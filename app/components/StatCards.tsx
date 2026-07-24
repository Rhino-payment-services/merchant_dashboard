import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { useSession } from 'next-auth/react';
import { useChildMerchantContext } from '@/lib/hooks/useChildMerchantContext';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';
import { getWalletBalance, getMyTransactions } from '@/lib/api/wallet.api';
import { fetchAllBusinessTransactions } from '@/lib/utils/merchant-transaction-export';
import {
  computeMerchantPnLSummary,
  filterTransactionsByCreatedAtRange,
  formatPeriodPercentChange,
  getLastTwoThirtyDayWindows,
} from '@/lib/utils/transaction-display';
import SweepToDisbursementModal from './SweepToDisbursementModal';

type StatCardItem = {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  icon: string;
};

export default function StatCards() {
  const { profile } = useUserProfile();
  const { data: session } = useSession();
  const {
    childMerchantId,
    childMerchantCode,
    isViewingChild,
  } = useChildMerchantContext();

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
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [totalSent, setTotalSent] = useState<number>(0);
  const [txnCountChange, setTxnCountChange] = useState(
    formatPeriodPercentChange(0, 0),
  );
  const [receivedChange, setReceivedChange] = useState(
    formatPeriodPercentChange(0, 0),
  );
  const [sentChange, setSentChange] = useState(formatPeriodPercentChange(0, 0));
  const [sweepModalOpen, setSweepModalOpen] = useState(false);

  const fetchWalletData = async () => {
    try {
      setWalletLoading(true);
      setWalletBalance(0);
      setCollectionBalance(null);
      setDisbursementBalance(null);
      setTotalTransactions(0);
      setTotalReceived(0);
      setTotalSent(0);

      const balanceData = await getWalletBalance(childMerchantId || undefined);
      setWalletBalance(balanceData.balance);
      setCollectionBalance(balanceData.collectionBalance ?? null);
      setDisbursementBalance(balanceData.disbursementBalance ?? null);

      const merchantCodeForTx = isViewingChild ? childMerchantCode : undefined;
      const meta = await getMyTransactions(
        { page: 1, limit: 1 },
        childMerchantId || undefined,
        merchantCodeForTx,
      );
      setTotalTransactions(meta.total || 0);

      const allTransactions = await fetchAllBusinessTransactions(
        {},
        childMerchantId || undefined,
        merchantCodeForTx,
      );

      // All-time received/sent (exclude sweeps — same rules as Reports)
      const lifetime = computeMerchantPnLSummary(allTransactions);
      setTotalReceived(lifetime.totalRevenue);
      setTotalSent(lifetime.totalExpenses);

      // Real trends: last 30 days vs prior 30 days
      const windows = getLastTwoThirtyDayWindows();
      const currentPeriodTxs = filterTransactionsByCreatedAtRange(
        allTransactions,
        windows.startCurrent,
        windows.endCurrent,
      );
      const previousPeriodTxs = filterTransactionsByCreatedAtRange(
        allTransactions,
        windows.startPrevious,
        windows.endPrevious,
      );

      setTxnCountChange(
        formatPeriodPercentChange(
          currentPeriodTxs.length,
          previousPeriodTxs.length,
          {
            noBaselineLabel: (n) =>
              `${n.toLocaleString()} transaction${n === 1 ? '' : 's'} in last 30 days`,
          },
        ),
      );

      const currentPnL = computeMerchantPnLSummary(currentPeriodTxs);
      const previousPnL = computeMerchantPnLSummary(previousPeriodTxs);
      setReceivedChange(
        formatPeriodPercentChange(
          currentPnL.totalRevenue,
          previousPnL.totalRevenue,
          {
            noBaselineLabel: (n) =>
              `UGX ${n.toLocaleString()} received in last 30 days`,
          },
        ),
      );
      setSentChange(
        formatPeriodPercentChange(
          currentPnL.totalExpenses,
          previousPnL.totalExpenses,
          {
            noBaselineLabel: (n) =>
              `UGX ${n.toLocaleString()} sent in last 30 days`,
          },
        ),
      );
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setWalletBalance(0);
      setTotalTransactions(0);
      setTotalReceived(0);
      setTotalSent(0);
      setTxnCountChange(formatPeriodPercentChange(0, 0));
      setReceivedChange(formatPeriodPercentChange(0, 0));
      setSentChange(formatPeriodPercentChange(0, 0));
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

  const hasSplitBalances =
    featureBulkPayments &&
    collectionBalance !== null &&
    disbursementBalance !== null;

  const stats: StatCardItem[] = hasSplitBalances
    ? [
        {
          label: 'Collection balance',
          value: `${(collectionBalance ?? 0).toLocaleString()} UGX`,
          change: 'Incoming customer payments (Collection wallet)',
          changeType: 'neutral',
          icon: '📥',
        },
        {
          label: 'Payout balance',
          value: `${(disbursementBalance ?? 0).toLocaleString()} UGX`,
          change: 'Available for outgoing payments (Disbursement wallet)',
          changeType: 'neutral',
          icon: '📤',
        },
        {
          label: 'Total transactions',
          value: `${totalTransactions}`,
          change: txnCountChange.label,
          changeType: txnCountChange.changeType,
          icon: '🛒',
        },
        {
          label: 'Total received',
          value: `${totalReceived.toLocaleString()} UGX`,
          change: receivedChange.label,
          changeType: receivedChange.changeType,
          icon: '📦',
        },
      ]
    : [
        {
          label: 'Current balance',
          value: `${walletBalance.toLocaleString()} UGX`,
          change: 'Available business wallet balance',
          changeType: 'neutral',
          icon: '💰',
        },
        {
          label: 'Total transactions',
          value: `${totalTransactions}`,
          change: txnCountChange.label,
          changeType: txnCountChange.changeType,
          icon: '🛒',
        },
        {
          label: 'Total received',
          value: `${totalReceived.toLocaleString()} UGX`,
          change: receivedChange.label,
          changeType: receivedChange.changeType,
          icon: '📦',
        },
        {
          label: 'Total sent',
          value: `${totalSent.toLocaleString()} UGX`,
          change: sentChange.label,
          changeType: sentChange.changeType,
          icon: '👥',
        },
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {hasSplitBalances && (
          <Button
            size="sm"
            onClick={() => setSweepModalOpen(true)}
            disabled={walletLoading || (collectionBalance ?? 0) <= 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Move to payout balance
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

      {hasSplitBalances && (
        <p className="text-xs text-gray-500">
          Customer payments are credited to your <span className="font-medium">Collection balance</span> (Collection wallet).
          Transfer funds to your <span className="font-medium">Payout balance</span> (Disbursement wallet) for outgoing payments.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-2 relative">
            <CardHeader className="flex flex-row items-center gap-2 text-gray-500 pb-2">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-sm font-medium">{stat.label}</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div
                className={`text-xs font-semibold ${
                  stat.changeType === 'up'
                    ? 'text-green-500'
                    : stat.changeType === 'down'
                      ? 'text-red-500'
                      : 'text-gray-500'
                }`}
              >
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
