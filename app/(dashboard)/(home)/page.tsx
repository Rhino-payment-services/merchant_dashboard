"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
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
import { getMyTransactions, Transaction } from "@/lib/api/wallet.api";

export default function Home() {
  const router = useRouter();
  const { profile, loading, error, refetch, isRefetching } = useUserProfile();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Log the profile for debugging
  console.log("Dashboard Home profile:", profile);

  // Fetch recent transactions
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const data = await getMyTransactions({ limit: 5 });
        setRecentTransactions(data.transactions);
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchRecentTransactions();
  }, [isRefetching]);

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
    <>
      <Head>
        <title>Dashboard - RukaPay Merchant</title>
        <meta name="description" content="RukaPay Merchant Dashboard - Manage your payments, transactions, and business operations" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex-1 flex flex-col">
      <main className="flex-1 p-4 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Dashboard</h1>
              <div className="flex flex-row gap-[10px] items-center">
                <span className="font-[600] text-[16px] text-gray-600">Welcome back, </span>
                <span className="font-[600] text-[16px] text-[#08163d]">{profile?.profile.merchant_names}</span>
                {isRefetching && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Updating...
                  </span>
                )}
              </div>
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
            {transactionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading transactions...</span>
              </div>
            ) : (
              <RecentTransactions 
                transactions={recentTransactions as any} 
                isNewFormat={true}
              />
            )}
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
