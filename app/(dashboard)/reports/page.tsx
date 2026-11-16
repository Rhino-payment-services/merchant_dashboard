"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserProfile } from '../UserProfileProvider';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canViewReports } from '@/lib/utils/permissions';
import {
  TransactionFilter,
  getBusinessWalletStatement,
  useMyTransactions,
} from '@/lib/api/transactions.api';
import { getWalletBalance } from '@/lib/api/wallet.api';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Landmark,
  Wallet,
  Filter,
  BarChart3,
  PieChart,
  DownloadCloud,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Chart } from '../../components/chart';
import { writeWorkbookWithSheetsToFile } from '@/lib/excel-utils';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useChildMerchantContext } from '@/lib/hooks/useChildMerchantContext';
import {
  currentMonthToTodayRange,
  formatStatementPeriodLabel,
} from '@/lib/date-picker-utils';
import {
  downloadTextFile,
  fetchAllBusinessTransactions,
  merchantStatementCoverRows,
  merchantStatementCsvPreamble,
  merchantTransactionsToCsv,
  merchantTransactionsToExportRows,
  resolveExportDateRange,
  sanitizeMerchantFilenamePart,
} from '@/lib/utils/merchant-transaction-export';
import KpiCard from '@/app/components/KpiCard';
import {
  getTransactionNetAmount,
  getTransactionReceiverParty,
  getTransactionSenderParty,
  isSweepTransaction,
} from '@/lib/utils/transaction-display';

interface Transaction {
  /** Stable unique row id (DB transaction id) — references can repeat for sweep pairs */
  rowKey: string;
  rdbs_transaction_id: string;
  rdbs_approval_date: string;
  rdbs_sender_name: string;
  rdbs_receiver_name: string;
  rdbs_receiver_number: string;
  rdbs_amount: number;
  rdbs_type: 'credit' | 'debit';
  rdbs_approval_status: 'success' | 'pending' | 'failed';
  rdbs_date?: string;
  /** Internal collection↔disbursement transfer — exclude from P&L */
  isSweep?: boolean;
  /** Original API transaction for accurate P&L aggregation */
  raw?: any;
}

interface ReportSummary {
  openingBalance: number;
  totalNetCredit: number;
  totalNetDebit: number;
  closingBalance: number;
  successfulCount: number;
  currency: string;
  totalTransactions: number;
  creditTransactions: number;
  debitTransactions: number;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const { profile, loading: profileLoading } = useUserProfile();
  const teamSession = useTeamPermissionSession();
  const sessionMerchantCode = (session?.user as { merchantCode?: string })?.merchantCode;
  const firstSessionMerchantCode = (session?.user as { merchants?: { merchantCode?: string }[] })?.merchants?.[0]?.merchantCode;
  const currentMerchantCode =
    sessionMerchantCode != null
      ? String(sessionMerchantCode)
      : firstSessionMerchantCode != null
        ? String(firstSessionMerchantCode)
        : (profile?.merchant_code ?? profile?.merchantCode) != null
          ? String(profile?.merchant_code ?? profile?.merchantCode ?? '')
          : null;

  const {
    childMerchantId,
    childMerchantCode,
    isViewingChild,
  } = useChildMerchantContext();
  const effectiveMerchantCode = isViewingChild
    ? childMerchantCode
    : currentMerchantCode;

  const [dateRange, setDateRange] = useState(currentMonthToTodayRange);
  const [transactionType, setTransactionType] = useState<'all' | 'credit' | 'debit'>('all');
  const [status, setStatus] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Paginated list for the table — full history is only fetched on export.
  // Status/direction/search are applied client-side on the current page
  // (business transactions API does not accept those filters).
  const reportApiFilter = useMemo(() => {
    const filter: TransactionFilter = {
      page: currentPage,
      limit: itemsPerPage,
    };
    if (dateRange.from) filter.startDate = dateRange.from;
    if (dateRange.to) filter.endDate = dateRange.to;
    else if (dateRange.from) filter.endDate = dateRange.from;
    return filter;
  }, [dateRange, currentPage, itemsPerPage]);

