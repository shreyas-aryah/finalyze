import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import Tesseract from "tesseract.js"; // ✅ Correct import

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save file to public/receipts
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(process.cwd(), "public", "receipts", fileName);
        await fs.writeFile(filePath, buffer);

        // ✅ Use Tesseract.js correctly
        const result = await Tesseract.recognize(filePath, "eng");

        return NextResponse.json({
            message: "OCR completed",
            text: result.data.text,
        });
    } catch (error) {
        console.error("OCR error:", error);
        return NextResponse.json(
            { error: "OCR failed", details: String(error) },
            { status: 500 }
        );
    }
}
