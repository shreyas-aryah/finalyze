"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function InsightsPage() {
    const { isLoaded, isSignedIn } = useUser();
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchInsights() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/receipts/summary");
                if (!res.ok) throw new Error("Failed to fetch insights");
                const data = await res.json();
                setInsights(data.summary);
            } catch (err: any) {
                setError(err.message || "Unknown error");
            } finally {
                setLoading(false);
            }
        }
        if (isSignedIn) fetchInsights();
    }, [isSignedIn]);

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
                        ) : insights?.categoryTotals && Object.keys(insights.categoryTotals).length > 0 ? (
                            <ul className="text-gray-700 text-sm space-y-1">
                                {Object.entries(insights.categoryTotals)
                                    .sort((a: any, b: any) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([cat, amt]) => (
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
                        ) : insights?.categoryTotals && Object.keys(insights.categoryTotals).length > 0 ? (
                            <ul className="text-gray-700 text-sm space-y-1">
                                {Object.entries(insights.categoryTotals)
                                    .sort((a: any, b: any) => b[1] - a[1])
                                    .slice(0, 1)
                                    .map(([cat]) => (
                                        <li key={cat}>
                                            Try reducing your spending in <span className="font-medium">{cat}</span> for more savings!
                                        </li>
                                    ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">Upload more receipts to get personalized tips!</p>
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
                    ) : insights ? (
                        <ul className="text-gray-700 text-sm space-y-1">
                            <li>Your total spending so far: <span className="font-medium">${insights.totalSpending?.toFixed(2) || 0}</span></li>
                            <li>You have <span className="font-medium">{insights.receiptCount || 0}</span> receipts uploaded.</li>
                        </ul>
                    ) : (
                        <p className="text-gray-500">Upload more receipts to see trends!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
