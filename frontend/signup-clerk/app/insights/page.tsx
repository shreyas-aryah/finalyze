"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function InsightsPage() {
    const { isLoaded, isSignedIn } = useUser();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);
            setError(null);
            try {
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
            top[1] ? `Try setting a budget for '${top[1][0]}' as well.` : null
        ].filter(Boolean);
    }

    // Helper: Generate trends and predictions
    function getTrends() {
        if (!summary) return ["Upload more receipts to see trends!"];
        return [
            `Your total spending so far: $${summary.totalSpending?.toFixed(2) || 0}`,
            `You have ${summary.receiptCount} receipts uploaded.`
        ];
    }

    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Loading...
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <h1 className="text-4xl font-bold mb-4">Please sign in to view insights</h1>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights</h1>
                <p className="text-gray-600 mb-8">Gain smart AI-powered insights based on your receipts and expenses.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Spending Categories */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-2">Top Spending Categories</h2>
                        {loading ? (
                            <p className="text-gray-500">Loading...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : summary?.categoryTotals && Object.keys(summary.categoryTotals).length > 0 ? (
                            <ul className="text-gray-700 text-sm space-y-1">
                                {getTopCategories().map(([cat, amt]) => (
                                    <li key={cat}>
                                        <span className="font-medium">{cat}:</span> ${Number(amt).toFixed(2)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No categories found.</p>
                        )}
                    </div>
                    {/* Savings Suggestions */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-2">Savings Suggestions</h2>
                        {loading ? (
                            <p className="text-gray-500">Loading...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : (
                            <ul className="text-gray-700 text-sm space-y-1">
                                {getSavingsSuggestions().map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {/* Trends & Predictions */}
                <div className="bg-gray-50 rounded-lg p-6 mt-6">
                    <h2 className="text-lg font-semibold mb-2">Trends & Predictions</h2>
                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : (
                        <ul className="text-gray-700 text-sm space-y-1">
                            {getTrends().map((trend, i) => (
                                <li key={i}>{trend}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
