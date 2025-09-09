import React from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useUserProfile } from '../(dashboard)/UserProfileProvider';
import { RefreshCw } from 'lucide-react';

export default function StatCards() {
  const {profile, loading, isRefetching} = useUserProfile()

  console.log("profile", profile)

  const stats = [
    {
      label: 'Current balance ',
      value: `${!loading ? `${Number(profile?.profile?.merchant_balance).toLocaleString()} UGX` : "..."}`,
      change: '+15,7%',
      changeType: 'up',
      icon: '💰',
    },
    {
      label: 'Total transactions',
      value: `${!loading ? profile?.profile?.merchant_transactions.length : '....'}`,
      change: '+1,5%',
      changeType: 'up',
      icon: '🛒',
    },
    {
      label: 'Total Credit',
      value: `${!loading ? `${Number(profile?.profile.merchant_balance).toLocaleString()} UGX` : "....."}`,
      change: '-2,5%',
      changeType: 'down',
      icon: '📦',
    },
  
    {
      label: 'Total Debit',
      value: `${!loading ? '0.00 UGX' : '....'}`,
      change: '+32,6%',
      changeType: 'up',
      icon: '👥',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col gap-2 relative">
          {isRefetching && (
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
  );
} 