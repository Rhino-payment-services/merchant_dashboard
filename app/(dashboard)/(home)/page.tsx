"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerId } from "@/app/lib/mockBackend";
import StatCards from "@/app/components/StatCards";
import StatsOverviewChart from "@/app/components/StatsOverviewChart";
import RecentTransactions from "@/app/components/RecentTransactions";
import TopLocationMap from "@/app/components/TopLocationMap";
import QRCodeButton from "@/app/components/QRCodeButton";
import { useUserProfile } from "../UserProfileProvider";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const { profile, loading, error, refetch, isRefetching } = useUserProfile();
  // Log the profile for debugging
  console.log("Dashboard Home profile:", profile);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Dashboard data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh dashboard data');
    }
  };

  // Mock merchant data - in real app this would come from API/context

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 p-4 md:p-8 space-y-6">
        {/* QR Code Button - Prominent placement */}
        <div className="flex flex-row justify-between">
          <div className="flex flex-row gap-[10px] items-center">
            <span className="font-[800] text-[18px] text-[#08163d]">Welcome to </span>
            <span>{profile?.profile.merchant_names}</span>
            {isRefetching && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || isRefetching}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : isRefetching ? 'Refreshing...' : 'Refresh'}
            </Button>
            {!loading && profile?.profile?.merchant_names && (
              <QRCodeButton
                merchantCode={profile.profile.merchantId}
                merchantName={profile.profile.merchant_names}
              />
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="relative">
          {isRefetching && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Updating dashboard...</span>
              </div>
            </div>
          )}
          <StatCards />
        </div>
        <div className="grid grid-cols-1  gap-6">
          {/* Stats Overview Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-4">
            <StatsOverviewChart />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-4">
            <RecentTransactions 
              transactions={
                profile?.profile?.merchant_transactions
                  ?.sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime())
                  .slice(0, 5) || []
              } 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
