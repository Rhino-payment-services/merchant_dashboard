"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono,Outfit } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from './components/ReactQueryProvider';
import React from 'react';
import { Toaster } from 'sonner';
import { SessionProvider } from "next-auth/react";
import Head from 'next/head';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const available = true
  return (
    <html lang="en">
      <Head>
        <title>RukaPay Merchant Dashboard</title>
        <meta name="description" content="RukaPay Merchant Dashboard - Manage your payments, transactions, and business operations" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#08163d" />
      </Head>
      <body
        className={`${outfit.className}`}
      >
        {!available ? (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              <div className="mb-8">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 bg-main rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                
                {/* Main Content */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Service Unavailable
                </h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  This service is not available at the moment. 
                  Please contact customer support for more information.
                </p>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button className="w-full bg-main hover:bg-main-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200">
                    Contact Customer  Support <br />
                    <span className="text-sm text-gray-500">0200 244410</span>
                  </button>
                
                </div>
                
                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Need help? Contact support at{' '}
                    <a href="mailto:support@rukapay.com" className="text-main hover:underline">
                      techsupport@rukapay.co.ug
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
 
        <SessionProvider>
          <ReactQueryProvider>
            {children}
            <Toaster position="top-center" richColors />
          </ReactQueryProvider>
        </SessionProvider>
        )}
      </body>
    </html>
  );
}
