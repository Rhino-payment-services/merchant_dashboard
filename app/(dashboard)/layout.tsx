"use client";
import type { Metadata } from "next";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UserProfileProvider } from "./UserProfileProvider";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [router, status]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Show loading spinner while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-main-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-main-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show dashboard if authenticated
  if (status === 'authenticated') {
    return (
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
    );
  }

  // Fallback
  return null;
}
