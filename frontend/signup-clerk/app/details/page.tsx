"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

/**
 * Receipt Details Page
 *
 * This page now fetches structured receipt data (fields, category, etc.) from MongoDB,
 * which is populated by the backend after calling the Python AI inference server.
 *
 * - When a receipt is uploaded, the backend saves the file, calls the AI server,
 *   and stores the structured result in MongoDB.
 * - This page fetches the structured receipts and displays fields like date, amount, vendor, category, etc.
 * - All previous UI/UX improvements (folders, drag-and-drop, preview, etc.) are preserved.
 */

// --- Receipt type definition (copied from dashboard for clarity) ---
type Receipt = {
    id: string;
    fileName: string;
    date: string;
    amount: number;
};

export default function DetailsPage() {
    const { user, isLoaded, isSignedIn } = useUser(); // Get user auth info

    // --- Local state for folders, receipts, and UI ---
    const [folders, setFolders] = useState<string[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string>("");
    const [receipts, setReceipts] = useState<string[]>([]); // Now just filenames
    const [loading, setLoading] = useState(false);
    const [ocrTexts, setOcrTexts] = useState<{ [file: string]: string | null }>({}); // Store OCR text per file
    const [showText, setShowText] = useState<{ [file: string]: boolean }>({}); // Track which card is expanded
    const [selected, setSelected] = useState<Set<string>>(new Set()); // Track selected receipts
    const [selectAll, setSelectAll] = useState(false); // Track select all state
    const [bulkFolder, setBulkFolder] = useState<string>(""); // For grouping
    const [newBulkFolder, setNewBulkFolder] = useState<string>(""); // For creating new folder in bulk action
    const [meta, setMeta] = useState<any>({}); // Folder metadata
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [editName, setEditName] = useState<string>("");
    const [editColor, setEditColor] = useState<string>("");
    const [draggedFile, setDraggedFile] = useState<string | null>(null);
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState("#3b82f6");
    const [previewImg, setPreviewImg] = useState<string | null>(null);
    // --- Local state for structured receipts ---
    const [structuredReceipts, setStructuredReceipts] = useState<any[]>([]); // Array of { fileName, filePath, fields, category, ... }

    // --- Helper: Refetch receipts from backend and update state ---
    async function refetchReceipts() {
        setLoading(true);
        try {
            const res = await fetch("/api/receipts/list");
            if (!res.ok) throw new Error("Failed to fetch receipts");
            const data = await res.json();
            setStructuredReceipts(data.receipts || []);
            setFolders(data.folders || []);
            setMeta(data.meta || {});
            setReceipts((data.receipts || []).map((r: any) => r.fileName));
            setSelected(new Set()); // Always clear selection after fetch
            setSelectAll(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- Fetch folders, files, and metadata in the current folder ---
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/receipts?folder=${encodeURIComponent(currentFolder)}`);
                if (!res.ok) throw new Error("Failed to fetch receipts");
                const data = await res.json();
                setFolders(data.folders || []);
                setReceipts(data.files || []);
                setMeta(data.meta || {});
                setSelected(new Set());
                setSelectAll(false);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        if (isSignedIn) fetchData();
    }, [isSignedIn, currentFolder]);

    // --- Fetch structured receipts from MongoDB on mount and after upload/delete ---
    useEffect(() => {
        if (isSignedIn) refetchReceipts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn, currentFolder]);

    // --- Helper to parse upload date from filename ---
    function getDateFromFilename(filename: string) {
        const match = filename.match(/^\d+-/);
        if (match) {
            const date = new Date(Number(match[0].slice(0, -1)));
            // Use a fixed locale and format to avoid hydration issues
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return "Unknown";
    }

    // --- Handler to fetch OCR text for a file ---
    async function handleViewText(file: string) {
        setOcrTexts((prev) => ({ ...prev, [file]: null })); // Show loading
        setShowText((prev) => ({ ...prev, [file]: true }));
        try {
            const res = await fetch(`/api/receipts?file=${encodeURIComponent(file)}&folder=${encodeURIComponent(currentFolder)}`);
            const data = await res.json();
            setOcrTexts((prev) => ({ ...prev, [file]: data.text || "No text found" }));
        } catch (err) {
            setOcrTexts((prev) => ({ ...prev, [file]: "Failed to extract text" }));
        }
    }

    // --- Bulk: Select all/none ---
    function handleSelectAll() {
        if (selectAll) {
            setSelected(new Set());
            setSelectAll(false);
        } else {
            const all = new Set(structuredReceipts.map(r => r.fileName));
            setSelected(all);
            setSelectAll(true);
        }
    }

    // --- Checkbox for each receipt: keep selectAll in sync ---
    function handleCheckboxChange(fileName: string, checked: boolean) {
        setSelected(prev => {
            const s = new Set(prev);
            if (checked) s.add(fileName); else s.delete(fileName);
            // Update selectAll state if all/none are selected
            if (s.size === structuredReceipts.length && structuredReceipts.length > 0) setSelectAll(true);
            else setSelectAll(false);
            return s;
        });
    }

    // --- Handler to delete a file ---
    async function handleDelete(fileName: string) {
        try {
            const res = await fetch("/api/receipts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: fileName, folder: currentFolder }),
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete receipt');
            }
            
            // Remove from selected set if it was selected
            setSelected(prev => {
                const s = new Set(prev);
                s.delete(fileName);
                return s;
            });
            
            // Refetch to update the UI
            await refetchReceipts();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete receipt. Please try again.');
        }
    }

    // --- Bulk: Group selected into folder ---
    async function handleBulkMove(toFolder: string) {
        for (const file of Array.from(selected)) {
            await fetch("/api/receipts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file, fromFolder: currentFolder, toFolder }),
            });
        }
        await refetchReceipts();
        setBulkFolder("");
        setNewBulkFolder("");
    }

    // --- Bulk: Delete selected ---
    async function handleBulkDelete() {
        try {
            for (const file of Array.from(selected)) {
                const res = await fetch("/api/receipts", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file, folder: currentFolder }),
                });
                
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || 'Failed to delete receipt');
                }
            }
            
            // Clear selection and refetch
            setSelected(new Set());
            setSelectAll(false);
            await refetchReceipts();
        } catch (error) {
            console.error('Bulk delete error:', error);
            alert('Failed to delete some receipts. Please try again.');
        }
    }

    // --- Handler to edit folder name and color ---
    async function handleEditFolderSubmit() {
        if (!editingFolder || !editName) return;
        await fetch("/api/receipts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ editFolder: { oldName: editingFolder, newName: editName, color: editColor } }),
        });
        setEditingFolder(null);
        setEditName("");
        setEditColor("");
        // Refresh
        setCurrentFolder("");
    }

    // --- Handler for dropping a receipt into a folder ---
    async function handleDropToFolder(file: string, toFolder: string) {
        await fetch("/api/receipts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file, fromFolder: currentFolder, toFolder }),
        });
        setReceipts((prev) => prev.filter(f => f !== file));
        setDraggedFile(null);
        setDragOverFolder(null);
    }

    // --- Handler to create a new folder (with color) ---
    async function handleCreateFolder() {
        if (!newFolderName) return;
        await fetch("/api/receipts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ editFolder: { oldName: newFolderName, newName: newFolderName, color: newFolderColor } }),
        });
        setShowCreateFolder(false);
        setNewFolderName("");
        setNewFolderColor("#3b82f6");
        setCurrentFolder("");
        await refetchReceipts();
    }

    // --- Handler to close preview modal ---
    function closePreview() {
        setPreviewImg(null);
    }

    // Show loading spinner while auth is initializing
    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isSignedIn ? (
                <div>
                    {/* --- Bulk Action Dropdown Menu --- */}
                    {structuredReceipts.length > 0 && (
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative">
                                <button
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-semibold shadow transition-all"
                                    onClick={() => setSelectAll(!selectAll)}
                                >
                                    {selectAll ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                            {selected.size > 0 && (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={bulkFolder}
                                        onChange={e => setBulkFolder(e.target.value)}
                                        className="px-3 py-2 border rounded text-sm"
                                    >
                                        <option value="">Move to folder...</option>
                                        {folders.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                        <option value="new">+ Create New Folder</option>
                                    </select>
                                    {bulkFolder === "new" && (
                                        <input
                                            type="text"
                                            value={newBulkFolder}
                                            onChange={e => setNewBulkFolder(e.target.value)}
                                            placeholder="New folder name"
                                            className="px-3 py-2 border rounded text-sm"
                                        />
                                    )}
                                    {(bulkFolder || newBulkFolder) && (
                                        <button
                                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                                            onClick={() => handleBulkMove(newBulkFolder || bulkFolder)}
                                        >
                                            Move
                                        </button>
                                    )}
                                    <button
                                        className="px-3 py-2 bg-red-600 text-white rounded text-sm"
                                        onClick={handleBulkDelete}
                                    >
                                        Delete Selected
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- Back to Parent Button (if inside a folder) --- */}
                    {currentFolder && (
                        <button
                            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold px-3 py-1 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all"
                            onClick={() => setCurrentFolder("")}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to All Folders
                        </button>
                    )}

                    {/* --- Folders and Receipts Grid --- */}
                    <h1 className="text-3xl font-bold mb-4">Receipt Details</h1>
                    {loading ? (
                        <p>Loading receipts...</p>
                    ) : receipts.length === 0 && folders.length === 0 ? (
                        <p>No receipts or folders found.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {/* --- Folder Cards --- */}
                            {folders.map((folder) => (
                                <div
                                    key={folder}
                                    className={`group bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow hover:shadow-lg p-6 flex flex-col items-center justify-center transition-all hover:scale-105 focus:outline-none relative ${dragOverFolder === folder ? 'ring-4 ring-blue-400' : ''}`}
                                    style={{ borderColor: meta[folder]?.color || undefined }}
                                    onDragOver={e => { e.preventDefault(); setDragOverFolder(folder); }}
                                    onDragLeave={e => { e.preventDefault(); setDragOverFolder(null); }}
                                    onDrop={e => {
                                        e.preventDefault();
                                        if (draggedFile) handleDropToFolder(draggedFile, folder);
                                    }}
                                >
                                    {/* Folder Icon */}
                                    <button
                                        className="absolute top-2 right-2 text-gray-400 hover:text-blue-600"
                                        onClick={e => { e.stopPropagation(); setEditingFolder(folder); setEditName(folder); setEditColor(meta[folder]?.color || ""); }}
                                        title="Edit folder"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                                        </svg>
                                    </button>
                                    <button
                                        className="w-full flex flex-col items-center focus:outline-none"
                                        onClick={() => setCurrentFolder(folder)}
                                        tabIndex={0}
                                        style={{ color: meta[folder]?.color || undefined }}
                                    >
                                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 3h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                        </svg>
                                        <span className="font-semibold text-lg truncate w-full text-center">{meta[folder]?.name || folder}</span>
                                        <span className="text-xs mt-1">Folder</span>
                                    </button>
                                    {/* Edit Modal (inline) */}
                                    {editingFolder === folder && (
                                        <div className="absolute z-50 top-10 left-1/2 -translate-x-1/2 bg-white border border-blue-200 rounded-lg shadow-lg p-4 w-64 flex flex-col gap-2">
                                            <label className="text-xs font-semibold">Folder Name</label>
                                            <input
                                                className="border rounded px-2 py-1 text-sm"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                            />
                                            <label className="text-xs font-semibold mt-2">Color</label>
                                            <input
                                                type="color"
                                                className="w-8 h-8 p-0 border-none bg-transparent"
                                                value={editColor || "#3b82f6"}
                                                onChange={e => setEditColor(e.target.value)}
                                            />
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs"
                                                    onClick={handleEditFolderSubmit}
                                                >Save</button>
                                                <button
                                                    className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                                                    onClick={() => setEditingFolder(null)}
                                                >Cancel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* --- Receipt Cards (structured data) --- */}
                            {structuredReceipts.map((receipt) => (
                                <div
                                    key={receipt._id || receipt.fileName}
                                    className={`bg-white border rounded-lg shadow p-4 flex flex-col items-center relative hover:shadow-lg transition-all ${draggedFile === receipt.fileName ? 'opacity-50' : ''}`}
                                    draggable
                                    onDragStart={() => setDraggedFile(receipt.fileName)}
                                    onDragEnd={() => { setDraggedFile(null); setDragOverFolder(null); }}
                                >
                                    {/* Checkbox for selection */}
                                    <input
                                        type="checkbox"
                                        checked={selected.has(receipt.fileName)}
                                        onChange={e => handleCheckboxChange(receipt.fileName, e.target.checked)}
                                        className="absolute left-2 top-2 accent-blue-600 w-5 h-5 rounded border-gray-300 focus:ring-2 focus:ring-blue-400 transition-all"
                                    />
                                    {/* Thumbnail (click to preview) */}
                                    <img
                                        src={receipt.filePath}
                                        alt={receipt.fileName}
                                        className="w-32 h-32 object-contain mb-2 border rounded bg-gray-50 cursor-zoom-in"
                                        onClick={() => setPreviewImg(receipt.filePath)}
                                    />
                                    {/* Structured Fields Display */}
                                    <div className="w-full text-left text-xs text-gray-700 mb-2">
                                        {receipt.fields && (
                                            <>
                                                {receipt.fields.date && <div><b>Date:</b> {receipt.fields.date}</div>}
                                                {receipt.fields.amount && <div><b>Amount:</b> {receipt.fields.amount}</div>}
                                                {receipt.fields.vendor && <div><b>Vendor:</b> {receipt.fields.vendor}</div>}
                                                {receipt.fields.tax && <div><b>Tax:</b> {receipt.fields.tax}</div>}
                                            </>
                                        )}
                                        {receipt.category && <div><b>Category:</b> {receipt.category}</div>}
                                    </div>
                                    {/* Delete Button */}
                                    <button
                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm mb-2 w-full"
                                        onClick={() => handleDelete(receipt.fileName)}
                                    >Delete</button>
                                    {/* View Text Button (optional, if you want to show OCR text) */}
                                    {/* ...existing preview/ocr logic if needed... */}
                                </div>
                            ))}
                        </div>
                    )}
                    {/* --- Floating Plus Button for Creating Folder --- */}
                    <button
                        className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl text-4xl transition-all backdrop-blur-md hover:scale-105 focus:outline-none"
                        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}
                        onClick={() => setShowCreateFolder(true)}
                        title="Create new folder"
                    >
                        +
                    </button>
                    {/* --- Create Folder Modal --- */}
                    {showCreateFolder && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-white/30">
                            <div className="bg-white/80 rounded-3xl shadow-2xl p-8 w-96 flex flex-col gap-4 border border-blue-100 relative animate-fade-in">
                                <button
                                    className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl focus:outline-none"
                                    onClick={() => setShowCreateFolder(false)}
                                    aria-label="Close"
                                >
                                    &times;
                                </button>
                                <h2 className="text-xl font-bold mb-2 text-blue-700">Create New Folder</h2>
                                <label className="text-xs font-semibold text-gray-600">Folder Name</label>
                                <input
                                    className="border border-blue-200 rounded-full px-4 py-2 text-base focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white/70"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="Folder name"
                                />
                                <label className="text-xs font-semibold text-gray-600 mt-2">Color</label>
                                <div className="flex items-center gap-4 mt-1">
                                    <input
                                        type="color"
                                        className="w-12 h-12 p-0 border-none bg-transparent rounded-full shadow"
                                        value={newFolderColor}
                                        onChange={e => setNewFolderColor(e.target.value)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span className="text-sm font-mono text-gray-500">{newFolderColor}</span>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-base font-semibold shadow-md transition-all disabled:opacity-50"
                                        onClick={handleCreateFolder}
                                        disabled={!newFolderName}
                                    >Create</button>
                                    <button
                                        className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-base font-semibold shadow-sm transition-all"
                                        onClick={() => setShowCreateFolder(false)}
                                    >Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- Receipt Image Preview Modal --- */}
                    {previewImg && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-white/30"
                            onClick={closePreview}
                        >
                            <div
                                className="relative max-w-3xl w-full flex flex-col items-center"
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 text-3xl focus:outline-none"
                                    onClick={closePreview}
                                    aria-label="Close preview"
                                >
                                    &times;
                                </button>
                                <img
                                    src={previewImg}
                                    alt="Receipt preview"
                                    className="rounded-2xl shadow-2xl max-h-[80vh] w-auto object-contain bg-white"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Ask user to sign in if not already authenticated
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                    <h1 className="text-4xl font-bold mb-4">Please sign in to view receipt details</h1>
                    <SignInButton>
                        <Button variant="default" className="px-8 py-3 text-lg">
                            Sign In to Continue
                        </Button>
                    </SignInButton>
                </div>
            )}
        </div>
    );
}

