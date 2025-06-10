import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receipts/list
// Returns all structured receipts for the current user from MongoDB
export async function GET(req: NextRequest) {
  // Get the current user's ID from Clerk
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ receipts: [] });

  // Connect to MongoDB and fetch receipts for this user
  const client = await clientPromise;
  const db = client.db("finalyze");
  const receipts = await db.collection("receipts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  // Return the receipts array
  return NextResponse.json({ receipts });
} 