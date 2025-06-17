import {
    ClerkProvider,
    UserButton
} from '@clerk/nextjs'
import { type Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import React from 'react'
import './globals.css'

// Configure Google Fonts with CSS variables for consistent typography
// Geist Sans - Primary font for body text and UI elements
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

// Geist Mono - Monospace font for code blocks and technical content
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// SEO metadata configuration for the application
export const metadata: Metadata = {
  title: 'Finalyze AI',
  description: 'AI-powered financial analysis',
}

/**
* Root Layout Component
*
* This layout wraps the entire application and provides:
* 1. Clerk authentication context to all child components
* 2. Global font variables for consistent typography
* 3. Base HTML structure for the application
* 
* @param children - All page components will be rendered here
*/
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body 
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
          suppressHydrationWarning
        >
          <div className="min-h-screen flex flex-col">
            {/*
              Modern Navigation Bar
              - Increased height (h-20)
              - Larger logo (text-3xl font-extrabold)
              - Larger navigation links (text-lg, px-4 py-3)
              - More spacing between logo and links (sm:ml-12 sm:space-x-6)
              - Larger user avatar (w-12 h-12)
            */}
            <nav className="bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Increased nav bar height */}
                <div className="flex justify-between h-20">
                  <div className="flex items-center">
                    {/* Larger logo */}
                    <Link href="/" className="flex items-center space-x-2">
                      <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                        Finalyze
                      </span>
                    </Link>
                    {/* More spacing between logo and links, larger links */}
                    <div className="hidden sm:ml-12 sm:flex sm:space-x-6">
                      <Link 
                        href="/dashboard" 
                        className="inline-flex items-center px-4 py-3 text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link 
                        href="/details" 
                        className="inline-flex items-center px-4 py-3 text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        Details
                      </Link>
                      <Link 
                        href="/upload" 
                        className="inline-flex items-center px-4 py-3 text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        Upload
                      </Link>
                      <Link 
                        href="/insights" 
                        className="inline-flex items-center px-4 py-3 text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        Insights
                      </Link>
                    </div>
                  </div>
                  {/* Larger user avatar, vertically centered */}
                  <div className="flex items-center h-full space-x-4">
                    {/* Settings icon */}
                    <Link href="/settings" className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors" aria-label="Settings">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-500 hover:text-blue-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Link>
                    <UserButton 
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-12 h-12"
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <p className="text-center text-sm text-gray-500">
                  © {new Date().getFullYear()} Finalyze. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}