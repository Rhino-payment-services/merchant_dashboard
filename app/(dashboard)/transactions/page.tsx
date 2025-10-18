"use client"
import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '../../../components/ui/input';
import { useMyTransactions, TransactionFilter } from '@/lib/api/transactions.api';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);

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

  // Extract data from API response
  const transactions = transactionsData?.transactions || [];
  const paginationInfo = transactionsData?.pagination;
  const summary = transactionsData?.summary;

  // Filter transactions client-side for search only
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;

    const searchLower = search.toLowerCase();
    return transactions.filter(tx => 
      tx.transactionId?.toLowerCase().includes(searchLower) ||
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('en-UG', { 
                  style: 'currency', 
                  currency: 'UGX' 
                }).format(summary.totalAmount || 0)}
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Fees</h3>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('en-UG', { 
                  style: 'currency', 
                  currency: 'UGX' 
                }).format(summary.totalFee || 0)}
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Successful</h3>
              <p className="text-2xl font-bold text-green-600">{summary.completedCount || 0}</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Failed</h3>
              <p className="text-2xl font-bold text-red-600">{summary.failedCount || 0}</p>
            </Card>
          </div>
        )}

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
                  <TableHead>Transaction ID</TableHead>
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
                        {transaction.reference}
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
                          {transaction.direction}
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
      </div>
    </div>
    </>
  );
}