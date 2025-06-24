import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import FormData from "form-data";
import fs from "fs/promises"; // Use promises-based fs API
import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";
import path from "path";
import Tesseract from "tesseract.js"; // OCR library

const RECEIPTS_DIR = path.join(process.cwd(), "public", "receipts");
const METADATA_FILE = path.join(RECEIPTS_DIR, "metadata.json");

// --- Helper to read and write folder metadata ---
async function readMetadata() {
    try {
        const data = await fs.readFile(METADATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return {};
    }
}
async function writeMetadata(meta: any) {
    await fs.writeFile(METADATA_FILE, JSON.stringify(meta, null, 2));
}

/* -------------------------------------------------- */
/*  POST: Handle file upload, AI backend, MongoDB     */
/* -------------------------------------------------- */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        const formData = await req.formData();
        const file = formData.get("file") as File;
        // Get OCR language from form (default to 'eng' if not provided)
        const lang = (formData.get("lang") as string) || 'eng';

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert file to a Node.js Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a unique filename using timestamp
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(RECEIPTS_DIR, fileName);

        // Save uploaded file to disk (public/receipts/)
        await fs.mkdir(RECEIPTS_DIR, { recursive: true }); // ensure dir exists
        await fs.writeFile(filePath, buffer);

        // Call Python AI backend for field extraction
        const form = new FormData();
        form.append("file", buffer, file.name);
        form.append("lang", lang); // Pass OCR language to backend
        const aiRes = await fetch("http://localhost:8000/extract", {
            method: "POST",
            body: form,
            headers: form.getHeaders(),
        });
        const aiData = await aiRes.json();

        // --- Vendor Matching Helper ---
        async function matchVendor(vendorName: string) {
            if (!vendorName) return null;
            const client = await clientPromise;
            const db = client.db("finalyze");
            const vendors = await db.collection("vendors").find().toArray();
            const names = vendors.map(v => v.name);
            // Simple fuzzy match using string similarity
            function similarity(a: string, b: string) {
                a = a.toLowerCase(); b = b.toLowerCase();
                let matches = 0;
                for (let i = 0; i < Math.min(a.length, b.length); i++) {
                    if (a[i] === b[i]) matches++;
                }
                return matches / Math.max(a.length, b.length);
            }
            let best = null, bestScore = 0.7;
            for (const v of vendors) {
                const score = similarity(vendorName, v.name);
                if (score > bestScore) {
                    best = v;
                    bestScore = score;
                }
            }
            return best;
        }

        // --- AI-powered categorization: Call /classify with OCR text to get category ---
        let category = "Uncategorized";
        let vendorInfo = null;
        if (aiData.fields?.raw_text) {
            const classifyRes = await fetch("http://localhost:8000/classify", {
                method: "POST",
                body: new URLSearchParams({ text: aiData.fields.raw_text }),
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });
            if (classifyRes.ok) {
                const classifyData = await classifyRes.json();
                category = classifyData.category || category;
            }
        }
        // --- Vendor matching and enrichment ---
        if (aiData.fields?.vendor) {
            vendorInfo = await matchVendor(aiData.fields.vendor);
        }

        // Store in MongoDB
        const client = await clientPromise;
        const db = client.db("finalyze");
        const receiptDoc: { [key: string]: any } = {
            userId,
            fileName,
            filePath: `/receipts/${fileName}`,
            fields: aiData.fields,
            category,
            createdAt: new Date(),
            folder: ""
        };
        if (vendorInfo) {
            receiptDoc.vendorInfo = vendorInfo;
        }
        await db.collection("receipts").insertOne(receiptDoc);

        return NextResponse.json({ message: "Receipt processed", fields: aiData.fields, category: aiData.category });
    } catch (error) {
        console.error("AI/MongoDB error:", error);
        return NextResponse.json(
            { error: "Processing failed", details: String(error) },
            { status: 500 }
        );
    }
}

/* -------------------------------------------------- */
/*  GET: List folders and files, or OCR for a file    */
/* -------------------------------------------------- */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");
    const folder = searchParams.get("folder") || "";

    if (file) {
        // OCR for a specific file (with optional folder)
        const filePath = path.join(RECEIPTS_DIR, folder, file);
        try {
            const result = await Tesseract.recognize(filePath, "eng");
            return NextResponse.json({ text: result.data.text });
        } catch (error) {
            return NextResponse.json({ error: "OCR failed", details: String(error) }, { status: 500 });
        }
    }

    // List folders and files (optionally within a folder)
    try {
        const targetDir = path.join(RECEIPTS_DIR, folder);
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        const folders = entries.filter(e => e.isDirectory()).map(e => e.name);
        const files = entries.filter(e => e.isFile()).map(e => e.name);
        // Read folder metadata
        const meta = await readMetadata();
        return NextResponse.json({ folders, files, meta });
    } catch (error) {
        return NextResponse.json({ error: "Failed to list receipts", details: String(error) }, { status: 500 });
    }
}

