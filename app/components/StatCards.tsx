import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { useSession } from 'next-auth/react';
import { useChildMerchantContext } from '@/lib/hooks/useChildMerchantContext';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';
import { getWalletBalance, getMyTransactions } from '@/lib/api/wallet.api';
import SweepToDisbursementModal from './SweepToDisbursementModal';

export default function StatCards() {
  const {profile, loading} = useUserProfile()
  const { data: session } = useSession();
  const {
    childMerchantId,
    childMerchantCode,
    isViewingChild,
  } = useChildMerchantContext();

  // Determine whether this merchant has bulk payments (disbursement wallet) enabled
  const merchants = (session?.user as any)?.merchants ?? [];
  const currentMerchantCode = (session?.user as any)?.merchantCode;
  const currentMerchant = Array.isArray(merchants)
    ? merchants.find((m: any) => m?.merchantCode === currentMerchantCode)
    : undefined;
  const liveMerchantData = profile?.merchantData || (profile as any)?.businessWallet?.merchant;
  const featureBulkPayments =
    (liveMerchantData?.featureBulkPayments ?? currentMerchant?.featureBulkPayments) === true;
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [collectionBalance, setCollectionBalance] = useState<number | null>(null);
  const [disbursementBalance, setDisbursementBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [sweepModalOpen, setSweepModalOpen] = useState(false);

  // Fetch wallet balance and transactions
  const fetchWalletData = async () => {
    try {
      setWalletLoading(true);
      setWalletBalance(0);
      setCollectionBalance(null);
      setDisbursementBalance(null);
      setTotalTransactions(0);
      setTotalCredit(0);
      setTotalDebit(0);
      const balanceData = await getWalletBalance(childMerchantId || undefined);
      setWalletBalance(balanceData.balance);
      setCollectionBalance(balanceData.collectionBalance ?? null);
      setDisbursementBalance(balanceData.disbursementBalance ?? null);
      const transactionsData = await getMyTransactions(
        { limit: 1000 },
        childMerchantId || undefined,
        isViewingChild ? childMerchantCode : undefined,
      );
      setTotalTransactions(transactionsData.total || 0);
      const credit = (transactionsData.transactions || [])
        .filter(t => (t.direction === 'CREDIT' || t.type === 'DEPOSIT' || t.type === 'TOPUP') && t.status === 'SUCCESS')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalCredit(credit);
      const debit = (transactionsData.transactions || [])
        .filter(t => (t.direction === 'DEBIT' || t.type === 'WITHDRAWAL' || t.type === 'TRANSFER') && t.status === 'SUCCESS')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalDebit(debit);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setWalletBalance(0);
      setTotalTransactions(0);
      setTotalCredit(0);
      setTotalDebit(0);
    } finally {
      setWalletLoading(false);
    }
  };

  const merchantCode = (session?.user as any)?.merchantCode;
  const hasFetchedRef = useRef<string | null>(null);
  const fetchKey = `${merchantCode || ''}:${childMerchantId || ''}`;

  useEffect(() => {
    if (!merchantCode && !isViewingChild) return;
    if (isViewingChild && !childMerchantId) return;
    if (hasFetchedRef.current === fetchKey) return;
    hasFetchedRef.current = fetchKey;
    fetchWalletData();
  }, [fetchKey, merchantCode, isViewingChild, childMerchantId]);

  if (walletLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-white p-4 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Only show separate collection/disbursement cards when:
  // - bulk payments feature is enabled for this merchant (they have a disbursement wallet)
  // - AND the backend returned both balances
  const hasSplitBalances =
    featureBulkPayments &&
    collectionBalance !== null &&
    disbursementBalance !== null;

  // Always show wallet stats (for both owners and team members with access)
  const stats = hasSplitBalances
    ? [
        {
          label: 'Collection balance',
          value: walletLoading ? '...' : `${(collectionBalance ?? 0).toLocaleString()} UGX`,
          change: 'Incoming payments',
          changeType: 'neutral',
          icon: '📥',
        },
        {
          label: 'Disbursement balance',
          value: walletLoading ? '...' : `${(disbursementBalance ?? 0).toLocaleString()} UGX`,
          change: 'Outgoing payments',
          changeType: 'neutral',
          icon: '📤',
        },
        {
          label: 'Total transactions',
          value: walletLoading ? '....' : `${totalTransactions}`,
          change: '+1,5%',
          changeType: 'up',
          icon: '🛒',
        },
        {
          label: 'Total Credit',
          value: walletLoading ? '.....' : `${totalCredit.toLocaleString()} UGX`,
          change: '-2,5%',
          changeType: 'down',
          icon: '📦',
        },
      ]
    : [
        {
          label: 'Current balance',
          value: walletLoading ? '...' : `${walletBalance.toLocaleString()} UGX`,
          change: '+15,7%',
          changeType: 'up',
          icon: '💰',
        },
        {
          label: 'Total transactions',
          value: walletLoading ? '....' : `${totalTransactions}`,
          change: '+1,5%',
          changeType: 'up',
          icon: '🛒',
        },
        {
          label: 'Total Credit',
          value: walletLoading ? '.....' : `${totalCredit.toLocaleString()} UGX`,
          change: '-2,5%',
          changeType: 'down',
          icon: '📦',
        },
        {
          label: 'Total Debit',
          value: walletLoading ? '....' : `${totalDebit.toLocaleString()} UGX`,
          change: '+32,6%',
          changeType: 'up',
          icon: '👥',
        },
      ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {hasSplitBalances && (
          <Button
            size="sm"
            onClick={() => setSweepModalOpen(true)}
            disabled={walletLoading || (collectionBalance ?? 0) <= 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer to Disbursement
          </Button>
        )}
        <button
          onClick={fetchWalletData}
          disabled={walletLoading}
          className="ml-auto flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
          {walletLoading ? 'Refreshing...' : 'Refresh Balance'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-2 relative">
            <CardHeader className="flex flex-row items-center gap-2 text-gray-500 pb-2">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-sm font-medium">{stat.label}</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs font-semibold ${
                stat.changeType === 'up' ? 'text-green-500' :
                stat.changeType === 'down' ? 'text-red-500' :
                'text-gray-500'
              }`}>{stat.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sweep modal — only mounted for merchants with split wallets */}
      {hasSplitBalances && (
        <SweepToDisbursementModal
          open={sweepModalOpen}
          onOpenChange={setSweepModalOpen}
          collectionBalance={collectionBalance ?? 0}
          disbursementBalance={disbursementBalance ?? 0}
          currency="UGX"
          onSuccess={fetchWalletData}
        />
      )}
    </div>
  );
} 