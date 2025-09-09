"use client"
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserProfile } from '../UserProfileProvider';
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
  const { profile, loading } = useUserProfile();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [transactionType, setTransactionType] = useState<'all' | 'credit' | 'debit'>('all');
  const [status, setStatus] = useState<'all' | 'approved' | 'pending' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const transactions: Transaction[] = profile?.profile?.merchant_transactions || [];

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
      const exportData = filteredTransactions.map(txn => ({
        'Transaction ID': txn.rdbs_transaction_id,
        'Date': new Date(txn.rdbs_approval_date).toLocaleDateString(),
        'Time': new Date(txn.rdbs_approval_date).toLocaleTimeString(),
        'Customer': txn.rdbs_sender_name,
        'Type': txn.rdbs_type,
        'Amount': Number(txn.rdbs_amount),
        'Status': txn.rdbs_approval_status,
        'Currency': 'UGX'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      
      // Add summary sheet
      const summaryData = [
        { 'Metric': 'Total Revenue', 'Value': summary.totalRevenue, 'Currency': 'UGX' },
        { 'Metric': 'Total Expenses', 'Value': summary.totalExpenses, 'Currency': 'UGX' },
        { 'Metric': 'Net Income', 'Value': summary.netIncome, 'Currency': 'UGX' },
        { 'Metric': 'Total Transactions', 'Value': summary.totalTransactions },
        { 'Metric': 'Credit Transactions', 'Value': summary.creditTransactions },
        { 'Metric': 'Debit Transactions', 'Value': summary.debitTransactions },
        { 'Metric': 'Average Transaction', 'Value': summary.averageTransaction, 'Currency': 'UGX' },
        { 'Metric': 'Success Rate', 'Value': `${summary.successRate.toFixed(1)}%` }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      XLSX.writeFile(wb, `rukapay-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Create a text-based PDF instead of image-based to avoid CSS issues
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      
      // Get merchant name from profile
      const merchantName = profile?.profile?.merchant_names || 'Unknown Merchant';
      
      // Add title with merchant name
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${merchantName} Transaction Report`, pageWidth / 2, margin + 10, { align: 'center' });
      
      // Add date
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 20, { align: 'center' });
      
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
      pdf.text(`Success Rate: ${summary.successRate.toFixed(1)}%`, margin, yPosition);
      
      // Add transactions table
      yPosition += 20;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Transaction Details', margin, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Table headers
      const headers = ['ID', 'Date', 'Customer', 'Type', 'Amount', 'Status'];
      const columnWidths = [30, 25, 40, 20, 30, 25];
      let xPosition = margin;
      
      headers.forEach((header, index) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(header, xPosition, yPosition);
        xPosition += columnWidths[index];
      });
      
      yPosition += 8;
      pdf.setFont('helvetica', 'normal');
      
      // Add transaction data
      const transactionsPerPage = 15;
      let transactionCount = 0;
      
      filteredTransactions.forEach((txn, index) => {
        if (transactionCount >= transactionsPerPage) {
          pdf.addPage();
          yPosition = margin + 20;
          transactionCount = 0;
        }
        
        xPosition = margin;
        pdf.text(txn.rdbs_transaction_id.substring(0, 8), xPosition, yPosition);
        xPosition += columnWidths[0];
        
        pdf.text(new Date(txn.rdbs_approval_date).toLocaleDateString(), xPosition, yPosition);
        xPosition += columnWidths[1];
        
        pdf.text(txn.rdbs_sender_name.substring(0, 15), xPosition, yPosition);
        xPosition += columnWidths[2];
        
        pdf.text(txn.rdbs_type, xPosition, yPosition);
        xPosition += columnWidths[3];
        
        pdf.text(`UGX ${Number(txn.rdbs_amount).toLocaleString()}`, xPosition, yPosition);
        xPosition += columnWidths[4];
        
        pdf.text(txn.rdbs_approval_status, xPosition, yPosition);
        
        yPosition += 6;
        transactionCount++;
      });
      
      pdf.save(`${merchantName.replace(/[^a-zA-Z0-9]/g, '_')}-transaction-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to generate PDF. Please try again. If the issue persists, try using the Excel export instead.');
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

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto" id="report-content">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive transaction analysis and insights</p>
          </div>
          <div className="flex gap-2">
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
              <Chart period="Monthly" from={dateRange.from} to={dateRange.to} />
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
                    <TableHead>Transaction ID</TableHead>
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