  const {
    data: transactionsPage,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useMyTransactions(
    reportApiFilter,
    childMerchantId || undefined,
    effectiveMerchantCode,
  );

  const apiTransactions = transactionsPage?.transactions || [];
  const paginationInfo = transactionsPage?.pagination || {
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 1,
  };

  const { data: walletBalances, refetch: refetchWalletBalances } = useQuery({
    queryKey: ['reports', 'wallet-balance', childMerchantId],
    queryFn: () => getWalletBalance(childMerchantId || undefined),
    staleTime: 30000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const statementRange = useMemo(() => {
    const range = resolveExportDateRange({
      from: dateRange.from,
      to: dateRange.to,
    });
    if (range && !range.unbounded && range.startDate && range.endDate) {
      return { startDate: range.startDate, endDate: range.endDate };
    }
    const fallback = currentMonthToTodayRange();
    return { startDate: fallback.from, endDate: fallback.to };
  }, [dateRange]);

  const {
    data: statement,
    isLoading: statementLoading,
    refetch: refetchStatement,
  } = useQuery({
    queryKey: [
      'reports',
      'statement',
      statementRange.startDate,
      statementRange.endDate,
      childMerchantId,
      effectiveMerchantCode,
    ],
    queryFn: () =>
      getBusinessWalletStatement(
        statementRange.startDate,
        statementRange.endDate,
        childMerchantId || undefined,
        effectiveMerchantCode,
      ),
    staleTime: 30000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: Boolean(statementRange.startDate && statementRange.endDate),
  });

  const merchants = (session?.user as { merchants?: { merchantCode?: string; featureBulkPayments?: boolean }[] })?.merchants ?? [];
  const currentMerchant = Array.isArray(merchants)
    ? merchants.find((m) => m?.merchantCode === currentMerchantCode)
    : undefined;
  const liveMerchantData =
    (profile as { merchantData?: { featureBulkPayments?: boolean } } | null)?.merchantData;
  const featureBulkPayments =
    (liveMerchantData?.featureBulkPayments ?? currentMerchant?.featureBulkPayments) === true;
  const hasSplitBalances =
    featureBulkPayments &&
    walletBalances?.collectionBalance != null &&
    walletBalances?.disbursementBalance != null;

  const getMerchantViewerContext = () => ({
    merchantName:
      profile?.merchant_names ||
      profile?.merchantBusinessTradeName ||
      profile?.businessTradeName ||
      'Merchant',
    phone: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || '',
    merchantCode: effectiveMerchantCode || undefined,
  });

  // Transform API transactions to the format expected by the reports page
  const transformTransaction = (apiTxn: any): Transaction => {
    const mapStatus = (apiStatus: string): 'success' | 'pending' | 'failed' => {
      if (apiStatus === 'COMPLETED' || apiStatus === 'SUCCESS') return 'success';
      if (apiStatus === 'PENDING' || apiStatus === 'PROCESSING') return 'pending';
      return 'failed';
    };

    const viewer = getMerchantViewerContext();
    const sender = getTransactionSenderParty(apiTxn, viewer);
    const receiver = getTransactionReceiverParty(apiTxn, viewer);
    const isWalletFunding =
      apiTxn.type === 'DEPOSIT' ||
      apiTxn.type === 'WALLET_FUNDING' ||
      (apiTxn.direction === 'CREDIT' && apiTxn.metadata?.fundedByAdmin);

    return {
      rowKey:
        String(apiTxn.id || '') ||
        `${apiTxn.reference || 'txn'}-${apiTxn.direction || ''}-${apiTxn.walletId || ''}-${apiTxn.createdAt || ''}`,
      rdbs_transaction_id: apiTxn.reference || apiTxn.transactionId || apiTxn.id || '',
      rdbs_approval_date: apiTxn.createdAt || apiTxn.updatedAt || new Date().toISOString(),
      rdbs_sender_name: sender.name,
      rdbs_receiver_name: receiver.name,
      rdbs_receiver_number: receiver.contact || 'N/A',
      rdbs_amount: getTransactionNetAmount(apiTxn),
      rdbs_type: isWalletFunding ? 'credit' : (apiTxn.direction === 'CREDIT' ? 'credit' : 'debit'),
      rdbs_approval_status: mapStatus(apiTxn.status || 'PENDING'),
      rdbs_date: apiTxn.createdAt || apiTxn.updatedAt,
      isSweep: isSweepTransaction(apiTxn),
      raw: apiTxn,
    };
  };

  // Transform current page of API transactions
  const transactions: Transaction[] = useMemo(() => {
    return apiTransactions.map(transformTransaction);
  }, [apiTransactions, profile]);

  // Status/type/search: client-side on the current page (API has no those filters).
  const filteredTransactions = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return transactions.filter((txn) => {
      const matchesType = transactionType === 'all' || txn.rdbs_type === transactionType;
      const matchesStatus = status === 'all' || txn.rdbs_approval_status === status;
      const matchesSearch =
        !searchTerm ||
        txn.rdbs_sender_name.toLowerCase().includes(q) ||
        txn.rdbs_receiver_name.toLowerCase().includes(q) ||
        txn.rdbs_receiver_number.toLowerCase().includes(q) ||
        txn.rdbs_transaction_id.toLowerCase().includes(q);
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [transactions, searchTerm, transactionType, status]);

  const totalPages = Math.max(1, paginationInfo.totalPages || 1);
  const startIndex =
    ((paginationInfo.page || currentPage) - 1) * (paginationInfo.limit || itemsPerPage);
  const endIndex = startIndex + filteredTransactions.length;
  const paginatedTransactions = filteredTransactions;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, transactionType, status, searchTerm, itemsPerPage]);

  // Period statement drives KPIs; list is independently paginated.
  const summary: ReportSummary = useMemo(() => {
    const totalNetCredit = Number(statement?.totalNetCredit || 0);
    const totalNetDebit = Number(statement?.totalNetDebit || 0);
    const successfulCount = Number(statement?.successfulCount || 0);
    // Approximate credit/debit share by amount when we no longer download all rows.
    const volume = totalNetCredit + totalNetDebit;
    const creditTransactions =
      volume > 0
        ? Math.round((totalNetCredit / volume) * successfulCount)
        : 0;
    const debitTransactions = Math.max(0, successfulCount - creditTransactions);

    return {
      openingBalance: Number(statement?.openingBalance || 0),
      totalNetCredit,
      totalNetDebit,
      closingBalance: Number(statement?.closingBalance || 0),
      successfulCount,
      currency: statement?.currency || 'UGX',
      totalTransactions: paginationInfo.total || 0,
      creditTransactions,
      debitTransactions,
    };
  }, [statement, paginationInfo.total]);

  const successfulVolume = summary.creditTransactions + summary.debitTransactions;
  // Period-level chart from statement totals (avoids downloading the full period list).
  const chartTransactions = useMemo(() => {
    if (!statementRange.startDate || !statementRange.endDate) return [];
    return [
      {
        rowKey: 'statement-credit',
        rdbs_transaction_id: 'period-credit',
        rdbs_approval_date: statementRange.endDate,
        rdbs_sender_name: '',
        rdbs_receiver_name: '',
        rdbs_receiver_number: '',
        rdbs_amount: Number(statement?.totalNetCredit || 0),
        rdbs_type: 'credit' as const,
        rdbs_approval_status: 'success' as const,
      },
      {
        rowKey: 'statement-debit',
        rdbs_transaction_id: 'period-debit',
        rdbs_approval_date: statementRange.endDate,
        rdbs_sender_name: '',
        rdbs_receiver_name: '',
        rdbs_receiver_number: '',
        rdbs_amount: Number(statement?.totalNetDebit || 0),
        rdbs_type: 'debit' as const,
        rdbs_approval_status: 'success' as const,
      },
    ];
  }, [statement, statementRange]);

  const loadTransactionsForExport = async () => {
    const range = statementRange;
    const toastId = toast.loading(
      `Loading transactions for ${formatStatementPeriodLabel(range.startDate, range.endDate)}…`,
    );
    try {
      const filter: TransactionFilter = {
        startDate: range.startDate,
        endDate: range.endDate,
      };
      if (status !== 'all') {
        if (status === 'success') filter.status = 'COMPLETED';
        else if (status === 'pending') filter.status = 'PENDING';
        else if (status === 'failed') filter.status = 'FAILED';
      }
      if (transactionType !== 'all') {
        filter.direction = transactionType === 'credit' ? 'CREDIT' : 'DEBIT';
      }

      const apiTxs = await fetchAllBusinessTransactions(
        filter,
        childMerchantId || undefined,
        effectiveMerchantCode,
      );

      if (apiTxs.length === 0) {
        toast.error('No transactions found for the selected period', { id: toastId });
        return null;
      }

      toast.dismiss(toastId);
      return { apiTxs, range, statement: summary };
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as Error).message)
          : 'Failed to load transactions';
      toast.error(message, { id: toastId });
      return null;
    }
  };

