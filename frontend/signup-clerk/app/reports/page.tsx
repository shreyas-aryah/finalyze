"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Button } from "../../components/ui/button";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ReportsPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trends, setTrends] = useState<any[]>([]);

    // Fetch report summary from backend
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

    // Fetch trends data
    useEffect(() => {
        async function fetchTrends() {
            if (!isSignedIn) return;
            try {
                const res = await fetch("/api/receipts/trends");
                if (!res.ok) throw new Error("Failed to fetch trends");
                const data = await res.json();
                setTrends(data.trends || []);
            } catch (err) {
                setTrends([]);
            }
        }
        fetchTrends();
    }, [isSignedIn]);

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
                    <Link href="/reports" className="hover:underline font-bold text-blue-600">Reports</Link>
                    <Link href="/insights" className="hover:underline">Insights</Link>

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
                        {/* Page header */}
                        <div>
                            <h1 className="text-4xl font-bold mb-1">Reports</h1>
                            <p className="text-gray-600 text-lg">View auto-generated summaries of your uploaded receipts.</p>
                        </div>

                        {/* Real report data */}
                        <div className="space-y-6">
                            {loading ? (
                                <div>Loading report...</div>
                            ) : error ? (
                                <div className="text-red-600">{error}</div>
                            ) : summary ? (
                                <>
                                    <div className="bg-gray-100 rounded-lg p-6 shadow-sm">
                                        <h2 className="text-xl font-semibold mb-2">Total Spending</h2>
                                        <p className="text-2xl font-bold text-blue-700 mb-2">${summary.totalSpending?.toFixed(2) || 0}</p>
                                        <p className="text-sm text-gray-700">Total number of receipts: {summary.receiptCount}</p>
                                    </div>

                                    <div className="bg-gray-100 rounded-lg p-6 shadow-sm">
                                        <h2 className="text-xl font-semibold mb-2">Spending by Category</h2>
                                        <ul className="text-sm text-gray-700">
                                            {Object.entries(summary.categoryTotals || {}).map(([cat, amt]: any) => (
                                                <li key={cat} className="flex justify-between border-b py-1">
                                                    <span>{cat}</span>
                                                    <span>${amt.toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {trends.length > 0 && (
                                        <div className="bg-gray-100 rounded-lg p-6 shadow-sm">
                                            <h2 className="text-xl font-semibold mb-2">Spending Trends Over Time</h2>
                                            <Line
                                                data={{
                                                    labels: trends.map((t: any) => t.month),
                                                    datasets: [
                                                        {
                                                            label: "Total Spending",
                                                            data: trends.map((t: any) => t.total),
                                                            borderColor: "#2563eb",
                                                            backgroundColor: "rgba(37,99,235,0.2)",
                                                            tension: 0.4,
                                                        },
                                                    ],
                                                }}
                                                options={{
                                                    responsive: true,
                                                    plugins: {
                                                        legend: { display: false },
                                                        title: { display: false },
                                                    },
                                                    scales: {
                                                        y: { beginAtZero: true },
                                                    },
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>No report data found.</div>
                            )}
                        </div>
                    </>
                ) : (
                    // Sign-in prompt for unauthenticated users
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold mb-4">Welcome to Finalyze AI</h1>
                            <p className="text-xl text-gray-600 mb-8">
                                Please sign in to access your financial reports.
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
