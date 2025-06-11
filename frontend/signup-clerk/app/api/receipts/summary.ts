import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receipts/summary
// Returns summary statistics for the current user's receipts
export async function GET(req: NextRequest) {
  // Authenticate user
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ summary: null });

  // Connect to MongoDB
  const client = await clientPromise;
  const db = client.db("finalyze");

  // Fetch all receipts for this user
  const receipts = await db.collection("receipts").find({ userId }).toArray();

  // Calculate total spending and category breakdown
  let totalSpending = 0;
  const categoryTotals: Record<string, number> = {};

  for (const receipt of receipts) {
    // Assume 'fields.amount' holds the expense value (customize if needed)
    const amount = parseFloat(receipt.fields?.amount || 0);
    totalSpending += amount;
    const category = receipt.category || "Uncategorized";
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  }

  // Build summary object
  const summary = {
    totalSpending,
    categoryTotals,
    receiptCount: receipts.length,
  };

  return NextResponse.json({ summary });
} 