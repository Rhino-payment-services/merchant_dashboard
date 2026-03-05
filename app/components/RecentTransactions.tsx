"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions } from "../lib/api";
import { useUserProfile } from "../(dashboard)/UserProfileProvider";
import { RefreshCw } from "lucide-react";


type  StatusType = 'approved' | 'pending' | 'failed' | 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'SUCCESS';
const statusColor: Record<StatusType, string> = {
  approved: 'text-green-600 bg-green-50',
  pending: 'text-yellow-700 bg-yellow-50',
  failed: 'text-red-600 bg-red-50',
  COMPLETED: 'text-green-600 bg-green-50',
  PENDING: 'text-yellow-700 bg-yellow-50',
  PROCESSING: 'text-blue-600 bg-blue-50',
  FAILED: 'text-red-600 bg-red-50',
  CANCELLED: 'text-gray-600 bg-gray-50',
  REFUNDED: 'text-orange-600 bg-orange-50',
  SUCCESS: 'text-green-600 bg-green-50',
};


const statusColors: Record<string, string> = {
  Complete: "text-green-600 bg-green-100",
  Delivery: "text-main-600 bg-main-100",
  Pending: "text-yellow-600 bg-yellow-100",
};

type Transaction = {
  name: string;
  price: string;
  customer: string;
  status: string;
};

