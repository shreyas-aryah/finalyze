"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function SettingsPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Load user info and birthday from localStorage
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
        }
        const storedBirthday = localStorage.getItem("birthday");
        if (storedBirthday) setBirthday(storedBirthday);
    }, [user]);

    // Save handler
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        try {
            // Update Clerk user info
            if (user) {
                await user.update({
                    firstName,
                    lastName,
                });
            }
            // Store birthday locally (replace with backend call if needed)
            localStorage.setItem("birthday", birthday);
            setSuccess(true);
        } catch (err) {
            // Optionally handle error
        } finally {
            setSaving(false);
        }
    };

    if (!isLoaded) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }
    if (!isSignedIn) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"><h1 className="text-4xl font-bold mb-4">Please sign in to view settings</h1></div>;
    }

    return (
        <div className="flex justify-center items-start min-h-[70vh] bg-gray-50 py-12">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-10">
                {/* Page Heading */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
                    <p className="text-gray-500">Manage your account and personalize your experience.</p>
                </div>
                <hr className="my-4" />
                {/* User Info Section */}
                <form className="space-y-6" onSubmit={handleSave}>
                    <div className="flex items-center gap-5">
                        {user?.imageUrl && <img src={user.imageUrl} alt="avatar" className="w-16 h-16 rounded-full border" />}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">Birthday</label>
                        <input
                            type="date"
                            value={birthday}
                            onChange={e => setBirthday(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none max-w-xs"
                        />
                    </div>
                    <div className="flex gap-4 items-center">
                        <button
                            type="submit"
                            className="px-4 py-2 rounded font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                        {success && <span className="text-green-600 font-medium">Saved!</span>}
                    </div>
                </form>
            </div>
        </div>
    );
} 