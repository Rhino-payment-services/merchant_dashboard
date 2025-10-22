import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { RefreshCw } from 'lucide-react';
import { getWalletBalance, getMyTransactions } from '@/lib/api/wallet.api';

export default function StatCards() {
  const {profile, loading, isRefetching} = useUserProfile()
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [totalDebit, setTotalDebit] = useState<number>(0);

  console.log("profile", profile)

  // Fetch wallet balance and transactions
  const fetchWalletData = async () => {
    try {
      setWalletLoading(true);
      
      // Fetch wallet balance
      const balanceData = await getWalletBalance();
      console.log('Wallet Balance API Response:', balanceData);
      setWalletBalance(balanceData.balance);

      // Fetch transactions to calculate totals
      const transactionsData = await getMyTransactions({ limit: 1000 });
      console.log('Transactions API Response:', transactionsData);
      setTotalTransactions(transactionsData.total || 0);

      // Calculate total credit (incoming money - what came into the wallet)
      const credit = transactionsData.transactions
        .filter(t => (t.direction === 'CREDIT' || t.type === 'DEPOSIT' || t.type === 'TOPUP') && t.status === 'SUCCESS')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalCredit(credit);

      // Calculate total debit (outgoing money - what left the wallet including fees)
      // For DEBIT, we use amount (which is the total that left the wallet)
      const debit = transactionsData.transactions
        .filter(t => (t.direction === 'DEBIT' || t.type === 'WITHDRAWAL' || t.type === 'TRANSFER') && t.status === 'SUCCESS')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalDebit(debit);

    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  // Initial fetch and refetch only when user manually refreshes
  useEffect(() => {
    fetchWalletData();
  }, [isRefetching]);

  const stats = [
    {
      label: 'Current balance',
      value: walletLoading ? '...' : `${walletBalance.toLocaleString()} UGX`,
      change: '+15,7%',
      changeType: 'up',
      icon: '💰',
    },
    {
      label: 'Total transactions',
      value: walletLoading ? '....' : `${totalTransactions}`,
      change: '+1,5%',
      changeType: 'up',
      icon: '🛒',
    },
    {
      label: 'Total Credit',
      value: walletLoading ? '.....' : `${totalCredit.toLocaleString()} UGX`,
      change: '-2,5%',
      changeType: 'down',
      icon: '📦',
    },
  
    {
      label: 'Total Debit',
      value: walletLoading ? '....' : `${totalDebit.toLocaleString()} UGX`,
      change: '+32,6%',
      changeType: 'up',
      icon: '👥',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchWalletData}
          disabled={walletLoading}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
          {walletLoading ? 'Refreshing...' : 'Refresh Balance'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-2 relative">
            {(isRefetching || walletLoading) && (
              <div className="absolute top-2 right-2">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
              </div>
            )}
            <CardHeader className="flex flex-row items-center gap-2 text-gray-500 pb-2">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-sm font-medium">{stat.label}</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs font-semibold ${stat.changeType === 'up' ? 'text-green-500' : 'text-red-500'}`}>{stat.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 