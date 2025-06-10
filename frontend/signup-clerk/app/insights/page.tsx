"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function InsightsPage() {
    const { user, isLoaded, isSignedIn } = useUser();

    // Wait for Clerk to load user session
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
                <Link href="/dashboard" className="text-xl font-semibold hover:underline">
                    Finalyze AI
                </Link>

                <div className="flex gap-6 items-center">
                    <Link href="/upload" className="hover:underline">Upload</Link>
                    <Link href="/details" className="hover:underline">Details</Link>
                    <Link href="/reports" className="hover:underline">Reports</Link>
                    <Link href="/insights" className="hover:underline font-bold text-blue-600">Insights</Link>

                    {isSignedIn ? (
                        <UserButton />
                    ) : (
                        <SignInButton>
                            <Button variant="default">Login</Button>
                        </SignInButton>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="p-10 space-y-10">
                {isSignedIn ? (
                    <>
                        {/* Page heading */}
                        <div>
                            <h1 className="text-4xl font-bold mb-1">Insights</h1>
                            <p className="text-gray-600 text-lg">
                                Gain smart AI-powered insights based on your receipts and expenses.
                            </p>
                        </div>

                        {/* Placeholder for AI insights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-100 rounded-lg p-6 shadow">
                                <h2 className="text-xl font-semibold mb-2">Top Spending Categories</h2>
                                <p className="text-sm text-gray-700">
                                    This section will show where you're spending the most each month.
                                </p>
                            </div>

                            <div className="bg-gray-100 rounded-lg p-6 shadow">
                                <h2 className="text-xl font-semibold mb-2">Savings Suggestions</h2>
                                <p className="text-sm text-gray-700">
                                    AI-generated tips to help you save money based on your spending patterns.
                                </p>
                            </div>

                            <div className="bg-gray-100 rounded-lg p-6 shadow md:col-span-2">
                                <h2 className="text-xl font-semibold mb-2">Trends & Predictions</h2>
                                <p className="text-sm text-gray-700">
                                    Predictive insights about future expenses or unusual trends over time.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    // Sign-in prompt if user is not logged in
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold mb-4">Welcome to Finalyze AI</h1>
                            <p className="text-xl text-gray-600 mb-8">
                                Please sign in to access personalized AI insights.
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
