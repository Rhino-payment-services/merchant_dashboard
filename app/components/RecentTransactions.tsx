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

interface transactionType {
  transactions?: any[];
  isNewFormat?: boolean;
}

export default function RecentTransactions({ transactions, isNewFormat = false }: transactionType) {
  const router = useRouter();
  const { isRefetching } = useUserProfile();

  // Sort transactions - handle both old and new formats
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => {
      if (isNewFormat) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime();
    });
  }, [transactions, isNewFormat]);

  const handleViewAll = () => {
    router.push("/transactions");
  };

  const handleViewDetails = () => {
    router.push("/transactions");
  };

  console.log("transactions", transactions);

  return (
    <div className="relative">
      {isRefetching && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 flex items-center gap-2">
            <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Updating...</span>
          </div>
        </div>
      )}
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
                <TableHead>Transaction ID</TableHead>
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
                return (
                  <TableRow key={isNewFormat ? txn.id : txn.rdbs_transaction_id || idx} className="hover:bg-gray-50 transition">
                    <TableCell className="font-mono text-sm">
                      {isNewFormat ? txn.reference : txn.rdbs_transaction_id}
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
                      {isNewFormat 
                        ? (txn.description || txn.reference || '-')
                        : (txn.rdbs_description || '-')
                      }
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
