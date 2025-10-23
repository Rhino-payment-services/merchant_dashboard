"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Upload, Download, Plus, Trash2, Users, CheckCircle2, 
  XCircle, Clock, Send, AlertCircle, Info, Loader2,
  Wallet, Phone, Building2, Zap, Edit
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { processBulkTransactionAsync, validateBulkRecipients, getBulkTransactionStatus, BulkTransactionItem, BulkTransactionItemResult } from "@/lib/api/bulk-payment.api";

const TRANSACTION_TYPES = [
  { value: 'WALLET_TO_MNO', label: 'Mobile Money', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'WALLET_TO_BANK', label: 'Bank Transfer', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'WALLET_TO_WALLET', label: 'Wallet Transfer', icon: Wallet, color: 'text-green-600', bg: 'bg-green-50' },
];

const UGANDAN_BANKS = [
  { bankName: "Barclays (now Absa)", bankSortCode: "013847" },
  { bankName: "Bank of Baroda", bankSortCode: "020147" },
  { bankName: "Stanbic Bank Ltd", bankSortCode: "040147" },
  { bankName: "DFCU Bank", bankSortCode: "050147" },
  { bankName: "Tropical Africa Bank", bankSortCode: "060147" },
  { bankName: "Standard Chartered Bank", bankSortCode: "080147" },
  { bankName: "Orient Bank", bankSortCode: "110147" },
  { bankName: "Bank of Africa", bankSortCode: "130447" },
  { bankName: "Centenary Bank", bankSortCode: "163747" },
  { bankName: "Crane Bank", bankSortCode: "170147" },
  { bankName: "Cairo International Bank", bankSortCode: "180147" },
  { bankName: "Diamond Trust Bank", bankSortCode: "190147" },
  { bankName: "Citi Bank", bankSortCode: "220147" },
  { bankName: "Housing Finance Bank", bankSortCode: "230147" },
  { bankName: "Global Trust Bank", bankSortCode: "240147" },
  { bankName: "Kenya Commercial Bank (KCB)", bankSortCode: "252947" },
  { bankName: "United Bank for Africa (UBA)", bankSortCode: "260147" },
  { bankName: "FINA Bank", bankSortCode: "271147" },
  { bankName: "Bank of Uganda", bankSortCode: "990147" },
  { bankName: "Ecobank", bankSortCode: "290147" },
  { bankName: "Equity Bank", bankSortCode: "300147" },
  { bankName: "ABC Bank", bankSortCode: "310147" },
  { bankName: "Imperial Bank Uganda", bankSortCode: "320147" },
  { bankName: "NC Bank", bankSortCode: "350147" },
  { bankName: "Post Bank Uganda", bankSortCode: "560147" }
];


interface PaymentItem extends Partial<BulkTransactionItem> {
  id: string;
  status?: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
  validated?: boolean;
}

