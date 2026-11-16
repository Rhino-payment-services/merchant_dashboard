"use client"
import React, { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '../../../components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatIsoDateDisplay, formatStatementPeriodLabel } from '@/lib/date-picker-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyTransactions, TransactionFilter } from '@/lib/api/transactions.api';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Activity, BarChart3, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, DollarSign, Eye, Search, Printer, CreditCard, Info, Users, AlertTriangle, Building2, Download, FileSpreadsheet, Layers } from 'lucide-react';
import { writeWorkbookToFile } from '@/lib/excel-utils';
import {
  downloadTextFile,
  fetchAllBusinessTransactions,
  merchantTransactionsToCsv,
  merchantTransactionsToExportRows,
  resolveExportDateRange,
  sanitizeMerchantFilenamePart,
} from '@/lib/utils/merchant-transaction-export';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useChildMerchantContext } from '@/lib/hooks/useChildMerchantContext';
import { getBulkTransactionStatus, getBulkTransactionList, viewBulkTransactions } from '@/lib/api/bulk-payment.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import TransactionReceipt from '@/components/TransactionReceipt';
import { useUserProfile } from '../UserProfileProvider';
import { AccessDenied } from '@/app/components/AccessDenied';
import KpiCard from '@/app/components/KpiCard';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canViewTransactions } from '@/lib/utils/permissions';
import {
  formatTransactionCharges,
  formatTransactionNetAmount,
  getTransactionDescriptionDisplay,
  getTransactionFeeAmount,
  getTransactionNetAmount,
  getTransactionReceiverParty,
  getTransactionSenderParty,
  getTransactionTypeDisplay,
  isEventLedgerTransaction,
  matchesTransactionStatusFilter,
} from '@/lib/utils/transaction-display';

type StatusType = 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | "SUCCESS";

const statusColor: Record<StatusType, string> = {
  COMPLETED: 'text-green-600 bg-green-50',
  PENDING: 'text-yellow-700 bg-yellow-50',
  PROCESSING: 'text-blue-600 bg-blue-50',
  FAILED: 'text-red-600 bg-red-50',
  CANCELLED: 'text-gray-600 bg-gray-50',
  REFUNDED: 'text-orange-600 bg-orange-50',
  SUCCESS: 'text-green-600 bg-green-50',
};

// Helper to remove duplicate admin-funded deposit rows that share the same reference/amount/etc.
// This prevents ADMIN_FUND credits from appearing twice in the UI when the ledger stores
// multiple records for the same logical funding action.
const dedupeAdminFundTransactions = (items: any[]) => {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const tx of items || []) {
    const isAdminFund = tx?.type === 'DEPOSIT' && tx?.metadata?.fundedByAdmin;
    if (!isAdminFund) {
      result.push(tx);
      continue;
    }

    // Admin funding currently comes back both as a Transaction and a LedgerEntry
    // with the same reference/amount/admin but slightly different timestamps.
    // Deduplicate purely on business identity (reference + amount + admin),
    // so we only show one logical "Admin fund" row per funding action.
    const keyParts = [
      tx.reference ?? '',
      tx.amount ?? '',
      tx.direction ?? '',
      tx.status ?? '',
      tx.metadata?.adminId ?? '',
      tx.metadata?.adminEmail ?? '',
    ];
    const key = keyParts.join('|');

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(tx);
  }

  return result;
};

const formatReferenceForDisplay = (txn: any): string => {
  const reference = String(txn?.reference || '').trim();
  if (!reference) return 'N/A';

  const isAdminFund = txn?.type === 'DEPOSIT' && txn?.metadata?.fundedByAdmin;
  if (!isAdminFund || reference.length <= 24) {
    return reference;
  }

  return `${reference.slice(0, 14)}...${reference.slice(-8)}`;
};

interface BulkTransaction {
  bulkTransactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL_SUCCESS' | 'SUCCESS';
  totalTransactions?: number;
  successfulTransactions?: number;
  failedTransactions?: number;
  pendingTransactions?: number;
  totalAmount?: number;
  totalFees?: number;
  currency?: string;
  createdAt?: string;
  completedAt?: string;
  errorMessage?: string;
  description?: string;
  transactionResults?: any[];
}

