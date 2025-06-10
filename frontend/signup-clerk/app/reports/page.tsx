"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function ReportsPage() {
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

                        {/* Placeholder for future report list */}
                        <div className="space-y-6">
                            <div className="bg-gray-100 rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-semibold mb-2">Monthly Expense Report</h2>
                                <p className="text-sm text-gray-700">
                                    This section will include a summary of your expenses by category.
                                </p>
                            </div>

                            <div className="bg-gray-100 rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-semibold mb-2">Spending Trends</h2>
                                <p className="text-sm text-gray-700">
                                    Charts or visualizations will show how your spending changes over time.
                                </p>
                            </div>
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
