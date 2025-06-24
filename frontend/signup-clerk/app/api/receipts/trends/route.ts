import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receipts/trends
// Returns spending trends for the current user (daily, weekly, or monthly)
export async function GET(req: NextRequest) {
  // Authenticate user
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ trends: [] });

  // Parse view param
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "monthly";

  // Connect to MongoDB and fetch receipts
  const client = await clientPromise;
  const db = client.db("finalyze");
  const receipts = await db.collection("receipts").find({ userId }).toArray();

  // Group receipts by the selected view
  const trends: Record<string, number> = {};
  for (const receipt of receipts) {
    const date = new Date(receipt.fields?.date || receipt.createdAt);
    let label = "";
    if (view === "daily") {
      // YYYY-MM-DD
      label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    } else if (view === "weekly") {
      // YYYY-WW (ISO week number)
      const year = date.getFullYear();
      const firstJan = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
      label = `${year}-W${String(week).padStart(2, "0")}`;
    } else {
      // Default: monthly (YYYY-MM)
      label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    const amount = parseFloat(receipt.fields?.amount || 0);
    trends[label] = (trends[label] || 0) + amount;
  }
  // Convert trends object to a sorted array for charting
  const trendArr = Object.entries(trends)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Return the trend data as JSON
  return NextResponse.json({ trends: trendArr });
} 