// Helper to remove duplicate admin-funded deposit rows that share the same reference/amount/etc.
// This keeps ADMIN_FUND credits from appearing twice in the dashboard widget.
const dedupeAdminFundTransactions = (items: any[]) => {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const tx of items || []) {
    const isAdminFund = tx?.type === 'DEPOSIT' && tx?.metadata?.fundedByAdmin;
    if (!isAdminFund) {
      result.push(tx);
      continue;
    }

    // Admin funding appears twice (Transaction + LedgerEntry) with same
    // reference/amount/admin but different timestamps. Deduplicate on the
    // business identity so the dashboard only shows one row per funding.
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

interface transactionType {
  transactions?: any[];
  isNewFormat?: boolean;
}

export default function RecentTransactions({ transactions, isNewFormat = false, merchantName }: transactionType & { merchantName?: string }) {
  const router = useRouter();
  const { profile } = useUserProfile();

  // Clean and sort transactions - handle both old and new formats
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    const cleaned = dedupeAdminFundTransactions(transactions);
    return [...cleaned].sort((a, b) => {
      if (isNewFormat) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime();
    });
  }, [transactions, isNewFormat]);

  // Get merchant business name
  const getMerchantName = () => {
    return merchantName || 
           profile?.merchantBusinessTradeName || 
           profile?.businessTradeName || 
           profile?.merchant_names || 
           'Merchant Business';
  };

  // Helper functions for consistent display - matching transactions page logic
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
      return {
        name: getMerchantName(),
        contact: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || ''
      };
    } else {
      // CREDIT direction - someone else is sending to merchant
      // Extract sender info based on transaction type (matching transactions page logic)
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
        // P2P - Wallet to Wallet - sender is another RukaPay user
        const senderName = txn.counterpartyUser?.profile?.firstName && txn.counterpartyUser?.profile?.lastName
          ? `${txn.counterpartyUser.profile.firstName} ${txn.counterpartyUser.profile.lastName}`
          : txn.metadata?.counterpartyInfo?.name || txn.metadata?.userName || 'RukaPay User';
        return {
          name: senderName,
          contact: txn.counterpartyUser?.phone || txn.counterpartyId || ''
        };
      } else if (txn.metadata?.counterpartyInfo) {
        return {
          name: txn.metadata.counterpartyInfo.name,
          contact: txn.metadata.counterpartyInfo.phone || (txn.metadata.counterpartyInfo as any)?.accountNumber || ''
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

  const getReceiverInfo = (txn: any) => {
    // Check for admin-funded deposits first
    if (txn.type === 'DEPOSIT' && txn.metadata?.fundedByAdmin) {
      // Merchant is receiving funds from admin
      return {
        name: getMerchantName(),
        contact: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || ''
      };
    }
    
    if (txn.direction === 'CREDIT') {
      // Merchant is receiving - receiver is the merchant (wallet owner)
      return {
        name: getMerchantName(),
        contact: profile?.merchant_phone || profile?.ownerPhone || profile?.phone || ''
      };
    } else {
      // DEBIT direction - merchant is sending to someone
      // Extract receiver info based on transaction type (matching transactions page logic)
      if (txn.type === 'WALLET_TO_WALLET' || txn.counterpartyId || txn.counterpartyUser) {
        // P2P - Wallet to Wallet - receiver is another RukaPay user
        const receiverName = txn.counterpartyUser?.profile?.firstName && txn.counterpartyUser?.profile?.lastName
          ? `${txn.counterpartyUser.profile.firstName} ${txn.counterpartyUser.profile.lastName}`
          : txn.metadata?.counterpartyInfo?.name || txn.metadata?.userName || 'RukaPay User';
        return {
          name: receiverName,
          contact: txn.counterpartyUser?.phone || txn.counterpartyId || ''
        };
      } else if (txn.type === 'WALLET_TO_MERCHANT' || txn.type === 'WALLET_TO_INTERNAL_MERCHANT' || txn.type?.includes('MERCHANT') || txn.metadata?.merchantName) {
        // Wallet to Merchant - receiver is merchant
        return {
          name: txn.metadata?.merchantName || txn.metadata?.counterpartyInfo?.name || txn.metadata?.userName || 'Merchant',
          contact: txn.metadata?.merchantCode || txn.metadata?.accountNumber || ''
        };
      } else if (txn.metadata?.counterpartyInfo) {
        return {
          name: txn.metadata.counterpartyInfo.name,
          contact: txn.metadata.counterpartyInfo.phone || (txn.metadata.counterpartyInfo as any)?.accountNumber || ''
        };
      } else if (txn.metadata?.mnoProvider) {
        // External Mobile Money - show recipient name if available
        return {
          name: txn.metadata?.userName || txn.metadata?.recipientName || `${txn.metadata.mnoProvider} Mobile Money`,
          contact: txn.metadata?.phoneNumber || ''
        };
      } else if (txn.metadata?.phoneNumber) {
        // External Mobile Money (no provider specified)
        return {
          name: txn.metadata?.userName || txn.metadata?.recipientName || 'Mobile Money User',
          contact: txn.metadata?.phoneNumber || ''
        };
      } else if (txn.metadata?.accountNumber) {
        // Bank/Utility/Other External Account
        return {
          name: txn.metadata?.userName || txn.metadata?.recipientName || 'External Account',
          contact: txn.metadata?.accountNumber || ''
        };
      } else {
        // Fallback
        return {
          name: txn.metadata?.recipientName || txn.metadata?.userName || 'Recipient',
          contact: txn.metadata?.phoneNumber || txn.metadata?.accountNumber || ''
        };
      }
    }
  };

  // Prefer a human-friendly description and avoid repeating the reference ID
  const getDescription = (txn: any) => {
    if (!isNewFormat) {
      return txn.rdbs_description || "-";
    }

    const ref = (txn.reference || "").toString().trim();
    const primaryDesc = (txn.description || "").toString().trim();

    // If description is missing or just duplicates the reference, try metadata fields
    if (!primaryDesc || primaryDesc === ref) {
      const metaDesc =
        (txn.metadata?.description ||
          txn.metadata?.narration ||
          txn.metadata?.note ||
          "") as string;

      const cleanedMeta = metaDesc.toString().trim();
      if (cleanedMeta && cleanedMeta !== ref) {
        return cleanedMeta;
      }

      // No better option – show a clean dash instead of repeating the reference
      return "-";
    }

    return primaryDesc;
  };

  const handleViewAll = () => {
    router.push("/transactions");
  };

  const handleViewDetails = () => {
    router.push("/transactions");
  };

  console.log("transactions", transactions);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg">Recent Transactions</div>
        <div className="flex gap-2">
          <button className="text-xs border rounded px-2 py-1 bg-gray-50">
            Filter
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAll}
            className="text-xs"
          >
            View All
          </Button>
        </div>
      </div>
      {!transactions || transactions.length == 0 ? (
        <div className="text-center flex flex-col gap-[10px] p-10">
          <h1 >No Transactions Yet</h1>
        </div>
      ) : (
        <>
          <Table>
          <TableHeader>
              <TableRow>
                <TableHead>Reference ID</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions?.map((txn:any, idx: number) => {
                // Extract sender and receiver information with contact details
                const senderInfo = getSenderInfo(txn);
                const receiverInfo = getReceiverInfo(txn);

                return (
                  <TableRow key={isNewFormat ? txn.id : txn.rdbs_transaction_id || idx} className="hover:bg-gray-50 transition">
                    <TableCell className="font-mono text-sm">
                      {isNewFormat ? txn.reference : txn.rdbs_transaction_id}
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
                          {isNewFormat ? txn.currency : 'UGX'} &nbsp;
                        </span>
                        {isNewFormat 
                          ? Number(txn.amount).toLocaleString()
                          : Number(txn.rdbs_amount).toLocaleString()
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-[25px]">
                        <span className='text-[12px]'>
                          {txn.metadata?.revenue?.currency ?? ""} &nbsp;
                        </span>
                        {txn.metadata?.revenue?.amount?.toLocaleString() ?? "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        txn.direction === 'CREDIT' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {txn.direction || (txn.rdbs_approval_status ? 'DEBIT' : 'N/A')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[txn.status as StatusType]}`}>
                        {isNewFormat ? txn.status : txn.rdbs_approval_status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {getDescription(txn)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isNewFormat 
                        ? new Date(txn.createdAt).toLocaleString('en-UG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(txn.rdbs_approval_date).toLocaleString('en-UG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                      }
                    </TableCell>
                  </TableRow> 
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
