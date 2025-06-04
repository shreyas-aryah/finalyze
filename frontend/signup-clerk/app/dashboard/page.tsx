"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "../../components/ui/button";

export default function Dashboard() {
    const { user } = useUser();

    return (
        <div className="min-h-screen bg-white text-black">
            {/* Navbar */}
            <nav className="flex justify-between items-center p-6 border-b">
                <div className="text-xl font-semibold">Finalyze AI</div>
                <div className="flex gap-6 items-center">
                    <a href="#" className="hover:underline">Upload</a>
                    <a href="#" className="hover:underline">Details</a>
                    <a href="#" className="hover:underline">Reports</a>
                    <a href="#" className="hover:underline">Insights</a>
                    <Button variant="default">Login</Button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="p-10 space-y-10">
                <div>
                    <h1 className="text-4xl font-bold mb-1">Welcome {user?.firstName}</h1>
                    <h2 className="text-2xl font-semibold">Dashboard</h2>
                </div>

                {/* Placeholder for graph */}
                <div className="w-full h-64 bg-gray-100 rounded-xl shadow-inner" />

                {/* AI Recap Card */}
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
            </main>
        </div>
    );
}
