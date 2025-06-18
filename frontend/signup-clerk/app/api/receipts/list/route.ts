import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

const RECEIPTS_DIR = path.join(process.cwd(), "public", "receipts");
const METADATA_FILE = path.join(RECEIPTS_DIR, "metadata.json");

async function readMetadata() {
  try {
    const data = await fs.readFile(METADATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Helper: Recursively collect all folders with relative paths
async function getAllFolders(dir: string, base = ""): Promise<string[]> {
  let folders: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      folders.push(relPath);
      const subfolders = await getAllFolders(path.join(dir, entry.name), relPath);
      folders = folders.concat(subfolders);
    }
  }
  return folders;
}

// GET /api/receipts/list
// Returns all structured receipts for the current user from MongoDB, plus folders and metadata
export async function GET(req: NextRequest) {
  // Get the current user's ID from Clerk
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ receipts: [], folders: [], meta: {} });

  // Connect to MongoDB and fetch receipts for this user
  const client = await clientPromise;
  const db = client.db("finalyze");
  const receipts = await db.collection("receipts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  // Read folders and metadata from filesystem
  let folders: string[] = [];
  let meta: any = {};
  try {
    folders = await getAllFolders(RECEIPTS_DIR);
    meta = await readMetadata();
  } catch {
    // ignore
  }

  // Return the receipts array, folders, and meta
  return NextResponse.json({ receipts, folders, meta });
} 