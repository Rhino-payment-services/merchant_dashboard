"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserProfile } from '../UserProfileProvider';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canViewReports } from '@/lib/utils/permissions';
import { TransactionFilter, getBusinessWalletStatement } from '@/lib/api/transactions.api';
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
import {
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
  transactionFees: number;
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

  // Date range only for API fetch — paginate all pages (backend caps limit at 100).
  // Status/direction filters are applied client-side after transform.
  const reportApiFilter = useMemo(() => {
    const filter: Omit<TransactionFilter, 'page' | 'limit'> = {};
    if (dateRange.from) filter.startDate = dateRange.from;
    if (dateRange.to) filter.endDate = dateRange.to;
    else if (dateRange.from) filter.endDate = dateRange.from;
    return filter;
  }, [dateRange]);

  const {
    data: apiTransactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: [
      'reports',
      'all-transactions',
      reportApiFilter,
      childMerchantId,
      effectiveMerchantCode,
    ],
    queryFn: () =>
      fetchAllBusinessTransactions(
        reportApiFilter,
        childMerchantId || undefined,
        effectiveMerchantCode,
      ),
    staleTime: 30000,
    retry: 3,
    refetchOnWindowFocus: false,
  });

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

  // Transform API transactions to the format expected by the reports page
  const transformTransaction = (apiTxn: any): Transaction => {
    // Map API status to reports page status
    const mapStatus = (apiStatus: string): 'success' | 'pending' | 'failed' => {
      if (apiStatus === 'COMPLETED' || apiStatus === 'SUCCESS') return 'success';
      if (apiStatus === 'PENDING' || apiStatus === 'PROCESSING') return 'pending';
      return 'failed';
    };

    // Get sender name from transaction metadata (similar to transactions page logic)
    const getSenderName = (txn: any): string => {
      // Check for admin-funded deposits/Wallet Funding first
      if (txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin) {
        return txn.metadata?.adminName || 'Admin User';
      }
      
      // Wallet Funding - when merchant wallet is being funded (credit to merchant)
      if (txn.type === 'DEPOSIT' || txn.type === 'WALLET_FUNDING' || 
          (txn.direction === 'CREDIT' && txn.metadata?.fundedByAdmin)) {
        // For wallet funding, the sender is the one funding the wallet (admin, external source, etc.)
        return txn.metadata?.adminName || 
               txn.metadata?.userName || 
               txn.metadata?.counterpartyInfo?.name || 
               'Wallet Funding Source';
      }
      
      if (txn.direction === 'DEBIT') {
        // Merchant is sending - sender is the merchant
        return profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || 'Merchant';
      } else {
        // CREDIT direction - someone else is sending to merchant
        if (txn.type === 'MERCHANT_TO_WALLET' || txn.type === 'MERCHANT_TO_INTERNAL_WALLET') {
          return txn.metadata?.merchantName || txn.metadata?.counterpartyInfo?.name || 'Merchant';
        } else if (txn.type === 'MNO_TO_WALLET') {
          return txn.metadata?.userName || `${txn.metadata?.mnoProvider || ''} Mobile Money`.trim() || 'Mobile Money User';
        } else if (txn.type === 'WALLET_TO_WALLET' || txn.counterpartyId || txn.counterpartyUser) {
          // P2P - Wallet to Wallet
          const senderName = txn.counterpartyUser?.profile?.firstName && txn.counterpartyUser?.profile?.lastName
            ? `${txn.counterpartyUser.profile.firstName} ${txn.counterpartyUser.profile.lastName}`
            : txn.metadata?.counterpartyInfo?.name || txn.metadata?.userName || 'RukaPay User';
          return senderName;
        } else if (txn.metadata?.counterpartyInfo) {
          return txn.metadata.counterpartyInfo.name;
        } else {
          // Fallback
          return txn.metadata?.userName || txn.metadata?.phoneNumber || 'Sender';
        }
      }
    };

    // Get receiver name from transaction metadata
    const getReceiverName = (txn: any): string => {
      const merchantName =
        profile?.merchant_names ||
        profile?.merchantBusinessTradeName ||
        profile?.businessTradeName ||
        'Merchant';

      if (txn.direction === 'CREDIT') {
        return merchantName;
      }

      const meta = txn.metadata || {};
      return (
        meta.recipientName ||
        meta.receiverName ||
        meta.counterpartyInfo?.name ||
        meta.userName ||
        meta.accountName ||
        (txn.counterpartyUser?.profile?.firstName && txn.counterpartyUser?.profile?.lastName
          ? `${txn.counterpartyUser.profile.firstName} ${txn.counterpartyUser.profile.lastName}`
          : null) ||
        txn.counterpartyUser?.phone ||
        txn.counterpartyId ||
        (txn.type === 'WALLET_TO_MNO' && meta.mnoProvider ? `${meta.mnoProvider} Mobile Money` : null) ||
        'Recipient'
      );
    };

    const getReceiverNumber = (txn: any): string => {
      const meta = txn.metadata || {};
      return (
        meta.recipientPhone ||
        meta.receiverPhone ||
        meta.phoneNumber ||
        meta.counterpartyInfo?.phone ||
        txn.counterpartyUser?.phone ||
        txn.phoneNumber ||
        txn.recipientPhoneNumber ||
        txn.accountNumber ||
        'N/A'
      );
    };

    // Determine transaction type - Wallet Funding should always be credit
    const isWalletFunding = apiTxn.type === 'DEPOSIT' || 
                           apiTxn.type === 'WALLET_FUNDING' || 
                           (apiTxn.direction === 'CREDIT' && apiTxn.metadata?.fundedByAdmin);
    
    return {
      rowKey:
        String(apiTxn.id || '') ||
        `${apiTxn.reference || 'txn'}-${apiTxn.direction || ''}-${apiTxn.walletId || ''}-${apiTxn.createdAt || ''}`,
      rdbs_transaction_id: apiTxn.reference || apiTxn.transactionId || apiTxn.id || '',
      rdbs_approval_date: apiTxn.createdAt || apiTxn.updatedAt || new Date().toISOString(),
      rdbs_sender_name: getSenderName(apiTxn),
      rdbs_receiver_name: getReceiverName(apiTxn),
      rdbs_receiver_number: getReceiverNumber(apiTxn),
      rdbs_amount: Number(apiTxn.amount || 0),
      // Wallet Funding should always be credit to merchant wallet
      rdbs_type: isWalletFunding ? 'credit' : (apiTxn.direction === 'CREDIT' ? 'credit' : 'debit'),
      rdbs_approval_status: mapStatus(apiTxn.status || 'PENDING'),
      rdbs_date: apiTxn.createdAt || apiTxn.updatedAt,
      isSweep: isSweepTransaction(apiTxn),
      raw: apiTxn,
    };
  };

  // Transform all API transactions
  const transactions: Transaction[] = useMemo(() => {
    return apiTransactions.map(transformTransaction);
  }, [apiTransactions, profile]);

  // Filter transactions based on criteria
  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(txn => {
      const matchesType = transactionType === 'all' || txn.rdbs_type === transactionType;
      const matchesStatus = status === 'all' || txn.rdbs_approval_status === status;
      const matchesSearch = !searchTerm || 
        txn.rdbs_sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.rdbs_transaction_id.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesType && matchesStatus && matchesSearch;
    });
    
    // Sort by rdbs_approval_date in descending order (newest first)
    return filtered.sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime());
  }, [transactions, dateRange, transactionType, status, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, transactionType, status, searchTerm]);

  // Period statement from the API; table filters only affect the list and charts.
  const summary: ReportSummary = useMemo(() => {
    const creditTransactions = filteredTransactions.filter(
      (t) => t.rdbs_type === 'credit' && t.rdbs_approval_status === 'success' && !t.isSweep,
    ).length;
    const debitTransactions = filteredTransactions.filter(
      (t) => t.rdbs_type === 'debit' && t.rdbs_approval_status === 'success' && !t.isSweep,
    ).length;

    return {
      openingBalance: Number(statement?.openingBalance || 0),
      totalNetCredit: Number(statement?.totalNetCredit || 0),
      totalNetDebit: Number(statement?.totalNetDebit || 0),
      closingBalance: Number(statement?.closingBalance || 0),
      transactionFees: Number(statement?.transactionFees || 0),
      successfulCount: Number(statement?.successfulCount || 0),
      currency: statement?.currency || 'UGX',
      totalTransactions: filteredTransactions.length,
      creditTransactions,
      debitTransactions,
    };
  }, [filteredTransactions, statement]);

  // Format currency
  const getMerchantViewerContext = () => ({
    merchantName:
      profile?.merchant_names ||
      profile?.merchantBusinessTradeName ||
      profile?.businessTradeName ||
      'Merchant',
    phone: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || '',
    merchantCode: effectiveMerchantCode || undefined,
  });

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
      const exportData = merchantTransactionsToExportRows(apiTxs, viewer);
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
      const rows = merchantTransactionsToExportRows(apiTxs, viewer);
      const merchantName = sanitizeMerchantFilenamePart(viewer.merchantName);
      downloadTextFile(
        `${merchantName}-statement-${exportFileLabel(range)}.csv`,
        merchantStatementCsvPreamble(viewer, range, statementSummary) +
          merchantTransactionsToCsv(rows),
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
          rdbs_amount: Number(apiTxn.amount || 0),
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
      pdf.text(`Amount deposited (total net credit): ${money(statementSummary.totalNetCredit)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Amount spent (total net debit): ${money(statementSummary.totalNetDebit)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Closing balance: ${money(statementSummary.closingBalance)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(
        `Transaction fees: ${money(statementSummary.transactionFees)}  ·  ${statementSummary.successfulCount} successful transactions`,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  if (transactionsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Reports</h2>
          <p className="text-gray-600 mb-4">Failed to load transaction data. Please try again.</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!canViewReports(teamSession)) {
    return <AccessDenied description="You do not have permission to view reports." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 min-w-0">
      <div className="max-w-screen-2xl w-full min-w-0" id="report-content">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Wallet statement</h1>
              <p className="text-gray-600">
                Statement period:{' '}
                <span className="font-medium text-gray-800">
                  {formatStatementPeriodLabel(statementRange.startDate, statementRange.endDate)}
                </span>
                <span className="text-gray-500"> · Inclusive dates</span>
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                disabled={transactionsLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={exportToCsv}
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button 
                onClick={exportToExcel} 
                disabled={isExporting}
                variant="outline"
                className="flex items-center gap-2"
              >
                <DownloadCloud className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              <Button 
                onClick={exportToPDF} 
                disabled={isExporting}
                className="bg-[#08163d] hover:bg-[#131824]"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <p className="mt-1 text-xs text-gray-500">
                  Inclusive dates. Exports use this same period.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as 'all' | 'credit' | 'debit')}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'all' | 'success' | 'pending' | 'failed')}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available now — live wallets, not the period closing balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {hasSplitBalances ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available now · Collection</CardTitle>
                  <Wallet className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    UGX {Number(walletBalances?.collectionBalance ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Live collection wallet · not the period closing balance
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available now · Payout</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    UGX {Number(walletBalances?.disbursementBalance ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Live disbursement wallet · not the period closing balance
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="sm:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available now</CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  UGX {Number(walletBalances?.balance ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Live business wallet · not the period closing balance
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Period statement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opening balance</CardTitle>
              <Landmark className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#08163d]">
                {statementLoading ? '…' : `UGX ${Number(summary.openingBalance).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">As at start of this period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount deposited</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statementLoading ? '…' : `UGX ${Number(summary.totalNetCredit).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Total net credit · {summary.successfulCount} successful movements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount spent</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statementLoading ? '…' : `UGX ${Number(summary.totalNetDebit).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Total net debit · Transaction fees UGX {Number(summary.transactionFees).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closing balance</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#08163d]">
                {statementLoading ? '…' : `UGX ${Number(summary.closingBalance).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">As at end of this period</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-gray-600 mb-8">
          Opening + deposits − spending ={' '}
          <span className="font-medium text-gray-900">
            UGX{' '}
            {Number(
              summary.openingBalance + summary.totalNetCredit - summary.totalNetDebit,
            ).toLocaleString()}
          </span>
          . Internal collection-to-payout transfers are excluded from deposited and spent.
        </p>

        {/* Charts — equal columns; min-w-0 stops the bar chart from stretching the grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Transaction Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden">
              <Chart 
                period="Monthly" 
                from={dateRange.from} 
                to={dateRange.to}
                transactions={transactions}
                heightClass="h-[220px]"
              />
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Transaction Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex h-full min-h-[220px] items-center">
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Incoming payments</span>
                  <span className="text-sm text-green-600 font-bold">
                    {summary.creditTransactions} ({summary.totalTransactions > 0 ? ((summary.creditTransactions / summary.totalTransactions) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${summary.totalTransactions > 0 ? (summary.creditTransactions / summary.totalTransactions) * 100 : 0}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Outgoing payments</span>
                  <span className="text-sm text-red-600 font-bold">
                    {summary.debitTransactions} ({summary.totalTransactions > 0 ? ((summary.debitTransactions / summary.totalTransactions) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${summary.totalTransactions > 0 ? (summary.debitTransactions / summary.totalTransactions) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction Details</span>
              <span className="text-sm text-gray-500">
                {filteredTransactions.length} transactions found
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Receiver Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No transactions found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((txn) => (
                      <TableRow key={txn.rowKey}>
                        <TableCell className="font-mono text-sm">
                          {txn.rdbs_transaction_id}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(txn.rdbs_approval_date).toLocaleDateString()}</div>
                            <div className="text-gray-500">
                              {new Date(txn.rdbs_approval_date).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {txn.rdbs_sender_name}
                        </TableCell>
                        <TableCell className="font-medium">
                          {txn.rdbs_receiver_name}
                        </TableCell>
                        <TableCell className="font-medium">
                          {txn.rdbs_receiver_number}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            txn.rdbs_type === 'credit' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {txn.rdbs_type}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          UGX {Number(txn.rdbs_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            txn.rdbs_approval_status === 'success' 
                              ? 'bg-green-100 text-green-800'
                              : txn.rdbs_approval_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
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
            
            {/* Pagination */}
            {filteredTransactions.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Items per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 border rounded-md text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-700 px-2">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 