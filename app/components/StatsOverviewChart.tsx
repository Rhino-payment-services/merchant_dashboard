"use client"
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import React, { useEffect, useState } from 'react';
import { Chart } from './chart';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { RefreshCw } from 'lucide-react';

export default function StatsOverviewChart() {
  const { profile, loading, isRefetching } = useUserProfile();

  const [period, setPeriod] = useState<'Monthly' | 'Weekly'>('Monthly');
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Filter transactions by date range
  const filteredTransactions = profile?.profile?.merchant_transactions?.filter((txn: any) => {
    const date = new Date(txn.rdbs_approval_date);
    return date >= new Date(from) && date <= new Date(to);
  }).sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime()) || [];

  let totalIncome = 0;
  let totalExpense = 0;
  if (filteredTransactions.length) {
    if (period === 'Weekly') {
      // Only show the selected week (from -> to)
      const weekMap: Record<string, { income: number; expense: number }> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        const day = d.toLocaleString('default', { weekday: 'short', day: 'numeric', month: 'short' });
        weekMap[day] = { income: 0, expense: 0 };
      }
      filteredTransactions.forEach(txn => {
        const date = new Date(txn.rdbs_approval_date);
        const day = date.toLocaleString('default', { weekday: 'short', day: 'numeric', month: 'short' });
        if (!weekMap[day]) weekMap[day] = { income: 0, expense: 0 };
        if (txn.rdbs_type === 'credit') {
          weekMap[day].income += Number(txn.rdbs_amount) || 0;
        } else if (txn.rdbs_type === 'debit') {
          weekMap[day].expense += Number(txn.rdbs_amount) || 0;
        }
      });
      for (const d in weekMap) {
        totalIncome += weekMap[d].income;
        totalExpense += weekMap[d].expense;
      }
    } else {
      // Only show months in the selected range
      const monthMap: Record<string, { income: number; expense: number }> = {};
      let months: string[] = [];
      const fromDate = new Date(from);
      const toDate = new Date(to);
      let d = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
      while (d <= toDate) {
        const month = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        months.push(month);
        monthMap[month] = { income: 0, expense: 0 };
        d.setMonth(d.getMonth() + 1);
      }
      filteredTransactions.forEach(txn => {
        const date = new Date(txn.rdbs_approval_date);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0 };
        if (txn.rdbs_type === 'credit') {
          monthMap[month].income += Number(txn.rdbs_amount) || 0;
        } else if (txn.rdbs_type === 'debit') {
          monthMap[month].expense += Number(txn.rdbs_amount) || 0;
        }
      });
      for (const m in monthMap) {
        totalIncome += monthMap[m].income;
        totalExpense += monthMap[m].expense;
      }
    }
  }

  const summary = {
    income: `UGX ${totalIncome.toLocaleString()}`,
    expense: `UGX ${totalExpense.toLocaleString()}`,
  };

    useEffect(()=>{
      
    },[])

  return (
    <div>
      <Card className="mb-4 relative">
        {isRefetching && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Updating...</span>
            </div>
          </div>
        )}
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="font-semibold text-lg">Merchant {period} Summary</div>
          <div className="flex gap-2 items-center">
            <select
              className="text-xs border rounded px-2 py-1 bg-gray-50"
              value={period}
              onChange={e => setPeriod(e.target.value as 'Monthly' | 'Weekly')}
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-xs border rounded px-2 py-1 bg-gray-50" />
            <span className="text-xs">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-xs border rounded px-2 py-1 bg-gray-50" />
          </div>
        </CardHeader>
        <CardContent className="flex gap-8 pt-0">
          <div>
            <div className="text-xs text-gray-500">Income</div>
            <div className="text-xl font-bold text-green-600">{summary.income}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Expense</div>
            <div className="text-xl font-bold text-red-500">{summary.expense}</div>
          </div>
        </CardContent>
      </Card>
      {/* Placeholder for chart */}
      <div className="relative bg-gradient-to-r from-main-100 to-main-50 rounded-lg flex items-center justify-center text-gray-400">
        <Chart period={period} from={from} to={to} />
      </div>
      <div className="flex gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-main-600 rounded-full inline-block" /> Total Income
        </div>
      </div>
    </div>
  );
} 