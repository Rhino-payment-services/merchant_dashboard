"use client"
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  reference?: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  direction: string;
  description?: string;
  fee?: number;
  netAmount?: number;
  createdAt: string;
  metadata?: {
    revenue?: {
      amount: number;
      currency?: string;
    };
    senderName?: string;
    recipientName?: string;
    counterpartyInfo?: {
      name?: string;
      phone?: string;
      type?: string;
    };
    [key: string]: any;
  };
  user?: {
    phone?: string;
    email?: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface TransactionReceiptProps {
  transaction: Transaction;
  merchantInfo?: {
    businessName: string;
    merchantCode?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

export default function TransactionReceipt({ transaction, merchantInfo }: TransactionReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = () => {
    if (!receiptRef.current) {
      toast.error('Receipt content not found');
      return;
    }
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        // Fallback: use browser's native print with CSS
        window.print();
        return;
      }

      const printContent = receiptRef.current.innerHTML;
      const printStyles = `
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
            color: #000;
          }
          @media print {
            @page {
              margin: 10mm;
              size: A4;
            }
            body {
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      `;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Transaction Receipt - ${transaction.reference || transaction.id}</title>
            ${printStyles}
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      toast.success('Opening print dialog...');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print dialog. Please try using your browser\'s print function.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) {
      toast.error('Receipt content not found');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      toast.info('Generating PDF...');
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: receiptRef.current.offsetWidth,
        height: receiptRef.current.offsetHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Save PDF
      const fileName = `receipt-${transaction.reference || transaction.id}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Extract sender and receiver info with contact details
  const getSenderInfo = () => {
    // Check for admin-funded deposits first
    if (transaction.type === 'DEPOSIT' && transaction.metadata?.fundedByAdmin) {
      // Admin is funding the merchant's wallet
      return {
        name: transaction.metadata?.adminName || 'Admin User',
        contact: transaction.metadata?.adminPhone || transaction.metadata?.adminEmail || 'Admin'
      };
    }
    
    if (transaction.direction === 'DEBIT') {
      // Merchant is sending - sender is the merchant (wallet owner)
      return {
        name: merchantInfo?.businessName || 'Merchant',
        contact: merchantInfo?.phone || ''
      };
    } else {
      // CREDIT direction - someone else is sending to merchant
      // Extract sender info based on transaction type (matching page logic)
      if (transaction.type === 'MERCHANT_TO_WALLET' || transaction.type === 'MERCHANT_TO_INTERNAL_WALLET' || transaction.type?.includes('MERCHANT_TO_WALLET') || transaction.type?.includes('MERCHANT_TO_INTERNAL_WALLET')) {
        // Merchant sending to wallet
        return {
          name: transaction.metadata?.merchantName || transaction.metadata?.counterpartyInfo?.name || 'Merchant',
          contact: transaction.metadata?.merchantCode || transaction.metadata?.accountNumber || ''
        };
      } else if (transaction.type === 'MNO_TO_WALLET' || transaction.type?.includes('MNO_TO_WALLET')) {
        // Mobile Money sending to wallet
        if (transaction.metadata?.mnoProvider) {
          return {
            name: transaction.metadata?.userName || `${transaction.metadata.mnoProvider} Mobile Money`,
            contact: transaction.metadata?.phoneNumber || ''
          };
        } else if (transaction.metadata?.phoneNumber) {
          return {
            name: transaction.metadata?.userName || 'Mobile Money User',
            contact: transaction.metadata?.phoneNumber || ''
          };
        } else {
          return {
            name: 'External',
            contact: ''
          };
        }
      } else if (transaction.type === 'WALLET_TO_WALLET' || (transaction as any).counterpartyId || (transaction as any).counterpartyUser) {
        // P2P - Wallet to Wallet - sender is another RukaPay user
        const counterpartyUser = (transaction as any).counterpartyUser;
        const senderName = counterpartyUser?.profile?.firstName && counterpartyUser?.profile?.lastName
          ? `${counterpartyUser.profile.firstName} ${counterpartyUser.profile.lastName}`
          : transaction.metadata?.counterpartyInfo?.name || transaction.metadata?.userName || 'RukaPay User';
        return {
          name: senderName,
          contact: counterpartyUser?.phone || (transaction as any).counterpartyId || ''
        };
      } else if (transaction.metadata?.counterpartyInfo) {
        return {
          name: transaction.metadata.counterpartyInfo.name,
          contact: transaction.metadata.counterpartyInfo.phone || transaction.metadata.counterpartyInfo.accountNumber || ''
        };
      } else {
        // Fallback - extract from metadata
        return {
          name: transaction.metadata?.userName || transaction.metadata?.phoneNumber || 'External',
          contact: transaction.metadata?.phoneNumber || transaction.metadata?.accountNumber || ''
        };
      }
    }
  };

  const getReceiverInfo = () => {
    // Check for admin-funded deposits first
    if (transaction.type === 'DEPOSIT' && transaction.metadata?.fundedByAdmin) {
      // Merchant is receiving funds from admin
      return {
        name: merchantInfo?.businessName || 'Merchant',
        contact: merchantInfo?.phone || ''
      };
    }
    
    if (transaction.direction === 'CREDIT') {
      // Merchant is receiving - receiver is the merchant (wallet owner)
      return {
        name: merchantInfo?.businessName || 'Merchant',
        contact: merchantInfo?.phone || ''
      };
    } else {
      // DEBIT direction - merchant is sending to someone
      // Extract receiver info based on transaction type (matching page logic)
      if (transaction.type === 'WALLET_TO_WALLET' || (transaction as any).counterpartyId || (transaction as any).counterpartyUser) {
        // P2P - Wallet to Wallet - receiver is another RukaPay user
        const counterpartyUser = (transaction as any).counterpartyUser;
        const receiverName = counterpartyUser?.profile?.firstName && counterpartyUser?.profile?.lastName
          ? `${counterpartyUser.profile.firstName} ${counterpartyUser.profile.lastName}`
          : transaction.metadata?.counterpartyInfo?.name || transaction.metadata?.userName || 'RukaPay User';
        return {
          name: receiverName,
          contact: counterpartyUser?.phone || (transaction as any).counterpartyId || ''
        };
      } else if (transaction.type === 'WALLET_TO_MERCHANT' || transaction.type === 'WALLET_TO_INTERNAL_MERCHANT' || transaction.type?.includes('MERCHANT') || transaction.metadata?.merchantName) {
        // Wallet to Merchant - receiver is merchant
        return {
          name: transaction.metadata?.merchantName || transaction.metadata?.counterpartyInfo?.name || transaction.metadata?.userName || 'Merchant',
          contact: transaction.metadata?.merchantCode || transaction.metadata?.accountNumber || ''
        };
      } else if (transaction.metadata?.counterpartyInfo) {
        return {
          name: transaction.metadata.counterpartyInfo.name,
          contact: transaction.metadata.counterpartyInfo.phone || transaction.metadata.counterpartyInfo.accountNumber || ''
        };
      } else if (transaction.metadata?.mnoProvider) {
        // External Mobile Money - show recipient name if available
        return {
          name: transaction.metadata?.userName || transaction.metadata?.recipientName || `${transaction.metadata.mnoProvider} Mobile Money`,
          contact: transaction.metadata?.phoneNumber || ''
        };
      } else if (transaction.metadata?.phoneNumber) {
        // External Mobile Money (no provider specified)
        return {
          name: transaction.metadata?.userName || transaction.metadata?.recipientName || 'Mobile Money User',
          contact: transaction.metadata?.phoneNumber || ''
        };
      } else if (transaction.metadata?.accountNumber) {
        // Bank/Utility/Other External Account
        return {
          name: transaction.metadata?.userName || transaction.metadata?.recipientName || 'External Account',
          contact: transaction.metadata?.accountNumber || ''
        };
      } else {
        // Fallback
        return {
          name: transaction.metadata?.recipientName || transaction.metadata?.userName || 'Recipient',
          contact: transaction.metadata?.phoneNumber || transaction.metadata?.accountNumber || ''
        };
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'MERCHANT_TO_WALLET': 'Payment to Customer',
      'WALLET_TO_MERCHANT': 'Payment from Customer',
      'WALLET_TO_INTERNAL_MERCHANT': 'Payment from Customer',
      'WALLET_TO_EXTERNAL_MERCHANT': 'Payment from Customer',
      'MERCHANT_WITHDRAWAL': 'Merchant Withdrawal',
      'DEPOSIT': 'Deposit',
      'WITHDRAWAL': 'Withdrawal',
      'MNO_TO_WALLET': 'Mobile Money Deposit',
      'WALLET_TO_MNO': 'Mobile Money Withdrawal',
    };
    return typeLabels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'SUCCESS': 'text-green-700 bg-green-100',
      'COMPLETED': 'text-green-700 bg-green-100',
      'PENDING': 'text-yellow-700 bg-yellow-100',
      'PROCESSING': 'text-blue-700 bg-blue-100',
      'FAILED': 'text-red-700 bg-red-100',
      'CANCELLED': 'text-gray-700 bg-gray-100',
    };
    return statusColors[status] || 'text-gray-700 bg-gray-100';
  };

  return (
    <div className="w-full">
      {/* Print/Download Buttons - Hidden in print */}
      <div className="flex gap-2 mb-4 print:hidden">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
        <Button 
          onClick={handleDownloadPDF} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Receipt Content */}
      <div
        id="receipt-content"
        ref={receiptRef}
        className="bg-white p-8 rounded-lg border border-gray-300 max-w-2xl mx-auto print:border-0 print:shadow-none"
        style={{
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {merchantInfo?.businessName || 'RukaPay Merchant'}
          </h1>
          {merchantInfo?.merchantCode && (
            <p className="text-sm text-gray-600">Merchant Code: {merchantInfo.merchantCode}</p>
          )}
          {merchantInfo?.phone && (
            <p className="text-sm text-gray-600">Tel: {merchantInfo.phone}</p>
          )}
          {merchantInfo?.email && (
            <p className="text-sm text-gray-600">Email: {merchantInfo.email}</p>
          )}
          {merchantInfo?.address && (
            <p className="text-sm text-gray-600">{merchantInfo.address}</p>
          )}
          <p className="text-lg font-semibold text-gray-700 mt-2">TRANSACTION RECEIPT</p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 mb-6">
          {/* Reference & Status */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-sm font-semibold text-gray-700">Receipt #:</span>
            <span className="text-sm font-mono">{transaction.reference || transaction.id}</span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-sm font-semibold text-gray-700">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(transaction.status)}`}>
              {transaction.status}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-sm font-semibold text-gray-700">Date & Time:</span>
            <span className="text-sm">{formatDate(transaction.createdAt)}</span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-sm font-semibold text-gray-700">Transaction Type:</span>
            <span className="text-sm">{getTransactionTypeLabel(transaction.type)}</span>
          </div>

          {/* Sender & Receiver */}
          <div className="bg-gray-50 p-4 rounded-lg my-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">From</p>
                <p className="text-sm font-medium text-gray-800">{getSenderInfo().name}</p>
                {getSenderInfo().contact && (
                  <p className="text-xs text-gray-600">{getSenderInfo().contact}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">To</p>
                <p className="text-sm font-medium text-gray-800">{getReceiverInfo().name}</p>
                {getReceiverInfo().contact && (
                  <p className="text-xs text-gray-600">{getReceiverInfo().contact}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="flex justify-between items-start border-b border-gray-200 pb-2">
              <span className="text-sm font-semibold text-gray-700">Description:</span>
              <span className="text-sm text-right max-w-xs">{transaction.description}</span>
            </div>
          )}
        </div>

        {/* Amount Breakdown */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Amount:</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.amount, transaction.currency)}</span>
            </div>
            
            {transaction.fee !== undefined && transaction.fee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Transaction Fee:</span>
                <span className="text-sm font-medium">{formatCurrency(transaction.fee, transaction.currency)}</span>
              </div>
            )}

            {transaction.metadata?.revenue && transaction.direction === 'CREDIT' && (
              <div className="flex justify-between items-center text-green-700">
                <span className="text-sm font-semibold">Your Revenue:</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(transaction.metadata.revenue.amount, transaction.metadata.revenue.currency || transaction.currency)}
                </span>
              </div>
            )}

            <div className="border-t-2 border-gray-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">Total:</span>
                <span className="text-base font-bold text-gray-800">
                  {(() => {
                    // For DEBIT (outgoing): Total = amount + fee (total amount debited from merchant)
                    // For CREDIT (incoming): Total = amount or netAmount (net amount received)
                    if (transaction.direction === 'DEBIT') {
                      const totalAmount = Number(transaction.amount || 0) + Number(transaction.fee || 0);
                      return formatCurrency(totalAmount, transaction.currency);
                    } else {
                      // CREDIT - show net amount received
                      return formatCurrency(transaction.netAmount || transaction.amount, transaction.currency);
                    }
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t-2 border-gray-300 pt-4 mt-6">
          <p className="text-xs text-gray-600 mb-1">
            Thank you for using RukaPay
          </p>
          <p className="text-xs text-gray-500">
            This is an electronically generated receipt and is valid without a signature.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            For inquiries, please contact support at support@rukapay.co.ug
          </p>
        </div>

        {/* QR Code or Verification Section (Optional) */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Transaction ID: {transaction.id}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

