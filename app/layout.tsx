"use client"
import type { Metadata } from "next";
import { Geist, Geist_Mono,Outfit } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from './components/ReactQueryProvider';
import React from 'react';
import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';

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
  return (
    <html lang="en">
      <body
        className={`${outfit.className}`}
      >
        <SessionProvider>
          <ReactQueryProvider>
            {children}
            <Toaster position="top-center" richColors />
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
