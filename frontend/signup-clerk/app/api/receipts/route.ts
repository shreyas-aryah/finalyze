// app/api/receipts/route.ts

// Import necessary modules from Next.js and Node.js
import fs from "fs"; // File system module to interact with files
import { NextRequest, NextResponse } from "next/server"; // For handling API routes in Next.js
import path from "path"; // Node.js module to handle file paths
import Tesseract from "tesseract.js-node";

// Define the POST route handler
export async function POST(req: NextRequest) {
    try {
        // Parse the incoming request body to extract the file name
        const { fileName } = await req.json();

        // Construct the full path to the image file in the 'public/receipts' directory
        const imagePath = path.join(process.cwd(), "public", "receipts", fileName);

        // Check if the file actually exists on the server
        if (!fs.existsSync(imagePath)) {
            // Return a 404 response if the file does not exist
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Run OCR using Tesseract.js on the image file using the English language
        const result = await Tesseract.recognize(imagePath, "eng");

        // Return the extracted text in the response
        return NextResponse.json({
            message: "OCR completed",
            text: result.data.text, // OCR result text
        });
    } catch (error) {
        // Handle any errors during processing
        console.error("OCR error:", error);

        // Return a 500 Internal Server Error response with error details
        return NextResponse.json(
            { error: "OCR failed", details: String(error) },
            { status: 500 }
        );
    }
}
