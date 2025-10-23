"use client"
import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyTransactions, TransactionFilter } from '@/lib/api/transactions.api';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Activity, BarChart3, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, DollarSign, Eye, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { getBulkTransactionStatus, getBulkTransactionList, viewBulkTransactions } from '@/lib/api/bulk-payment.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);

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
  } = useMyTransactions(filter);

  // Debug logging
  console.log('Transactions Page - API Response:', transactionsData);
  console.log('Transactions Page - Error:', error);

  // Extract data from API response
  const transactions = transactionsData?.transactions || [];
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

  // Calculate summary statistics from transactions
  const calculatedSummary = useMemo(() => {
    const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalFee = transactions.reduce((sum, tx) => sum + (tx.fee || 0), 0);
    const successfulCount = transactions.filter(tx => tx.status === 'SUCCESS' || tx.status === 'COMPLETED').length;
    const failedCount = transactions.filter(tx => tx.status === 'FAILED').length;
    
    return {
      totalAmount,
      totalFee,
      successfulCount,
      failedCount,
      totalTransactions: transactions.length,
      walletType: (summary as any).walletType || 'PERSONAL'
    };
  }, [transactions, (summary as any).walletType]);

  // Filter transactions client-side for search only
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;

    const searchLower = search.toLowerCase();
    return transactions.filter(tx => 
      tx.transactionId?.toLowerCase().includes(searchLower) ||
      tx.id?.toLowerCase().includes(searchLower) ||
      tx.reference?.toLowerCase().includes(searchLower) ||
      tx.description?.toLowerCase().includes(searchLower)
    );
  }, [transactions, search]);

  const totalPages = paginationInfo?.totalPages || 1;

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Charges</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading transactions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">No transactions found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {transaction.reference || 'N/A'}
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
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.direction === 'CREDIT' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.direction || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[transaction.status as StatusType]}`}>
                          {transaction.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description || transaction.reference || '-'}
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
                    </TableRow>
                  ))
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
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
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
                <Table>
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
                  <div className="font-semibold">{selectedBulkTransaction.totalAmount} {selectedBulkTransaction.currency}</div>
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
    </div>
    </>
  );
}