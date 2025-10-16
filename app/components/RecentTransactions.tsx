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


type  StatusType = 'approved' | 'pending' | 'failed';
const statusColor: Record<StatusType, string> = {
  approved: 'text-green-600 bg-green-50',
  pending: 'text-yellow-700 bg-yellow-50',
  failed: 'text-red-600 bg-red-50',
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
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions?.map((txn:any, idx: number) => {
                // Map new format status to old format
                const getStatusDisplay = () => {
                  if (isNewFormat) {
                    const statusMap: Record<string, StatusType> = {
                      'SUCCESS': 'approved',
                      'PENDING': 'pending',
                      'PROCESSING': 'pending',
                      'FAILED': 'failed',
                      'CANCELLED': 'failed'
                    };
                    return statusMap[txn.status] || 'pending';
                  }
                  return txn.rdbs_approval_status as StatusType;
                };

                return (
                  <TableRow key={isNewFormat ? txn.id : txn.rdbs_transaction_id || idx} className="hover:bg-gray-100 transition">
                    <TableCell className="font-mono text-xs">
                      {isNewFormat ? txn.reference : txn.rdbs_transaction_id}
                    </TableCell>
                    <TableCell>
                      {isNewFormat 
                        ? new Date(txn.createdAt).toDateString()
                        : new Date(txn.rdbs_approval_date).toDateString()
                      }
                    </TableCell>
                    <TableCell>
                      {isNewFormat 
                        ? new Date(txn.createdAt).toLocaleTimeString()
                        : new Date(txn.rdbs_approval_date).toLocaleTimeString()
                      }
                    </TableCell>
                    <TableCell>
                      {isNewFormat 
                        ? (txn.metadata?.recipientName || txn.metadata?.senderName || 'N/A')
                        : (txn.rdbs_sender_name === "Unknown" ? txn.rdbs_obj_uri_receiver : txn.rdbs_sender_name)
                      }
                    </TableCell>
                    <TableCell>
                      {isNewFormat 
                        ? `${Number(txn.amount).toLocaleString()} ${txn.currency}`
                        : `${Number(txn.rdbs_amount).toLocaleString()} UGX`
                      }
                    </TableCell>
                    <TableCell>
                      {isNewFormat ? txn.description : txn.rdbs_description}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[getStatusDisplay()]}`}>
                        {isNewFormat ? txn.status.toLowerCase() : txn.rdbs_approval_status}
                      </span>
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
