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
import { getMyTransactions, Transaction } from "@/lib/api/transactions.api";
import { checkMerchantIsSuperMerchant } from "@/lib/api/super-merchant.api";
import { isSessionMerchantOwnAccount } from "@/lib/auth/sessionPayload";
import { useTeamPermissionSession } from "@/lib/hooks/useTeamPermissionSession";
import { canCollectPayments, canViewTransactions } from "@/lib/utils/permissions";
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
  const [refreshKey, setRefreshKey] = useState(0);
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
    if (!merchantCode && !isViewingChild) {
      setRecentTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    if (isViewingChild && !childMerchantId) {
      setRecentTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    try {
      setTransactionsLoading(true);
      const effectiveCode = isViewingChild
        ? childMerchantCode
        : merchantCode != null
          ? String(merchantCode)
          : null;
      const data = await getMyTransactions(
        { page: 1, limit: 10 },
        childMerchantId || undefined,
        effectiveCode,
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
    loadRecentTransactions();
  }, [merchantCode, childMerchantId, childMerchantCode, isViewingChild, teamSession]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
      await loadRecentTransactions();
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };
  // Get merchant ID - prioritize session merchant ID (the actual selected merchant)
  const currentMerchantId = sessionMerchantId || profile?.merchantId || '';

  const dashboardLoading = !isContextReady || (isViewingChild && loading && !profile);

  // Regular merchant dashboard content
  const RegularDashboard = () => (
    <div className="space-y-4">
      <div className="relative">
        {dashboardLoading ? <DashboardSkeleton /> : <StatCards refreshKey={refreshKey} />}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {!canViewTransactions(teamSession) ? (
          <p className="text-[13px] text-gray-400 py-6 text-center">
            You do not have permission to view transactions.
          </p>
        ) : dashboardLoading || transactionsLoading ? (
          <div className="space-y-3 animate-pulse py-1">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-10 bg-gray-50 rounded-lg" />
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
  );

  return (
    <>
      <Head>
        <title>Dashboard - RukaPay Merchant</title>
        <meta name="description" content="RukaPay Merchant Dashboard - Manage your payments, transactions, and business operations" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex-1 flex flex-col">
      <main className="flex-1 p-4 md:p-6 space-y-5">
        {(() => {
          const showSuperTabs =
            !superMerchantLoading && isSuperMerchant && !!currentMerchantId && !isViewingChild;
          const headerActions = (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={loading || refreshing || isRefetching}
                title="Refresh dashboard"
                className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing || isRefetching ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh dashboard</span>
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
          );

          const title = (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Dashboard</h1>
                {isSuperMerchant && !isViewingChild && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <Crown className="h-3 w-3" />
                    Super
                  </span>
                )}
              </div>
              {isViewingChild && (
                <p className="mt-0.5 text-[12px] text-gray-400">
                  Viewing {childMerchantName || childMerchantCode || 'child merchant'}
                </p>
              )}
            </div>
          );

          if (showSuperTabs) {
            return (
              <Tabs defaultValue="aggregate" className="w-full space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    {title}
                    <TabsList className="h-8 rounded-full bg-gray-100 p-0.5">
                      <TabsTrigger
                        value="aggregate"
                        className="h-7 rounded-full px-3 text-[12px] data-[state=active]:shadow-none"
                      >
                        Aggregate
                      </TabsTrigger>
                      <TabsTrigger
                        value="own"
                        className="h-7 rounded-full px-3 text-[12px] data-[state=active]:shadow-none"
                      >
                        My business
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  {headerActions}
                </div>
                <TabsContent value="aggregate" className="mt-0">
                  <SuperMerchantDashboard
                    merchantId={currentMerchantId}
                    merchantName={profile?.merchant_names || profile?.businessTradeName || 'Business'}
                    refreshKey={refreshKey}
                  />
                </TabsContent>
                <TabsContent value="own" className="mt-0">
                  <RegularDashboard />
                </TabsContent>
              </Tabs>
            );
          }

          return (
            <>
              <div className="flex items-center justify-between gap-3">
                {title}
                {headerActions}
              </div>
              {superMerchantLoading && !isViewingChild ? <DashboardSkeleton /> : <RegularDashboard />}
            </>
          );
        })()}
      </main>
    </div>
    </>
  );
}
