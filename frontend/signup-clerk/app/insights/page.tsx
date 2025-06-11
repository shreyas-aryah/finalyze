"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";

export default function InsightsPage() {
    // Clerk authentication and user state
    const { user, isLoaded, isSignedIn } = useUser();
    // Local state for summary, loading, and error
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch summary for AI insights
    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);
            setError(null);
            try {
                // Call the summary API endpoint
                const res = await fetch("/api/receipts/summary");
                if (!res.ok) throw new Error("Failed to fetch summary");
                const data = await res.json();
                setSummary(data.summary);
            } catch (err: any) {
                setError(err.message || "Unknown error");
            } finally {
                setLoading(false);
            }
        }
        if (isSignedIn) fetchSummary();
    }, [isSignedIn]);

    // Show loading screen while Clerk loads user session
    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    // Helper: Get top 3 spending categories
    function getTopCategories() {
        if (!summary?.categoryTotals) return [];
        return Object.entries(summary.categoryTotals)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 3);
    }

    // Helper: Generate savings suggestions based on top categories
    function getSavingsSuggestions() {
        if (!summary?.categoryTotals) return [];
        const top = getTopCategories();
        if (top.length === 0) return ["Upload receipts to get personalized tips!"];
        return [
            `Consider reducing spending in '${top[0][0]}' to save more each month.`,
            `Try setting a budget for '${top[0][0]}' and '${top[1]?.[0] || top[0][0]}'.`
        ];
    }

    // Helper: Generate trends and predictions
    function getTrends() {
        if (!summary) return ["Upload more receipts to see trends!"];
        return [
            `Your total spending so far: $${summary.totalSpending?.toFixed(2) || 0}`,
            `You have ${summary.receiptCount} receipts uploaded.`
        ];
    }

    return (
        <div className="min-h-screen bg-white text-black">
            {/* Navbar for navigation */}
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
                        {/* AI insights: Top categories, savings suggestions, trends */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-100 rounded-lg p-6 shadow">
                                <h2 className="text-xl font-semibold mb-2">Top Spending Categories</h2>
                                {loading ? <p>Loading...</p> : error ? <p className="text-red-600">{error}</p> : (
                                    <ul className="text-sm text-gray-700">
                                        {getTopCategories().map(([cat, amt]: any) => (
                                            <li key={cat} className="flex justify-between border-b py-1">
                                                <span>{cat}</span>
                                                <span>${amt.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="bg-gray-100 rounded-lg p-6 shadow">
                                <h2 className="text-xl font-semibold mb-2">Savings Suggestions</h2>
                                {loading ? <p>Loading...</p> : error ? <p className="text-red-600">{error}</p> : (
                                    <ul className="text-sm text-gray-700">
                                        {getSavingsSuggestions().map((tip, i) => (
                                            <li key={i}>{tip}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="bg-gray-100 rounded-lg p-6 shadow md:col-span-2">
                                <h2 className="text-xl font-semibold mb-2">Trends & Predictions</h2>
                                {loading ? <p>Loading...</p> : error ? <p className="text-red-600">{error}</p> : (
                                    <ul className="text-sm text-gray-700">
                                        {getTrends().map((trend, i) => (
                                            <li key={i}>{trend}</li>
                                        ))}
                                    </ul>
                                )}
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
