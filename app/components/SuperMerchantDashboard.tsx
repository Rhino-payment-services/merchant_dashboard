'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  Crown,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { getSuperMerchantDashboard, SuperMerchantDashboard as DashboardData } from '@/lib/api/super-merchant.api';
import Link from 'next/link';

interface SuperMerchantDashboardProps {
  merchantId: string;
  merchantName: string;
}

export default function SuperMerchantDashboard({ merchantId, merchantName }: SuperMerchantDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSuperMerchantDashboard(merchantId);
      if (result.data) {
        setDashboardData(result.data);
      } else {
        // API failed - likely no merchants attached or access issue
        setError(result.error || 'No merchants attached');
      }
    } catch (err: any) {
      console.error('Error fetching super merchant dashboard:', err);
      setError('No merchants attached');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (merchantId) {
      fetchDashboardData();
    }
  }, [merchantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' UGX';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-main-600" />
        <span className="ml-3 text-gray-600">Loading super merchant dashboard...</span>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-6">
          <div className="flex flex-col gap-2">
            <p className="text-amber-800 font-medium">
              {error === 'No merchants attached' || error?.toLowerCase().includes('no merchants')
                ? 'No merchants attached'
                : error || 'Unable to load super merchant dashboard'}
            </p>
            <p className="text-sm text-amber-700">
              Contact your administrator to assign merchants to your super merchant account.
            </p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Super Merchant Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
          <Crown className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Super Merchant Dashboard</h2>
          <p className="text-gray-500">
            Aggregate view of {merchantName} and {dashboardData.totalChildMerchants} assigned merchants
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" className="ml-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Child Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalChildMerchants}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {dashboardData.activeChildMerchants} Active
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                {dashboardData.verifiedChildMerchants} Verified
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboardData.totalWalletBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Combined across all merchants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalTransactionsCount.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              All successful transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Transaction Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.totalTransactionVolume)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total value processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Child Merchants Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Assigned Merchants</CardTitle>
              <CardDescription>
                Merchants operating under your super merchant account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData.childMerchants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No merchants assigned yet</p>
              <p className="text-sm mt-1">Contact your administrator to assign merchants to your account</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Merchant Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.childMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {merchant.businessTradeName}
                      </div>
                    </TableCell>
                    <TableCell>{merchant.merchantCode}</TableCell>
                    <TableCell>{merchant.businessCity}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {merchant.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                        {merchant.isVerified && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(merchant.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
