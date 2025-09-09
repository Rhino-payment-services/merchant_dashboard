"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '../../../components/ui/input';
import { useUserProfile } from '../UserProfileProvider';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type StatusType = 'approved' | 'pending' | 'failed';
const statusColor: Record<StatusType, string> = {
  approved: 'text-green-600 bg-green-50',
  pending: 'text-yellow-700 bg-yellow-50',
  failed: 'text-red-600 bg-red-50',
};

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const { profile, loading, refetch, isRefetching } = useUserProfile();

  // ✅ Deduplicate transactions by transaction ID
  const transactions = useMemo(() => {
    const txns = profile?.profile.merchant_transactions || [];
    const deduplicated = Array.from(
      new Map(
        txns.map(t => [t.rdbs_transaction_id || t.id, t])
      ).values()
    );
    // Sort by rdbs_approval_date in descending order (newest first)
    return deduplicated.sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime());
  }, [profile?.profile.merchant_transactions]);

  // ✅ Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(
      t =>
        (!search ||
          t.rdbs_sender_name?.toLowerCase().includes(search.toLowerCase()) ||
          String(t.rdbs_amount).toLowerCase().includes(search.toLowerCase()) ||
          String(t.rdbs_transaction_id).toLowerCase().includes(search.toLowerCase())) &&
        (!from || new Date(t.rdbs_approval_date) >= new Date(from)) &&
        (!to || new Date(t.rdbs_approval_date) <= new Date(to)) &&
        (!status || t.rdbs_approval_status === status)
    );
  }, [transactions, search, from, to, status]);

  // ✅ Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginationData = useMemo(() => {
    const startIndex = Math.max(0, (currentPage - 1) * itemsPerPage);
    const endIndex = Math.min(filtered.length, startIndex + itemsPerPage);
    return {
      startIndex,
      endIndex,
      currentTransactions: filtered.slice(startIndex, endIndex)
    };
  }, [filtered, currentPage]);

  const { startIndex, endIndex, currentTransactions } = paginationData;

  // ✅ Reset page if filters change and current page is invalid
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  // Handlers
  const handleResetFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setStatus("");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Transactions refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh transactions');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full">
        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">All Transactions</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Total: {filtered.length}
            </span>
            {isRefetching && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating...
              </span>
            )}
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
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
            <Input
              placeholder="Search by customer or amount..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full md:w-48"
            />
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setCurrentPage(1); }}
              className="text-xs border rounded px-3 py-2 bg-gray-50 min-w-[140px]"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setCurrentPage(1); }}
              className="text-xs border rounded px-3 py-2 bg-gray-50 min-w-[140px]"
            />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
              className="text-xs border rounded px-2 py-1 bg-gray-50"
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="ml-2">
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-x-auto relative">
          {isRefetching && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Updating...</span>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : currentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    {filtered.length === 0 ? "No transactions found." : "No transactions on this page."}
                  </TableCell>
                </TableRow>
              ) : (
                currentTransactions.map(txn => (
                  <TableRow key={txn.rdbs_transaction_id || txn.id} className="hover:bg-gray-100 transition">
                    <TableCell className="font-mono text-xs">{txn.rdbs_transaction_id}</TableCell>
                    <TableCell>{new Date(txn.rdbs_approval_date).toDateString()}</TableCell>
                    <TableCell>{new Date(txn.rdbs_approval_date).toLocaleTimeString()}</TableCell>
                    <TableCell>{txn.rdbs_sender_name}</TableCell>
                    <TableCell>
                      <span className={
                        txn.rdbs_type === 'credit'
                          ? 'text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium'
                          : txn.rdbs_type === 'debit'
                          ? 'text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium'
                          : ''
                      }>
                        {txn.rdbs_type}
                      </span>
                    </TableCell>
                    <TableCell>{Number(txn.rdbs_amount).toLocaleString()} UGX</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[txn.rdbs_approval_status as StatusType] || 'bg-gray-100 text-gray-700'}`}>
                        {txn.rdbs_approval_status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 px-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleFirstPage} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" /> First
              </Button>
              <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - 2);
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  if (endPage - startPage < maxVisiblePages - 1) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }
                  return pages.map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  ));
                })()}
              </div>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLastPage} disabled={currentPage === totalPages}>
                Last <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
