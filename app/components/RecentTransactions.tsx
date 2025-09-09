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
}

export default function RecentTransactions({ transactions }: transactionType) {
  const router = useRouter();
  const { isRefetching } = useUserProfile();

  // Sort transactions by rdbs_approval_date in descending order (newest first)
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => 
      new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime()
    );
  }, [transactions]);

  const handleViewAll = () => {
    router.push("/transactions");
  };

  const handleViewDetails = () => {
    router.push("/transactions");
  };

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
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions?.map((txn:any, idx: number) => (
              <TableRow key={txn.rdbs_transaction_id || idx} className="hover:bg-gray-100 transition">
              <TableCell className="font-mono text-xs">{txn.rdbs_transaction_id}</TableCell>
              <TableCell>
                {new Date(txn.rdbs_approval_date).toDateString()}
              </TableCell>
              <TableCell>
                {new Date(txn.rdbs_approval_date).toLocaleTimeString()}
              </TableCell>
              <TableCell>{txn.rdbs_sender_name}</TableCell>
              <TableCell className="text-left font-semibold">
              <span className={
                txn.rdbs_type === 'credit'
                  ? 'text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium'
                  : txn.rdbs_type === 'debit'
                  ? 'text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium'
                  : ''
              }>
                {txn.rdbs_type}
              </span>
            </TableCell>
              <TableCell>{Number(txn.rdbs_amount).toLocaleString()} UGX</TableCell>
              <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[txn.rdbs_approval_status as StatusType]}`}>{txn.rdbs_approval_status}</span>
              </TableCell>
            </TableRow> 
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
