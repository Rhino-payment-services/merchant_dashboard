"use client";
import type { Metadata } from "next";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useState, useEffect } from 'react';
import MerchantAuthGuard from "@/components/auth/MerchantAuthGuard";
import { UserProfileProvider } from "./UserProfileProvider";
import { startTokenRefresh, stopTokenRefresh } from "@/lib/utils/token-refresh";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Start token refresh when layout mounts
  useEffect(() => {
    startTokenRefresh();
    
    // Cleanup on unmount
    return () => {
      stopTokenRefresh();
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <MerchantAuthGuard>
      <UserProfileProvider>
        <div className="w-full h-screen flex bg-gray-50 overflow-hidden">
          {/* Sidebar */}
          <Sidebar 
            isOpen={isMobileMenuOpen} 
            onClose={closeMobileMenu}
          />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Fixed Topbar */}
            <div className="fixed top-0 left-0 md:left-56 right-0 z-20">
              <Topbar 
                onMenuToggle={toggleMobileMenu}
                isMenuOpen={isMobileMenuOpen}
              />
            </div>
            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto pt-[72px] px-0 md:px-0 bg-gray-50 min-h-0">
              {children}
            </main>
          </div>
        </div>
      </UserProfileProvider>
    </MerchantAuthGuard>
  );
}