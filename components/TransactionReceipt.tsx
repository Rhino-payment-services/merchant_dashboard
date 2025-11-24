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

      const printContent = receiptRef.current.outerHTML;
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
          /* Utility classes */
          .bg-white { background-color: #ffffff; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .bg-gray-300 { background-color: #d1d5db; }
          .bg-green-100 { background-color: #dcfce7; }
          .bg-yellow-100 { background-color: #fef3c7; }
          .bg-blue-100 { background-color: #dbeafe; }
          .bg-red-100 { background-color: #fee2e2; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-700 { color: #374151; }
          .text-gray-800 { color: #1f2937; }
          .text-green-700 { color: #15803d; }
          .text-yellow-700 { color: #a16207; }
          .text-blue-700 { color: #1d4ed8; }
          .text-red-700 { color: #b91c1c; }
          .border { border-width: 1px; }
          .border-b { border-bottom-width: 1px; }
          .border-b-2 { border-bottom-width: 2px; }
          .border-t-2 { border-top-width: 2px; }
          .border-gray-200 { border-color: #e5e7eb; }
          .border-gray-300 { border-color: #d1d5db; }
          .rounded-lg { border-radius: 0.5rem; }
          .rounded-full { border-radius: 9999px; }
          .p-4 { padding: 1rem; }
          .p-8 { padding: 2rem; }
          .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
          .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          .pb-2 { padding-bottom: 0.5rem; }
          .pb-4 { padding-bottom: 1rem; }
          .pt-2 { padding-top: 0.5rem; }
          .pt-4 { padding-top: 1rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-6 { margin-top: 1.5rem; }
          .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
          .space-y-2 > * + * { margin-top: 0.5rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          .flex { display: flex; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-4 { gap: 1rem; }
          .items-center { align-items: center; }
          .items-start { align-items: flex-start; }
          .justify-between { justify-content: space-between; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-base { font-size: 1rem; line-height: 1.5rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; }
          .max-w-xs { max-width: 20rem; }
          .max-w-2xl { max-width: 42rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .font-mono { font-family: ui-monospace, monospace; }
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
            <meta charset="UTF-8">
            ${printStyles}
          </head>
          <body>
            <div style="max-width: 800px; margin: 0 auto;">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
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
    const toastId = toast.loading('Generating PDF...');
    
    try {
      // Wait a bit to ensure all content is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: receiptRef.current.scrollWidth,
        windowHeight: receiptRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // Remove all stylesheets that might contain oklch
          const stylesheets = Array.from(clonedDoc.querySelectorAll('style, link[rel="stylesheet"]'));
          stylesheets.forEach(sheet => sheet.remove());
          
          // Get the cloned receipt element
          const clonedElement = clonedDoc.getElementById('receipt-content');
          if (clonedElement) {
            // Apply base styles
            clonedElement.style.maxWidth = '800px';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.color = '#1f2937';
            clonedElement.style.fontFamily = 'Arial, sans-serif';
            
            // Add a style tag with explicit hex colors to override any oklch
            const styleTag = clonedDoc.createElement('style');
            styleTag.textContent = `
              * {
                background-color: inherit !important;
                color: inherit !important;
                border-color: inherit !important;
              }
              .bg-white { background-color: #ffffff !important; }
              .bg-gray-50 { background-color: #f9fafb !important; }
              .bg-gray-100 { background-color: #f3f4f6 !important; }
              .bg-green-100 { background-color: #dcfce7 !important; }
              .bg-yellow-100 { background-color: #fef3c7 !important; }
              .bg-blue-100 { background-color: #dbeafe !important; }
              .bg-red-100 { background-color: #fee2e2 !important; }
              .text-gray-500 { color: #6b7280 !important; }
              .text-gray-600 { color: #4b5563 !important; }
              .text-gray-700 { color: #374151 !important; }
              .text-gray-800 { color: #1f2937 !important; }
              .text-green-700 { color: #15803d !important; }
              .text-yellow-700 { color: #a16207 !important; }
              .text-blue-700 { color: #1d4ed8 !important; }
              .text-red-700 { color: #b91c1c !important; }
              .border-gray-200 { border-color: #e5e7eb !important; }
              .border-gray-300 { border-color: #d1d5db !important; }
            `;
            clonedDoc.head.appendChild(styleTag);
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Add additional pages if content is too long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const fileName = `receipt-${transaction.reference || transaction.id}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF downloaded successfully', { id: toastId });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`, { id: toastId });
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
          contact: transaction.metadata.counterpartyInfo.phone || (transaction.metadata.counterpartyInfo as any)?.accountNumber || ''
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
          contact: transaction.metadata.counterpartyInfo.phone || (transaction.metadata.counterpartyInfo as any)?.accountNumber || ''
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

