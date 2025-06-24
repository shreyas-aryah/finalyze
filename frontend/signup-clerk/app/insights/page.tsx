"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import {
    ArcElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from "react";
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

export default function InsightsPage() {
    const { isLoaded, isSignedIn } = useUser();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [qaQuestion, setQaQuestion] = useState("");
    const [qaAnswer, setQaAnswer] = useState<string | null>(null);
    const [qaLoading, setQaLoading] = useState(false);
    const [qaError, setQaError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/receipts/summary");
                if (!res.ok) throw new Error("Failed to fetch summary");
                const data = await res.json();
                setSummary(data.summary);
            } catch (err: unknown) {
                let msg = "Unknown error";
                if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
                    msg = (err as any).message;
                } else if (typeof err === "string") {
                    msg = err;
                }
                setError(msg);
            } finally {
                setLoading(false);
            }
        }
        async function fetchTrends() {
            try {
                const res = await fetch("/api/receipts/trends?view=monthly");
                if (!res.ok) throw new Error("Failed to fetch trends");
                const data = await res.json();
                setTrends(data.trends || []);
            } catch (err: unknown) {
                // ignore for now
            }
        }
        if (isSignedIn) {
            fetchSummary();
            fetchTrends();
        }
    }, [isSignedIn]);

    // Helper: Get top 3 spending categories
    function getTopCategories() {
        if (!summary?.categoryTotals) return [];
        return Object.entries(summary.categoryTotals)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 3);
    }

    // Helper: Generate savings suggestions based on top categories and budgets
    function getSavingsSuggestions() {
        if (!summary?.categoryTotals) return [];
        const top = getTopCategories();
        if (top.length === 0) return ["Upload receipts to get personalized tips!"];
        const suggestions = [];
        // Suggest a budget for the top category (10% less than current)
        const topCat = top[0];
        const topCatBudget = Math.round(topCat[1] * 0.9);
        suggestions.push(
            `Set a monthly budget of $${topCatBudget} for '${topCat[0]}' (10% less than your current spending of $${Number(topCat[1]).toFixed(2)}).`
        );
        // Suggest a budget for the second category if it exists
        if (top[1]) {
            const secondCatBudget = Math.round(top[1][1] * 0.9);
            suggestions.push(
                `Try limiting '${top[1][0]}' to $${secondCatBudget} per month.`
            );
        }
        // Show potential savings if they reduce top category by 20%
        const save20 = Math.round(topCat[1] * 0.2);
        suggestions.push(
            `Reducing your '${topCat[0]}' spending by 20% could save you $${save20} per month.`
        );
        return suggestions;
    }

    // Helper: Generate smarter trends and predictions
    function getTrends() {
        if (!summary) return ["Upload more receipts to see trends!"];
        const trendsArr = [];
        const total = summary.totalSpending || 0;
        const months = trends.length;
        const avgMonthly = months > 0 ? total / months : 0;
        trendsArr.push(`Your average monthly spending: $${avgMonthly.toFixed(2)}`);
        // Projected year-end total
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const projected = avgMonthly * 12;
        trendsArr.push(`If you keep this pace, you'll spend ~$${projected.toFixed(0)} this year.`);
        // Check for increasing trend
        if (trends.length > 2) {
            const last = trends[trends.length - 1].total;
            const prev = trends[trends.length - 2].total;
            if (last > prev * 1.1) {
                trendsArr.push("Warning: Your spending increased by more than 10% compared to last month.");
            }
        }
        trendsArr.push(`You have ${summary.receiptCount} receipts uploaded.`);
        return trendsArr;
    }

    // --- Handler for Q&A search ---
    async function handleQaSearch(e: React.FormEvent) {
        e.preventDefault();
        setQaLoading(true);
        setQaError(null);
        setQaAnswer(null);
        try {
            const res = await fetch("/api/receipts/qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: qaQuestion }),
            });
            const data = await res.json();
            if (res.ok && data.answer) {
                setQaAnswer(data.answer);
            } else {
                setQaError(data.error || "No answer found.");
            }
        } catch (err) {
            setQaError("Failed to get answer.");
        } finally {
            setQaLoading(false);
        }
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
            {/* AI Q&A Search Bar */}
            <motion.div
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                <form onSubmit={handleQaSearch} className="flex flex-col md:flex-row gap-4 items-center">
                    <input
                        type="text"
                        className="flex-1 border border-gray-300 rounded px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ask a question about your spending (e.g. 'How much did I spend on food last month?')"
                        value={qaQuestion}
                        onChange={e => setQaQuestion(e.target.value)}
                        required
                    />
                    <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-lg"
                        disabled={qaLoading || !qaQuestion.trim()}
                    >
                        {qaLoading ? 'Thinking...' : 'Ask AI'}
                    </Button>
                </form>
                <AnimatePresence>
                    {qaLoading && (
                        <motion.div className="mt-4 text-blue-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <span className="animate-pulse">AI is thinking...</span>
                        </motion.div>
                    )}
                    {qaAnswer && !qaLoading && (
                        <motion.div
                            className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-lg text-blue-900 shadow"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <b>AI Answer:</b> {qaAnswer}
                        </motion.div>
                    )}
                    {qaError && !qaLoading && (
                        <motion.div className="mt-4 text-red-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {qaError}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights</h1>
                <p className="text-gray-600 mb-8">Gain smart AI-powered insights based on your receipts and expenses.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Breakdown Pie Chart */}
                    <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center">
                        <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
                        {summary?.categoryTotals && Object.keys(summary.categoryTotals).length > 0 ? (
                            <Pie
                                data={{
                                    labels: Object.keys(summary.categoryTotals),
                                    datasets: [
                                        {
                                            data: Object.values(summary.categoryTotals),
                                            backgroundColor: [
                                                '#2563eb', '#f59e42', '#10b981', '#f43f5e', '#a78bfa', '#fbbf24', '#38bdf8', '#6366f1', '#f87171', '#34d399',
                                            ],
                                            borderWidth: 1,
                                        },
                                    ],
                                }}
                                options={{
                                    plugins: {
                                        legend: { position: 'bottom' },
                                    },
                                    animation: { animateRotate: true, animateScale: true },
                                }}
                                height={180}
                            />
                        ) : (
                            <p className="text-gray-500">No categories found.</p>
                        )}
                    </div>
                    {/* Savings Suggestions */}
                    <motion.div
                        className="bg-gray-50 rounded-lg p-6 flex flex-col justify-between"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <h2 className="text-lg font-semibold mb-4">Savings Suggestions</h2>
                        {loading ? (
                            <motion.p className="text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                Loading...
                            </motion.p>
                        ) : error ? (
                            <motion.p className="text-red-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {error}
                            </motion.p>
                        ) : (
                            <ul className="text-gray-700 text-base space-y-2 list-disc list-inside">
                                <AnimatePresence>
                                    {getSavingsSuggestions().map((tip, i) => (
                                        <motion.li
                                            key={i}
                                            initial={{ opacity: 0, x: 30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -30 }}
                                            transition={{ duration: 0.4, delay: i * 0.08 }}
                                        >
                                            {tip}
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                            </ul>
                        )}
                    </motion.div>
                </div>
                {/* Spending Trend Line Chart */}
                <div className="bg-gray-50 rounded-lg p-6 mt-8">
                    <h2 className="text-lg font-semibold mb-4">Spending Trend (Monthly)</h2>
                    {trends.length === 0 ? (
                        <div className="text-gray-500">No trend data yet.</div>
                    ) : (
                        <Line
                            data={{
                                labels: trends.map((t: any) => t.label || t.month),
                                datasets: [
                                    {
                                        label: 'Total Spent',
                                        data: trends.map((t: any) => t.total),
                                        borderColor: '#2563eb',
                                        backgroundColor: 'rgba(37,99,235,0.1)',
                                        tension: 0.3,
                                        fill: true,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                    },
                                ],
                            }}
                            options={{
                                responsive: true,
                                plugins: {
                                    legend: { display: false },
                                    title: { display: false },
                                    tooltip: { mode: 'index', intersect: false },
                                },
                                scales: {
                                    x: { title: { display: true, text: 'Month' } },
                                    y: { title: { display: true, text: 'Total Spent ($)' }, beginAtZero: true },
                                },
                            }}
                            height={80}
                        />
                    )}
                </div>
                {/* Trends & Predictions */}
                <motion.div
                    className="bg-gray-50 rounded-lg p-6 mt-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                >
                    <h2 className="text-lg font-semibold mb-2">Trends & Predictions</h2>
                    {loading ? (
                        <motion.p className="text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            Loading...
                        </motion.p>
                    ) : error ? (
                        <motion.p className="text-red-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {error}
                        </motion.p>
                    ) : (
                        <ul className="text-gray-700 text-base space-y-2 list-disc list-inside">
                            <AnimatePresence>
                                {getTrends().map((trend, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -30 }}
                                        transition={{ duration: 0.4, delay: i * 0.08 }}
                                    >
                                        {trend}
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                        </ul>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
