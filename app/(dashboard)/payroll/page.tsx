"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Play,
  FileText,
  ShieldX
} from 'lucide-react';
import { toast } from 'sonner';

export default function PayrollDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [pendingBatches, setPendingBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const merchants = (session?.user as any)?.merchants ?? [];
  const currentMerchantCode = (session?.user as any)?.merchantCode;
  const currentMerchant = currentMerchantCode
    ? merchants.find((m: any) => m?.merchantCode === currentMerchantCode)
    : merchants[0];
  const featurePayroll = currentMerchant?.featurePayroll === true;

  useEffect(() => {
    if (session && currentMerchant && featurePayroll === false) {
      toast.error('Payroll is not enabled for this merchant.');
      router.replace('/');
      return;
    }
    if (session && featurePayroll) {
      loadPayrollData();
    } else {
      setLoading(false);
    }
  }, [session, currentMerchant, featurePayroll, router]);

  const loadPayrollData = async () => {
    try {
      const response = await fetch('/api/payroll/summary', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (session && currentMerchant && featurePayroll !== true) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <ShieldX className="h-8 w-8 text-red-500" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              Payroll is not enabled for this merchant. Contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
        <p className="text-gray-600 mt-2">
          Manage employee salaries with maker-checker approval workflow
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">
                  {summary?.totalEmployees || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Gross</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary?.totalGrossSalary || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary?.totalDeductions || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Payable</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.totalNetSalary || 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button
          className="h-20 bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push('/payroll/employees')}
        >
          <Users className="h-5 w-5 mr-2" />
          Manage Employees
        </Button>

        <Button
          className="h-20 bg-green-600 hover:bg-green-700"
          onClick={() => router.push('/payroll/run')}
        >
          <Play className="h-5 w-5 mr-2" />
          Run Payroll
        </Button>

        <Button
          className="h-20 bg-yellow-600 hover:bg-yellow-700"
          onClick={() => router.push('/payroll/approvals')}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Approvals
        </Button>

        <Button
          className="h-20 bg-purple-600 hover:bg-purple-700"
          onClick={() => router.push('/payroll/reports')}
        >
          <FileText className="h-5 w-5 mr-2" />
          View Reports
        </Button>
      </div>

      {/* Pending Approvals */}
      {pendingBatches.length > 0 && (
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Payroll batches waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingBatches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border mb-2"
              >
                <div>
                  <p className="font-medium">{batch.paymentMonth} Payroll</p>
                  <p className="text-sm text-gray-600">
                    {batch.totalEmployees} employees • {formatCurrency(batch.totalNet)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/payroll/approve/${batch.id}`)}
                >
                  Review & Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Deduction Breakdown */}
      {summary?.deductionBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Deduction Breakdown</CardTitle>
            <CardDescription>Monthly deduction summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary.deductionBreakdown).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{key}</span>
                  <span className="text-gray-600">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
