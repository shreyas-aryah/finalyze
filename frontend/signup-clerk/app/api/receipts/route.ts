// Import necessary modules
import fs from "fs"; // File system module to read directories/files
import { NextRequest, NextResponse } from "next/server"; // For handling Next.js API routes
import path from "path"; // To handle file paths cross-platform
import Tesseract from "tesseract.js-node"; // Tesseract Node.js binding for OCR

// ----- GET Route: List available receipts -----
export async function GET() {
    try {
        // Define the path to the directory where receipt images are stored
        const receiptsDir = path.join(process.cwd(), "public", "receipts");

        // Read all files from the receipts directory
        const files = fs.readdirSync(receiptsDir);

        // Filter out non-image files (only include jpg, jpeg, png)
        const imageFiles = files.filter(file =>
            /\.(jpg|jpeg|png)$/i.test(file) // Case-insensitive match
        );

        // Return the list of image file names as JSON
        return NextResponse.json({ receipts: imageFiles });
    } catch (error) {
        // Log any error that occurs and return a 500 response with error details
        console.error("Error reading receipts:", error);
        return NextResponse.json(
            { error: "Failed to fetch receipts", details: String(error) },
            { status: 500 }
        );
    }
}

// ----- POST Route: Perform OCR on a selected receipt -----
export async function POST(req: NextRequest) {
    try {
        // Parse the JSON request body to get the fileName
        const { fileName } = await req.json();

        // Build the absolute path to the image file in the receipts directory
        const imagePath = path.join(process.cwd(), "public", "receipts", fileName);

        // Check if the file actually exists at the specified path
        if (!fs.existsSync(imagePath)) {
            // If not found, return 404 error
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Perform OCR on the image using Tesseract with English language
        const result = await Tesseract.recognize(imagePath, "eng");

        // Return the extracted text in the response
        return NextResponse.json({
            message: "OCR completed",
            text: result.data.text, // Raw text result from OCR
        });

    } catch (error) {
        // Handle and return any unexpected errors during OCR processing
        console.error("OCR processing error:", error);
        return NextResponse.json(
            { error: "OCR failed", details: String(error) },
            { status: 500 }
        );
    }
}
