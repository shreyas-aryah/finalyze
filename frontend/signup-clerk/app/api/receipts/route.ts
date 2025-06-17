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

        // Call Python AI backend for field extraction and categorization
        const form = new FormData();
        form.append("file", buffer, file.name);
        const aiRes = await fetch("http://localhost:8000/extract", {
            method: "POST",
            body: form,
            headers: form.getHeaders(),
        });
        const aiData = await aiRes.json();

        // Store in MongoDB
        const client = await clientPromise;
        const db = client.db("finalyze");
        await db.collection("receipts").insertOne({
            userId,
            fileName,
            filePath: `/receipts/${fileName}`,
            fields: aiData.fields,
            category: aiData.category,
            createdAt: new Date(),
        });

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
        if (body.file && body.toFolder) {
            const { file, fromFolder = "", toFolder } = body;
            const src = path.join(RECEIPTS_DIR, fromFolder, file);
            const destDir = path.join(RECEIPTS_DIR, toFolder);
            await fs.mkdir(destDir, { recursive: true });
            const dest = path.join(destDir, file);
            await fs.rename(src, dest);
            return NextResponse.json({ message: "File moved" });
        }
        // --- Edit folder name or color ---
        if (body.editFolder) {
            const { oldName, newName, color } = body.editFolder;
            const meta = await readMetadata();
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

/* -------------------------------------------------- */
/*  DELETE: Delete a file                             */
/* -------------------------------------------------- */
export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { file, folder = "" } = await req.json();
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
