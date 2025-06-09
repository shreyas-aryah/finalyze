"use client"; // Make this a client component (required for hooks like useDropzone)

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../../components/ui/button";

export default function UploadPage() {
    /* ------------------------------------------------------------------ */
    /*  Clerk auth state                                                  */
    /* ------------------------------------------------------------------ */
    const { isLoaded, isSignedIn } = useUser(); // auth flags

    /* ------------------------------------------------------------------ */
    /*  Local state                                                      */
    /* ------------------------------------------------------------------ */
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [ocrText, setOcrText] = useState<string | null>(null); // Store OCR extracted text

    /* ------------------------------------------------------------------ */
    /*  Dropzone logic                                                    */
    /* ------------------------------------------------------------------ */
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFile(acceptedFiles[0]); // only store the first file
        setOcrText(null);          // clear OCR text when new file selected
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: { "image/*": [] }, // optional: limit to images
    });

    /* ------------------------------------------------------------------ */
    /*  Upload handler (POST with FormData)                               */
    /* ------------------------------------------------------------------ */
    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setOcrText(null); // Clear previous OCR text on upload start

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/receipts", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setOcrText(data.text || "No text extracted");
                setFile(null); // Clear file after successful upload
            } else {
                setOcrText(`Error: ${data.error || "Unknown error"}`);
            }
        } catch (err) {
            console.error(err);
            setOcrText(`Upload failed: ${String(err)}`);
        } finally {
            setUploading(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Loading screen while Clerk initializes                            */
    /* ------------------------------------------------------------------ */
    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Loading...
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Page layout                                                      */
    /* ------------------------------------------------------------------ */
    return (
        <div className="min-h-screen bg-white text-black">
            {/* ---------------- Navbar (shared across pages) ---------------- */}
            <nav className="flex justify-between items-center p-6 border-b">
                <div className="text-xl font-semibold">Finalyze AI</div>

                <div className="flex gap-6 items-center">
                    <Link href="/upload" className="hover:underline font-bold text-blue-600">
                        Upload
                    </Link>
                    <Link href="/details" className="hover:underline">
                        Details
                    </Link>
                    <Link href="/reports" className="hover:underline">
                        Reports
                    </Link>
                    <Link href="/insights" className="hover:underline">
                        Insights
                    </Link>

                    {isSignedIn ? (
                        <UserButton />
                    ) : (
                        <SignInButton>
                            <Button variant="default">Login</Button>
                        </SignInButton>
                    )}
                </div>
            </nav>

            {/* ---------------- Main Content -------------------------------- */}
            <main className="p-10 max-w-3xl mx-auto">
                {isSignedIn ? (
                    <>
                        <h1 className="text-3xl font-bold mb-4">Upload Receipt</h1>
                        <p className="text-gray-600 mb-6">
                            Drag an image of your receipt into the box below, or click to browse.
                        </p>

                        {/* Dropzone container */}
                        <div
                            {...getRootProps()}
                            className="flex flex-col items-center justify-center
                         border-2 border-dashed rounded-lg p-8 cursor-pointer
                         transition-colors hover:bg-gray-50"
                        >
                            <input {...getInputProps()} />

                            {isDragActive ? (
                                <p>Drop the file here…</p>
                            ) : (
                                <p>Drag &amp; drop a receipt here, or click to select</p>
                            )}
                        </div>

                        {/* Selected file name */}
                        {file && <p className="mt-4 text-sm">Selected file: {file.name}</p>}

                        {/* Upload button */}
                        <Button
                            className="mt-6"
                            onClick={handleUpload}
                            disabled={!file || uploading}
                        >
                            {uploading ? "Uploading…" : "Upload"}
                        </Button>

                        {/* OCR extracted text display */}
                        {ocrText && (
                            <section className="mt-8 p-4 border rounded bg-gray-50 whitespace-pre-wrap">
                                <h2 className="font-semibold mb-2">Extracted Text:</h2>
                                <pre className="text-sm">{ocrText}</pre>
                            </section>
                        )}
                    </>
                ) : (
                    /* -------------- Sign-in prompt for guests ---------------- */
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                        <h1 className="text-4xl font-bold mb-4">Please sign in to upload receipts</h1>
                        <SignInButton>
                            <Button variant="default" className="px-8 py-3 text-lg">
                                Sign In to Continue
                            </Button>
                        </SignInButton>
                    </div>
                )}
            </main>
        </div>
    );
}
