"use client"; // Enables client-side features in a Next.js server component

// Clerk authentication hooks and UI components
import { SignInButton, useUser } from "@clerk/nextjs";

// Routing and UI libraries
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { useEffect, useRef, useState } from "react";
import { Line } from 'react-chartjs-2';
import { Button } from "../../components/ui/button";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
    const [trends, setTrends] = useState<any[]>([]);
    const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

    // Fetch user's receipts from the backend API once the user is signed in
    const fetchReceipts = async () => {
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
    };

    // Fetch summary for dashboard
    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/receipts/summary");
            if (!res.ok) throw new Error("Failed to fetch summary");
            const data = await res.json();
            setSummary(data.summary);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch recent receipts for dashboard
    const fetchRecentReceipts = async () => {
        try {
            const res = await fetch("/api/receipts/list");
            if (!res.ok) throw new Error("Failed to fetch receipts");
            const data = await res.json();
            setRecentReceipts(data.receipts || []);
        } catch (error) {
            console.error(error);
        }
    };

    // Fetch trends for dashboard
    const fetchTrends = async (view: 'daily' | 'weekly' | 'monthly' = 'monthly') => {
        try {
            const res = await fetch(`/api/receipts/trends?view=${view}`);
            if (!res.ok) throw new Error("Failed to fetch trends");
            const data = await res.json();
            setTrends(data.trends || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isSignedIn) {
            fetchReceipts();
            fetchSummary();
            fetchRecentReceipts();
            fetchTrends(trendView);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn, trendView]);

    // Upload handler for dashboard
    const handleDashboardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        setSuccess(false);
        try {
            const formData = new FormData();
            formData.append("file", files[0]);
            const res = await fetch("/api/receipts", {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                setSuccess(true);
                await fetchReceipts();
                await fetchSummary();
                await fetchRecentReceipts();
            }
        } catch (err) {
            // Optionally handle error
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Show a loading screen while Clerk finishes initializing the user
    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    // Show sign-in prompt if user is not authenticated
    if (!isSignedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <h1 className="text-4xl font-bold mb-4">Please sign in to view your dashboard</h1>
                <SignInButton>
                    <Button variant="default" className="px-8 py-3 text-lg">
                        Sign In to Continue
                    </Button>
                </SignInButton>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {user?.firstName || 'User'}!
                </h1>
                <p className="text-gray-600">
                    Here's an overview of your receipts and expenses.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Receipts</h3>
                    <p className="text-3xl font-bold text-gray-900">{summary?.receiptCount ?? 0}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Spent</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        ${typeof summary?.totalSpending === 'number' ? summary.totalSpending.toFixed(2) : '0.00'}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Top Category</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        {summary?.categoryTotals ? Object.entries(summary.categoryTotals as any).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A' : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Monthly Spending Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Spending Trend</h2>
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all ${trendView === 'daily' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                            onClick={() => setTrendView('daily')}
                        >
                            Daily
                        </button>
                        <button
                            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all ${trendView === 'weekly' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                            onClick={() => setTrendView('weekly')}
                        >
                            Weekly
                        </button>
                        <button
                            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all ${trendView === 'monthly' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
                            onClick={() => setTrendView('monthly')}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
                {trends.length === 0 ? (
                    <div className="text-gray-500">No trend data yet.</div>
                ) : (
                    <Line
                        data={{
                            labels: trends.map((t: any) => t.label || t.month || t.week || t.day),
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
                                x: { title: { display: true, text: trendView.charAt(0).toUpperCase() + trendView.slice(1) } },
                                y: { title: { display: true, text: 'Total Spent ($)' }, beginAtZero: true },
                            },
                        }}
                        height={80}
                    />
                )}
            </div>

            {/* Recent Receipts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Receipts</h2>
                </div>
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading receipts...</div>
                ) : recentReceipts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <p className="mb-4">No receipts found. Upload some receipts to get started!</p>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleDashboardUpload}
                            className="hidden"
                        />
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? "Uploading..." : "Upload Receipt"}
                        </Button>
                        {success && <div className="mt-4 text-green-600 font-semibold">Receipt uploaded successfully!</div>}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {recentReceipts.slice(0, 5).map((receipt) => (
                            <div key={receipt._id || receipt.fileName} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">{receipt.fileName}</h3>
                                        <p className="text-sm text-gray-500">{receipt.fields?.date || (receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : '')}</p>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">${receipt.fields?.amount || '0.00'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
