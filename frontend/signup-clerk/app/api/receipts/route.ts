// Import Clerk's auth method to authenticate the request
import { auth } from '@clerk/nextjs/server';

// Import MongoDB client to interact with the database
import { MongoClient } from 'mongodb';

// Import types from Next.js for handling the request and response
import { NextRequest, NextResponse } from 'next/server';

// Get the MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI!;

// Cache the MongoClient to avoid reconnecting on every request in a serverless environment
let cachedClient: MongoClient | null = null;

// Handler for POST requests to this API route
export async function POST(req: NextRequest) {
    // Use Clerk's auth to get the currently authenticated user's ID
    const { userId } = await auth();

    // Parse the JSON body of the request
    // NOTE: This assumes a JSON body — update this when switching to file uploads
    const body = await req.json();

    // If the user is not authenticated, return a 401 Unauthorized response
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Initialize MongoDB client only if it hasn't been already
        if (!cachedClient) {
            cachedClient = new MongoClient(uri);
            await cachedClient.connect(); // Establish the connection
        }

        // Get the default database (or specify one explicitly if needed)
        const db = cachedClient.db();

        // Get a reference to the "receipts" collection
        const receipts = db.collection("receipts");

        // Create a new document to store receipt metadata
        const receiptData = {
            userId, // Clerk user ID
            fileName: body.fileName || "test.jpg", // Store the file name (default is test.jpg)
            imageUrl: "mock-url", // Placeholder for image URL — to be replaced when real uploads are handled
            extractedData: null, // Reserved for future OCR data
            status: "pending", // Initial status of the receipt processing
            createdAt: new Date(), // Timestamp for creation
            updatedAt: new Date(), // Timestamp for last update
        };

        // Insert the receipt document into the collection
        await receipts.insertOne(receiptData);

        // Respond with a success message
        return NextResponse.json({ message: "Saved!" });
    } catch (error) {
        // Catch any errors and return a 500 response with the error message
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
