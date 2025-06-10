"use client"; // Enables client-side features in a Next.js server component

// Clerk authentication hooks and UI components
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

// Routing and UI libraries
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

// Add this above your component
type Receipt = {
  id: string;
  fileName: string;
  date: string;
  amount: number;
};

export default function Dashboard() {
    // Get user data and authentication state from Clerk
    const { user, isLoaded, isSignedIn } = useUser();

    // Local state to store receipts and loading status
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch user's receipts from the backend API once the user is signed in
    useEffect(() => {
        async function fetchReceipts() {
            setLoading(true); // Start loading state
            try {
                const res = await fetch("/api/receipts"); // Call receipts API
                if (!res.ok) throw new Error("Failed to fetch receipts"); // Handle failed requests
                const data = await res.json();
                setReceipts(data.receipts || []); // Store receipts in state
            } catch (error) {
                console.error(error); // Log error to console
            } finally {
                setLoading(false); // End loading state
            }
        }

        if (isSignedIn) {
            fetchReceipts(); // Only fetch if user is signed in
        }
    }, [isSignedIn]);

    // Show a loading screen while Clerk finishes initializing the user
    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black">
            {/* Navbar */}
            <nav className="flex justify-between items-center p-6 border-b">
                <div className="text-xl font-semibold">Finalyze AI</div>
                <div className="flex gap-6 items-center">
                    {/* Navigation Links */}
                    <Link href="/upload" className="hover:underline">Upload</Link>
                    <Link href="/details" className="hover:underline">Details</Link>
                    <Link href="/reports" className="hover:underline">Reports</Link>
                    <Link href="/insights" className="hover:underline">Insights</Link>

                    {/* Show user profile or login button based on auth status */}
                    {isSignedIn ? (
                        <UserButton /> // User avatar dropdown if signed in
                    ) : (
                        <SignInButton>
                            <Button variant="default">Login</Button>
                        </SignInButton>
                    )}
                </div>
            </nav>

            {/* Main dashboard content */}
            <main className="p-10 space-y-10">
                {isSignedIn ? (
                    <>
                        {/* Welcome message */}
                        <div>
                            <h1 className="text-4xl font-bold mb-1">
                                Welcome {user?.firstName || 'User'}
                            </h1>
                            <h2 className="text-2xl font-semibold">Dashboard</h2>
                        </div>

                        {/* Placeholder graph section */}
                        <div className="w-full h-64 bg-gray-100 rounded-xl shadow-inner" />

                        {/* AI Recap Section */}
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-full h-40 bg-gray-200 rounded shadow" />
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">AI-generated Recap of Expenses</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Body text for whatever you'd like to expand on the main point.
                                </p>
                                <div className="flex gap-3">
                                    <Button>Button</Button>
                                    <Button variant="secondary">Secondary button</Button>
                                </div>
                            </div>
                        </div>

                        {/* User Receipts List */}
                        {/* The receipts list has been moved to the Details page. */}
                    </>
                ) : (
                    // Message and sign-in prompt for unauthenticated users
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold mb-4">Welcome to Finalyze AI</h1>
                            <p className="text-xl text-gray-600 mb-8">
                                Please sign in to access your financial dashboard
                            </p>
                        </div>

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
