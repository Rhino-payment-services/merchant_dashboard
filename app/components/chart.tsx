"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { useUserProfile } from "../(dashboard)/UserProfileProvider";
import { useMemo } from "react";

// Helper to get all months in the current year
function getAllMonths() {
  const now = new Date();
  const year = now.getFullYear();
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  });
}

// Helper to get all weeks in the current year
function getAllWeeks() {
  const now = new Date();
  const year = now.getFullYear();
  const weeks = [];
  let d = new Date(year, 0, 1);
  let week = 1;
  while (d.getFullYear() === year) {
    weeks.push(`W${week} ${year}`);
    d.setDate(d.getDate() + 7);
    week++;
  }
  return weeks;
}

// Group transactions by month
function getMonthlyIncomeExpense(transactions: any[]) {
  const months = getAllMonths();
  const monthMap: Record<string, { income: number; expense: number }> = {};
  months.forEach(month => { monthMap[month] = { income: 0, expense: 0 }; });
  transactions.forEach(txn => {
    const date = new Date(txn.rdbs_approval_date);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0 };
    if (txn.rdbs_type === "credit") {
      monthMap[month].income += Number(txn.rdbs_amount) || 0;
    } else if (txn.rdbs_type === "debit") {
      monthMap[month].expense += Number(txn.rdbs_amount) || 0;
    }
  });
  return months.map(month => ({ month, ...monthMap[month] }));
}

// Group transactions by week
function getWeeklyIncomeExpense(transactions: any[]) {
  const weeks = getAllWeeks();
  const weekMap: Record<string, { income: number; expense: number }> = {};
  weeks.forEach(week => { weekMap[week] = { income: 0, expense: 0 }; });
  transactions.forEach(txn => {
    const date = new Date(txn.rdbs_approval_date);
    const year = date.getFullYear();
    const onejan = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    const weekLabel = `W${week} ${year}`;
    if (!weekMap[weekLabel]) weekMap[weekLabel] = { income: 0, expense: 0 };
    if (txn.rdbs_type === "credit") {
      weekMap[weekLabel].income += Number(txn.rdbs_amount) || 0;
    } else if (txn.rdbs_type === "debit") {
      weekMap[weekLabel].expense += Number(txn.rdbs_amount) || 0;
    }
  });
  return weeks.map(week => ({ week, ...weekMap[week] }));
}

const chartConfig = {
    income: {
        label: "Income",
        color: "#08163d",
    },
    expense: {
        label: "Expense",
        color: "darkred",
    },
} satisfies ChartConfig

export function Chart({ period = "Monthly", from, to }: { period?: "Monthly" | "Weekly", from?: string, to?: string }) {
  const { profile } = useUserProfile();
  const transactions = profile?.profile?.merchant_transactions || [];
  const filteredTransactions = useMemo(() => {
    if (!from || !to) return transactions.sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime());
    return transactions.filter((txn: any) => {
      const date = new Date(txn.rdbs_approval_date);
      return date >= new Date(from) && date <= new Date(to);
    }).sort((a, b) => new Date(b.rdbs_approval_date).getTime() - new Date(a.rdbs_approval_date).getTime());
  }, [transactions, from, to]);

  const chartData = useMemo(() => {
    if (period === "Weekly" && from && to) {
      // Show only the selected week (from -> to), group by day
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
      return Object.entries(weekMap).map(([day, val]) => ({ month: day, ...val }));
    }
    if (period === "Monthly" && from && to) {
      // Show only months in the selected range
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
      return months.map(month => ({ month, ...monthMap[month] }));
    }
    // fallback: all months in current year
    return getMonthlyIncomeExpense(filteredTransactions);
  }, [filteredTransactions, period, from, to]);

  return (
    <div className="relative w-full h-full">
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => String(value).slice(0, 3)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="income" fill="var(--color-income)" radius={4} />
          <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