export default function BulkPaymentPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkReference, setBulkReference] = useState('');
  // State for progress tracking
  const [bulkTransactionId, setBulkTransactionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressStats, setProgressStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    percentage: 0
  });
  const [validating, setValidating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<PaymentItem>>({
    mode: 'WALLET_TO_MNO',
    currency: 'UGX',
    walletType: 'BUSINESS', // ✅ Hardcoded to BUSINESS wallet for merchant dashboard
  });

  const handleAddPayment = () => {
    // ✅ Description is now optional - only validate amount
    if (!formData.amount) {
      toast.error('Amount is required');
      return;
    }

    // Validate based on mode
    if (formData.mode === 'WALLET_TO_MNO' && (!formData.phoneNumber || !formData.mnoProvider)) {
      toast.error('Phone number and network are required for mobile money');
      return;
    }

    if (formData.mode === 'WALLET_TO_BANK' && (!formData.accountNumber || !formData.bankSortCode || !formData.accountName)) {
      toast.error('Account number, bank, and account name are required for bank transfer');
      return;
    }

    if (formData.mode === 'WALLET_TO_WALLET' && !formData.recipientPhone) {
      toast.error('Recipient phone is required for wallet transfer');
      return;
    }

    if (editingId) {
      // Update existing payment (always use BUSINESS wallet)
      setPayments(prev => prev.map(p => 
        p.id === editingId 
          ? { ...formData as PaymentItem, id: p.id, itemId: p.itemId, status: 'pending', validated: false, walletType: 'BUSINESS' }
          : p
      ));
      setEditingId(null);
      toast.success('Payment updated');
    } else {
      // Add new payment (always use BUSINESS wallet)
      const newPayment: PaymentItem = {
        ...formData as BulkTransactionItem,
        id: `item-${Date.now()}`,
        itemId: `ITEM-${Date.now()}`,
        status: 'pending',
        walletType: 'BUSINESS', // ✅ Hardcoded to BUSINESS wallet
      };
      setPayments(prev => [...prev, newPayment]);
      toast.success('Payment added to list');
    }

    setFormData({ mode: 'WALLET_TO_MNO', currency: 'UGX', walletType: 'BUSINESS' });
    setShowAddForm(false);
  };

  const handleEditPayment = (payment: PaymentItem) => {
    setFormData(payment);
    setEditingId(payment.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData({ mode: 'WALLET_TO_MNO', currency: 'UGX', walletType: 'BUSINESS' });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleValidateAll = async () => {
    if (payments.length === 0) {
      toast.error('No payments to validate');
      return;
    }

    setValidating(true);

    try {
      // Don't send walletType to validation endpoint - it's only needed for processing
      const items: BulkTransactionItem[] = payments.map(p => ({
        itemId: p.itemId!,
        mode: p.mode!,
        amount: p.amount!,
        currency: p.currency!,
        description: p.description,
        // walletType is not needed for validation, only for processing
        phoneNumber: p.phoneNumber,
        mnoProvider: p.mnoProvider,
        recipientName: p.recipientName,
        accountNumber: p.accountNumber,
        bankSortCode: p.bankSortCode,
        accountName: p.accountName,
        bankName: p.bankName,
        recipientPhone: p.recipientPhone,
      }));

      console.log('🔍 Validating recipients:', items);
      
      const result = await validateBulkRecipients(items);
      
      console.log('✅ Validation result:', result);

      // Update payment statuses based on validation results
      const validationResults = result.results || [];
      
      const updatedPayments = payments.map(payment => {
        const itemResult = validationResults.find((r: any) => r.itemId === payment.itemId);
        if (itemResult) {
          return {
            ...payment,
            status: itemResult.isValid ? 'pending' as const : 'failed' as const,
            error: itemResult.error,
            validated: true,
            // Update with validated name if available
            recipientName: itemResult.accountName || payment.recipientName,
            accountName: itemResult.accountName || payment.accountName,
          };
        }
        return payment;
      });

      setPayments(updatedPayments);

      // Show summary toast
      if (result.validItems === result.totalItems) {
        toast.success(`✅ All ${result.validItems} recipients validated successfully!`);
      } else if (result.validItems > 0) {
        toast.warning(`⚠️ ${result.validItems} valid, ${result.invalidItems} invalid`);
      } else {
        toast.error(`❌ All ${result.invalidItems} recipients failed validation`);
      }

    } catch (error: any) {
      console.error('❌ Bulk validation error:', error);
      toast.error(error.message || 'Failed to validate recipients');
    } finally {
      setValidating(false);
    }
  };

  // Poll bulk transaction status
  const pollBulkTransactionStatus = async (bulkTransactionId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const status = await getBulkTransactionStatus(bulkTransactionId);

        // Update progress stats
        const successCount = status.successfulTransactions || status.successfulItems || 0;
        const failCount = status.failedTransactions || status.failedItems || 0;
        const pendingCount = status.pendingTransactions || status.pendingItems || 0;
        const totalCount = status.totalTransactions || status.totalItems || payments.length;
        const processed = successCount + failCount;
        
        setProgressStats({
          total: totalCount,
          successful: successCount,
          failed: failCount,
          pending: pendingCount,
          percentage: Math.round((processed / totalCount) * 100)
        });
        
        // Update individual payment statuses
        const transactionResults = status.transactionResults || status.results || [];
        const updatedPayments = payments.map(payment => {
          const itemResult = transactionResults.find((r: any) => r.itemId === payment.itemId);
          if (itemResult) {
            return {
              ...payment,
              status: itemResult.status?.toLowerCase() || 'pending' as any,
              error: itemResult.errorMessage || itemResult.error,
            };
          }
          return payment;
        });
        setPayments(updatedPayments);

        // Check for completion
        if (status.status === 'SUCCESS' || status.status === 'FAILED' || status.status === 'PARTIAL_SUCCESS') {
          setBulkTransactionId(null);
          // Show final summary toast
          if (successCount === totalCount) {
            toast.success(`🎉 All ${successCount} payments completed successfully!`);
          } else if (successCount > 0) {
            toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed`);
          } else {
            toast.error(`❌ All ${failCount} payments failed`);
          }
          return; // Stop polling
        }

        // Continue polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setBulkTransactionId(null);
          toast.warning('⏰ Status polling timeout. Check transaction status manually.');
        }

      } catch (error) {
        console.error('❌ Error polling bulk transaction status:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setBulkTransactionId(null);
          toast.error('❌ Failed to get bulk transaction status');
        }
      }
    };

    // Start polling after 2 seconds
    setTimeout(poll, 2000);
  };

  const handleProcessBulk = async () => {
    if (payments.length === 0) {
      toast.error('No payments to process');
      return;
    }

    const userId = (session?.user as any)?.id;
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setProcessing(true);

    try {
      // Prepare bulk transaction request
      const bulkRequest = {
        userId,
        transactions: payments.map(p => ({
          itemId: p.itemId!,
          mode: p.mode!,
          amount: p.amount!,
          currency: p.currency!,
          description: p.description,
          reference: p.reference,
          walletType: 'BUSINESS' as 'BUSINESS', // ✅ Hardcoded to BUSINESS wallet for merchant dashboard
          phoneNumber: p.phoneNumber,
          mnoProvider: p.mnoProvider,
          recipientName: p.recipientName,
          accountNumber: p.accountNumber,
          bankSortCode: p.bankSortCode,
          bankName: p.bankName,
          accountName: p.accountName,
          swiftCode: p.swiftCode,
          recipientPhone: p.recipientPhone,
          recipientUserId: p.recipientUserId,
          metadata: p.metadata,
        })),
        description: bulkDescription || 'Bulk payment',
        reference: bulkReference || `BULK-${Date.now()}`,
        processInParallel: true,
        stopOnFirstFailure: false,
      };

      console.log('🚀 Processing bulk transaction async:', bulkRequest);
      
      const result = await processBulkTransactionAsync(bulkRequest);
      
      console.log('✅ Bulk transaction queued:', result);

      setBulkTransactionId(result.bulkTransactionId);
      setProgressStats({
        total: payments.length,
        successful: 0,
        failed: 0,
        pending: payments.length,
        percentage: 0
      });
      
      toast.success(`🚀 Bulk payment queued! Processing ${payments.length} transactions in background.`);
      await pollBulkTransactionStatus(result.bulkTransactionId);

      // Update payment statuses based on results
      // Backend returns transactionResults, not results
      const transactionResults = result.transactionResults || result.results || [];
      
      const updatedPayments = payments.map(payment => {
        const itemResult = transactionResults.find((r: any) => r.itemId === payment.itemId);
        if (itemResult) {
          return {
            ...payment,
            status: itemResult.status?.toLowerCase() || 'pending' as any,
            error: itemResult.errorMessage || itemResult.error,
          };
        }
        return payment;
      });

      setPayments(updatedPayments);

      // Show summary toast
      const successCount = result.successfulTransactions || result.successfulItems || 0;
      const failCount = result.failedTransactions || result.failedItems || 0;
      const totalCount = result.totalTransactions || result.totalItems || payments.length;
      
      if (successCount === totalCount) {
        toast.success(`🎉 All ${successCount} payments completed successfully!`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed`);
      } else {
        toast.error(`❌ All ${failCount} payments failed`);
      }

    } catch (error: any) {
      console.error('❌ Bulk payment error:', error);
      toast.error(error.message || 'Failed to process bulk payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    console.log('📁 Uploading file:', file.name, 'Extension:', fileExtension);

    if (fileExtension === 'csv') {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const csvContent = evt.target?.result as string;
          if (!csvContent) {
            toast.error('Failed to read CSV file');
            return;
          }

          console.log('📄 CSV Content length:', csvContent.length);

          // Parse CSV - handle both \n and \r\n line endings
          const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
          console.log('📋 Total lines:', lines.length);

          if (lines.length < 2) {
            toast.error('CSV file is empty or has no data rows');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          console.log('📊 Headers:', headers);
          
          const data = lines.slice(1).map((line, lineIndex) => {
            // Simple CSV parser - split by comma but handle quotes
            const values: string[] = [];
            let currentValue = '';
            let insideQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim().replace(/^"|"$/g, ''));

            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            console.log(`Row ${lineIndex + 1}:`, row);
            return row;
          });

          const newPayments: PaymentItem[] = data
            .filter(row => {
              const isValid = row.mode && row.amount && row.description;
              if (!isValid) {
                console.log('⚠️ Skipping invalid row:', row);
              }
              return isValid;
            })
            .map((row, index) => ({
              id: `upload-${Date.now()}-${index}`,
              itemId: `ITEM-${Date.now()}-${index}`,
              mode: row.mode as any,
              amount: Number(row.amount),
              currency: row.currency || 'UGX',
              description: row.description,
              phoneNumber: row.phoneNumber || '',
              mnoProvider: row.mnoProvider || row.network || '',
              recipientName: row.recipientName || row.name || '',
              accountNumber: row.accountNumber || '',
              bankSortCode: row.bankSortCode || '',
              bankName: row.bankName || '',
              accountName: row.accountName || '',
              recipientPhone: row.recipientPhone || '',
              status: 'pending' as const,
            }));

          console.log('✅ Parsed payments:', newPayments);

          if (newPayments.length === 0) {
            toast.error('No valid payment rows found in CSV');
            return;
          }

          setPayments(prev => [...prev, ...newPayments]);
          toast.success(`✅ Uploaded ${newPayments.length} payments from CSV`);
        } catch (error: any) {
          console.error('❌ CSV parse error:', error);
          toast.error(`Failed to parse CSV: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read CSV file');
      };
      
      reader.readAsText(file);
    } else {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          if (!bstr) {
            toast.error('Failed to read Excel file');
            return;
          }

          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const newPayments: PaymentItem[] = (data as any[])
            .filter(row => row.amount && row.description && row.mode)
            .map((row, index) => ({
              id: `upload-${Date.now()}-${index}`,
              itemId: `ITEM-${Date.now()}-${index}`,
              mode: row.mode || 'WALLET_TO_MNO',
              amount: Number(row.amount),
              currency: row.currency || 'UGX',
              description: row.description,
              phoneNumber: row.phoneNumber || '',
              mnoProvider: row.mnoProvider || row.network || '',
              recipientName: row.recipientName || row.name || '',
              accountNumber: row.accountNumber || '',
              bankSortCode: row.bankSortCode || '',
              bankName: row.bankName || '',
              accountName: row.accountName || '',
              recipientPhone: row.recipientPhone || '',
              status: 'pending' as const,
            }));

          setPayments(prev => [...prev, ...newPayments]);
          toast.success(`✅ Uploaded ${newPayments.length} payments from Excel`);
        } catch (error: any) {
          console.error('❌ Excel parse error:', error);
          toast.error(`Failed to parse Excel: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read Excel file');
      };
      
      reader.readAsBinaryString(file);
    }

    // Reset file input
    e.target.value = '';
  };

  const downloadTemplate = (format: 'excel' | 'csv' = 'csv') => {
    const templateData = [
      {
        mode: 'WALLET_TO_MNO',
        phoneNumber: '256700111111',
        mnoProvider: 'MTN',
        recipientName: 'John Doe',
        amount: 50000,
        currency: 'UGX',
        description: 'Salary payment',
      },
      {
        mode: 'WALLET_TO_BANK',
        accountNumber: '1234567890',
        bankSortCode: '040147',
        bankName: 'Stanbic Bank Ltd',
        accountName: 'Jane Smith',
        amount: 100000,
        currency: 'UGX',
        description: 'Contractor payment',
      },
      {
        mode: 'WALLET_TO_WALLET',
        recipientPhone: '256700333333',
        amount: 75000,
        currency: 'UGX',
        description: 'Internal transfer',
      },
    ];

    if (format === 'csv') {
      // Generate CSV content
      const headers = ['mode', 'phoneNumber', 'mnoProvider', 'recipientName', 'accountNumber', 'bankSortCode', 'bankName', 'accountName', 'recipientPhone', 'amount', 'currency', 'description'];
      const csvContent = [
        headers.join(','),
        ...templateData.map(row => 
          headers.map(header => {
            const value = (row as any)[header] || '';
            // Escape commas and quotes in values
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        )
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'rukapay-bulk-payment-template.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('CSV template downloaded successfully');
    } else {
      // Generate Excel file
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BulkPaymentTemplate');
      XLSX.writeFile(wb, 'rukapay-bulk-payment-template.xlsx');
      toast.success('Excel template downloaded successfully');
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const successCount = payments.filter(p => p.status === 'success').length;
  const failedCount = payments.filter(p => p.status === 'failed').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Bulk Payments</h1>
              <p className="text-gray-600">Process multiple payments at once with mixed payment methods</p>
            </div>
            
            <Card className="md:w-80 bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-100">Total Amount</p>
                  <p className="text-2xl font-bold">{totalAmount.toLocaleString()} UGX</p>
                </div>
                <Users className="w-8 h-8 text-purple-200" />
              </div>
              <div className="mt-4 pt-4 border-t border-purple-500/30 flex justify-between text-xs">
                <span>{payments.length} payments</span>
                <span>{pendingCount} pending</span>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Progress Indicator Card */}
        {bulkTransactionId && processing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                Processing Bulk Payment
              </CardTitle>
              <CardDescription>
                Transaction ID: {bulkTransactionId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Progress</span>
                  <span className="font-bold text-blue-600">{progressStats.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressStats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                  <div className="text-2xl font-bold text-gray-800">{progressStats.total}</div>
                  <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{progressStats.successful}</div>
                  <div className="text-xs text-green-700 mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Success
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{progressStats.failed}</div>
                  <div className="text-xs text-red-700 mt-1 flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{progressStats.pending}</div>
                  <div className="text-xs text-yellow-700 mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </div>
                </div>
              </div>

              {/* Processing Info */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Processing in background</p>
                    <p className="text-xs text-gray-600">
                      Transactions are being processed asynchronously. You can leave this page and check back later.
                      The individual transaction statuses will update automatically every 5 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bulk Description
                </label>
                <Input
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                  placeholder="e.g., January 2025 Payroll"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference (Optional)
                </label>
                <Input
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  placeholder="e.g., PAYROLL-JAN-2025"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
          
          <Button
            variant="outline"
            onClick={() => downloadTemplate('csv')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => downloadTemplate('excel')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          <div className="ml-auto flex gap-2">
            <Button
              onClick={handleValidateAll}
              disabled={payments.length === 0 || validating || processing}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validate All
                </>
              )}
            </Button>

            <Button
              onClick={handleProcessBulk}
              disabled={payments.length === 0 || processing || validating}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing {payments.length} Payments...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Process All ({payments.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Add Payment Form */}
        {showAddForm && (
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? 'Edit Payment' : 'Add New Payment'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Update the payment details' : 'Fill in the details for a single payment'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Transaction Type */}
                <div className="col-span-full">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {TRANSACTION_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, mode: type.value as any }))}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            formData.mode === type.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mx-auto mb-2 ${
                            formData.mode === type.value ? type.color : 'text-gray-400'
                          }`} />
                          <p className="text-xs font-medium text-center">{type.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Money Fields */}
                {formData.mode === 'WALLET_TO_MNO' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.phoneNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="256700123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Network <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.mnoProvider || 'MTN'}
                        onChange={(e) => setFormData(prev => ({ ...prev, mnoProvider: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="MTN">MTN</option>
                        <option value="AIRTEL">Airtel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Recipient Name
                      </label>
                      <Input
                        value={formData.recipientName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                  </>
                )}

                {/* Bank Transfer Fields */}
                {formData.mode === 'WALLET_TO_BANK' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.accountNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bank <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.bankSortCode || ''}
                        onChange={(e) => {
                          const bank = UGANDAN_BANKS.find(b => b.bankSortCode === e.target.value);
                          setFormData(prev => ({ ...prev, bankSortCode: e.target.value, bankName: bank?.bankName }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Bank</option>
                        {UGANDAN_BANKS.map(bank => (
                          <option key={bank.bankSortCode} value={bank.bankSortCode}>{bank.bankName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.accountName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                  </>
                )}

                {/* Wallet Transfer Fields */}
                {formData.mode === 'WALLET_TO_WALLET' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Recipient Phone <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.recipientPhone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
                        placeholder="256700123456"
                      />
                    </div>
                  </>
                )}


                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount (UGX) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    placeholder="10000"
                    min={1000}
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-400">(Optional)</span>
                  </label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., January 2025 salary (auto-generated if empty)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💼 Payments will be deducted from your Business Wallet
                  </p>
                </div>

                <div className="col-span-full flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddPayment}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingId ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Update Payment
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to List
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments List */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Queue</CardTitle>
                <CardDescription>
                  {payments.length === 0 
                    ? 'No payments added yet' 
                    : `${payments.length} payment${payments.length !== 1 ? 's' : ''} ready to process`
                  }
                </CardDescription>
              </div>
              
              {payments.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{successCount}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full">
                    <XCircle className="w-3 h-3" />
                    <span>{failedCount}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-700 rounded-full">
                    <Clock className="w-3 h-3" />
                    <span>{pendingCount}</span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No payments in queue</p>
                <p className="text-sm text-gray-400">Add payments manually or upload an Excel file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const typeInfo = TRANSACTION_TYPES.find(t => t.value === payment.mode);
                  const Icon = typeInfo?.icon || Phone;
                  
                  return (
                    <div
                      key={payment.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                        payment.status === 'processing' 
                          ? 'border-blue-300 bg-blue-50 animate-pulse' 
                          : payment.status === 'success'
                          ? 'border-green-200 bg-green-50'
                          : payment.status === 'failed'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-3 rounded-lg ${
                        payment.status === 'processing'
                          ? 'bg-blue-100'
                          : payment.status === 'success'
                          ? 'bg-green-100'
                          : payment.status === 'failed'
                          ? 'bg-red-100'
                          : typeInfo?.bg || 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          payment.status === 'processing'
                            ? 'text-blue-600'
                            : payment.status === 'success'
                            ? 'text-green-600'
                            : payment.status === 'failed'
                            ? 'text-red-600'
                            : typeInfo?.color || 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-medium">{typeInfo?.label}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Details</p>
                          <p className="text-sm font-medium">
                            {payment.mode === 'WALLET_TO_MNO' && payment.phoneNumber}
                            {payment.mode === 'WALLET_TO_BANK' && payment.accountNumber}
                            {payment.mode === 'WALLET_TO_WALLET' && payment.recipientPhone}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">{payment.recipientName || payment.accountName}</p>
                            {payment.validated && payment.status === 'pending' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                ✓ Validated
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm font-bold">{payment.amount?.toLocaleString()} UGX</p>
                          <p className="text-xs text-gray-500">{payment.description}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <div className="flex items-center gap-1 mt-1">
                              {payment.status === 'success' && (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-600">Success</span>
                                </>
                              )}
                              {payment.status === 'failed' && (
                                <>
                                  <XCircle className="w-4 h-4 text-red-600" />
                                  <span className="text-xs font-medium text-red-600">Failed</span>
                                </>
                              )}
                              {payment.status === 'processing' && (
                                <>
                                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                  <span className="text-xs font-medium text-blue-600">Processing</span>
                                </>
                              )}
                              {payment.status === 'pending' && (
                                <>
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="text-xs font-medium text-gray-600">Pending</span>
                                </>
                              )}
                            </div>
                            {payment.error && (
                              <p className="text-xs text-red-600 mt-1">{payment.error}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(payment)}
                              disabled={payment.status === 'processing'}
                              title="Edit payment"
                            >
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePayment(payment.id)}
                              disabled={payment.status === 'processing'}
                              title="Remove payment"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">High Performance</p>
                  <p className="text-sm text-blue-700 mt-1">Process up to 1000 payments in seconds with parallel processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Mixed Payment Types</p>
                  <p className="text-sm text-green-700 mt-1">Combine mobile money, bank transfers, and more in one batch</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900">Three Payment Types</p>
                  <p className="text-sm text-purple-700 mt-1">Mobile Money, Bank Transfer, and Wallet Transfer in one bulk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


