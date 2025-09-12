"use client";
import React from "react";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { removeCustomerId } from "@/app/lib/mockBackend";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUserProfile } from "../(dashboard)/UserProfileProvider";
import { Menu, X } from "lucide-react";

const mockNotifications = [
  {
    id: 1,
    title: "Payment Received",
    description: "You received 500 USD from John Doe.",
    time: "2 min ago",
  },
  {
    id: 2,
    title: "Withdrawal Successful",
    description: "Your withdrawal of 200 USD was successful.",
    time: "1 hour ago",
  },
  {
    id: 3,
    title: "New Message",
    description: "Support replied to your ticket.",
    time: "Yesterday",
  },
];

interface TopbarProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export default function Topbar({ onMenuToggle, isMenuOpen }: TopbarProps) {
  const router = useRouter();
  const handleLogout = () => {
    removeCustomerId();
    router.replace("/auth/login");
  };

  const { data: userData, status } = useSession();
  const { profile, loading } = useUserProfile();

  return (
    <header className="flex items-center justify-between px-4 py-4 bg-white">
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <Button
          onClick={onMenuToggle}
            className="text-gray-600 cursor-pointer hover:text-gray-900 w-10 h-10" 
        >
          {isMenuOpen ? (
            <X className="w-10 h-10" color="white" />
          ) : (
            <Menu className="w-10 h-10" color="white" />
          )}
        </Button>
      </div>

      {/* Search Bar - Hidden on mobile when menu is open */}
      {/* <div className={`flex-1 ${isMenuOpen ? 'hidden md:block' : 'block'}`}>
        <input
          type="text"
          placeholder="Search anything ..."
          className="w-full max-w-xs px-4 py-2 rounded-lg border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-main-200"
        />
      </div> */}

      <div className="flex items-center gap-4">
        {/* Notification icon */}
        <Link href="/notification">
          <Button variant="ghost" size="icon" className="relative">
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-500"
              viewBox="0 0 24 24"
            >
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </Button>
        </Link>
        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 focus:outline-none cursor-pointer">
              <span className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300">
                <span className="font-medium text-gray-700 uppercase">
                  {`${
                    profile?.profile?.merchant_names?.split(" ")[0]?.[0] || ""
                  }${
                    profile?.profile?.merchant_names?.split(" ")[1]?.[0] || ""
                  }`}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 mt-2">
            <Link href="/profile">
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem>Setting</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 cursor-pointer"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
