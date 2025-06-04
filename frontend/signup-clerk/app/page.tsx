import Link from 'next/link';
import React from 'react';

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-4xl font-bold mb-8">Finalyze AI</h1>
            <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Go to Dashboard
            </Link>
        </div>
    );
}