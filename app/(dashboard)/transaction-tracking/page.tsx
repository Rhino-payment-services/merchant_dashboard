"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { getBulkTransactionStatus, getBulkTransactionList } from '@/lib/api/bulk-payment.api';

interface BulkTransaction {
  bulkTransactionId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL_SUCCESS' | 'SUCCESS';
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  totalFees: number;
  currency: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  transactionResults: Array<{
    itemId: string;
    transactionId: string;
    status: string;
    amount: number;
    fee: number;
    netAmount: number;
    currency: string;
    reference: string;
    description: string;
    createdAt: string;
    processedAt: string;
    errorMessage?: string;
  }>;
}

export default function TransactionTrackingPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [bulkTransactions, setBulkTransactions] = useState<BulkTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBulkTransaction, setSelectedBulkTransaction] = useState<BulkTransaction | null>(null);

  // Load bulk transactions
  const loadBulkTransactions = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const response = await getBulkTransactionList({
        page: 1,
        limit: 50,
        userId: (session.user as any).id
      });
      
      setBulkTransactions(response.bulkTransactions || []);
    } catch (error) {
      console.error('Error loading bulk transactions:', error);
      toast.error('Failed to load bulk transactions');
    } finally {
      setLoading(false);
    }
  };

  // Load detailed status for a specific bulk transaction
  const loadBulkTransactionDetails = async (bulkTransactionId: string) => {
    try {
      const details = await getBulkTransactionStatus(bulkTransactionId);
      setSelectedBulkTransaction(details);
    } catch (error) {
      console.error('Error loading bulk transaction details:', error);
      toast.error('Failed to load transaction details');
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadBulkTransactions();
    
    const interval = setInterval(() => {
      loadBulkTransactions();
    }, 30000);

    return () => clearInterval(interval);
  }, [session]);

  // Filter transactions
  const filteredTransactions = bulkTransactions.filter(tx => {
    const matchesSearch = !searchTerm || 
      tx.bulkTransactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tx.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics
  const summary = {
    total: bulkTransactions.length,
    pending: bulkTransactions.filter(tx => tx.status === 'PENDING').length,
    processing: bulkTransactions.filter(tx => tx.status === 'PROCESSING').length,
    completed: bulkTransactions.filter(tx => tx.status === 'COMPLETED' || tx.status === 'SUCCESS').length,
    failed: bulkTransactions.filter(tx => tx.status === 'FAILED').length,
    partialSuccess: bulkTransactions.filter(tx => tx.status === 'PARTIAL_SUCCESS').length,
    totalAmount: bulkTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0),
    totalFees: bulkTransactions.reduce((sum, tx) => sum + tx.totalFees, 0),
  };

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
    const processed = tx.successfulTransactions + tx.failedTransactions;
    return Math.round((processed / tx.totalTransactions) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor and track your bulk payment transactions</p>
        </div>
        <Button onClick={loadBulkTransactions} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">UGX {summary.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Transaction Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by transaction ID or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="partial_success">Partial Success</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Transactions</CardTitle>
              <CardDescription>
                Track the status and progress of your bulk payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.bulkTransactionId}>
                      <TableCell className="font-mono text-sm">
                        {tx.bulkTransactionId}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tx.status)}
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
                          <div className="font-medium">UGX {tx.totalAmount.toLocaleString()}</div>
                          {tx.totalFees > 0 && (
                            <div className="text-gray-500">Fee: UGX {tx.totalFees.toLocaleString()}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-green-600">{tx.successfulTransactions}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span className="text-red-600">{tx.failedTransactions}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-yellow-600" />
                            <span className="text-yellow-600">{tx.pendingTransactions}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBulkTransaction(tx);
                            setActiveTab('details');
                            loadBulkTransactionDetails(tx.bulkTransactionId);
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

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No bulk transactions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {selectedBulkTransaction ? (
            <div className="space-y-4">
              {/* Transaction Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Transaction Details
                    {getStatusBadge(selectedBulkTransaction.status)}
                  </CardTitle>
                  <CardDescription>
                    ID: {selectedBulkTransaction.bulkTransactionId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-lg font-bold">UGX {selectedBulkTransaction.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Fees</p>
                      <p className="text-lg font-bold">UGX {selectedBulkTransaction.totalFees.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Currency</p>
                      <p className="text-lg font-bold">{selectedBulkTransaction.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Individual Transactions</CardTitle>
                  <CardDescription>
                    {selectedBulkTransaction.transactionResults.length} transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBulkTransaction.transactionResults.map((tx) => (
                        <TableRow key={tx.transactionId}>
                          <TableCell className="font-mono text-sm">
                            {tx.reference}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(tx.status)}
                          </TableCell>
                          <TableCell>UGX {tx.amount.toLocaleString()}</TableCell>
                          <TableCell>UGX {tx.fee.toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {tx.description || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(tx.processedAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Select a transaction from the overview to view details
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