/* -------------------------------------------------- */
/*  PATCH: Move a file to a folder, or edit folder    */
/* -------------------------------------------------- */
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        // --- Move file to folder ---
        if (body.file && body.toFolder !== undefined) {
            const { file, fromFolder = "", toFolder } = body;
            let src = path.join(RECEIPTS_DIR, fromFolder, file);
            const destDir = toFolder ? path.join(RECEIPTS_DIR, toFolder) : RECEIPTS_DIR;
            await fs.mkdir(destDir, { recursive: true });
            const dest = path.join(destDir, file);
            let fileMoved = false;
            try {
                await fs.rename(src, dest);
                fileMoved = true;
            } catch (err) {
                // If file not found, search all folders for the file
                try {
                    const entries = await fs.readdir(RECEIPTS_DIR, { withFileTypes: true });
                    // Check root
                    let found = false;
                    if (await fileExists(path.join(RECEIPTS_DIR, file))) {
                        src = path.join(RECEIPTS_DIR, file);
                        await fs.rename(src, dest);
                        found = true;
                        fileMoved = true;
                    } else {
                        for (const entry of entries) {
                            if (entry.isDirectory()) {
                                const possible = path.join(RECEIPTS_DIR, entry.name, file);
                                if (await fileExists(possible)) {
                                    src = possible;
                                    await fs.rename(src, dest);
                                    found = true;
                                    fileMoved = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!found) {
                        console.error(`File ${file} not found in any folder for move operation.`);
                    }
                } catch (searchErr) {
                    console.error('Error searching for file to move:', searchErr);
                }
            }
            // Update MongoDB: set folder field (even if empty string)
            const { userId } = await auth();
            if (userId) {
                const client = await clientPromise;
                const db = client.db("finalyze");
                await db.collection("receipts").updateOne(
                    { userId, fileName: file },
                    { $set: { folder: toFolder } }
                );
            }
            return NextResponse.json({ message: fileMoved ? "File moved" : "File not found, only DB updated" });
        }
        // --- Edit folder name or color ---
        if (body.editFolder) {
            const { oldName, newName, color } = body.editFolder;
            const meta = await readMetadata();
            // Create new folder if oldName === newName and it doesn't exist
            if (oldName && newName && oldName === newName) {
                const folderPath = path.join(RECEIPTS_DIR, newName);
                await fs.mkdir(folderPath, { recursive: true });
            }
            // Rename folder on disk if name changed
            if (oldName && newName && oldName !== newName) {
                const oldPath = path.join(RECEIPTS_DIR, oldName);
                const newPath = path.join(RECEIPTS_DIR, newName);
                await fs.rename(oldPath, newPath);
                // Move metadata
                if (meta[oldName]) {
                    meta[newName] = { ...meta[oldName], name: newName };
                    delete meta[oldName];
                }
            }
            // Set color
            if (newName && color) {
                meta[newName] = meta[newName] || { name: newName };
                meta[newName].color = color;
            }
            await writeMetadata(meta);
            return NextResponse.json({ message: "Folder updated", meta });
        }
        return NextResponse.json({ error: "Invalid PATCH request" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to process PATCH", details: String(error) }, { status: 500 });
    }
}

// Helper to check if a file exists
async function fileExists(path: string) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

/* -------------------------------------------------- */
/*  DELETE: Delete a file                             */
/* -------------------------------------------------- */
export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { file, folder = "", folder: folderToDelete } = await req.json();
        // --- Folder delete logic ---
        if (folderToDelete && !file) {
            // Remove folder from disk
            const folderPath = path.join(RECEIPTS_DIR, folderToDelete);
            try {
                await fs.rm(folderPath, { recursive: true, force: true });
            } catch (err) {
                // Folder may not exist, that's ok
            }
            // Remove from metadata
            const meta = await readMetadata();
            if (meta[folderToDelete]) {
                delete meta[folderToDelete];
                await writeMetadata(meta);
            }
            return NextResponse.json({ message: "Folder deleted" });
        }
        // ... existing file delete logic ...
        if (!file) {
            return NextResponse.json({ error: "Missing file" }, { status: 400 });
        }

        // Delete from file system if it exists
        const filePath = path.join(RECEIPTS_DIR, folder, file);
        try {
            await fs.access(filePath); // Check if file exists
            await fs.unlink(filePath);
        } catch (fsError) {
            // If file doesn't exist, that's okay - we'll still clean up MongoDB
            console.log(`File ${filePath} not found, continuing with MongoDB cleanup`);
        }

        // Delete from MongoDB
        const client = await clientPromise;
        const db = client.db("finalyze");
        const result = await db.collection("receipts").deleteOne({ 
            userId,
            fileName: file 
        });

        if (result.deletedCount === 0) {
            console.log(`No MongoDB record found for file ${file}`);
        }

        return NextResponse.json({ 
            message: "Receipt deleted",
            fileDeleted: true,
            dbDeleted: result.deletedCount > 0
        });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ 
            error: "Failed to delete receipt", 
            details: String(error) 
        }, { status: 500 });
    }
}
