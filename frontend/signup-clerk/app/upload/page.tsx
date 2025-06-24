"use client"; // Make this a client component (required for hooks like useDropzone)

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
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
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    /* ------------------------------------------------------------------ */
    /*  Language selector for multi-language OCR                          */
    /* ------------------------------------------------------------------ */
    const [ocrLang, setOcrLang] = useState<string>('eng'); // Default to English, always string
    // Supported languages for Tesseract OCR (add more as needed)
    const ocrLanguages = [
        { code: 'eng', label: 'English' },
        { code: 'spa', label: 'Spanish' },
        { code: 'fra', label: 'French' },
        { code: 'deu', label: 'German' },
        { code: 'ita', label: 'Italian' },
        { code: 'por', label: 'Portuguese' },
        // Add more as needed
    ];

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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dataTransfer = e.dataTransfer;
        if (dataTransfer && dataTransfer.files) {
            const files = Array.from(dataTransfer.files);
            onDrop(files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    /* ------------------------------------------------------------------ */
    /*  Upload handler (POST with FormData)                               */
    /* ------------------------------------------------------------------ */
    const handleUpload = async () => {
        if (!file || uploading) return; // Prevent double upload
        setUploading(true);
        setOcrText(null); // Clear previous OCR text on upload start
        setSuccess(false);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("lang", ocrLang); // Pass selected OCR language
            const res = await fetch("/api/receipts", {
                method: "POST",
                body: formData,
            });
            let data;
            try {
                data = await res.json();
            } catch (err) {
                setOcrText("Error: Invalid response from server");
                setUploading(false);
                return;
            }
            if (res.ok) {
                setOcrText(data.text || data.fields?.raw_text || "No text extracted");
                setFile(null); // Clear file after successful upload
                setSuccess(true); // Show success message
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
    // Set preview image when file is selected
    useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, [file]);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload Receipt</h1>
                <p className="text-gray-500 mb-8">Drag an image of your receipt into the box below, or click to browse.</p>
                {/* Language Selector for OCR */}
                <div className="mb-6">
                    <label htmlFor="ocr-lang" className="block text-gray-700 font-medium mb-2">OCR Language:</label>
                    <select
                        id="ocr-lang"
                        value={ocrLang}
                        onChange={e => setOcrLang(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {ocrLanguages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                    </select>
                </div>
                {/* Upload Area */}
                <div 
                    className={`border-2 border-dashed rounded-lg p-12 text-center ${
                        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    } transition-colors`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {file ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center">
                                <img 
                                    src={preview} 
                                    alt="Preview" 
                                    className="max-h-64 rounded-lg shadow-sm"
                                />
                            </div>
                            <p className="text-sm text-gray-600">{file.name}</p>
                            <div className="flex justify-center gap-4">
                                <Button 
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </Button>
                                <Button 
                                    onClick={() => setFile(null)}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <svg 
                                    className="w-12 h-12 text-gray-400" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                                    />
                                </svg>
                            </div>
                            <div className="text-gray-600">
                                <p className="font-medium">Drag & drop a receipt here, or click to select</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    ref={fileInputRef}
                                />
                                <Button className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={handleBrowseClick}>
                                    Browse Files
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Supports JPG, PNG, and PDF files up to 10MB
                            </p>
                        </div>
                    )}
                </div>

                {/* OCR Results */}
                {success && (
                    <div className="mt-8 text-green-600 font-semibold">Receipt uploaded successfully!</div>
                )}
                {ocrText && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Extracted Text</h2>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                {ocrText}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
