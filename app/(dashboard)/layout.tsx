"use client";
import type { Metadata } from "next";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useEffect } from 'react';
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [router, status]);

  if (status === 'authenticated') {
    return (
      <UserProfileProvider>
        <div className="w-full h-screen flex bg-gray-50 overflow-hidden">
          {/* Fixed Sidebar */}
          <div className="hidden md:block fixed left-0 top-0 h-screen z-30">
            <Sidebar />
          </div>
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col md:ml-64 min-h-0">
            {/* Fixed Topbar */}
            <div className="fixed top-0 left-0 md:left-64 right-0 z-20">
              <Topbar />
            </div>
            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto pt-[72px] px-0 md:px-0 bg-gray-50 min-h-0">
              {children}
            </main>
          </div>
        </div>
      </UserProfileProvider>
    );
  } else if (status === 'loading') {
    return <div></div>;
  }
  // Optionally, handle other cases (shouldn't be needed)
  return null;
}
