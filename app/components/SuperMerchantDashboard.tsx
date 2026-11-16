'use client';

import React, { useState, useEffect } from 'react';
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
import { useAccessibleMerchants } from '@/lib/hooks/useAccessibleMerchants';
import KpiCard from './KpiCard';
import { useMerchantSwitch } from '@/lib/hooks/useMerchantSwitch';
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
  refreshKey?: number;
}

interface MerchantItem {
  id: string;
  merchantCode: string;
  businessTradeName: string;
  isSuperMerchant: boolean;
  isOwnAccount: boolean;
  isChildMerchant: boolean;
}

export default function SuperMerchantDashboard({ merchantId, merchantName, refreshKey = 0 }: SuperMerchantDashboardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { switchMerchant, switching: merchantSwitching } = useMerchantSwitch();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildMerchantId, setSelectedChildMerchantId] = useState<string | null>(null);
  const [selectedMerchantContext, setSelectedMerchantContext] = useState<string>('super-merchant'); // 'super-merchant' or child merchant ID
  
  const { merchants: accessibleMerchants } = useAccessibleMerchants();
  
  // Get all available merchants from session (user's own accounts) + child merchants
  const sessionMerchants = (session?.user as any)?.merchants || [];
  const currentMerchantCode = (session?.user as any)?.merchantCode;
  
  const allMerchants: MerchantItem[] =
    accessibleMerchants.length > 0
      ? accessibleMerchants.map((m) => ({
          id: m.id,
          merchantCode: m.merchantCode,
          businessTradeName: m.businessTradeName,
          isSuperMerchant: m.isSuperMerchant ?? false,
          isOwnAccount: m.isOwnAccount,
          isChildMerchant: m.isChildMerchant === true,
        }))
      : sessionMerchants.map((m: any) => ({
          id: m.id,
          merchantCode: m.merchantCode,
          businessTradeName: m.businessTradeName,
          isSuperMerchant: m.isSuperMerchant || false,
          isOwnAccount: m.isOwnAccount === true,
          isChildMerchant: false,
        }));
  // Get current selected merchant
  const currentMerchant = allMerchants.find((m: MerchantItem) => m.merchantCode === currentMerchantCode) || allMerchants[0];
  const currentContextId = currentMerchant?.id || selectedMerchantContext;

  const ownAccounts = allMerchants.filter((m) => m.isOwnAccount);
  const childAccounts = allMerchants.filter((m) => m.isChildMerchant);
  const teamAccounts = allMerchants.filter(
    (m) => !m.isOwnAccount && !m.isChildMerchant,
  );

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
  }, [merchantId, refreshKey]);

  const handleViewChildMerchantTransactions = async (targetMerchantId: string, _merchantCode: string) => {
    const merchant = accessibleMerchants.find((m) => m.id === targetMerchantId);
    if (merchant) {
      await switchMerchant(merchant, '/transactions');
    } else {
      router.push('/transactions');
    }
  };

  const handleViewChildMerchantDetails = (childMerchantId: string) => {
    // Open child merchant details modal or navigate to details page
    setSelectedChildMerchantId(childMerchantId);
    // TODO: Implement child merchant details view
  };

  const handleViewChildMerchantReports = async (targetMerchantId: string, _merchantCode: string) => {
    const merchant = accessibleMerchants.find((m) => m.id === targetMerchantId);
    if (merchant) {
      await switchMerchant(merchant, '/reports');
    } else {
      router.push('/reports');
    }
  };

  const handleViewChildMerchantQR = (merchantCode: string, businessName: string) => {
    router.push(`/qr-code?merchantCode=${merchantCode}&merchantName=${encodeURIComponent(businessName)}`);
  };

  const handleSwitchMerchant = async (merchantIdToSwitch: string, _merchantCode: string) => {
    const merchant = accessibleMerchants.find((m) => m.id === merchantIdToSwitch);
    if (!merchant || merchantSwitching) return;

    if (merchantIdToSwitch === dashboardData?.superMerchant.id) {
      setSelectedMerchantContext('super-merchant');
    } else {
      setSelectedMerchantContext(merchantIdToSwitch);
    }

    await switchMerchant(merchant, '/');
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 bg-gray-100 rounded" />
            <div className="h-3 w-64 bg-gray-50 rounded" />
          </div>
          <div className="h-8 w-36 bg-gray-100 rounded-full" />
        </div>

        {/* Summary cards skeleton */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 space-y-2.5">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-3 w-28 bg-gray-50 rounded" />
              <div className="h-6 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border bg-white p-4">
          <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-3 bg-gray-100 rounded" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, row) => (
              <div key={row} className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((__, col) => (
                  <div key={col} className="h-3 bg-gray-100 rounded" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    const childCount = childAccounts.length;
    return (
      <div className="space-y-4">
        {allMerchants.length > 1 && (
          <div className="flex justify-end">
            <Select
              value={currentContextId}
              onValueChange={(value) => {
                const merchant = allMerchants.find((m: MerchantItem) => m.id === value);
                if (merchant) {
                  handleSwitchMerchant(merchant.id, merchant.merchantCode);
                }
              }}
            >
              <SelectTrigger className="h-8 w-[240px] rounded-full text-[12px]">
                <SelectValue placeholder="Select merchant">
                  {currentMerchant?.businessTradeName || 'Select merchant'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ownAccounts.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.businessTradeName}
                  </SelectItem>
                ))}
                {teamAccounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1">
                      Team access
                    </div>
                    {teamAccounts.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.businessTradeName}
                      </SelectItem>
                    ))}
                  </>
                )}
                {childCount > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1">
                      Child Merchants
                    </div>
                    {childAccounts.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.businessTradeName}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4">
          <p className="text-[13px] font-medium text-amber-800">
            {error === 'No merchants attached' || error?.toLowerCase().includes('no merchants')
              ? 'No merchants attached'
              : error || 'Unable to load super merchant dashboard'}
          </p>
          <p className="mt-1 text-[12px] text-amber-700">
            {childCount > 0
              ? 'Aggregate stats could not be loaded, but you can still switch to assigned child merchants using the dropdown above.'
              : 'Contact your administrator to assign merchants to your super merchant account.'}
          </p>
          <Button onClick={fetchDashboardData} variant="outline" size="sm" className="mt-3 h-8 rounded-full text-[12px]">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Super Merchant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Crown className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">Super Merchant</h2>
            <p className="text-[12px] text-gray-400 truncate">
              {merchantName} + {dashboardData.totalChildMerchants} child merchant
              {dashboardData.totalChildMerchants !== 1 ? 's' : ''}
            </p>
          </div>
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
              <SelectTrigger className="h-8 w-[240px] rounded-full text-[12px]">
                <SelectValue placeholder="Select merchant">
                  {currentMerchant?.businessTradeName || 'Select merchant'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* User's Own Accounts */}
                {ownAccounts.map((merchant) => (
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
                {teamAccounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1">
                      Team access
                    </div>
                    {teamAccounts.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        <div className="flex items-center gap-2 w-full">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="flex-1">{merchant.businessTradeName}</span>
                          <Badge variant="outline" className="text-violet-600">
                            Team
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {/* Child Merchants */}
                {childAccounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1">
                      Child Merchants
                    </div>
                    {childAccounts.map((merchant) => (
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Users}
          label="Total merchants"
          value={`${dashboardData.totalChildMerchants + 1}`}
          hint={`${dashboardData.activeChildMerchants + (dashboardData.superMerchant.isActive ? 1 : 0)} active · ${dashboardData.verifiedChildMerchants + (dashboardData.superMerchant.isVerified ? 1 : 0)} verified`}
        />
        <KpiCard
          icon={Wallet}
          label="Total balance"
          value={Number(dashboardData.totalWalletBalance || 0).toLocaleString()}
          suffix="UGX"
          hint={`Includes super merchant + ${dashboardData.totalChildMerchants} child merchant${dashboardData.totalChildMerchants !== 1 ? 's' : ''}`}
          valueClassName="text-emerald-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Total transactions"
          value={dashboardData.totalTransactionsCount.toLocaleString()}
          hint="All successful transactions"
        />
        <KpiCard
          icon={CheckCircle}
          label="Active merchants"
          value={`${dashboardData.activeChildMerchants + (dashboardData.superMerchant.isActive ? 1 : 0)}`}
          hint="Currently active on the network"
        />
      </div>

      {/* All Merchants Table (Super Merchant + Child Merchants) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="mb-3">
          <h3 className="text-[14px] font-semibold text-gray-900">All merchants</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Your account and assigned child merchants
          </p>
        </div>
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
                  <TableRow className="bg-amber-50/50">
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
                    <TableCell className="text-gray-500">-</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewChildMerchantTransactions(
                                dashboardData.superMerchant.id,
                                dashboardData.superMerchant.merchantCode,
                              )
                            }
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewChildMerchantReports(
                                dashboardData.superMerchant.id,
                                dashboardData.superMerchant.merchantCode,
                              )
                            }
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewChildMerchantQR(
                                dashboardData.superMerchant.merchantCode,
                                dashboardData.superMerchant.businessTradeName,
                              )
                            }
                          >
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
                <TableRow className="bg-amber-50/50">
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
                  <TableCell className="text-gray-500">-</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleViewChildMerchantTransactions(
                              dashboardData.superMerchant.id,
                              dashboardData.superMerchant.merchantCode,
                            )
                          }
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          View Transactions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleViewChildMerchantReports(
                              dashboardData.superMerchant.id,
                              dashboardData.superMerchant.merchantCode,
                            )
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Reports
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleViewChildMerchantQR(
                              dashboardData.superMerchant.merchantCode,
                              dashboardData.superMerchant.businessTradeName,
                            )
                          }
                        >
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
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewChildMerchantTransactions(merchant.id, merchant.merchantCode)
                            }
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewChildMerchantReports(merchant.id, merchant.merchantCode)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewChildMerchantQR(merchant.merchantCode, merchant.businessTradeName)
                            }
                          >
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
      </div>
    </div>
  );
}
