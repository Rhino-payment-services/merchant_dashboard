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
import { RefreshCw, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMyTransactions, Transaction } from "@/lib/api/wallet.api";
import { checkMerchantIsSuperMerchant } from "@/lib/api/super-merchant.api";
import DebugWallet from "../debug-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const { profile, loading, error, refetch, isRefetching } = useUserProfile();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isSuperMerchant, setIsSuperMerchant] = useState(false);
  const [superMerchantLoading, setSuperMerchantLoading] = useState(true);

  const merchantCode = (session?.user as any)?.merchantCode;
  const userId = (session?.user as any)?.id;
  const sessionMerchants = (session?.user as any)?.merchants || [];
  
  // Get merchant ID from session merchants first (most reliable for current session)
  // Priority: 1) session merchant matching current merchantCode, 2) first session merchant, 3) profile.merchantId
  const profileMerchantCode = profile?.merchant_code || profile?.merchantCode;
  const effectiveMerchantCode = merchantCode || profileMerchantCode;
  
  // Find the session merchant that matches the current merchant code
  const sessionMerchantId = effectiveMerchantCode 
    ? sessionMerchants.find((m: any) => {
        const mCode = String(m?.merchantCode || '').trim();
        const eCode = String(effectiveMerchantCode || '').trim();
        return mCode === eCode || mCode === eCode.padStart(4, '0') || eCode === mCode.padStart(4, '0');
      })?.id
    : sessionMerchants[0]?.id;
  
  // Use session merchant ID first (it's the actual selected merchant), then fallback to profile
  // This ensures we check the correct merchant that matches the current session
  const currentMerchantIdForCheck = sessionMerchantId || profile?.merchantId || '';
  
  // Debug log to verify which merchant ID is being used
  useEffect(() => {
    if (sessionMerchants.length > 0) {
      console.log('📋 Session Merchants:', sessionMerchants.map((m: any) => ({
        id: m.id,
        code: m.merchantCode,
        name: m.businessTradeName,
        isSuperMerchant: m.isSuperMerchant
      })));
      console.log('📋 Effective Merchant Code:', effectiveMerchantCode);
      console.log('📋 Selected Session Merchant ID:', sessionMerchantId);
      console.log('📋 Will check super merchant status for:', currentMerchantIdForCheck);
    }
  }, [sessionMerchants, effectiveMerchantCode, sessionMerchantId, currentMerchantIdForCheck]);
  
  // Check if current merchant is a SUPER_MERCHANT (at merchant level, not user level)
  useEffect(() => {
    const checkSuperMerchantStatus = async () => {
      // First, check if session merchants array has isSuperMerchant field (fastest check)
      if (sessionMerchantId && sessionMerchants.length > 0) {
        const sessionMerchant = sessionMerchants.find((m: any) => m.id === sessionMerchantId);
        if (sessionMerchant && typeof sessionMerchant.isSuperMerchant === 'boolean') {
          console.log('✅ Using isSuperMerchant from session merchant data:', sessionMerchant.isSuperMerchant);
          setIsSuperMerchant(sessionMerchant.isSuperMerchant);
          setSuperMerchantLoading(false);
          return;
        }
      }
      
      // Fallback: Check via API using current merchant ID (merchant-level check)
      if (currentMerchantIdForCheck) {
        try {
          console.log('🔍 Checking super merchant status via API for merchantId:', currentMerchantIdForCheck);
          const result = await checkMerchantIsSuperMerchant(currentMerchantIdForCheck);
          console.log('🔍 Super merchant check result:', result);
          setIsSuperMerchant(result);
        } catch (err: any) {
          console.error('❌ Error checking super merchant status:', err);
          console.error('❌ Error details:', {
            message: err?.message,
            response: err?.response?.data,
            status: err?.response?.status
          });
          setIsSuperMerchant(false);
        }
      } else {
        console.warn('⚠️ No merchant ID available for super merchant check');
        setIsSuperMerchant(false);
      }
      setSuperMerchantLoading(false);
    };
    
    if (!loading) {
      checkSuperMerchantStatus();
    }
  }, [currentMerchantIdForCheck, loading, sessionMerchantId, sessionMerchants]);

  // Fetch recent transactions when merchantCode is available (avoids race after switching)
  useEffect(() => {
    if (!merchantCode) return;
    const fetchRecentTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const data = await getMyTransactions({ limit: 5 });
        setRecentTransactions(data.transactions || []);
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        setRecentTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };
    fetchRecentTransactions();
  }, [merchantCode, isRefetching]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Dashboard data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh dashboard data');
    }
  };

  // Get merchant ID - prioritize session merchant ID (the actual selected merchant)
  const currentMerchantId = sessionMerchantId || profile?.merchantId || '';
  
  // Debug logging
  useEffect(() => {
    if (!loading && currentMerchantId) {
      console.log('📊 Dashboard Debug:', {
        merchantId: currentMerchantId,
        merchantCode,
        isSuperMerchant,
        superMerchantLoading,
        profileMerchantId: profile?.merchantId,
        sessionMerchantId,
        sessionMerchants: sessionMerchants.map((m: any) => ({
          id: m.id,
          code: m.merchantCode,
          name: m.businessTradeName
        }))
      });
    }
  }, [loading, currentMerchantId, merchantCode, isSuperMerchant, superMerchantLoading, profile?.merchantId, sessionMerchantId]);

  // Regular merchant dashboard content
  const RegularDashboard = () => (
    <>
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
        {process.env.NODE_ENV === 'development' && <DebugWallet />}
        <StatCards />
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
    </>
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
                  Managing <span className="font-semibold text-[#08163d]">{profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || 'Business'}</span>
                  {profile?.owner_name && (
                    <span className="text-gray-500 font-normal"> · {profile.owner_name}</span>
                  )}
                </span>
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
              {!loading && (profile?.merchant_names || profile?.merchantBusinessTradeName) && (
                <QRCodeButton
                  merchantCode={profile?.merchantCode || profile?.merchant_code || ''}
                  merchantName={profile?.merchant_names || profile?.merchantBusinessTradeName || 'Merchant'}
                />
              )}
            </div>
          </div>
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-gray-100 rounded-lg text-xs">
            <strong>Super Merchant Debug:</strong>
            <ul className="mt-2 space-y-1">
              <li>Loading: {superMerchantLoading ? 'Yes' : 'No'}</li>
              <li>Is Super Merchant: {isSuperMerchant ? 'Yes' : 'No'}</li>
              <li>Current Merchant ID: {currentMerchantId || 'N/A'}</li>
              <li>Merchant Code: {merchantCode || 'N/A'}</li>
              <li>Profile Merchant ID: {profile?.merchantId || 'N/A'}</li>
              <li>Session Merchant ID: {sessionMerchantId || 'N/A'}</li>
              <li>Session Merchants: {sessionMerchants.length} found</li>
            </ul>
          </div>
        )}

        {/* Super Merchant gets tabs, regular merchants get standard dashboard */}
        {!superMerchantLoading && isSuperMerchant && currentMerchantId ? (
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
        ) : superMerchantLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Checking super merchant status...</span>
          </div>
        ) : (
          <RegularDashboard />
        )}
      </main>
    </div>
    </>
  );
}
