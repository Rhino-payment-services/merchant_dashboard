"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserProfile } from '../UserProfileProvider';
import { useMyTransactions, TransactionFilter } from '@/lib/api/transactions.api';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  DownloadCloud,
  RefreshCw
} from 'lucide-react';
import { Chart } from '../../components/chart';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface Transaction {
  rdbs_transaction_id: string;
  rdbs_approval_date: string;
  rdbs_sender_name: string;
  rdbs_amount: number;
  rdbs_type: 'credit' | 'debit';
  rdbs_approval_status: 'approved' | 'pending' | 'failed';
  rdbs_date?: string;
}

interface ReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalTransactions: number;
  creditTransactions: number;
  debitTransactions: number;
  averageTransaction: number;
  successRate: number;
}

export default function ReportsPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [transactionType, setTransactionType] = useState<'all' | 'credit' | 'debit'>('all');
  const [status, setStatus] = useState<'all' | 'approved' | 'pending' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Build filter for API - use date range if provided
  const apiFilter: TransactionFilter = useMemo(() => {
    const filter: TransactionFilter = {
      page: 1,
      limit: 1000, // Fetch a large number of transactions for reports
    };

    if (dateRange.from) filter.startDate = dateRange.from;
    if (dateRange.to) filter.endDate = dateRange.to;
    if (status !== 'all') {
      // Map status filter to API status
      if (status === 'approved') filter.status = 'COMPLETED';
      else if (status === 'pending') filter.status = 'PENDING';
      else if (status === 'failed') filter.status = 'FAILED';
    }
    if (transactionType !== 'all') {
      filter.direction = transactionType === 'credit' ? 'CREDIT' : 'DEBIT';
    }

    return filter;
  }, [dateRange, status, transactionType]);

  // Fetch transactions from API
  const { 
    data: transactionsData, 
    isLoading: transactionsLoading, 
    error: transactionsError,
    refetch: refetchTransactions
  } = useMyTransactions(apiFilter);

  // Transform API transactions to the format expected by the reports page
  const transformTransaction = (apiTxn: any): Transaction => {
    // Map API status to reports page status
    const mapStatus = (apiStatus: string): 'approved' | 'pending' | 'failed' => {
      if (apiStatus === 'COMPLETED' || apiStatus === 'SUCCESS') return 'approved';
      if (apiStatus === 'PENDING' || apiStatus === 'PROCESSING') return 'pending';
      return 'failed';
    };

    // Get sender name from transaction metadata (similar to transactions page logic)
    const getSenderName = (txn: any): string => {
      // Check for admin-funded deposits first
      if (txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin) {
        return txn.metadata?.adminName || 'Admin User';
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
          return txn.metadata?.userName || txn.metadata?.phoneNumber || 'Customer';
        }
      }
    };

    return {
      rdbs_transaction_id: apiTxn.reference || apiTxn.transactionId || apiTxn.id || '',
      rdbs_approval_date: apiTxn.createdAt || apiTxn.updatedAt || new Date().toISOString(),
      rdbs_sender_name: getSenderName(apiTxn),
      rdbs_amount: Number(apiTxn.amount || 0),
      rdbs_type: apiTxn.direction === 'CREDIT' ? 'credit' : 'debit',
      rdbs_approval_status: mapStatus(apiTxn.status || 'PENDING'),
      rdbs_date: apiTxn.createdAt || apiTxn.updatedAt
    };
  };

  // Transform all API transactions
  const transactions: Transaction[] = useMemo(() => {
    if (!transactionsData?.transactions) return [];
    return transactionsData.transactions.map(transformTransaction);
  }, [transactionsData, profile]);

  // Filter transactions based on criteria
  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(txn => {
      const date = new Date(txn.rdbs_approval_date);
      const fromDate = dateRange.from ? new Date(dateRange.from) : null;
      const toDate = dateRange.to ? new Date(dateRange.to) : null;
      
      const matchesDate = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
      const matchesType = transactionType === 'all' || txn.rdbs_type === transactionType;
      const matchesStatus = status === 'all' || txn.rdbs_approval_status === status;
      const matchesSearch = !searchTerm || 
        txn.rdbs_sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.rdbs_transaction_id.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesType && matchesStatus && matchesSearch;
    });
    
    // Sort by rdbs_approval_date in descending order (newest first)
    return filtered.sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime());
  }, [transactions, dateRange, transactionType, status, searchTerm]);

  // Calculate summary statistics
  const summary: ReportSummary = useMemo(() => {
    const creditTransactions = filteredTransactions.filter(t => t.rdbs_type === 'credit');
    const debitTransactions = filteredTransactions.filter(t => t.rdbs_type === 'debit');
    
    const totalRevenue = creditTransactions.reduce((sum, t) => sum + Number(t.rdbs_amount), 0);
    const totalExpenses = debitTransactions.reduce((sum, t) => sum + Number(t.rdbs_amount), 0);
    const netIncome = totalRevenue - totalExpenses;
    const totalTransactions = filteredTransactions.length;
    const averageTransaction = totalTransactions > 0 ? (totalRevenue + totalExpenses) / totalTransactions : 0;
    const successRate = totalTransactions > 0 ? 
      (filteredTransactions.filter(t => t.rdbs_approval_status === 'approved').length / totalTransactions) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      totalTransactions,
      creditTransactions: creditTransactions.length,
      debitTransactions: debitTransactions.length,
      averageTransaction,
      successRate
    };
  }, [filteredTransactions]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Export to Excel
  const exportToExcel = () => {
    setIsExporting(true);
    try {
      if (filteredTransactions.length === 0) {
        toast.error('No transactions to export');
        setIsExporting(false);
        return;
      }

      // Prepare transaction data with all relevant fields
      const exportData = filteredTransactions.map(txn => {
        const transactionDate = new Date(txn.rdbs_approval_date);
        return {
          'Transaction ID': txn.rdbs_transaction_id || 'N/A',
          'Date': transactionDate.toLocaleDateString('en-UG'),
          'Time': transactionDate.toLocaleTimeString('en-UG'),
          'Customer Name': txn.rdbs_sender_name || 'N/A',
          'Transaction Type': txn.rdbs_type?.toUpperCase() || 'N/A',
          'Amount (UGX)': Number(txn.rdbs_amount || 0),
          'Status': txn.rdbs_approval_status?.toUpperCase() || 'N/A',
          'Date (Full)': transactionDate.toISOString(),
        };
      });

      // Create transactions worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better readability
      const columnWidths = [
        { wch: 25 }, // Transaction ID
        { wch: 12 }, // Date
        { wch: 12 }, // Time
        { wch: 30 }, // Customer Name
        { wch: 15 }, // Transaction Type
        { wch: 15 }, // Amount
        { wch: 12 }, // Status
        { wch: 25 }, // Date (Full)
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      
      // Add summary sheet with formatted values
      const summaryData = [
        { 'Metric': 'Total Revenue', 'Value': summary.totalRevenue, 'Currency': 'UGX', 'Formatted': `UGX ${Number(summary.totalRevenue).toLocaleString()}` },
        { 'Metric': 'Total Expenses', 'Value': summary.totalExpenses, 'Currency': 'UGX', 'Formatted': `UGX ${Number(summary.totalExpenses).toLocaleString()}` },
        { 'Metric': 'Net Income', 'Value': summary.netIncome, 'Currency': 'UGX', 'Formatted': `UGX ${Number(summary.netIncome).toLocaleString()}` },
        { 'Metric': 'Total Transactions', 'Value': summary.totalTransactions, 'Currency': '', 'Formatted': summary.totalTransactions.toString() },
        { 'Metric': 'Credit Transactions', 'Value': summary.creditTransactions, 'Currency': '', 'Formatted': summary.creditTransactions.toString() },
        { 'Metric': 'Debit Transactions', 'Value': summary.debitTransactions, 'Currency': '', 'Formatted': summary.debitTransactions.toString() },
        { 'Metric': 'Average Transaction', 'Value': summary.averageTransaction, 'Currency': 'UGX', 'Formatted': `UGX ${Number(summary.averageTransaction).toLocaleString()}` },
        { 'Metric': 'Success Rate', 'Value': summary.successRate, 'Currency': '%', 'Formatted': `${summary.successRate.toFixed(1)}%` }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [
        { wch: 25 }, // Metric
        { wch: 15 }, // Value
        { wch: 10 }, // Currency
        { wch: 20 }, // Formatted
      ];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate filename with merchant name and date
      const merchantName = profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || 'Merchant';
      const sanitizedMerchantName = merchantName.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${sanitizedMerchantName}-transactions-${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      if (filteredTransactions.length === 0) {
        toast.error('No transactions to export');
        setIsExporting(false);
        return;
      }

      // Create a text-based PDF instead of image-based to avoid CSS issues
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      
      // Get merchant name from profile
      const merchantName = profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || 'Unknown Merchant';
      
      // Add title with merchant name
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${merchantName} Transaction Report`, pageWidth / 2, margin + 10, { align: 'center' });
      
      // Add date range if filters are applied
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let dateRangeText = `Generated on: ${new Date().toLocaleDateString('en-UG')}`;
      if (dateRange.from || dateRange.to) {
        const fromDate = dateRange.from ? new Date(dateRange.from).toLocaleDateString('en-UG') : 'All time';
        const toDate = dateRange.to ? new Date(dateRange.to).toLocaleDateString('en-UG') : 'Today';
        dateRangeText += ` | Period: ${fromDate} to ${toDate}`;
      }
      pdf.text(dateRangeText, pageWidth / 2, margin + 20, { align: 'center' });
      
      // Add summary
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', margin, margin + 40);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      let yPosition = margin + 50;
      
      pdf.text(`Total Revenue: UGX ${Number(summary.totalRevenue).toLocaleString()}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Total Expenses: UGX ${Number(summary.totalExpenses).toLocaleString()}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Net Income: UGX ${Number(summary.netIncome).toLocaleString()}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Total Transactions: ${summary.totalTransactions}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Credit Transactions: ${summary.creditTransactions}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Debit Transactions: ${summary.debitTransactions}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Success Rate: ${summary.successRate.toFixed(1)}%`, margin, yPosition);
      
      // Add transactions table
      yPosition += 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Transaction Details (${filteredTransactions.length} transactions)`, margin, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Table headers
      const headers = ['Transaction ID', 'Date', 'Customer', 'Type', 'Amount (UGX)', 'Status'];
      const columnWidths = [35, 25, 45, 20, 35, 20];
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
      
      filteredTransactions.forEach((txn, index) => {
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
        
        // Customer name (truncate if too long, handle empty strings)
        const customerName = (txn.rdbs_sender_name || 'N/A').toString();
        const displayName = customerName.length > 22 ? customerName.substring(0, 22) + '...' : customerName;
        pdf.text(displayName, xPosition, yPosition);
        xPosition += columnWidths[2];
        
        // Type
        pdf.text(txn.rdbs_type?.toUpperCase() || 'N/A', xPosition, yPosition);
        xPosition += columnWidths[3];
        
        // Amount
        pdf.text(`UGX ${Number(txn.rdbs_amount || 0).toLocaleString()}`, xPosition, yPosition);
        xPosition += columnWidths[4];
        
        // Status
        pdf.text(txn.rdbs_approval_status?.toUpperCase() || 'N/A', xPosition, yPosition);
        
        yPosition += 6;
        transactionCount++;
      });
      
      // Generate filename
      const sanitizedMerchantName = merchantName.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${sanitizedMerchantName}-transaction-report-${dateStr}.pdf`;
      
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
    setDateRange({ from: '', to: '' });
    setTransactionType('all');
    setStatus('all');
    setSearchTerm('');
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
      await refetchTransactions();
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

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto" id="report-content">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Reports & Analytics</h1>
              <p className="text-gray-600">Comprehensive transaction analysis and insights</p>
            </div>
            <div className="flex gap-2">
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
                onClick={exportToExcel} 
                disabled={isExporting || filteredTransactions.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                <DownloadCloud className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              <Button 
                onClick={exportToPDF} 
                disabled={isExporting || filteredTransactions.length === 0}
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
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
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
                  onChange={(e) => setStatus(e.target.value as 'all' | 'approved' | 'pending' | 'failed')}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">UGX {Number(summary.totalRevenue).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.creditTransactions} credit transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">UGX {Number(summary.totalExpenses).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.debitTransactions} debit transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                UGX {Number(summary.netIncome).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue - Expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalTransactions} total transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Transaction Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart 
                period="Monthly" 
                from={dateRange.from} 
                to={dateRange.to}
                transactions={transactions}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Transaction Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Credit Transactions</span>
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
                  <span className="text-sm font-medium">Debit Transactions</span>
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No transactions found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((txn) => (
                      <TableRow key={txn.rdbs_transaction_id}>
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
                            txn.rdbs_approval_status === 'approved' 
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 