'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Eye,
  Activity,
  FileText,
  QrCode,
  MoreVertical,
} from 'lucide-react';
import { getSuperMerchantDashboard, SuperMerchantDashboard as DashboardData } from '@/lib/api/super-merchant.api';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SuperMerchantDashboardProps {
  merchantId: string;
  merchantName: string;
}

interface MerchantItem {
  id: string;
  merchantCode: string;
  businessTradeName: string;
  isSuperMerchant: boolean;
  isOwnAccount: boolean;
}

export default function SuperMerchantDashboard({ merchantId, merchantName }: SuperMerchantDashboardProps) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildMerchantId, setSelectedChildMerchantId] = useState<string | null>(null);
  const [selectedMerchantContext, setSelectedMerchantContext] = useState<string>('super-merchant'); // 'super-merchant' or child merchant ID
  
  // Get all available merchants from session (user's own accounts) + child merchants
  const sessionMerchants = (session?.user as any)?.merchants || [];
  const currentMerchantCode = (session?.user as any)?.merchantCode;
  
  // Get all available merchants (user's own accounts + child merchants)
  const allMerchants: MerchantItem[] = dashboardData ? [
    // User's own merchant accounts (from session)
    ...sessionMerchants.map((m: any) => ({
      id: m.id,
      merchantCode: m.merchantCode,
      businessTradeName: m.businessTradeName,
      isSuperMerchant: m.isSuperMerchant || false,
      isOwnAccount: true,
    })),
    // Child merchants (assigned to super merchant)
    ...dashboardData.childMerchants
      .filter(child => !sessionMerchants.some((s: any) => s.id === child.id)) // Don't duplicate if user also owns it
      .map(m => ({
        id: m.id,
        merchantCode: m.merchantCode,
        businessTradeName: m.businessTradeName,
        isSuperMerchant: false,
        isOwnAccount: false,
      }))
  ] : sessionMerchants.map((m: any) => ({
    id: m.id,
    merchantCode: m.merchantCode,
    businessTradeName: m.businessTradeName,
    isSuperMerchant: m.isSuperMerchant || false,
    isOwnAccount: true,
  }));
  
  // Get current selected merchant
  const currentMerchant = allMerchants.find((m: MerchantItem) => m.merchantCode === currentMerchantCode) || allMerchants[0];
  const currentContextId = currentMerchant?.id || selectedMerchantContext;

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

  const handleViewChildMerchantTransactions = (childMerchantId: string, merchantCode: string) => {
    // Navigate to transactions page with child merchant context
    router.push(`/transactions?merchantId=${childMerchantId}&merchantCode=${merchantCode}`);
  };

  const handleViewChildMerchantDetails = (childMerchantId: string) => {
    // Open child merchant details modal or navigate to details page
    setSelectedChildMerchantId(childMerchantId);
    // TODO: Implement child merchant details view
  };

  const handleViewChildMerchantReports = (childMerchantId: string, merchantCode: string) => {
    router.push(`/reports?merchantId=${childMerchantId}&merchantCode=${merchantCode}`);
  };

  const handleViewChildMerchantQR = (merchantCode: string, businessName: string) => {
    router.push(`/qr-code?merchantCode=${merchantCode}&merchantName=${encodeURIComponent(businessName)}`);
  };

  const handleSwitchMerchant = async (merchantIdToSwitch: string, merchantCode: string) => {
    if (merchantIdToSwitch === dashboardData?.superMerchant.id) {
      // Switching to super merchant's own account
      setSelectedMerchantContext('super-merchant');
      // Update session to use super merchant's code
      await updateSession({ merchantCode });
      router.push('/');
      router.refresh();
    } else {
      // Switching to a child merchant
      setSelectedMerchantContext(merchantIdToSwitch);
      // Update session to use child merchant's code
      await updateSession({ merchantCode });
      router.push('/');
      router.refresh();
    }
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
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Super Merchant Dashboard</h2>
          <p className="text-gray-500">
            Aggregate view including {merchantName} and {dashboardData.totalChildMerchants} assigned child merchant{dashboardData.totalChildMerchants !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Merchant Switcher */}
          {allMerchants.length > 1 && (
            <Select
              value={currentContextId}
              onValueChange={(value) => {
                const merchant = allMerchants.find((m: MerchantItem) => m.id === value);
                if (merchant) {
                  handleSwitchMerchant(merchant.id, merchant.merchantCode);
                }
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select merchant">
                  {currentMerchant?.businessTradeName || 'Select merchant'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* User's Own Accounts */}
                {allMerchants.filter((m: MerchantItem) => m.isOwnAccount).map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    <div className="flex items-center gap-2 w-full">
                      {merchant.isSuperMerchant ? (
                        <Crown className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="flex-1">{merchant.businessTradeName}</span>
                      {merchant.isSuperMerchant ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Super Merchant
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          My Account
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {/* Child Merchants */}
                {allMerchants.filter((m: MerchantItem) => !m.isOwnAccount).length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1">
                      Child Merchants
                    </div>
                    {allMerchants.filter((m: MerchantItem) => !m.isOwnAccount).map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        <div className="flex items-center gap-2 w-full">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="flex-1">{merchant.businessTradeName}</span>
                          <Badge variant="outline" className="text-blue-600">
                            Child
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          )}
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalChildMerchants + 1}</div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <Crown className="h-3 w-3 mr-1" />
                  1 Super Merchant
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {dashboardData.activeChildMerchants + (dashboardData.superMerchant.isActive ? 1 : 0)} Active
                </Badge>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-600 w-fit">
                {dashboardData.verifiedChildMerchants + (dashboardData.superMerchant.isVerified ? 1 : 0)} Verified
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
              Includes super merchant + {dashboardData.totalChildMerchants} child merchant{dashboardData.totalChildMerchants !== 1 ? 's' : ''}
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

      {/* All Merchants Table (Super Merchant + Child Merchants) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Merchants</CardTitle>
              <CardDescription>
                Your super merchant account and all assigned child merchants
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData.childMerchants.length === 0 ? (
            <div className="space-y-4">
              {/* Show super merchant even if no child merchants */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Merchant Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-yellow-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        {dashboardData.superMerchant.businessTradeName}
                      </div>
                    </TableCell>
                    <TableCell>{dashboardData.superMerchant.merchantCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        <Crown className="h-3 w-3 mr-1" />
                        Super Merchant
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {dashboardData.superMerchant.isActive ? (
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
                        {dashboardData.superMerchant.isVerified && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      -
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewChildMerchantTransactions(dashboardData.superMerchant.id, dashboardData.superMerchant.merchantCode)}>
                            <Activity className="h-4 w-4 mr-2" />
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantReports(dashboardData.superMerchant.id, dashboardData.superMerchant.merchantCode)}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantQR(dashboardData.superMerchant.merchantCode, dashboardData.superMerchant.businessTradeName)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            View QR Code
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="text-center py-4 text-gray-500 border-t">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No child merchants assigned yet</p>
                <p className="text-xs mt-1">Contact your administrator to assign merchants to your account</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Merchant Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Super Merchant Row (highlighted) */}
                <TableRow className="bg-yellow-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      {dashboardData.superMerchant.businessTradeName}
                    </div>
                  </TableCell>
                  <TableCell>{dashboardData.superMerchant.merchantCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      <Crown className="h-3 w-3 mr-1" />
                      Super Merchant
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {dashboardData.superMerchant.isActive ? (
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
                      {dashboardData.superMerchant.isVerified && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                    <TableCell className="text-gray-500">
                      -
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewChildMerchantTransactions(dashboardData.superMerchant.id, dashboardData.superMerchant.merchantCode)}>
                            <Activity className="h-4 w-4 mr-2" />
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantReports(dashboardData.superMerchant.id, dashboardData.superMerchant.merchantCode)}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantQR(dashboardData.superMerchant.merchantCode, dashboardData.superMerchant.businessTradeName)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            View QR Code
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                {/* Child Merchants */}
                {dashboardData.childMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {merchant.businessTradeName}
                      </div>
                    </TableCell>
                    <TableCell>{merchant.merchantCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-gray-600">
                        Child Merchant
                      </Badge>
                    </TableCell>
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
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewChildMerchantTransactions(merchant.id, merchant.merchantCode)}>
                            <Activity className="h-4 w-4 mr-2" />
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantReports(merchant.id, merchant.merchantCode)}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantQR(merchant.merchantCode, merchant.businessTradeName)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            View QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewChildMerchantDetails(merchant.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
