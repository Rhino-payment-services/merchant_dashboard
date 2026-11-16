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
import { useUserProfile } from "../(dashboard)/UserProfileProvider";
import {
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

  const viewerContext = {
    merchantName:
      merchantName ||
      profile?.merchantBusinessTradeName ||
      profile?.businessTradeName ||
      profile?.merchant_names ||
      'Merchant Business',
    phone:
      profile?.merchant_phone || profile?.ownerPhone || profile?.phone || '',
  };

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

  const handleViewAll = () => {
    router.push("/transactions");
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold text-gray-900">Recent Transactions</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Latest 10 transactions on this business wallet</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAll}
          className="h-7 rounded-full px-2.5 text-[12px] text-gray-500 hover:text-gray-900"
        >
          View all
        </Button>
      </div>
      {!transactions || transactions.length == 0 ? (
        <div className="text-center py-10">
          <p className="text-[13px] text-gray-400">No transactions yet</p>
        </div>
      ) : (
        <>
          <Table>
          <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Reference</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Sender</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Receiver</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Type</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Amount</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Status</TableHead>
                <TableHead className="h-8 text-[11px] font-medium text-gray-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions?.map((txn:any, idx: number) => {
                const senderInfo = getTransactionSenderParty(txn, viewerContext);
                const receiverInfo = getTransactionReceiverParty(txn, viewerContext);

                return (
                  <TableRow key={isNewFormat ? txn.id : txn.rdbs_transaction_id || idx} className="hover:bg-gray-50/80">
                    <TableCell className="py-2.5 font-mono text-[12px] text-gray-600" title={isNewFormat ? (txn.reference || 'N/A') : txn.rdbs_transaction_id}>
                      {isNewFormat ? formatReferenceForDisplay(txn) : txn.rdbs_transaction_id}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="min-w-0 max-w-[160px]">
                        <div className="truncate text-[12px] font-medium text-gray-800" title={senderInfo.name}>
                          {senderInfo.name}
                        </div>
                        {senderInfo.contact && (
                          <div className="truncate text-[11px] text-gray-400" title={senderInfo.contact}>
                            {senderInfo.contact}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="min-w-0 max-w-[160px]">
                        <div className="truncate text-[12px] font-medium text-gray-800" title={receiverInfo.name}>
                          {receiverInfo.name}
                        </div>
                        {receiverInfo.contact && (
                          <div className="truncate text-[11px] text-gray-400" title={receiverInfo.contact}>
                            {receiverInfo.contact}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-[12px] text-gray-700">
                        {isNewFormat ? getTransactionTypeDisplay(txn) : (txn.rdbs_type || 'N/A')}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="text-[13px] font-semibold tabular-nums text-gray-900">
                        <span className="mr-1 text-[11px] font-medium text-gray-400">
                          {isNewFormat ? txn.currency : 'UGX'}
                        </span>
                        {isNewFormat 
                          ? Number(txn.amount).toLocaleString()
                          : Number(txn.rdbs_amount).toLocaleString()
                        }
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColor[txn.status as StatusType]}`}>
                        {isNewFormat ? txn.status : txn.rdbs_approval_status}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-gray-500">
                      {isNewFormat 
                        ? new Date(txn.createdAt).toLocaleString('en-UG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(txn.rdbs_approval_date).toLocaleString('en-UG', {
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