function computeNetAmountAndTotalFee(tx: any) {
  const totalFee = getTransactionFeeAmount(tx);
  const netAmountForDisplay = getTransactionNetAmount(tx);
  return { totalFee, netAmountForDisplay };
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const teamSession = useTeamPermissionSession();
  // Use ONLY session for which merchant's transactions to load (never profile – profile can be a single merchant and would show same data when switching)
  const sessionMerchantCode = (session?.user as any)?.merchantCode;
  const firstSessionMerchantCode = (session?.user as any)?.merchants?.[0]?.merchantCode;
  const currentMerchantCode = sessionMerchantCode != null
    ? String(sessionMerchantCode)
    : (firstSessionMerchantCode != null ? String(firstSessionMerchantCode) : (profile?.merchant_code ?? profile?.merchantCode) != null ? String(profile?.merchant_code ?? profile?.merchantCode ?? '') : null);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);
  const [walletView, setWalletView] = useState<'all' | 'collection' | 'disbursement'>('all');
  
  const {
    childMerchantId,
    childMerchantCode,
    childMerchantName,
    isViewingChild,
    clearChildContext,
  } = useChildMerchantContext();
  
  // When user switches business, reset to first page so we don't show wrong pagination
  React.useEffect(() => {
    setCurrentPage(1);
  }, [currentMerchantCode, childMerchantId]);

  // Receipt state
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  // Transaction details modal state
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<any>(null);

  // Bulk transaction state
  const [bulkTransactions, setBulkTransactions] = useState<BulkTransaction[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [bulkStatusFilter, setBulkStatusFilter] = useState<string>('all');
  const [selectedBulkTransaction, setSelectedBulkTransaction] = useState<BulkTransaction | null>(null);
  const [isBulkDetailsOpen, setIsBulkDetailsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Build filter object for API
  const filter: TransactionFilter = useMemo(() => {
    const apiFilter: TransactionFilter = {
      page: currentPage,
      limit: currentLimit,
    };

    if (status) apiFilter.status = status as any;
    if (from) apiFilter.startDate = from;
    if (to) apiFilter.endDate = to;
    else if (from) apiFilter.endDate = from;

    return apiFilter;
  }, [status, from, to, currentPage, currentLimit]);

  const effectiveMerchantCode = isViewingChild
    ? childMerchantCode
    : currentMerchantCode;

  const { 
    data: transactionsData, 
    isLoading, 
    error, 
    refetch, 
    isRefetching 
  } = useMyTransactions(
    filter,
    childMerchantId || undefined,
    effectiveMerchantCode,
  );

  // Debug logging
  console.log('Transactions Page - API Response:', transactionsData);
  console.log('Transactions Page - Error:', error);

  // Extract data from API response
  const rawTransactions = transactionsData?.transactions || [];
  const transactions = useMemo(
    () => dedupeAdminFundTransactions(rawTransactions),
    [rawTransactions],
  );
  const paginationInfo = transactionsData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  };

  // Helper to classify which business wallet flavour a transaction used
  const classifyWalletView = (tx: any): 'collection' | 'disbursement' | 'unknown' => {
    const t = (
      tx.businessWalletType ||
      // For debit flows, backend may expose explicit debit wallet type in metadata.
      tx.metadata?.debitWalletType ||
      tx.wallet?.walletType ||
      tx.metadata?.businessWalletType ||
      tx.metadata?.walletType ||
      ''
    )
      .toString()
      .toUpperCase();

    if (t === 'BUSINESS_DISBURSEMENT' || t === 'BUSINESS_LIQUIDATION') {
      return 'disbursement';
    }
    if (t === 'BUSINESS' || t === 'BUSINESS_COLLECTION') {
      return 'collection';
    }
    return 'unknown';
  };

  // Slice unified list into per-wallet views (collection/disbursement)
  const viewScopedTransactions = useMemo(() => {
    let base = transactions;
    if (status) {
      base = base.filter((tx: any) => matchesTransactionStatusFilter(tx, status));
    }
    if (walletView === 'all') return base;
    return base.filter((tx: any) => {
      const bucket = classifyWalletView(tx);
      if (walletView === 'collection') return bucket === 'collection';
      if (walletView === 'disbursement') return bucket === 'disbursement';
      return true;
    });
  }, [transactions, walletView, status]);

  // Filter transactions client-side by search within the current wallet view
  const filteredTransactions = useMemo(() => {
    const base = viewScopedTransactions;
    if (!search) return base;

    const searchLower = search.toLowerCase();
    return base.filter(tx => 
      tx.transactionId?.toLowerCase().includes(searchLower) ||
      tx.id?.toLowerCase().includes(searchLower) ||
      tx.reference?.toLowerCase().includes(searchLower) ||
      tx.description?.toLowerCase().includes(searchLower)
    );
  }, [viewScopedTransactions, search]);

  // Calculate total pages based on API pagination (not filtered results)
  const totalPages = paginationInfo?.totalPages || 1;

  // Helper function to get merchant business name
  const getMerchantName = () => {
    return profile?.merchantBusinessTradeName || 
           profile?.businessTradeName || 
           profile?.merchant_names || 
           profile?.owner_name || 
           'Merchant Business';
  };

  const viewerContext = {
    merchantName: getMerchantName(),
    phone:
      profile?.merchant_phone || profile?.ownerPhone || profile?.phone || '',
  };

  const exportRangeSummary = useMemo(() => {
    const range = resolveExportDateRange({ from, to });
    if (!range) return 'Invalid date range (end before start)';
    if (range.unbounded) return 'All dates';
    return formatStatementPeriodLabel(range.startDate, range.endDate);
  }, [from, to]);

  const tableDateSummary = useMemo(() => {
    if (from && to && from !== to) {
      return `${formatIsoDateDisplay(from)} – ${formatIsoDateDisplay(to)}`;
    }
    if (from) return formatIsoDateDisplay(from);
    return 'All dates (paginated)';
  }, [from, to]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Transactions refreshed');
    } catch (error) {
      toast.error('Failed to refresh transactions');
    }
  };

  const runTransactionsExport = async (format: 'csv' | 'xlsx') => {
    const range = resolveExportDateRange({ from, to });
    if (!range) {
      toast.error('End date cannot be before start date');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(
      range.unbounded
        ? 'Preparing export for all matching transactions…'
        : `Preparing export for ${formatStatementPeriodLabel(range.startDate, range.endDate)}…`,
    );
    try {
      const txs = dedupeAdminFundTransactions(
        await fetchAllBusinessTransactions(
          {
            ...(range.startDate ? { startDate: range.startDate } : {}),
            ...(range.endDate ? { endDate: range.endDate } : {}),
          },
          childMerchantId || undefined,
          effectiveMerchantCode,
        ),
      ).filter((tx) => matchesTransactionStatusFilter(tx, status || undefined));

      if (txs.length === 0) {
        toast.error('No transactions found for the selected period', { id: toastId });
        return;
      }

      const rows = merchantTransactionsToExportRows(txs, viewerContext);
      const merchantPart = sanitizeMerchantFilenamePart(getMerchantName());
      const fileLabel = range.unbounded
        ? 'all-dates'
        : range.startDate === range.endDate
          ? range.startDate
          : `${range.startDate}_to_${range.endDate}`;

      if (format === 'csv') {
        downloadTextFile(
          `${merchantPart}-transactions-${fileLabel}.csv`,
          merchantTransactionsToCsv(rows),
        );
      } else {
        await writeWorkbookToFile(
          'Transactions',
          rows,
          `${merchantPart}-transactions-${fileLabel}.xlsx`,
        );
      }

      toast.success(
        `Exported ${txs.length} transaction${txs.length === 1 ? '' : 's'}`,
        { id: toastId },
      );
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as Error).message)
          : 'Export failed';
      toast.error(message, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Bulk transaction functions
  const loadBulkTransactions = async () => {
    if (!session?.user) {
      console.log('No session found, skipping bulk transaction load');
      return;
    }

    setBulkLoading(true);
    try {
      console.log('Loading bulk transactions for user:', (session.user as any).id);
      console.log('Session data:', session);

      const response = await viewBulkTransactions({
        page: 1,
        limit: 50
      });

      console.log('Bulk transactions response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));

      if (response && response.bulkTransactions) {
        setBulkTransactions(response.bulkTransactions);
        console.log('Set bulk transactions:', response.bulkTransactions.length);
      } else {
        console.log('No bulkTransactions in response, setting empty array');
        setBulkTransactions([]);
      }

      if (response?.bulkTransactions?.length === 0) {
        console.log('No bulk transactions found for user');
      }
    } catch (error: any) {
      console.error('Error loading bulk transactions:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      toast.error('Failed to load bulk transactions');
      setBulkTransactions([]);
    } finally {
      setBulkLoading(false);
    }
  };

  const loadBulkTransactionDetails = async (bulkTransactionId: string) => {
    try {
      const details = await getBulkTransactionStatus(bulkTransactionId);
      setSelectedBulkTransaction(details);
    } catch (error) {
      console.error('Error loading bulk transaction details:', error);
      toast.error('Failed to load transaction details');
    }
  };

  // Filter bulk transactions
  const filteredBulkTransactions = useMemo(() => {
    return bulkTransactions.filter(tx => {
      const matchesSearch = !bulkSearchTerm || 
        tx.bulkTransactionId.toLowerCase().includes(bulkSearchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(bulkSearchTerm.toLowerCase());
      
      const matchesStatus = bulkStatusFilter === 'all' || tx.status.toLowerCase() === bulkStatusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [bulkTransactions, bulkSearchTerm, bulkStatusFilter]);

  // Calculate bulk summary statistics
  const bulkSummary = useMemo(() => {
    return {
      total: bulkTransactions.length,
      pending: bulkTransactions.filter(tx => tx.status === 'PENDING').length,
      processing: bulkTransactions.filter(tx => tx.status === 'PROCESSING').length,
      completed: bulkTransactions.filter(tx => tx.status === 'COMPLETED' || tx.status === 'SUCCESS').length,
      failed: bulkTransactions.filter(tx => tx.status === 'FAILED').length,
      partialSuccess: bulkTransactions.filter(tx => tx.status === 'PARTIAL_SUCCESS').length,
      totalAmount: bulkTransactions.reduce((sum, tx) => sum + (parseFloat(tx.totalAmount?.toString() || '0') || 0), 0),
      totalFees: bulkTransactions.reduce((sum, tx) => sum + (tx.totalFees || 0), 0),
    };
  }, [bulkTransactions]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      SUCCESS: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      PARTIAL_SUCCESS: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getProgressPercentage = (tx: BulkTransaction) => {
    const processed = (tx.successfulTransactions || 0) + (tx.failedTransactions || 0);
    const total = tx.totalTransactions || 1;
    return Math.round((processed / total) * 100);
  };

  // Load bulk transactions on component mount
  React.useEffect(() => {
    loadBulkTransactions();
  }, [session]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Transactions</h2>
          <p className="text-gray-600 mb-4">Failed to load your transactions. Please try again.</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!canViewTransactions(teamSession)) {
    return <AccessDenied description="You do not have permission to view transactions." />;
  }

  return (
    <>
      <Head>
        <title>Transactions - RukaPay Merchant</title>
        <meta name="description" content="View and manage all your transaction history on RukaPay" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 min-w-0">
      <div className="max-w-screen-2xl w-full min-w-0 space-y-4">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Transactions</h1>
            <p className="mt-0.5 text-[12px] text-gray-400">Wallet activity for this business</p>
          </div>
          {isViewingChild && childMerchantCode && (
            <div className="flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[12px] text-amber-800">
                Viewing {childMerchantName || childMerchantCode}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await clearChildContext();
                  refetch();
                }}
                className="text-[11px] font-medium text-amber-700 hover:underline"
              >
                My transactions
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="h-8 w-fit rounded-full bg-gray-100 p-0.5">
            <TabsTrigger value="transactions" className="h-7 rounded-full px-3 text-[12px] data-[state=active]:shadow-none">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="tracking" className="h-7 rounded-full px-3 text-[12px] data-[state=active]:shadow-none">
              Bulk tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-gray-400">Wallet</span>
              <div className="inline-flex rounded-full border border-gray-100 bg-white p-0.5">
                {([
                  ['all', 'All'],
                  ['collection', 'Collection'],
                  ['disbursement', 'Payout'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setWalletView(value)}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium ${
                      walletView === value
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <Label htmlFor="txn-search" className="mb-1.5 block text-xs font-medium text-gray-700">
                  Search
                </Label>
                <Input
                  id="txn-search"
                  placeholder="Reference, description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="md:col-span-3">
                <Label className="mb-1.5 block text-xs font-medium text-gray-700">Status</Label>
                <Select
                  value={status || 'all'}
                  onValueChange={(value) => {
                    setStatus(value === 'all' ? '' : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block text-xs font-medium text-gray-700">Per page</Label>
                <Select
                  value={String(currentLimit)}
                  onValueChange={(value) => {
                    setCurrentLimit(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex md:col-span-2 md:justify-end">
                <Button
                  type="button"
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={isRefetching}
                  className="h-8 w-full rounded-full px-3 text-[12px] md:w-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Label className="text-xs font-medium text-gray-700">Date range &amp; export</Label>
                <span className="text-xs text-gray-500">
                  Export:{' '}
                  <span className="font-medium text-[#08163d]">{exportRangeSummary}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DateRangePicker
                  layout="inline"
                  from={from}
                  to={to}
                  onFromChange={(value) => {
                    setFrom(value);
                    setCurrentPage(1);
                  }}
                  onToChange={(value) => {
                    setTo(value);
                    setCurrentPage(1);
                  }}
                  onClear={() => {
                    setFrom('');
                    setTo('');
                    setCurrentPage(1);
                  }}
                />
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={() => runTransactionsExport('csv')}
                    variant="outline"
                    disabled={isExporting}
                    className="h-8 px-2.5 text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {isExporting ? '…' : 'CSV'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => runTransactionsExport('xlsx')}
                    className="h-8 bg-[#08163d] px-2.5 text-xs hover:bg-[#131824]"
                    disabled={isExporting}
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                    Excel
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Table: <span className="font-medium text-gray-700">{tableDateSummary}</span>
                {search ? (
                  <>
                    {' '}
                    · Search: <span className="font-medium text-gray-700">{search}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden min-w-0 rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="overflow-x-auto max-w-full">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Reference</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Sender</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Receiver</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Amount</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Charges</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Net</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Wallet</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Type</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Status</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Description</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400">Date</TableHead>
                  <TableHead className="h-8 text-[11px] font-medium text-gray-400"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="flex items-center justify-center text-[13px] text-gray-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        <span className="ml-2">Loading transactions…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="text-[13px] text-gray-400">No transactions found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    // Extract sender and receiver information with contact details
                    const txn = transaction as any;
                    const senderInfo = getTransactionSenderParty(txn, viewerContext);
                    const receiverInfo = getTransactionReceiverParty(txn, viewerContext);

                    return (
                      <TableRow key={transaction.id} className="hover:bg-gray-50/80">
                        <TableCell className="py-2.5 font-mono text-[12px] text-gray-600" title={transaction.reference || 'N/A'}>
                          {formatReferenceForDisplay(transaction)}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="min-w-0 max-w-[140px]">
                            <div className="truncate text-[12px] font-medium text-gray-800" title={senderInfo.name}>
                              {senderInfo.name}
                            </div>
                            {senderInfo.contact && (
                              <div className="truncate text-[11px] text-gray-400" title={senderInfo.contact}>
                                {senderInfo.contact}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="min-w-0 max-w-[140px]">
                            <div className="truncate text-[12px] font-medium text-gray-800" title={receiverInfo.name}>
                              {receiverInfo.name}
                            </div>
                            {receiverInfo.contact && (
                              <div className="truncate text-[11px] text-gray-400" title={receiverInfo.contact}>
                                {receiverInfo.contact}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="text-[13px] font-semibold tabular-nums text-gray-900">
                            <span className="mr-1 text-[11px] font-medium text-gray-400">UGX</span>
                            {Number(transaction.amount).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-[12px] text-gray-600">
                          {formatTransactionCharges(transaction)}
                        </TableCell>
                        <TableCell className="py-2.5 text-[12px] font-medium text-emerald-700">
                          {formatTransactionNetAmount(transaction)}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {(() => {
                            const bucket = classifyWalletView(transaction as any);
                            if (bucket === 'disbursement') {
                              return (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                  Payout
                                </span>
                              );
                            }
                            if (bucket === 'collection') {
                              return (
                                <span className="inline-flex items-center rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                                  Collection
                                </span>
                              );
                            }
                            return <span className="text-[11px] text-gray-300">—</span>;
                          })()}
                        </TableCell>
                        <TableCell className="py-2.5 text-[12px] text-gray-700">
                          {getTransactionTypeDisplay(transaction)}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColor[transaction.status as StatusType]}`}>
                            {transaction.status}
                          </span>
                        </TableCell>
                        <TableCell
                          className="py-2.5 max-w-[160px] truncate text-[12px] text-gray-500"
                          title={getTransactionDescriptionDisplay(transaction)}
                        >
                          {getTransactionDescriptionDisplay(transaction)}
                        </TableCell>
                        <TableCell className="py-2.5 whitespace-nowrap text-[12px] text-gray-500">
                          {new Date(transaction.createdAt).toLocaleString('en-UG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransactionForDetails(transaction);
                                setIsTransactionDetailsOpen(true);
                              }}
                              title="View Details"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setIsReceiptOpen(true);
                              }}
                              title="Print Receipt"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-800"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
            <div className="text-[12px] text-gray-400">
              {((currentPage - 1) * currentLimit) + 1}–{Math.min(currentPage * currentLimit, paginationInfo?.total || 0)} of {paginationInfo?.total || 0}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || isLoading}
                className="h-7 w-7 p-0"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-1 text-[12px] text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages || isLoading}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages || isLoading}
                className="h-7 w-7 p-0"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="tracking" className="mt-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <KpiCard icon={Layers} label="Bulk payments" value={String(bulkSummary.total)} hint="All batches" />
              <KpiCard icon={CheckCircle} label="Completed" value={String(bulkSummary.completed)} hint="Successful batches" />
              <KpiCard icon={XCircle} label="Failed" value={String(bulkSummary.failed)} hint="Batches with errors" />
              <KpiCard icon={Clock} label="Pending" value={String(bulkSummary.pending)} hint="Still processing" />
              <KpiCard
                icon={DollarSign}
                label="Total amount"
                value={Number(bulkSummary.totalAmount || 0).toLocaleString()}
                suffix="UGX"
                hint="Processed volume"
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <Input
                        placeholder="Search bulk ID or description…"
                        value={bulkSearchTerm}
                        onChange={(e) => setBulkSearchTerm(e.target.value)}
                        className="h-8 pl-9 text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={bulkStatusFilter}
                      onChange={(e) => setBulkStatusFilter(e.target.value)}
                      className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                    >
                      <option value="all">All status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="partial_success">Partial Success</option>
                    </select>
                    <Button
                      onClick={loadBulkTransactions}
                      disabled={bulkLoading}
                      variant="outline"
                      className="h-8 rounded-full px-3 text-[12px]"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${bulkLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
            </div>

            <div className="overflow-hidden min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Bulk transactions</h3>
                <div className="overflow-x-auto max-w-full">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Bulk ID</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Status</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Progress</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Amount</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Items</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Created</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400">Details</TableHead>
                      <TableHead className="h-8 text-[11px] font-medium text-gray-400"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBulkTransactions.map((tx) => (
                      <TableRow key={tx.bulkTransactionId}>
                        <TableCell className="font-mono text-sm">
                          {tx.bulkTransactionId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(tx.status)}
                            {tx.errorMessage && (
                              <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                                {tx.errorMessage}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage(tx)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {getProgressPercentage(tx)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">UGX {(tx.totalAmount || 0).toLocaleString()}</div>
                            {(tx.totalFees || 0) > 0 && (
                              <div className="text-gray-500">Fee: UGX {(tx.totalFees || 0).toLocaleString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="text-green-600">{tx.successfulTransactions || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span className="text-red-600">{tx.failedTransactions || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-yellow-600" />
                              <span className="text-yellow-600">{tx.pendingTransactions || 0}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <div className="space-y-1">
                            <div>
                              <span className="text-xs text-gray-400">Created:</span>
                              <div>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            {tx.completedAt && (
                              <div>
                                <span className="text-xs text-gray-400">Completed:</span>
                                <div>{new Date(tx.completedAt).toLocaleDateString()}</div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1 max-w-xs">
                            {tx.transactionResults && tx.transactionResults.length > 0 ? (
                              tx.transactionResults.slice(0, 3).map((result: any, index: number) => (
                                <div key={index} className="flex items-center gap-1 p-1 bg-gray-50 rounded">
                                  <div className={`w-2 h-2 rounded-full ${
                                    result.status === 'SUCCESS' ? 'bg-green-500' :
                                    result.status === 'FAILED' ? 'bg-red-500' :
                                    'bg-yellow-500'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate">
                                      {result.amount} {result.currency}
                                    </div>
                                    {result.errorMessage && (
                                      <div className="text-red-500 text-xs truncate">
                                        {result.errorMessage}
                                      </div>
                                    )}
                                    {result.externalReference && (
                                      <div className="text-gray-400 text-xs truncate">
                                        Ref: {result.externalReference}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">No transactions</span>
                            )}
                            {tx.transactionResults && tx.transactionResults.length > 3 && (
                              <div className="text-gray-400 text-xs">
                                +{tx.transactionResults.length - 3} more
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBulkTransaction(tx);
                              setIsBulkDetailsOpen(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {filteredBulkTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bulk transactions found</h3>
                    <p className="text-gray-500 mb-4">
                      {bulkTransactions.length === 0 
                        ? "You haven't created any bulk payments yet. Start by creating a bulk payment to track its progress here."
                        : "No transactions match your current search criteria."
                      }
                    </p>
                    {bulkTransactions.length === 0 && (
                      <Button 
                        onClick={() => window.location.href = '/bulk-payment'}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Create Bulk Payment
                      </Button>
                    )}
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Transaction Details Modal */}
      <Dialog open={isBulkDetailsOpen} onOpenChange={setIsBulkDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Bulk Transaction Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBulkTransaction && (
            <div className="space-y-6">
              {/* Bulk Transaction Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">Bulk ID</div>
                  <div className="font-mono text-sm">{selectedBulkTransaction.bulkTransactionId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div>{getStatusBadge(selectedBulkTransaction.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="font-semibold">
                    {(
                      (selectedBulkTransaction.totalAmount || 0) +
                      (selectedBulkTransaction.totalFees || 0)
                    ).toLocaleString()}{' '}
                    {selectedBulkTransaction.currency}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="text-sm">{selectedBulkTransaction.createdAt ? new Date(selectedBulkTransaction.createdAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              {/* Transaction Results */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Individual Transactions</h3>
                <div className="space-y-3">
                  {selectedBulkTransaction.transactionResults && selectedBulkTransaction.transactionResults.length > 0 ? (
                    selectedBulkTransaction.transactionResults.map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              result.status === 'SUCCESS' ? 'bg-green-500' :
                              result.status === 'FAILED' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`} />
                            <span className="font-medium">{result.status}</span>
                            <span className="text-gray-500">•</span>
                            <span className="font-semibold">{result.amount} {result.currency}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.processedAt ? new Date(result.processedAt).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Transaction ID</div>
                            <div className="font-mono">{result.transactionId}</div>
                          </div>
                          {result.itemId && (
                            <div>
                              <div className="text-gray-500">Item ID</div>
                              <div className="font-mono">{result.itemId}</div>
                            </div>
                          )}
                          {result.externalReference && (
                            <div>
                              <div className="text-gray-500">External Reference</div>
                              <div className="font-mono">{result.externalReference}</div>
                            </div>
                          )}
                        </div>
                        
                        {result.errorMessage && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <div className="text-sm text-red-600">
                              <strong>Error:</strong> {result.errorMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No transaction details available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Details Modal */}
      <Dialog open={isTransactionDetailsOpen} onOpenChange={setIsTransactionDetailsOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          {selectedTransactionForDetails && (() => {
            const txn = selectedTransactionForDetails;
            const senderInfo = getTransactionSenderParty(txn, viewerContext);
            const receiverInfo = getTransactionReceiverParty(txn, viewerContext);
            const { totalFee, netAmountForDisplay } = computeNetAmountAndTotalFee(txn);
            const formatAmount = (amount: number) => {
              return new Intl.NumberFormat('en-UG', {
                style: 'currency',
                currency: txn.currency || 'UGX',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(amount);
            };
            const formatDate = (date: string | Date) => {
              return new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            };
            const getStatusBadge = (status: string) => {
              const statusColors: Record<string, string> = {
                SUCCESS: 'bg-green-100 text-green-800 border-green-200',
                COMPLETED: 'bg-green-100 text-green-800 border-green-200',
                FAILED: 'bg-red-100 text-red-800 border-red-200',
                PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
              };
              return (
                <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}>
                  {status}
                </Badge>
              );
            };

            return (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border-2 ${
                  txn.status === 'SUCCESS' || txn.status === 'COMPLETED'
                    ? 'bg-green-50 border-green-200'
                    : txn.status === 'FAILED'
                    ? 'bg-red-50 border-red-200'
                    : txn.status === 'PENDING' || txn.status === 'PROCESSING'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {txn.status === 'SUCCESS' || txn.status === 'COMPLETED' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : txn.status === 'FAILED' ? (
                      <XCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <Clock className="h-8 w-8 text-yellow-600" />
                    )}
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${
                        txn.status === 'SUCCESS' || txn.status === 'COMPLETED'
                          ? 'text-green-900'
                          : txn.status === 'FAILED'
                          ? 'text-red-900'
                          : 'text-yellow-900'
                      }`}>
                        Transaction {txn.status === 'SUCCESS' || txn.status === 'COMPLETED' ? 'Completed' : txn.status === 'FAILED' ? 'Failed' : txn.status}
                      </h3>
                      <p className={`text-sm ${
                        txn.status === 'SUCCESS' || txn.status === 'COMPLETED'
                          ? 'text-green-700'
                          : txn.status === 'FAILED'
                          ? 'text-red-700'
                          : 'text-yellow-700'
                      }`}>
                        {txn.status === 'SUCCESS' || txn.status === 'COMPLETED'
                          ? 'This transaction was processed successfully'
                          : txn.status === 'FAILED'
                          ? 'This transaction could not be completed'
                          : 'This transaction is being processed'}
                      </p>
                    </div>
                    {getStatusBadge(txn.status)}
                  </div>

                  {/* Failure Reason */}
                  {txn.status === 'FAILED' && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-900 text-sm">Failure Reason:</p>
                          <p className="text-red-800 text-sm mt-1 font-medium">
                            {txn.errorMessage || txn.metadata?.errorMessage || txn.failureReason || txn.metadata?.failureReason || 'Transaction failed due to processing error. Please contact support for more details.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                      <Info className="h-4 w-4" />
                      Basic Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono font-medium text-gray-900 text-xs">
                          {txn.reference || txn.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900">{getTransactionTypeDisplay(txn)}</span>
                      </div>
                      {isEventLedgerTransaction(txn) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Event Order Ref:</span>
                          <span className="font-medium text-gray-900">
                            {txn.metadata?.merchantEventOrderReference || 'N/A'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date & Time:</span>
                        <span className="font-medium text-gray-900">{formatDate(txn.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Direction:</span>
                        <span className="font-medium text-gray-900">
                          {txn.direction === 'DEBIT' ? '📤 Outgoing' : '📥 Incoming'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                      <DollarSign className="h-4 w-4" />
                      Amount Breakdown
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction Amount:</span>
                        <span className="font-bold text-gray-900">
                          {formatAmount(Number(txn.amount || 0))}
                        </span>
                      </div>
                      {totalFee > 0 && (
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-blue-600">Transaction Fee:</span>
                          <span className="font-medium text-blue-600">
                            {formatAmount(totalFee)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 pt-2 mt-2">
                        <span className="text-green-600 font-bold">
                          {txn.direction === 'CREDIT'
                            ? 'Net Amount (to wallet):'
                            : 'Total Debited:'}
                        </span>
                        <span className="font-bold text-green-600 text-lg">
                          {formatAmount(netAmountForDisplay)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sender & Receiver Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Sender
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">{senderInfo.name}</span>
                      </div>
                      {senderInfo.contact && (
                        <div className="text-blue-600">
                          📱 {senderInfo.contact}
                        </div>
                      )}
                      {txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin && (
                        <div className="text-xs text-purple-600 font-medium mt-1">
                          👨‍💼 Admin Funding
                        </div>
                      )}
                      {(txn.metadata?.sweepToDisbursement || txn.metadata?.sweepFromCollection) && (
                        <div className="text-xs text-amber-700 font-medium mt-1">
                          Debited: {txn.metadata?.debitWalletType || 'Collection'} wallet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Receiver */}
                  <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Receiver
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-green-700 font-medium">{receiverInfo.name}</span>
                      </div>
                      {receiverInfo.contact && (
                        <div className="text-green-600">
                          📱 {receiverInfo.contact}
                        </div>
                      )}
                      {txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          💰 Wallet Credit
                        </div>
                      )}
                      {(txn.metadata?.sweepToDisbursement || txn.metadata?.sweepFromCollection) && (
                        <div className="text-xs text-green-700 font-medium mt-1">
                          Credited: {txn.metadata?.creditWalletType || 'Disbursement'} wallet
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-700">
                    {getTransactionDescriptionDisplay(txn)}
                  </p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <TransactionReceipt
              transaction={selectedTransaction}
              merchantInfo={{
                businessName: profile?.merchantBusinessTradeName || profile?.businessTradeName || 'Merchant',
                merchantCode: profile?.merchantCode,
                phone: profile?.ownerPhone || profile?.phone,
                email: profile?.ownerEmail || profile?.email,
                address: profile?.businessAddress || undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}