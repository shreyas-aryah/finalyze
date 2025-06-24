import clientPromise from "@/lib/mongodb";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// --- Helper: Simple keyword-based retrieval ---
function getRelevantReceipts(receipts: any[], question: string, topN = 10) {
    // Score each receipt by keyword overlap with the question
    const qWords = question.toLowerCase().split(/\W+/).filter(Boolean);
    return receipts
        .map(r => {
            const text = (r.fields?.raw_text || "").toLowerCase();
            const score = qWords.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
            return { ...r, _score: score };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, topN);
}

// --- Helper: Chunk context to fit model limits ---
function chunkText(text: string, maxLen = 1800) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + maxLen));
        i += maxLen;
    }
    return chunks;
}

// --- Helper: Summarize a chunk using Python backend ---
async function summarizeChunk(chunk: string) {
    const res = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ text: chunk }),
    });
    const data = await res.json();
    return data.summary || chunk;
}

// POST /api/receipts/qa
export async function POST(req: NextRequest) {
    try {
        // 1. Get user and question
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
        const { question } = await req.json();
        if (!question) return NextResponse.json({ error: "No question provided" }, { status: 400 });

        // 2. Fetch all receipts for this user
        const client = await clientPromise;
        const db = client.db("finalyze");
        const receipts = await db.collection("receipts").find({ userId }).toArray();
        if (!receipts.length) return NextResponse.json({ error: "No receipts found" }, { status: 404 });

        // 3. Retrieval: Select top N relevant receipts
        const relevantReceipts = getRelevantReceipts(receipts, question, 10);
        const context = relevantReceipts.map(r => r.fields?.raw_text || "").join("\n---\n");
        if (!context.trim()) return NextResponse.json({ error: "No relevant receipt text found" }, { status: 404 });

        // 4. Chunking: Split context if too long
        const maxChunkLen = 1800; // chars (adjust as needed)
        let chunks = chunkText(context, maxChunkLen);

        // 5. Summarization: Summarize each chunk if it's still too long
        for (let i = 0; i < chunks.length; i++) {
            if (chunks[i].length > maxChunkLen) {
                chunks[i] = await summarizeChunk(chunks[i]);
            }
        }
        const finalContext = chunks.join("\n---\n");

        // 6. Call Python backend /document-qa endpoint
        const res = await fetch("http://localhost:8000/document-qa", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ context: finalContext, question }),
        });
        const data = await res.json();
        if (res.ok && data.answer) {
            return NextResponse.json({ answer: data.answer, score: data.score });
        } else {
            return NextResponse.json({ error: data.error || "No answer found" }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
} 