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
import SuperMerchantDashboard from "@/app/components/SuperMerchantDashboard";
import { useUserProfile } from "../UserProfileProvider";
import { useSession } from "next-auth/react";
import DashboardSkeleton from "@/app/components/DashboardSkeleton";
import { useChildMerchantContext } from '@/lib/hooks/useChildMerchantContext';
import { RefreshCw, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMyTransactions, Transaction } from "@/lib/api/wallet.api";
import { checkMerchantIsSuperMerchant } from "@/lib/api/super-merchant.api";
import { isSessionMerchantOwnAccount } from "@/lib/auth/sessionPayload";
import { useTeamPermissionSession } from "@/lib/hooks/useTeamPermissionSession";
import { canCollectPayments, canViewTransactions } from "@/lib/utils/permissions";
import DebugWallet from "../debug-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const { profile, loading, error, refetch, isRefetching } = useUserProfile();
  const teamSession = useTeamPermissionSession();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isSuperMerchant, setIsSuperMerchant] = useState(false);
  const [superMerchantLoading, setSuperMerchantLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {
    childMerchantId,
    childMerchantCode,
    childMerchantName,
    isViewingChild,
    isContextReady,
  } = useChildMerchantContext();

  const merchantCode = (session?.user as any)?.merchantCode;
  const userId = (session?.user as any)?.id;
  const sessionMerchants = (session?.user as any)?.merchants || [];
  
  // Get merchant ID from session merchants first (most reliable for current session)
  // Priority: 1) session merchant matching current merchantCode, 2) first session merchant, 3) profile.merchantId
  const profileMerchantCode = profile?.merchant_code || profile?.merchantCode;
  const effectiveMerchantCode = merchantCode || profileMerchantCode;
  
  // Find the session merchant that matches the current merchant code
  const currentSessionMerchant = effectiveMerchantCode
    ? sessionMerchants.find((m: any) => {
        const mCode = String(m?.merchantCode || '').trim();
        const eCode = String(effectiveMerchantCode || '').trim();
        return mCode === eCode || mCode === eCode.padStart(4, '0') || eCode === mCode.padStart(4, '0');
      })
    : sessionMerchants[0];
  const sessionMerchantId = currentSessionMerchant?.id;
  // Wait for profile so team members are not briefly treated as owners (legacy sessions).
  const ownsCurrentMerchant =
    !loading &&
    !!profile &&
    isSessionMerchantOwnAccount(currentSessionMerchant) &&
    profile.isTeamMember !== true &&
    profile.isWalletOwner === true;

  // Use session merchant ID first (it's the actual selected merchant), then fallback to profile
  // This ensures we check the correct merchant that matches the current session
  const currentMerchantIdForCheck = sessionMerchantId || profile?.merchantId || '';

  // Super Merchant UI is owner-only. Team members of a super merchant get the normal dashboard.
  useEffect(() => {
    const checkSuperMerchantStatus = async () => {
      if (loading) {
        setSuperMerchantLoading(true);
        return;
      }

      if (isViewingChild || !ownsCurrentMerchant) {
        setIsSuperMerchant(false);
        setSuperMerchantLoading(false);
        return;
      }

      // First, check if session merchants array has isSuperMerchant field (fastest check)
      if (currentSessionMerchant && typeof currentSessionMerchant.isSuperMerchant === 'boolean') {
        setIsSuperMerchant(currentSessionMerchant.isSuperMerchant === true);
        setSuperMerchantLoading(false);
        return;
      }

      // Fallback: Check via API using current merchant ID (merchant-level check)
      if (currentMerchantIdForCheck) {
        try {
          const result = await checkMerchantIsSuperMerchant(currentMerchantIdForCheck);
          setIsSuperMerchant(result);
        } catch (err: any) {
          console.error('Error checking super merchant status:', err);
          setIsSuperMerchant(false);
        }
      } else {
        setIsSuperMerchant(false);
      }
      setSuperMerchantLoading(false);
    };

    checkSuperMerchantStatus();
  }, [currentMerchantIdForCheck, loading, currentSessionMerchant, ownsCurrentMerchant, isViewingChild]);

  // Helper to (re)load recent transactions for the current merchant
  const loadRecentTransactions = async () => {
    if (!canViewTransactions(teamSession)) {
      setRecentTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    if (!merchantCode && !isViewingChild) return;
    if (isViewingChild && !childMerchantId) return;
    try {
      setTransactionsLoading(true);
      const data = await getMyTransactions(
        { limit: 5 },
        childMerchantId || undefined,
        isViewingChild ? childMerchantCode : undefined,
      );
      setRecentTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      setRecentTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Initial / merchant-change load for recent transactions
  useEffect(() => {
    if (!merchantCode && !isViewingChild) return;
    loadRecentTransactions();
  }, [merchantCode, childMerchantId, isViewingChild]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
      await loadRecentTransactions();
      toast.success('Dashboard data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };
  // Get merchant ID - prioritize session merchant ID (the actual selected merchant)
  const currentMerchantId = sessionMerchantId || profile?.merchantId || '';

  const dashboardLoading = !isContextReady || (isViewingChild && loading && !profile);

  // Regular merchant dashboard content
  const RegularDashboard = () => (
    <div className="space-y-6">
      <div className="relative">
        {refreshing && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 flex items-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Updating dashboard...</span>
            </div>
          </div>
        )}
        {process.env.NODE_ENV === 'development' && <DebugWallet />}
        {dashboardLoading ? <DashboardSkeleton /> : <StatCards />}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-4">
          {!canViewTransactions(teamSession) ? (
            <p className="text-sm text-gray-500 py-4">
              You do not have permission to view transactions.
            </p>
          ) : dashboardLoading || transactionsLoading ? (
            <div className="space-y-3 animate-pulse py-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          ) : (
            <RecentTransactions
              transactions={recentTransactions as any}
              isNewFormat={true}
            />
          )}
        </div>
      </div>
    </div>
  );

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
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-[#08163d]">Dashboard</h1>
                {isSuperMerchant && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    <Crown className="h-3 w-3" />
                    Super Merchant
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-base text-gray-600">
                  Managing <span className="font-semibold text-[#08163d]">
                    {isViewingChild
                      ? (childMerchantName || childMerchantCode || 'Child Merchant')
                      : (profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || 'Business')}
                  </span>
                  {profile?.owner_name && (
                    <span className="text-gray-500 font-normal"> · {profile.owner_name}</span>
                  )}
                </span>
                {(refreshing || isRefetching) && (
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
                disabled={loading || refreshing || isRefetching}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing || isRefetching ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : refreshing || isRefetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              {!loading &&
                canCollectPayments(teamSession) &&
                (profile?.merchant_names || profile?.merchantBusinessTradeName) && (
                <QRCodeButton
                  merchantCode={profile?.merchantCode || profile?.merchant_code || ''}
                  merchantName={profile?.merchant_names || profile?.merchantBusinessTradeName || 'Merchant'}
                />
              )}
            </div>
          </div>
        </div>

        {/* Super Merchant gets tabs, regular merchants get standard dashboard */}
        {!superMerchantLoading && isSuperMerchant && currentMerchantId && !isViewingChild ? (
          <Tabs defaultValue="aggregate" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="aggregate" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Aggregate View
              </TabsTrigger>
              <TabsTrigger value="own" className="flex items-center gap-2">
                My Business
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="aggregate">
              <SuperMerchantDashboard 
                merchantId={currentMerchantId}
                merchantName={profile?.merchant_names || profile?.businessTradeName || 'Business'}
              />
            </TabsContent>
            
            <TabsContent value="own">
              <RegularDashboard />
            </TabsContent>
          </Tabs>
        ) : superMerchantLoading && !isViewingChild ? (
          <DashboardSkeleton />
        ) : (
          <RegularDashboard />
        )}
      </main>
    </div>
    </>
  );
}
