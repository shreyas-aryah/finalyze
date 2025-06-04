"use client"; // Ensures the component runs on the client-side in a Next.js app

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone"; // Importing the hook from react-dropzone to handle file uploads via drag-and-drop

export default function UploadPage() {
    // State to store the uploaded file (only one file in this case)
    const [file, setFile] = useState<File | null>(null);

    // Callback function triggered when a file is dropped or selected
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Set the first accepted file to state
        setFile(acceptedFiles[0]);
    }, []);

    // useDropzone hook gives us props and state to manage the drop area
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/receipts", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        alert(data.message || data.error);
    };

    return (
        <div className="p-6">
            {/* Title for the upload page */}
            <h2 className="text-xl font-bold">Upload Receipt</h2>

            {/* Dropzone area that accepts file drop or click to select */}
            <div
                {...getRootProps()} // Spread dropzone root props onto the container div
                className="mt-4 p-6 border border-dashed rounded-md text-center cursor-pointer"
            >
                {/* Input field hidden but used internally by react-dropzone */}
                <input {...getInputProps()} />

                {/* Display message based on whether a file is being dragged over the drop area */}
                {isDragActive ? (
                    <p>Drop the file here...</p>
                ) : (
                    <p>Drag & drop a receipt here, or click to browse</p>
                )}
            </div>

            {/* Display selected file name after it is uploaded */}
            {file && <p className="mt-4">Selected file: {file.name}</p>}

            <button onClick={handleUpload} disabled={!file}>Upload</button>
        </div>
    );
}
