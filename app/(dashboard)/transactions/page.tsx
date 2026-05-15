"use client"
import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyTransactions, TransactionFilter } from '@/lib/api/transactions.api';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Activity, BarChart3, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, DollarSign, Eye, Search, Printer, CreditCard, Info, Users, AlertTriangle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { getBulkTransactionStatus, getBulkTransactionList, viewBulkTransactions } from '@/lib/api/bulk-payment.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import TransactionReceipt from '@/components/TransactionReceipt';
import { useUserProfile } from '../UserProfileProvider';
import {
  getTransactionTypeDisplay,
  isEventLedgerTransaction,
} from '@/lib/utils/transaction-display';

type StatusType = 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | "SUCCESS";

function getEventLedgerDescription(txn: any): string {
  const meta = txn?.metadata || {};
  const orderRef = String(meta.merchantEventOrderReference || '').trim();
  if (orderRef) {
    return `Event ticket payment (${orderRef})`;
  }
  return 'Event ticket payment';
}

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
  const amount = Number(tx?.amount) || 0;
  const direction = String(tx?.direction || '').toUpperCase();
  const feeBreakdown = tx?.metadata?.feeBreakdown || {};

  const rukapayFeeFromBreakdown = feeBreakdown.rukapayFee || 0;
  const rukapayFee =
    rukapayFeeFromBreakdown > 0 ? rukapayFeeFromBreakdown : Number(tx?.rukapayFee) || 0;

  const partnerFeeFromBreakdown = feeBreakdown.partnerFee || feeBreakdown.thirdPartyFee || 0;
  const partnerFee =
    partnerFeeFromBreakdown > 0 ? partnerFeeFromBreakdown : Number(tx?.thirdPartyFee) || 0;

  const govTaxFromBreakdown = feeBreakdown.governmentTax || feeBreakdown.govTax || 0;
  const governmentTax =
    govTaxFromBreakdown > 0 ? govTaxFromBreakdown : Number(tx?.governmentTax) || 0;

  const processingFee = feeBreakdown.processingFee || Number(tx?.processingFee) || 0;
  const networkFee = feeBreakdown.networkFee || Number(tx?.networkFee) || 0;
  const complianceFee = feeBreakdown.complianceFee || Number(tx?.complianceFee) || 0;
  const telecomBankCharge = feeBreakdown.telecomBankCharge || 0;

  let calculatedTotalFees =
    rukapayFee +
    partnerFee +
    governmentTax +
    processingFee +
    networkFee +
    complianceFee +
    telecomBankCharge;

  if (feeBreakdown.totalFee !== undefined && feeBreakdown.totalFee !== null) {
    calculatedTotalFees = Number(feeBreakdown.totalFee);
  }

  let totalFee = calculatedTotalFees;

  if (totalFee === 0) {
    const feeField = Number(tx?.fee) || 0;
    if (feeField > 0) {
      totalFee = feeField;
    } else {
      const netAmountField = Number(tx?.netAmount) || 0;
      if (netAmountField > 0 && amount !== netAmountField) {
        totalFee = Math.abs(amount - netAmountField);
      }
    }
  }

  const netAmountForDisplay =
    direction === 'DEBIT' ? amount + totalFee : Number(tx?.netAmount) || amount;

  return {
    totalFee,
    netAmountForDisplay,
  };
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const { profile } = useUserProfile();
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
  
  // Support for viewing child merchant transactions (for super merchants)
  const [childMerchantId, setChildMerchantId] = useState<string | null>(null);
  const [childMerchantCode, setChildMerchantCode] = useState<string | null>(null);
  
  // Check URL params for child merchant context
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const merchantId = params.get('merchantId');
      const merchantCode = params.get('merchantCode');
      if (merchantId && merchantCode) {
        setChildMerchantId(merchantId);
        setChildMerchantCode(merchantCode);
      }
    }
  }, []);
  // When user switches business, reset to first page so we don't show wrong pagination
  React.useEffect(() => {
    setCurrentPage(1);
  }, [currentMerchantCode]);

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

  // Build filter object for API
  const filter: TransactionFilter = useMemo(() => {
    const apiFilter: TransactionFilter = {
      page: currentPage,
      limit: currentLimit,
    };

    if (status) apiFilter.status = status as any;
    if (from) apiFilter.startDate = from;
    if (to) apiFilter.endDate = to;

    return apiFilter;
  }, [status, from, to, currentPage, currentLimit]);

  const { 
    data: transactionsData, 
    isLoading, 
    error, 
    refetch, 
    isRefetching 
  } = useMyTransactions(filter, childMerchantId || undefined, currentMerchantCode);

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
  const summary = transactionsData?.summary || {
    totalTransactions: 0,
    walletType: 'PERSONAL'
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
    if (walletView === 'all') return transactions;
    return transactions.filter((tx: any) => {
      const bucket = classifyWalletView(tx);
      if (walletView === 'collection') return bucket === 'collection';
      if (walletView === 'disbursement') return bucket === 'disbursement';
      return true;
    });
  }, [transactions, walletView]);

  // Calculate summary statistics from currently-scoped transactions
  const calculatedSummary = useMemo(() => {
    const base = viewScopedTransactions;
    const totalAmount = base.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalFee = base.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    const successfulCount = base.filter(tx => tx.status === 'SUCCESS' || tx.status === 'COMPLETED').length;
    const failedCount = base.filter(tx => tx.status === 'FAILED').length;
    
    return {
      totalAmount,
      totalFee,
      successfulCount,
      failedCount,
        totalTransactions: base.length,
      walletType: (summary as any).walletType || 'PERSONAL'
    };
  }, [viewScopedTransactions, (summary as any).walletType]);

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

  // Helper function to format sender info with details
  const getSenderInfo = (txn: any) => {
    // Check for admin-funded deposits first
    if (txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin) {
      // Admin is funding the merchant's wallet
      return {
        name: txn.metadata?.adminName || 'Admin User',
        contact: txn.metadata?.adminPhone || txn.metadata?.adminEmail || 'Admin'
      };
    }
    
    if (txn.direction === 'DEBIT') {
      // Merchant is sending - sender is the merchant (wallet owner)
      const merchantName = getMerchantName();
      return {
        name: merchantName,
        contact: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || ''
      };
    } else {
      // CREDIT direction - someone else is sending to merchant
      // Extract sender info based on transaction type (matching admin dashboard logic)
      if (txn.type === 'MERCHANT_TO_WALLET' || txn.type === 'MERCHANT_TO_INTERNAL_WALLET' || txn.type?.includes('MERCHANT_TO_WALLET') || txn.type?.includes('MERCHANT_TO_INTERNAL_WALLET')) {
        // Merchant sending to wallet
        return {
          name: txn.metadata?.merchantName || txn.metadata?.counterpartyInfo?.name || 'Merchant',
          contact: txn.metadata?.merchantCode || txn.metadata?.accountNumber || ''
        };
      } else if (txn.type === 'MNO_TO_WALLET' || txn.type?.includes('MNO_TO_WALLET')) {
        // Mobile Money sending to wallet
        if (txn.metadata?.mnoProvider) {
          return {
            name: txn.metadata?.userName || `${txn.metadata.mnoProvider} Mobile Money`,
            contact: txn.metadata?.phoneNumber || ''
          };
        } else if (txn.metadata?.phoneNumber) {
          return {
            name: txn.metadata?.userName || 'Mobile Money User',
            contact: txn.metadata?.phoneNumber || ''
          };
        } else {
          return {
            name: 'External',
            contact: ''
          };
        }
      } else if (txn.type === 'WALLET_TO_WALLET' || txn.counterpartyId || txn.counterpartyUser) {
        // P2P / personal-wallet-to-merchant: sender is the counterpartyUser.
        // When counterpartyUser.profile.firstName is missing, prefer counterpartyUser.phone
        // over metadata.counterpartyInfo.name — the latter may be set to the sender's
        // business name when they also own a merchant account.
        const cp = txn.counterpartyUser
        const senderName =
          (cp?.profile?.firstName && cp?.profile?.lastName
            ? `${cp.profile.firstName} ${cp.profile.lastName}`
            : null)
          || txn.metadata?.senderName
          || txn.metadata?.userName
          || (cp ? null : txn.metadata?.counterpartyInfo?.name)  // only use counterpartyInfo if no counterpartyUser
          || cp?.phone
          || txn.counterpartyId
          || 'RukaPay User';
        return {
          name: senderName,
          contact: cp?.phone || txn.counterpartyId || ''
        };
      } else if (txn.metadata?.counterpartyInfo) {
        return {
          name: txn.metadata.counterpartyInfo.name,
          contact: txn.metadata.counterpartyInfo.phone || txn.metadata.counterpartyInfo.accountNumber || ''
        };
      } else {
        // Fallback - extract from metadata
        return {
          name: txn.metadata?.userName || txn.metadata?.phoneNumber || 'External',
          contact: txn.metadata?.phoneNumber || txn.metadata?.accountNumber || ''
        };
      }
    }
  };

  // Helper function to format receiver info with details
  const getPreferredRecipientName = (txn: any): string | null => {
    const meta = txn?.metadata || {};
    const fromMetadata = [
      meta.recipientName,
      meta.receiverName,
      meta.counterpartyInfo?.name,
      meta.userName,
      meta.accountName,
      meta.customerName,
    ]
      .map((v: any) => String(v || '').trim())
      .find((v: string) => v.length > 0);

    if (fromMetadata) return fromMetadata;

    if (txn?.counterpartyUser?.profile?.firstName && txn?.counterpartyUser?.profile?.lastName) {
      return `${txn.counterpartyUser.profile.firstName} ${txn.counterpartyUser.profile.lastName}`.trim();
    }

    return null;
  };

  const getReceiverInfo = (txn: any) => {
    // Check for admin-funded deposits first
    if (txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin) {
      // Merchant is receiving funds from admin
      const merchantName = getMerchantName();
      return {
        name: merchantName,
        contact: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || ''
      };
    }
    
    if (txn.direction === 'CREDIT') {
      // Merchant is receiving - receiver is the merchant (wallet owner)
      const merchantName = getMerchantName();
      return {
        name: merchantName,
        contact: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || ''
      };
    } else {
      // DEBIT direction - merchant is sending to someone
      const preferredRecipientName = getPreferredRecipientName(txn);
      // Check MNO/phone/bank first because metadata.merchantName is the SENDER's business
      // name, not the receiver. Without this order, MNO disbursements would incorrectly
      // show the sending merchant as the receiver.
      if (txn.type === 'WALLET_TO_MNO' || (txn.metadata?.mnoProvider && txn.metadata?.phoneNumber)) {
        return {
          name: preferredRecipientName || `${txn.metadata?.mnoProvider || 'Mobile'} Money`,
          contact: txn.metadata?.phoneNumber || ''
        };
      } else if (txn.type === 'WALLET_TO_WALLET' || txn.counterpartyId || txn.counterpartyUser) {
        const receiverName = preferredRecipientName || 'RukaPay User';
        return {
          name: receiverName,
          contact: txn.counterpartyUser?.phone || txn.counterpartyId || ''
        };
      } else if (txn.metadata?.phoneNumber) {
        return {
          name: preferredRecipientName || 'Mobile Money User',
          contact: txn.metadata?.phoneNumber || ''
        };
      } else if (txn.type === 'WALLET_TO_MERCHANT' || txn.type === 'WALLET_TO_INTERNAL_MERCHANT' || txn.type?.includes('MERCHANT')) {
        return {
          name: preferredRecipientName || txn.metadata?.merchantName || 'Merchant',
          contact: txn.metadata?.merchantCode || txn.metadata?.accountNumber || ''
        };
      } else if (txn.metadata?.counterpartyInfo) {
        return {
          name: preferredRecipientName || txn.metadata.counterpartyInfo.name,
          contact: txn.metadata.counterpartyInfo.phone || txn.metadata.counterpartyInfo.accountNumber || ''
        };
      } else if (txn.metadata?.accountNumber) {
        return {
          name: preferredRecipientName || 'External Account',
          contact: txn.metadata?.accountNumber || ''
        };
      } else {
        return {
          name: preferredRecipientName || 'Recipient',
          contact: txn.metadata?.phoneNumber || txn.metadata?.accountNumber || ''
        };
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Transactions refreshed');
    } catch (error) {
      toast.error('Failed to refresh transactions');
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

  return (
    <>
      <Head>
        <title>Transactions - RukaPay Merchant</title>
        <meta name="description" content="View and manage all your transaction history on RukaPay" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-2xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Transactions</h1>
              <p className="text-gray-600">View and manage all your transaction history</p>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              disabled={isRefetching}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Child Merchant Context Banner */}
          {childMerchantId && childMerchantCode && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Viewing transactions for child merchant: <span className="font-semibold">{childMerchantCode}</span>
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    You are viewing transactions as a super merchant
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setChildMerchantId(null);
                  setChildMerchantCode(null);
                  // Remove query params from URL
                  const url = new URL(window.location.href);
                  url.searchParams.delete('merchantId');
                  url.searchParams.delete('merchantCode');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                View My Transactions
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Bulk Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            {/* Wallet view toggle: All / Collection / Disbursement */}
            <Card className="p-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Wallet view:</span>
                <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setWalletView('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      walletView === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All business wallets
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletView('collection')}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      walletView === 'collection'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Collection only
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletView('disbursement')}
                    className={`px-3 py-1 text-xs font-medium rounded-md ${
                      walletView === 'disbursement'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Disbursement only
                  </button>
                </div>
              </div>
            </Card>

            {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-UG', { 
                style: 'currency', 
                currency: 'UGX' 
              }).format(calculatedSummary.totalAmount || 0)}
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Fees</h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-UG', { 
                style: 'currency', 
                currency: 'UGX' 
              }).format(calculatedSummary.totalFee || 0)}
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Successful</h3>
            <p className="text-2xl font-bold text-green-600">{calculatedSummary.successfulCount || 0}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Failed</h3>
            <p className="text-2xl font-bold text-red-600">{calculatedSummary.failedCount || 0}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              type="date"
              placeholder="Start Date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentLimit}
              onChange={(e) => setCurrentLimit(Number(e.target.value))}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Charges</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading transactions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="text-gray-500">No transactions found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    // Extract sender and receiver information with contact details
                    const txn = transaction as any;
                    const senderInfo = getSenderInfo(txn);
                    const receiverInfo = getReceiverInfo(txn);

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm" title={transaction.reference || 'N/A'}>
                          {formatReferenceForDisplay(transaction)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <div className="font-medium truncate max-w-[150px]" title={senderInfo.name}>
                              {senderInfo.name}
                            </div>
                            {senderInfo.contact && (
                              <div className="text-xs text-gray-500 truncate max-w-[150px]" title={senderInfo.contact}>
                                {senderInfo.contact}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <div className="font-medium truncate max-w-[150px]" title={receiverInfo.name}>
                              {receiverInfo.name}
                            </div>
                            {receiverInfo.contact && (
                              <div className="text-xs text-gray-500 truncate max-w-[150px]" title={receiverInfo.contact}>
                                {receiverInfo.contact}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-[25px]">
                            <span className='text-[12px]'>
                              UGX &nbsp;
                            </span>
                           {Number(transaction.amount).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-[25px]">
                            <span className='text-[12px]'>
                             {transaction.metadata?.revenue?.currency ?? ""} &nbsp;
                            </span>
                           {transaction.metadata?.revenue?.amount?.toLocaleString() ?? "N/A"}
                          </div>
                        </TableCell>
                        {/* Wallet source: show which business wallet handled this transaction */}
                        <TableCell>
                          {(() => {
                            const bucket = classifyWalletView(transaction as any);
                            if (bucket === 'disbursement') {
                              return (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Disbursement
                                </span>
                              );
                            }
                            if (bucket === 'collection') {
                              return (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Collection
                                </span>
                              );
                            }
                            return <span className="text-xs text-gray-400">—</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {getTransactionTypeDisplay(transaction)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[transaction.status as StatusType]}`}>
                            {transaction.status}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {isEventLedgerTransaction(transaction)
                            ? getEventLedgerDescription(transaction)
                            : (transaction.description || transaction.reference || '-')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(transaction.createdAt).toLocaleString('en-UG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransactionForDetails(transaction);
                                setIsTransactionDetailsOpen(true);
                              }}
                              title="View Details"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setIsReceiptOpen(true);
                              }}
                              title="Print Receipt"
                              className="h-8 w-8 p-0"
                            >
                              <Printer className="h-4 w-4" />
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
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * currentLimit) + 1} to {Math.min(currentPage * currentLimit, paginationInfo?.total || 0)} of {paginationInfo?.total || 0} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            {/* Bulk Transaction Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Total Bulk Payments</h3>
                <p className="text-2xl font-bold text-gray-900">{bulkSummary.total}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 mr-1" />
                  <span className="text-sm text-blue-600">+0%</span>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                <p className="text-2xl font-bold text-green-600">{bulkSummary.completed}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">Success</span>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Failed</h3>
                <p className="text-2xl font-bold text-red-600">{bulkSummary.failed}</p>
                <div className="flex items-center mt-2">
                  <XCircle className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-sm text-red-600">Errors</span>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <p className="text-2xl font-bold text-yellow-600">{bulkSummary.pending}</p>
                <div className="flex items-center mt-2">
                  <Clock className="w-4 h-4 text-yellow-600 mr-1" />
                  <span className="text-sm text-yellow-600">Processing</span>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {new Intl.NumberFormat('en-UG', { 
                    style: 'currency', 
                    currency: 'UGX' 
                  }).format(bulkSummary.totalAmount || 0)}
                </p>
                <div className="flex items-center mt-2">
                  <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">Processed</span>
                </div>
              </Card>
            </div>

            {/* Bulk Transaction Filters */}
            <Card>
              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by transaction ID or description..."
                        value={bulkSearchTerm}
                        onChange={(e) => setBulkSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={bulkStatusFilter}
                      onChange={(e) => setBulkStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="partial_success">Partial Success</option>
                    </select>
                    <Button onClick={loadBulkTransactions} disabled={bulkLoading} className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${bulkLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bulk Transactions Table */}
            <Card>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Transactions</h3>
                <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulk ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Actions</TableHead>
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
            </Card>
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
            const senderInfo = getSenderInfo(txn);
            const receiverInfo = getReceiverInfo(txn);
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
                        <span className="text-green-600 font-bold">Net Amount:</span>
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
                {txn.description && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-700">{txn.description}</p>
                  </div>
                )}
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