import {
  ClerkProvider
} from '@clerk/nextjs'
import { type Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // ClerkProvider: Wraps the entire app to provide authentication context
    // This makes useUser(), SignedIn, SignedOut, etc. available throughout the app
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {/* 
            Body classes breakdown:
            - geistSans.variable: Makes --font-geist-sans CSS variable available
            - geistMono.variable: Makes --font-geist-mono CSS variable available  
            - antialiased: Tailwind class for smooth font rendering
          */}

          {/* 
            Children will be rendered here - this includes all pages
            No global header/navigation is included here, allowing each page
            to have complete control over its layout and authentication UI
          */}
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}