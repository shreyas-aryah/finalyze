import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receipts/trends
// Returns monthly spending trends for the current user
export async function GET(req: NextRequest) {
  // Authenticate user
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ trends: [] });

  // Connect to MongoDB and fetch receipts
  const client = await clientPromise;
  const db = client.db("finalyze");
  const receipts = await db.collection("receipts").find({ userId }).toArray();

  // Group receipts by month and sum total spending for each month
  const trends: Record<string, number> = {};
  for (const receipt of receipts) {
    // Use the receipt's date field or fallback to createdAt
    const date = new Date(receipt.fields?.date || receipt.createdAt);
    // Format as YYYY-MM
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = parseFloat(receipt.fields?.amount || 0);
    trends[month] = (trends[month] || 0) + amount;
  }
  // Convert trends object to a sorted array for charting
  const trendArr = Object.entries(trends)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Return the trend data as JSON
  return NextResponse.json({ trends: trendArr });
} 