  const exportFileLabel = (range: { startDate: string; endDate: string }) =>
    range.startDate === range.endDate
      ? range.startDate
      : `${range.startDate}_to_${range.endDate}`;

  // Export to Excel
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const loaded = await loadTransactionsForExport();
      if (!loaded) {
        return;
      }

      const { apiTxs, range, statement: statementSummary } = loaded;
      const viewer = getMerchantViewerContext();
      const exportData = merchantTransactionsToExportRows(apiTxs, viewer, 'statement');
      const summaryData = merchantStatementCoverRows(viewer, range, statementSummary);

      const merchantName = viewer.merchantName;
      const sanitizedMerchantName = sanitizeMerchantFilenamePart(merchantName);
      const filename = `${sanitizedMerchantName}-statement-${exportFileLabel(range)}.xlsx`;

      await writeWorkbookWithSheetsToFile(
        [
          { name: 'Statement', data: summaryData },
          { name: 'Transactions', data: exportData },
        ],
        filename
      );
      toast.success(`Exported ${apiTxs.length} transaction${apiTxs.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCsv = async () => {
    setIsExporting(true);
    try {
      const loaded = await loadTransactionsForExport();
      if (!loaded) {
        return;
      }
      const { apiTxs, range, statement: statementSummary } = loaded;
      const viewer = getMerchantViewerContext();
      const rows = merchantTransactionsToExportRows(apiTxs, viewer, 'statement');
      const merchantName = sanitizeMerchantFilenamePart(viewer.merchantName);
      downloadTextFile(
        `${merchantName}-statement-${exportFileLabel(range)}.csv`,
        merchantStatementCsvPreamble(viewer, range, statementSummary) +
          merchantTransactionsToCsv(rows, 'statement'),
      );
      toast.success(`Exported ${apiTxs.length} transaction${apiTxs.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('CSV export failed:', error);
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const loaded = await loadTransactionsForExport();
      if (!loaded) {
        return;
      }

      const { apiTxs, range, statement: statementSummary } = loaded;
      const viewer = getMerchantViewerContext();
      const exportTransactions = apiTxs.map((apiTxn) => {
        const sender = getTransactionSenderParty(apiTxn, viewer);
        const receiver = getTransactionReceiverParty(apiTxn, viewer);
        return {
          rdbs_transaction_id: apiTxn.reference || apiTxn.id || '',
          rdbs_approval_date: apiTxn.createdAt || apiTxn.updatedAt || new Date().toISOString(),
          rdbs_sender_name: sender.name,
          rdbs_receiver_name: receiver.name,
          rdbs_receiver_number: receiver.contact || 'N/A',
          rdbs_amount: getTransactionNetAmount(apiTxn),
          rdbs_type: apiTxn.direction === 'CREDIT' ? ('credit' as const) : ('debit' as const),
          rdbs_approval_status:
            apiTxn.status === 'COMPLETED' || apiTxn.status === 'SUCCESS'
              ? ('success' as const)
              : apiTxn.status === 'PENDING' || apiTxn.status === 'PROCESSING'
                ? ('pending' as const)
                : ('failed' as const),
        };
      });

      // Create a text-based PDF instead of image-based to avoid CSS issues
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      
      const merchantName = viewer.merchantName;
      const periodLabel = formatStatementPeriodLabel(range.startDate, range.endDate);
      const money = (value: number) =>
        `UGX ${Number(value || 0).toLocaleString()}`;
      
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${merchantName} Wallet Statement`, pageWidth / 2, margin + 10, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Statement period: ${periodLabel}  ·  Inclusive dates`,
        pageWidth / 2,
        margin + 18,
        { align: 'center' },
      );
      pdf.text(
        `Generated: ${new Date().toLocaleString('en-UG')}`,
        pageWidth / 2,
        margin + 24,
        { align: 'center' },
      );
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Period summary', margin, margin + 40);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      let yPosition = margin + 50;
      
      pdf.text(`Opening balance: ${money(statementSummary.openingBalance)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Amount deposited (net collection): ${money(statementSummary.totalNetCredit)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Amount spent (net payout): ${money(statementSummary.totalNetDebit)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Closing balance: ${money(statementSummary.closingBalance)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(
        `${statementSummary.successfulCount} successful transactions`,
        margin,
        yPosition,
      );
      yPosition += 8;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.text(
        `Opening + deposits − spending = ${money(
          statementSummary.openingBalance +
            statementSummary.totalNetCredit -
            statementSummary.totalNetDebit,
        )}`,
        margin,
        yPosition,
      );
      pdf.setFont('helvetica', 'normal');
      
      // Add transactions table
      yPosition += 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Transaction Details (${exportTransactions.length} transactions)`, margin, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Table headers
      const headers = ['Transaction ID', 'Date', 'Sender', 'Receiver', 'Receiver No.', 'Type', 'Amount (UGX)', 'Status'];
      const columnWidths = [28, 20, 32, 30, 28, 16, 26, 20];
      let xPosition = margin;
      
      // Draw header background
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
      
      headers.forEach((header, index) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(header, xPosition, yPosition);
        xPosition += columnWidths[index];
      });
      
      yPosition += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      // Add transaction data
      const transactionsPerPage = 18;
      let transactionCount = 0;
      
      exportTransactions.forEach((txn, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - margin - 10) {
          pdf.addPage();
          yPosition = margin + 20;
          
          // Redraw headers on new page
          xPosition = margin;
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          headers.forEach((header, headerIndex) => {
            pdf.text(header, xPosition, yPosition);
            xPosition += columnWidths[headerIndex];
          });
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          transactionCount = 0;
        }
        
        xPosition = margin;
        
        // Transaction ID (truncate if too long, handle empty strings)
        const transactionId = (txn.rdbs_transaction_id || 'N/A').toString();
        const displayId = transactionId.length > 15 ? transactionId.substring(0, 15) + '...' : transactionId;
        pdf.text(displayId, xPosition, yPosition);
        xPosition += columnWidths[0];
        
        // Date
        const transactionDate = new Date(txn.rdbs_approval_date);
        pdf.text(transactionDate.toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' }), xPosition, yPosition);
        xPosition += columnWidths[1];
        
        // Sender name (truncate if too long, handle empty strings)
        const senderName = (txn.rdbs_sender_name || 'N/A').toString();
        const displayName = senderName.length > 15 ? senderName.substring(0, 15) + '...' : senderName;
        pdf.text(displayName, xPosition, yPosition);
        xPosition += columnWidths[2];

        // Receiver name
        const receiverName = (txn.rdbs_receiver_name || 'N/A').toString();
        const displayReceiver = receiverName.length > 14 ? receiverName.substring(0, 14) + '...' : receiverName;
        pdf.text(displayReceiver, xPosition, yPosition);
        xPosition += columnWidths[3];

        // Receiver number
        const receiverNumber = (txn.rdbs_receiver_number || 'N/A').toString();
        const displayReceiverNumber = receiverNumber.length > 14 ? receiverNumber.substring(0, 14) + '...' : receiverNumber;
        pdf.text(displayReceiverNumber, xPosition, yPosition);
        xPosition += columnWidths[4];
        
        // Type
        pdf.text(txn.rdbs_type?.toUpperCase() || 'N/A', xPosition, yPosition);
        xPosition += columnWidths[5];
        
        // Amount
        pdf.text(`UGX ${Number(txn.rdbs_amount || 0).toLocaleString()}`, xPosition, yPosition);
        xPosition += columnWidths[6];
        
        // Status
        pdf.text(txn.rdbs_approval_status?.toUpperCase() || 'N/A', xPosition, yPosition);
        
        yPosition += 6;
        transactionCount++;
      });
      
      // Generate filename
      const sanitizedMerchantName = merchantName.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${sanitizedMerchantName}-statement-${exportFileLabel(range)}.pdf`;
      
      pdf.save(filename);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setDateRange(currentMonthToTodayRange());
    setTransactionType('all');
    setStatus('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Handle loading state
  const loading = profileLoading || transactionsLoading;

  // Handle errors
  useEffect(() => {
    if (transactionsError) {
      console.error('Error loading transactions:', transactionsError);
      toast.error('Failed to load transaction data. Please try again.');
    }
  }, [transactionsError]);

  // Refresh handler
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchTransactions(),
        refetchWalletBalances(),
        refetchStatement(),
      ]);
      toast.success('Reports refreshed');
    } catch (error) {
      toast.error('Failed to refresh reports');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading reports...
        </div>
      </div>
    );
  }

  if (transactionsError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-[15px] font-semibold text-gray-900">Error Loading Reports</h2>
          <p className="mt-1 text-[12px] text-gray-400">Failed to load transaction data. Please try again.</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4 h-8 rounded-full px-3 text-[12px]">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!canViewReports(teamSession)) {
    return <AccessDenied description="You do not have permission to view reports." />;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-4" id="report-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Wallet statement</h1>
            <p className="mt-0.5 text-[12px] text-gray-400">
              Statement period:{' '}
              <span className="font-medium text-gray-600">
                {formatStatementPeriodLabel(statementRange.startDate, statementRange.endDate)}
              </span>
              <span> · Inclusive dates</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={transactionsLoading}
              className="h-8 rounded-full border-gray-200 px-3 text-[12px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${transactionsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={exportToCsv}
              disabled={isExporting}
              variant="outline"
              className="h-8 rounded-full border-gray-200 px-3 text-[12px]"
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              onClick={exportToExcel}
              disabled={isExporting}
              variant="outline"
              className="h-8 rounded-full border-gray-200 px-3 text-[12px]"
            >
              <DownloadCloud className="h-3.5 w-3.5" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="h-8 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              Filters
            </p>
            <Button variant="outline" onClick={resetFilters} className="h-7 rounded-full px-3 text-[12px]">
              Reset Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="md:col-span-2">
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onFromChange={(from) =>
                  setDateRange((prev) => ({ ...prev, from }))
                }
                onToChange={(to) =>
                  setDateRange((prev) => ({ ...prev, to }))
                }
                onClear={() => setDateRange(currentMonthToTodayRange())}
                fromLabel="From"
                toLabel="To"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Inclusive dates. Exports use this same period.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Transaction Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as 'all' | 'credit' | 'debit')}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
              >
                <option value="all">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'all' | 'success' | 'pending' | 'failed')}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Search</label>
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        <div className={`grid gap-3 ${hasSplitBalances ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {hasSplitBalances ? (
            <>
              <KpiCard
                icon={Wallet}
                label="Available now · Collection"
                suffix="UGX"
                value={Number(walletBalances?.collectionBalance ?? 0).toLocaleString()}
                hint="Live collection wallet · not the period closing balance"
              />
              <KpiCard
                icon={Wallet}
                label="Available now · Payout"
                suffix="UGX"
                value={Number(walletBalances?.disbursementBalance ?? 0).toLocaleString()}
                hint="Live disbursement wallet · not the period closing balance"
              />
            </>
          ) : (
            <KpiCard
              icon={Wallet}
              label="Available now"
              suffix="UGX"
              value={Number(walletBalances?.balance ?? 0).toLocaleString()}
              hint="Live business wallet · not the period closing balance"
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Landmark}
            label="Opening balance"
            suffix="UGX"
            value={statementLoading ? '…' : Number(summary.openingBalance).toLocaleString()}
            hint="As at start of this period"
          />
          <KpiCard
            icon={TrendingUp}
            label="Money in"
            suffix="UGX"
            value={statementLoading ? '…' : Number(summary.totalNetCredit).toLocaleString()}
            hint="Payments collected in this period"
          />
          <KpiCard
            icon={TrendingDown}
            label="Money out"
            suffix="UGX"
            value={statementLoading ? '…' : Number(summary.totalNetDebit).toLocaleString()}
            hint="Payments sent in this period"
          />
          <KpiCard
            icon={Wallet}
            label="Closing balance"
            suffix="UGX"
            value={statementLoading ? '…' : Number(summary.closingBalance).toLocaleString()}
            hint="As at end of this period"
          />
        </div>
        <p className="text-[12px] text-gray-400">
          Opening + deposits − spending ={' '}
          <span className="font-medium tabular-nums text-gray-700">
            UGX{' '}
            {Number(
              summary.openingBalance + summary.totalNetCredit - summary.totalNetDebit,
            ).toLocaleString()}
          </span>
          . Internal collection-to-payout transfers are excluded from deposited and spent.
        </p>

        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
              <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
              Transaction Volume
            </p>
            <Chart
              period="Monthly"
              from={dateRange.from}
              to={dateRange.to}
              transactions={chartTransactions}
              heightClass="h-[200px]"
            />
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
              <PieChart className="h-3.5 w-3.5 text-gray-400" />
              Transaction Distribution
            </p>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">Incoming payments</span>
                  <span className="text-[12px] font-semibold tabular-nums text-emerald-600">
                    {summary.creditTransactions} ({successfulVolume > 0 ? ((summary.creditTransactions / successfulVolume) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${successfulVolume > 0 ? (summary.creditTransactions / successfulVolume) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">Outgoing payments</span>
                  <span className="text-[12px] font-semibold tabular-nums text-rose-500">
                    {summary.debitTransactions} ({successfulVolume > 0 ? ((summary.debitTransactions / successfulVolume) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-rose-500"
                    style={{ width: `${successfulVolume > 0 ? (summary.debitTransactions / successfulVolume) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                Successful payments in this period (share estimated from money in/out). Sweeps are excluded.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-[13px] font-semibold text-gray-900">Transaction Details</p>
            <p className="text-[12px] text-gray-400">
              {summary.totalTransactions.toLocaleString()} transactions found
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Reference ID</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Date & Time</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Sender</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Receiver</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Receiver Number</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Type</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Amount</TableHead>
                  <TableHead className="h-9 px-4 text-[11px] font-medium text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-[12px] text-gray-400">
                      Loading transactions…
                    </TableCell>
                  </TableRow>
                ) : paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-[12px] text-gray-400">
                      No transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((txn) => (
                    <TableRow key={txn.rowKey} className="border-gray-50">
                      <TableCell className="px-4 py-2.5 font-mono text-[12px] text-gray-600">
                        {txn.rdbs_transaction_id}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 whitespace-nowrap text-[12px] text-gray-500">
                        {new Date(txn.rdbs_approval_date).toLocaleString('en-UG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-[12px] font-medium text-gray-800">
                        {txn.rdbs_sender_name}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-[12px] font-medium text-gray-800">
                        {txn.rdbs_receiver_name}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-[12px] text-gray-600">
                        {txn.rdbs_receiver_number}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          txn.rdbs_type === 'credit'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {txn.rdbs_type}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-gray-900">
                        UGX {Number(txn.rdbs_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          txn.rdbs_approval_status === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : txn.rdbs_approval_status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {txn.rdbs_approval_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!transactionsLoading && summary.totalTransactions > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-3 text-[12px] text-gray-400">
                <span>
                  {summary.totalTransactions === 0
                    ? '0'
                    : `${startIndex + 1}–${Math.min(endIndex, summary.totalTransactions)}`}{' '}
                  of {summary.totalTransactions.toLocaleString()}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 rounded-md border border-gray-200 px-2 text-[12px]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1} className="h-7 w-7 p-0">
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage <= 1} className="h-7 w-7 p-0">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-1 text-[12px] text-gray-500">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage >= totalPages} className="h-7 w-7 p-0">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="h-7 w-7 p-0">
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 