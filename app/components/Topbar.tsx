"use client";
import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeCustomerId } from "@/app/lib/mockBackend";
import { useRouter } from "next/navigation";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useUserProfile } from "../(dashboard)/UserProfileProvider";
import { useSession } from "next-auth/react";
import { Menu, X, Building2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const { data: session, update: updateSession } = useSession();
  const { profile, loading } = useUserProfile();
  const { user, logout } = useMerchantAuth();
  const merchants = (session?.user as any)?.merchants || [];
  const currentMerchantCode = (session?.user as any)?.merchantCode;
  const profileMerchantCode = profile?.merchant_code || profile?.merchantCode;
  const effectiveMerchantCode = currentMerchantCode || profileMerchantCode;

  // Optimistic state: set immediately on click so the UI doesn't snap back
  const [pendingMerchantCode, setPendingMerchantCode] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  // Resolve displayed merchant using pending code first (optimistic), then session
  const displayedMerchantCode = pendingMerchantCode || effectiveMerchantCode;
  const findMerchant = (code: string | null) =>
    code
      ? merchants.find((m: any) => {
          const mCode = String(m?.merchantCode || '').trim();
          const eCode = String(code || '').trim();
          return mCode === eCode || mCode === eCode.padStart(4, '0') || eCode === mCode.padStart(4, '0');
        })
      : merchants[0];
  const displayedMerchant = findMerchant(displayedMerchantCode);

  // While switching, use merchant array name (profile is still stale); otherwise prefer profile
  const businessDisplayName = switching
    ? (displayedMerchant?.businessTradeName || (displayedMerchantCode ? `Business · ${displayedMerchantCode}` : 'Select business'))
    : (profile?.merchant_names || profile?.businessTradeName || displayedMerchant?.businessTradeName || (displayedMerchantCode ? `Business · ${displayedMerchantCode}` : 'Select business'));

  const handleSwitchMerchant = async (merchantCode: string) => {
    const code = String(merchantCode || '').trim();
    if (!code || code === effectiveMerchantCode || switching) return;
    try {
      setSwitching(true);
      setPendingMerchantCode(code); // optimistically show new name right away
      await updateSession({ merchantCode: code });
      toast.success("Company switched");
      // Hard navigate so the new session is guaranteed to be picked up everywhere
      window.location.href = '/';
    } catch {
      setPendingMerchantCode(null); // rollback on failure
      setSwitching(false);
      toast.error("Failed to switch company");
    }
  };

  const handleLogout = async () => {
    try {
      // Clear any local storage/session storage
      removeCustomerId();
      
      // Sign out using merchant auth
      logout();
      
      // Force redirect to login page
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: force redirect even if logout fails
      window.location.href = '/auth/login';
    }
  };

  // Set default date range to current year (January 1st to December 31st)
  const [from, setFrom] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-01-01`;
  });

  const [to, setTo] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  });

  return (
    <header className="flex items-center justify-between px-4 py-4 bg-white">
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="text-gray-600 hover:text-gray-900"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Business selector dropdown (matches staging) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={switching}>
          <button
            type="button"
            disabled={switching}
            className="flex items-center gap-2 min-w-0 max-w-[200px] sm:max-w-[260px] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-left focus:outline-none focus:ring-2 focus:ring-main-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {switching ? (
              <Loader2 className="w-4 h-4 text-main-600 flex-shrink-0 animate-spin" />
            ) : (
              <Building2 className="w-4 h-4 text-main-600 flex-shrink-0" />
            )}
            <span className="truncate text-sm font-medium text-gray-900">
              {loading && !switching ? '...' : businessDisplayName}
            </span>
            {!switching && <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-auto" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 mt-2">
          {merchants.length > 0 ? (
            merchants.map((m: any) => {
              const mCode = String(m?.merchantCode || '').trim();
              const isActive = mCode === String(displayedMerchantCode || '').trim() ||
                mCode === String(displayedMerchantCode || '').trim().padStart(4, '0');
              return (
                <DropdownMenuItem
                  key={m.merchantCode || m.id}
                  onClick={() => handleSwitchMerchant(m.merchantCode ?? m.id)}
                  className={`cursor-pointer ${isActive ? 'bg-main-50 font-semibold' : ''}`}
                >
                  <Building2 className={`w-4 h-4 mr-2 ${isActive ? 'text-main-600' : 'text-gray-400'}`} />
                  <span className="truncate">{m.businessTradeName || m.merchantCode || 'Merchant'}</span>
                  {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-main-600 flex-shrink-0" />}
                </DropdownMenuItem>
              );
            })
          ) : (
            <Link href="/auth/select-merchant">
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                <Building2 className="w-4 h-4" />
                Switch Merchant
              </DropdownMenuItem>
            </Link>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
                  {loading 
                    ? '...' 
                    : (() => {
                        const ownerName = profile?.owner_name || user?.profile?.firstName;
                        const firstInitial = ownerName?.split(" ")[0]?.[0] || user?.profile?.firstName?.[0] || "U";
                        const secondInitial = ownerName?.split(" ")[1]?.[0] || user?.profile?.lastName?.[0] || ownerName?.split(" ")[0]?.[1] || "";
                        return `${firstInitial}${secondInitial}`.toUpperCase() || "U";
                      })()
                  }
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 mt-2">
            {merchants.length > 1 && (
              <Link href="/auth/select-merchant">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Switch Merchant
                </DropdownMenuItem>
              </Link>
            )}
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
