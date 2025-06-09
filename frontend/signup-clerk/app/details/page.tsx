"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import React from "react";
import { Button } from "../../components/ui/button";

export default function DetailsPage() {
    const { user, isLoaded, isSignedIn } = useUser(); // Get user auth info

    // Show loading spinner while auth is initializing
    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black">
            {/* -------- Navbar -------- */}
            <nav className="flex justify-between items-center p-6 border-b">
                <div className="text-xl font-semibold">Finalyze AI</div>
                <div className="flex gap-6 items-center">
                    {/* Navigation links */}
                    <Link href="/upload" className="hover:underline">Upload</Link>
                    <Link href="/details" className="hover:underline font-bold text-blue-600">Details</Link>
                    <Link href="/reports" className="hover:underline">Reports</Link>
                    <Link href="/insights" className="hover:underline">Insights</Link>

                    {/* Auth UI */}
                    {isSignedIn ? (
                        <UserButton />
                    ) : (
                        <SignInButton>
                            <Button variant="default">Login</Button>
                        </SignInButton>
                    )}
                </div>
            </nav>

            {/* -------- Main Receipt Details Content -------- */}
            <main className="p-10">
                {isSignedIn ? (
                    <div>
                        <h1 className="text-3xl font-bold mb-4">Receipt Details</h1>
                        <p className="text-gray-600 mb-6">
                            View structured data from your uploaded receipts.
                        </p>

                        {/* Placeholder for data table or detail list */}
                        <div className="bg-gray-100 h-64 rounded-lg shadow-inner flex items-center justify-center text-gray-500">
                            Details Table Placeholder
                        </div>
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
            </main>
        </div>
    );
}
