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
import {
  formatTransactionCharges,
  getTransactionDescriptionDisplay,
  getTransactionReceiverParty,
  getTransactionSenderParty,
  getTransactionTypeDisplay,
} from "@/lib/utils/transaction-display";


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

const formatReferenceForDisplay = (txn: any): string => {
  const reference = String(txn?.reference || '').trim();
  if (!reference) return 'N/A';

  const isAdminFund = txn?.type === 'DEPOSIT' && txn?.metadata?.fundedByAdmin;
  if (!isAdminFund || reference.length <= 24) {
    return reference;
  }

  return `${reference.slice(0, 14)}...${reference.slice(-8)}`;
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

  const viewerContext = {
    merchantName: getMerchantName(),
    phone:
      profile?.merchant_phone || profile?.ownerPhone || profile?.phone || '',
  };

  const handleViewAll = () => {
    router.push("/transactions");
  };

  const handleViewDetails = () => {
    router.push("/transactions");
  };

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
                const senderInfo = getTransactionSenderParty(txn, viewerContext);
                const receiverInfo = getTransactionReceiverParty(txn, viewerContext);

                return (
                  <TableRow key={isNewFormat ? txn.id : txn.rdbs_transaction_id || idx} className="hover:bg-gray-50 transition">
                    <TableCell className="font-mono text-sm" title={isNewFormat ? (txn.reference || 'N/A') : txn.rdbs_transaction_id}>
                      {isNewFormat ? formatReferenceForDisplay(txn) : txn.rdbs_transaction_id}
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
                      <div className="font-medium text-sm text-gray-800">
                        {isNewFormat
                          ? formatTransactionCharges(txn)
                          : txn.rdbs_fee != null
                            ? `UGX ${Number(txn.rdbs_fee).toLocaleString()}`
                            : '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {isNewFormat ? getTransactionTypeDisplay(txn) : (txn.rdbs_type || 'N/A')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[txn.status as StatusType]}`}>
                        {isNewFormat ? txn.status : txn.rdbs_approval_status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={isNewFormat ? getTransactionDescriptionDisplay(txn) : txn.rdbs_description}>
                      {isNewFormat
                        ? getTransactionDescriptionDisplay(txn)
                        : txn.rdbs_description || '—'}
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
