import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { useSession } from 'next-auth/react';
import { useChildMerchantContext } from '@/lib/hooks/useChildMerchantContext';
import {
  ArrowRightLeft,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  TrendingUp,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { getWalletBalance } from '@/lib/api/wallet.api';
import {
  getBusinessWalletStatement,
  getMyTransactions,
} from '@/lib/api/transactions.api';
import { getLastTwoThirtyDayIsoWindows } from '@/lib/date-picker-utils';
import { formatPeriodPercentChange } from '@/lib/utils/transaction-display';
import SweepToDisbursementModal from './SweepToDisbursementModal';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canViewBalance, canViewTransactions } from '@/lib/utils/permissions';
import KpiCard from './KpiCard';

type StatCardItem = {
  label: string;
  value: string;
  suffix?: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  valueClassName?: string;
};

export default function StatCards({ refreshKey = 0 }: { refreshKey?: number }) {
  const { profile } = useUserProfile();
  const { data: session } = useSession();
  const teamSession = useTeamPermissionSession();
  const allowBalance = canViewBalance(teamSession);
  const allowTransactions = canViewTransactions(teamSession);
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
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
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

  const merchantCodeForTx = isViewingChild
    ? childMerchantCode
    : currentMerchantCode != null
      ? String(currentMerchantCode)
      : null;

  const fetchBalance = async () => {
    if (!allowBalance) {
      setBalanceLoading(false);
      return;
    }
    try {
      setBalanceLoading(true);
      const balanceData = await getWalletBalance(childMerchantId || undefined);
      setWalletBalance(balanceData.balance ?? 0);
      setCollectionBalance(balanceData.collectionBalance ?? null);
      setDisbursementBalance(balanceData.disbursementBalance ?? null);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
      setCollectionBalance(null);
      setDisbursementBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchMetrics = async () => {
    if (!allowTransactions) {
      setTotalTransactions(0);
      setTotalReceived(0);
      setTotalSent(0);
      setTxnCountChange(formatPeriodPercentChange(0, 0));
      setReceivedChange(formatPeriodPercentChange(0, 0));
      setSentChange(formatPeriodPercentChange(0, 0));
      setMetricsLoading(false);
      return;
    }

    try {
      setMetricsLoading(true);
      const windows = getLastTwoThirtyDayIsoWindows();

      const [meta, currentStatement, previousStatement] = await Promise.all([
        getMyTransactions(
          { page: 1, limit: 1 },
          childMerchantId || undefined,
          merchantCodeForTx,
        ),
        getBusinessWalletStatement(
          windows.current.startDate,
          windows.current.endDate,
          childMerchantId || undefined,
          merchantCodeForTx,
        ),
        getBusinessWalletStatement(
          windows.previous.startDate,
          windows.previous.endDate,
          childMerchantId || undefined,
          merchantCodeForTx,
        ),
      ]);

      setTotalTransactions(meta.pagination?.total || 0);
      setTotalReceived(Number(currentStatement.totalNetCredit || 0));
      setTotalSent(Number(currentStatement.totalNetDebit || 0));

      setTxnCountChange(
        formatPeriodPercentChange(
          Number(currentStatement.successfulCount || 0),
          Number(previousStatement.successfulCount || 0),
          {
            noBaselineLabel: (n) =>
              `${n.toLocaleString()} successful in last 30 days`,
          },
        ),
      );
      setReceivedChange(
        formatPeriodPercentChange(
          Number(currentStatement.totalNetCredit || 0),
          Number(previousStatement.totalNetCredit || 0),
          {
            noBaselineLabel: (n) =>
              `UGX ${n.toLocaleString()} received in last 30 days`,
          },
        ),
      );
      setSentChange(
        formatPeriodPercentChange(
          Number(currentStatement.totalNetDebit || 0),
          Number(previousStatement.totalNetDebit || 0),
          {
            noBaselineLabel: (n) =>
              `UGX ${n.toLocaleString()} sent in last 30 days`,
          },
        ),
      );
    } catch (error) {
      console.error('Error fetching wallet metrics:', error);
      setTotalTransactions(0);
      setTotalReceived(0);
      setTotalSent(0);
      setTxnCountChange(formatPeriodPercentChange(0, 0));
      setReceivedChange(formatPeriodPercentChange(0, 0));
      setSentChange(formatPeriodPercentChange(0, 0));
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchWalletData = async () => {
    await Promise.all([fetchBalance(), fetchMetrics()]);
  };

  const merchantCode = (session?.user as any)?.merchantCode;
  const hasFetchedRef = useRef<string | null>(null);
  const fetchKey = `${merchantCode || ''}:${childMerchantId || ''}:${allowBalance}:${allowTransactions}:${refreshKey}`;

  useEffect(() => {
    if (!merchantCode && !isViewingChild) return;
    if (isViewingChild && !childMerchantId) return;
    if (hasFetchedRef.current === fetchKey) return;
    hasFetchedRef.current = fetchKey;
    fetchWalletData();
  }, [fetchKey, merchantCode, isViewingChild, childMerchantId, allowBalance, allowTransactions, refreshKey]);

  const showInitialSkeleton = balanceLoading && metricsLoading;

  if (showInitialSkeleton) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 space-y-2.5">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-28 bg-gray-50 rounded" />
            <div className="h-6 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const hasSplitBalances =
    allowBalance &&
    featureBulkPayments &&
    collectionBalance !== null &&
    disbursementBalance !== null;

  const moneyValue = (amount: number) =>
    allowBalance ? amount.toLocaleString() : '••••';
  const maskCount = (n: number) => (allowTransactions ? `${n.toLocaleString()}` : '••••');
  const pendingValue = '…';

  const stats: StatCardItem[] = hasSplitBalances
    ? [
        {
          label: 'Collection balance',
          value: balanceLoading ? pendingValue : moneyValue(collectionBalance ?? 0),
          suffix: allowBalance && !balanceLoading ? 'UGX' : undefined,
          change: allowBalance
            ? 'Incoming customer payments'
            : 'Balance hidden — no permission',
          changeType: 'neutral',
          icon: ArrowDownToLine,
        },
        {
          label: 'Payout balance',
          value: balanceLoading ? pendingValue : moneyValue(disbursementBalance ?? 0),
          suffix: allowBalance && !balanceLoading ? 'UGX' : undefined,
          change: allowBalance
            ? 'Available for outgoing payments'
            : 'Balance hidden — no permission',
          changeType: 'neutral',
          icon: ArrowUpFromLine,
        },
        {
          label: 'Total transactions',
          value: metricsLoading ? pendingValue : maskCount(totalTransactions),
          change: allowTransactions
            ? metricsLoading
              ? 'Loading period trend…'
              : txnCountChange.label
            : 'Transactions hidden — no permission',
          changeType: allowTransactions && !metricsLoading ? txnCountChange.changeType : 'neutral',
          icon: ArrowLeftRight,
        },
        {
          label: 'Money in (30d)',
          value:
            metricsLoading || !(allowTransactions && allowBalance)
              ? metricsLoading && allowTransactions && allowBalance
                ? pendingValue
                : '••••'
              : moneyValue(totalReceived),
          suffix:
            !metricsLoading && allowTransactions && allowBalance ? 'UGX' : undefined,
          change:
            allowTransactions && allowBalance
              ? metricsLoading
                ? 'Loading last 30 days…'
                : receivedChange.label
              : 'Hidden — no permission',
          changeType:
            allowTransactions && allowBalance && !metricsLoading
              ? receivedChange.changeType
              : 'neutral',
          icon: TrendingUp,
          valueClassName: 'text-emerald-600',
        },
      ]
    : [
        {
          label: 'Current balance',
          value: balanceLoading ? pendingValue : moneyValue(walletBalance),
          suffix: allowBalance && !balanceLoading ? 'UGX' : undefined,
          change: allowBalance
            ? 'Available business wallet balance'
            : 'Balance hidden — no permission',
          changeType: 'neutral',
          icon: Wallet,
        },
        {
          label: 'Total transactions',
          value: metricsLoading ? pendingValue : maskCount(totalTransactions),
          change: allowTransactions
            ? metricsLoading
              ? 'Loading period trend…'
              : txnCountChange.label
            : 'Transactions hidden — no permission',
          changeType: allowTransactions && !metricsLoading ? txnCountChange.changeType : 'neutral',
          icon: ArrowLeftRight,
        },
        {
          label: 'Money in (30d)',
          value:
            metricsLoading || !(allowTransactions && allowBalance)
              ? metricsLoading && allowTransactions && allowBalance
                ? pendingValue
                : '••••'
              : moneyValue(totalReceived),
          suffix:
            !metricsLoading && allowTransactions && allowBalance ? 'UGX' : undefined,
          change:
            allowTransactions && allowBalance
              ? metricsLoading
                ? 'Loading last 30 days…'
                : receivedChange.label
              : 'Hidden — no permission',
          changeType:
            allowTransactions && allowBalance && !metricsLoading
              ? receivedChange.changeType
              : 'neutral',
          icon: TrendingUp,
          valueClassName: 'text-emerald-600',
        },
        {
          label: 'Money out (30d)',
          value:
            metricsLoading || !(allowTransactions && allowBalance)
              ? metricsLoading && allowTransactions && allowBalance
                ? pendingValue
                : '••••'
              : moneyValue(totalSent),
          suffix:
            !metricsLoading && allowTransactions && allowBalance ? 'UGX' : undefined,
          change:
            allowTransactions && allowBalance
              ? metricsLoading
                ? 'Loading last 30 days…'
                : sentChange.label
              : 'Hidden — no permission',
          changeType:
            allowTransactions && allowBalance && !metricsLoading
              ? sentChange.changeType
              : 'neutral',
          icon: Send,
        },
      ];

  return (
    <div className="space-y-3">
      {hasSplitBalances && allowBalance && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">
            Incoming payments land in Collection. Move funds to Payout before sending money out.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSweepModalOpen(true)}
            disabled={balanceLoading || (collectionBalance ?? 0) <= 0}
            className="h-8 shrink-0 rounded-full px-3 text-[12px] font-medium"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Move to payout
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <KpiCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            suffix={stat.suffix}
            hint={stat.change}
            changeType={stat.changeType}
            valueClassName={stat.valueClassName}
          />
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
