"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Users,
  Send,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { canInitiatePayments, canApprovePayroll, UserSession } from '@/lib/utils/permissions';
import { useUserProfile } from '../../UserProfileProvider';
import { removeEmployeeFromBatch } from '@/lib/api/payroll.api';

// Transaction limits - ALL payment methods use 3.5M limit
const TRANSACTION_LIMIT = 3500000; // 3.5M UGX for all methods

// Helper function to check if payment needs tranching
const needsTranching = (amount: number, method: string) => {
  return amount > TRANSACTION_LIMIT;
};

// Helper function to calculate tranches
const calculateTranches = (amount: number, method: string) => {
  if (amount <= TRANSACTION_LIMIT) return 1;
  return Math.ceil(amount / TRANSACTION_LIMIT);
};

// Helper function to generate default tranches
const generateDefaultTranches = (amount: number, employeeId: string) => {
  if (amount <= TRANSACTION_LIMIT) {
    return [{
      id: `${employeeId}-1`,
      amount: amount,
      scheduledDate: new Date().toISOString().split('T')[0]
    }];
  }
  
  const trancheCount = Math.ceil(amount / TRANSACTION_LIMIT);
  const tranches = [];
  let remaining = amount;
  
  for (let i = 0; i < trancheCount; i++) {
    const trancheAmount = Math.min(remaining, TRANSACTION_LIMIT);
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    tranches.push({
      id: `${employeeId}-${i + 1}`,
      amount: trancheAmount,
      scheduledDate: date.toISOString().split('T')[0]
    });
    
    remaining -= trancheAmount;
  }
  
  return tranches;
};

export default function RunPayrollPage() {
  const { data: session } = useSession();
  const { profile } = useUserProfile();
  const [payrollData, setPayrollData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInitiateConfirm, setShowInitiateConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedPayrolls, setApprovedPayrolls] = useState<any[]>([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [expandedPayrolls, setExpandedPayrolls] = useState<Record<string, boolean>>({});
  const [payrollDetails, setPayrollDetails] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  
  // Remove employee confirmation dialog state
  const [showRemoveEmployeeDialog, setShowRemoveEmployeeDialog] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState<{
    batchId: string;
    employeePaymentId: string;
    employeeName: string;
  } | null>(null);
  
  // Tranche editing state
  const [editingTranches, setEditingTranches] = useState<Record<string, any[]>>({});
  const [showTrancheEditor, setShowTrancheEditor] = useState<string | null>(null);
  
  // Build user session with isWalletOwner flag for permission checks
  // Use wallet team permissions if available (for team members)
  const walletPermissions = profile?.walletPermissions || profile?.businessWallet?.permissions;
  const userSession: UserSession = {
    role: (session as any)?.user?.role || profile?.role,
    userType: (session as any)?.user?.userType || profile?.userType,
    userData: walletPermissions || (session as any)?.userData || {},
    isWalletOwner: profile?.isWalletOwner || false
  };

  // Check permissions using utility functions
  const isMaker = canInitiatePayments(userSession);
  const isChecker = canApprovePayroll(userSession);
  const canProcess = canInitiatePayments(userSession); // Account users can process after owner approval

  useEffect(() => {
    // Set current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(month);
  }, []);

  // Fetch approved payrolls on mount
  useEffect(() => {
    const fetchApprovedPayrolls = async () => {
      try {
        setLoadingApproved(true);
        const response = await fetch('/api/payroll/approved', {
          headers: {
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setApprovedPayrolls(Array.isArray(data) ? data : []);
        } else {
          setApprovedPayrolls([]);
        }
      } catch (error: any) {
        console.error('Error fetching approved payrolls:', error);
        setApprovedPayrolls([]);
      } finally {
        setLoadingApproved(false);
      }
    };

    if (session) {
      fetchApprovedPayrolls();
    }
  }, [session]);

  // Fetch payroll data when month changes
  useEffect(() => {
    if (!selectedMonth) return;

    const fetchPayrollByMonth = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/payroll/month/${selectedMonth}`, {
          headers: {
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setPayrollData(data);
          } else {
            setPayrollData(null); // No payroll for this month
          }
        } else if (response.status === 404) {
          setPayrollData(null); // No payroll found
        }
      } catch (error: any) {
        console.error('Error fetching payroll:', error);
        setPayrollData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollByMonth();
  }, [selectedMonth, session]);

  const handleInitiatePayroll = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/payroll/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          cycleId: 'default-cycle-id', // TODO: Get from selection
          paymentMonth: selectedMonth
        })
      });

      if (!response.ok) throw new Error('Failed to initiate payroll');

      const data = await response.json();
      setPayrollData(data);
      toast.success(`Payroll initiated for ${data.totalEmployees} employees`);
      setShowInitiateConfirm(false);
      
      // Refetch to ensure data is up to date
      const refetchResponse = await fetch(`/api/payroll/month/${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });
      if (refetchResponse.ok) {
        const refetchData = await refetchResponse.json();
        if (refetchData) {
          setPayrollData(refetchData);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/payroll/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          payrollBatchId: payrollData.id,
          notes: 'Approved'
        })
      });

      if (!response.ok) throw new Error('Failed to approve payroll');

      toast.success('Payroll approved successfully');
      setShowApproveConfirm(false);
      
      // Refetch approved payrolls to show the newly approved one
      const approvedResponse = await fetch('/api/payroll/approved', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });
      if (approvedResponse.ok) {
        const approvedData = await approvedResponse.json();
        setApprovedPayrolls(Array.isArray(approvedData) ? approvedData : []);
      }
      
      // Refetch to get updated data
      const refetchResponse = await fetch(`/api/payroll/month/${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });
      if (refetchResponse.ok) {
        const refetchData = await refetchResponse.json();
        if (refetchData) {
          setPayrollData(refetchData);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/payroll/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          payrollBatchId: payrollData.id,
          reason: rejectionReason
        })
      });

      if (!response.ok) throw new Error('Failed to reject payroll');

      toast.success('Payroll rejected');
      setShowRejectDialog(false);
      setRejectionReason('');
      
      // Refetch to get updated data
      const refetchResponse = await fetch(`/api/payroll/month/${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });
      if (refetchResponse.ok) {
        const refetchData = await refetchResponse.json();
        if (refetchData) {
          setPayrollData(refetchData);
        } else {
          setPayrollData(null);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject payroll');
    } finally {
      setLoading(false);
    }
  };

  const togglePayrollView = async (payrollId: string) => {
    const isExpanded = expandedPayrolls[payrollId];
    
    if (!isExpanded && !payrollDetails[payrollId]) {
      // Fetch payroll details
      setLoadingDetails({ ...loadingDetails, [payrollId]: true });
      try {
        const response = await fetch(`/api/payroll/batch/${payrollId}`, {
          headers: {
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPayrollDetails({ ...payrollDetails, [payrollId]: data });
        } else {
          toast.error('Failed to load payroll details');
        }
      } catch (error: any) {
        console.error('Error fetching payroll details:', error);
        toast.error('Failed to load payroll details');
      } finally {
        setLoadingDetails({ ...loadingDetails, [payrollId]: false });
      }
    }
    
    setExpandedPayrolls({ ...expandedPayrolls, [payrollId]: !isExpanded });
  };

  const openRemoveEmployeeDialog = (batchId: string, employeePaymentId: string, employeeName: string) => {
    setEmployeeToRemove({ batchId, employeePaymentId, employeeName });
    setShowRemoveEmployeeDialog(true);
  };

  const handleRemoveEmployee = async () => {
    if (!employeeToRemove) return;

    const { batchId, employeePaymentId, employeeName } = employeeToRemove;

    setLoading(true);
    try {
      await removeEmployeeFromBatch(batchId, employeePaymentId);
      toast.success(`✅ ${employeeName} removed from payroll batch`);
      
      // Close dialog
      setShowRemoveEmployeeDialog(false);
      setEmployeeToRemove(null);
      
      // Refresh the payroll details if it's in the expanded list
      if (payrollDetails[batchId]) {
        const response = await fetch(`/api/payroll/batch/${batchId}`, {
          headers: {
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPayrollDetails({ ...payrollDetails, [batchId]: data });
        }
      }
      
      // Refresh main payroll data if it matches
      if (payrollData && payrollData.id === batchId) {
        const response = await fetch(`/api/payroll/month/${payrollData.paymentMonth}`, {
          headers: {
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setPayrollData(data);
          }
        }
      }
      
      // Refresh approved payrolls list
      const approvedResponse = await fetch('/api/payroll/approved', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });
      if (approvedResponse.ok) {
        const approvedData = await approvedResponse.json();
        setApprovedPayrolls(Array.isArray(approvedData) ? approvedData : []);
      }
    } catch (error: any) {
      console.error('Error removing employee:', error);
      toast.error(error.message || 'Failed to remove employee from batch');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (batchId?: string) => {
    const payrollId = batchId || payrollData?.id;
    if (!payrollId) {
      toast.error('Payroll batch ID is required');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/payroll/process/${payrollId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to process payroll');
      }

      toast.success(`Payroll processing started - Bulk Transaction: ${responseData.bulkTransactionId || 'N/A'}`);
      
      // Refetch approved payrolls to remove the processed one
      const approvedResponse = await fetch('/api/payroll/approved', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });
      if (approvedResponse.ok) {
        const approvedData = await approvedResponse.json();
        setApprovedPayrolls(Array.isArray(approvedData) ? approvedData : []);
      }
      
      // If processing the current month's payroll, refetch it
      if (!batchId && selectedMonth) {
        const refetchResponse = await fetch(`/api/payroll/month/${selectedMonth}`, {
          headers: {
            'Authorization': `Bearer ${(session as any)?.accessToken}`
          }
        });
        if (refetchResponse.ok) {
          const refetchData = await refetchResponse.json();
          if (refetchData) {
            setPayrollData(refetchData);
          }
        }
      }
    } catch (error: any) {
      console.error('Error processing payroll:', error);
      toast.error(error.message || 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    // Handle null, undefined, or invalid values
    if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
      return 'UGX 0';
    }
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return 'UGX 0';
    }
    
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(numAmount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };

    return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Run Payroll</h1>
        <p className="text-gray-600 mt-2">Initiate, approve, and process employee salaries</p>
        
        {/* Permission Status */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Account Type:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                userSession.isWalletOwner ? 'bg-purple-100 text-purple-800' :
                userSession.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                userSession.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {userSession.isWalletOwner ? 'Account Owner' : (userSession.role || 'Team Member')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Can Initiate:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                isMaker ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isMaker ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Can Approve:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                isChecker ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isChecker ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Can Process:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                canProcess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {canProcess ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Approved Payrolls Ready to Process */}
      {approvedPayrolls.length > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Approved Payrolls Ready to Pay</CardTitle>
            <CardDescription>
              These payrolls have been approved and are ready for payment processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedPayrolls.map((payroll: any) => {
                const isExpanded = expandedPayrolls[payroll.id];
                const details = payrollDetails[payroll.id];
                const isLoadingDetails = loadingDetails[payroll.id];
                
                return (
                  <div
                    key={payroll.id}
                    className="bg-white p-4 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            Payroll - {new Date(payroll.paymentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <Badge className="bg-green-600">APPROVED</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Employees:</span>
                            <p className="font-semibold">{payroll.totalEmployees}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Gross:</span>
                            <p className="font-semibold">{formatCurrency(payroll.totalGross)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Deductions:</span>
                            <p className="font-semibold">{formatCurrency(payroll.totalDeductions)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Net Payable:</span>
                            <p className="font-semibold text-green-700">{formatCurrency(payroll.totalNet)}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Initiated by: {payroll.initiatedBy} | Approved by: {payroll.approvedBy || 'N/A'}
                        </div>
                      </div>
                      <div className="ml-4 flex gap-2">
                        <Button
                          onClick={() => togglePayrollView(payroll.id)}
                          variant="outline"
                          className="border-gray-300"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Hide Employees
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View Employees
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleProcess(payroll.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Pay Now
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Employees List */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        {isLoadingDetails ? (
                          <div className="text-center py-4">
                            <Clock className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                            <p className="text-sm text-gray-500 mt-2">Loading employees...</p>
                          </div>
                        ) : details?.employees && details.employees.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Employees in this payroll:</h4>
                            {details.employees.map((emp: any) => (
                              <div
                                key={emp.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                                  <p className="text-xs text-gray-500">{emp.phoneNumber}</p>
                                  <div className="flex gap-4 mt-1 text-xs">
                                    <span className="text-gray-600">
                                      Gross: <span className="font-medium">{formatCurrency(emp.grossSalary)}</span>
                                    </span>
                                    <span className="text-gray-600">
                                      Net: <span className="font-medium text-green-600">{formatCurrency(emp.netSalary)}</span>
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => openRemoveEmployeeDialog(payroll.id, emp.paymentId || emp.id, `${emp.firstName} ${emp.lastName}`)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">No employees found</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Payment Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Payment Month</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMonth(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => setShowInitiateConfirm(true)}
              className="bg-blue-600"
              disabled={!selectedMonth || payrollData?.status === 'PENDING' || !isMaker}
            >
              <Send className="h-4 w-4 mr-2" />
              Initiate Payroll
            </Button>
            {!isMaker && (
              <p className="text-xs text-gray-500 mt-1">
                You don't have permission to initiate payroll
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Summary */}
      {payrollData && (
        <>
          {/* Status & Summary */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll for {payrollData.paymentMonth}</CardTitle>
                  <CardDescription>
                    {payrollData.totalEmployees} employees
                  </CardDescription>
                </div>
                {getStatusBadge(payrollData.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Gross</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(payrollData?.totalGross ?? 0)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(payrollData?.totalDeductions ?? 0)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Net Payable</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(payrollData?.totalNet ?? 0)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Employees</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {payrollData?.totalEmployees ?? 0}
                  </p>
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="mt-6 pt-6 border-t">
                {payrollData.status === 'PENDING' && isChecker && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowApproveConfirm(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve Payroll
                    </Button>
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Reject Payroll
                    </Button>
                  </div>
                )}

                {payrollData.status === 'APPROVED' && canProcess && (
                  <Button
                    onClick={() => handleProcess()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Process Payment'}
                  </Button>
                )}
                
                {payrollData.status === 'APPROVED' && !canProcess && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      You don't have permission to process payments. Please contact your account owner.
                    </p>
                  </div>
                )}

                {payrollData.status === 'REJECTED' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium">Payroll Rejected</p>
                    <p className="text-sm text-red-600 mt-1">
                      {payrollData.rejectionReason || 'No reason provided'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Payment Details</CardTitle>
              <CardDescription>
                {payrollData.employees?.some((emp: any) => needsTranching(emp.netSalary, emp.paymentMethod)) && (
                  <span className="text-orange-600 flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Some payments will be split into tranches due to transaction limits
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payrollData.employees?.map((emp: any) => {
                  const hasTranching = needsTranching(emp.netSalary, emp.paymentMethod);
                  const trancheCount = calculateTranches(emp.netSalary, emp.paymentMethod);
                  
                  return (
                    <div
                      key={emp.id}
                      className={`flex justify-between items-center p-3 border rounded-lg ${
                        hasTranching ? 'border-orange-300 bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          {hasTranching && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                              {trancheCount} tranches
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{emp.phoneNumber}</p>
                        <p className="text-xs text-gray-500 capitalize">{emp.paymentMethod.replace('_', ' ').toLowerCase()}</p>
                        
                        {hasTranching && (
                          <div className="mt-2 text-xs text-orange-700">
                            <div className="flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium">Payment will be split:</p>
                                {(() => {
                                  const currentTranches = editingTranches[emp.id] || generateDefaultTranches(emp.netSalary, emp.id);
                                  return currentTranches.map((tranche: any, i: number) => (
                                    <p key={i}>
                                      Tranche {i + 1}: {formatCurrency(tranche.amount)}
                                      {i > 0 && ` (${tranche.scheduledDate})`}
                                    </p>
                                  ));
                                })()}
                                <p className="mt-1 text-gray-600">
                                  Reason: Exceeds transaction limit of {formatCurrency(TRANSACTION_LIMIT)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!editingTranches[emp.id]) {
                                  setEditingTranches({
                                    ...editingTranches,
                                    [emp.id]: generateDefaultTranches(emp.netSalary, emp.id)
                                  });
                                }
                                setShowTrancheEditor(emp.id);
                              }}
                              className="mt-2 text-xs h-7"
                            >
                              ✏️ Edit Tranches
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4 flex flex-col items-end gap-2">
                        <div>
                          <p className="text-sm text-gray-500">
                            Gross: {formatCurrency(emp.grossSalary)}
                          </p>
                          <p className="text-sm text-red-600">
                            Deductions: -{formatCurrency(emp.totalDeductions)}
                          </p>
                          <p className="font-bold text-green-600">
                            Net: {formatCurrency(emp.netSalary)}
                          </p>
                        </div>
                        {(payrollData.status === 'PENDING' || payrollData.status === 'APPROVED') && (
                          <Button
                            onClick={() => openRemoveEmployeeDialog(payrollData.id, emp.paymentId || emp.id, `${emp.firstName} ${emp.lastName}`)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Initiate Confirmation Dialog */}
      <AlertDialog open={showInitiateConfirm} onOpenChange={setShowInitiateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initiate Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will calculate salaries for all employees for {selectedMonth} and submit for approval.
              The payroll cannot be modified after initiation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInitiatePayroll} disabled={loading}>
              {loading ? 'Initiating...' : 'Initiate Payroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve payroll batch for {payrollData?.paymentMonth}. 
              Total amount: {formatCurrency(payrollData?.totalNet || 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={loading}>
              {loading ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this payroll batch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="e.g., Incorrect salary amounts for John Doe"
              value={rejectionReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={loading || !rejectionReason.trim()}>
              {loading ? 'Rejecting...' : 'Reject Payroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tranche Editor Dialog */}
      <AlertDialog open={!!showTrancheEditor} onOpenChange={() => setShowTrancheEditor(null)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Payment Tranches</AlertDialogTitle>
            <AlertDialogDescription>
              {showTrancheEditor && (() => {
                const emp = payrollData?.employees?.find((e: any) => e.id === showTrancheEditor);
                return emp ? `${emp.firstName} ${emp.lastName} - Total: ${formatCurrency(emp.netSalary)}` : '';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 my-4">
            {showTrancheEditor && editingTranches[showTrancheEditor]?.map((tranche: any, index: number) => (
              <div key={tranche.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Tranche {index + 1}</h4>
                  {editingTranches[showTrancheEditor].length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = editingTranches[showTrancheEditor].filter((_: any, i: number) => i !== index);
                        setEditingTranches({ ...editingTranches, [showTrancheEditor]: updated });
                      }}
                      className="text-red-600 hover:text-red-700 h-7 text-xs"
                    >
                      ❌ Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Amount (UGX)</label>
                    <Input
                      type="number"
                      value={tranche.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const updated = [...editingTranches[showTrancheEditor]];
                        updated[index] = { ...updated[index], amount: Number(e.target.value) };
                        setEditingTranches({ ...editingTranches, [showTrancheEditor]: updated });
                      }}
                      max={TRANSACTION_LIMIT}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max: {formatCurrency(TRANSACTION_LIMIT)}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700">Scheduled Date</label>
                    <Input
                      type="date"
                      value={tranche.scheduledDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const updated = [...editingTranches[showTrancheEditor]];
                        updated[index] = { ...updated[index], scheduledDate: e.target.value };
                        setEditingTranches({ ...editingTranches, [showTrancheEditor]: updated });
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {showTrancheEditor && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentTranches = editingTranches[showTrancheEditor];
                    const lastDate = new Date(currentTranches[currentTranches.length - 1].scheduledDate);
                    lastDate.setDate(lastDate.getDate() + 1);
                    
                    setEditingTranches({
                      ...editingTranches,
                      [showTrancheEditor]: [
                        ...currentTranches,
                        {
                          id: `${showTrancheEditor}-${currentTranches.length + 1}`,
                          amount: 0,
                          scheduledDate: lastDate.toISOString().split('T')[0]
                        }
                      ]
                    });
                  }}
                  className="w-full"
                >
                  ➕ Add Another Tranche
                </Button>
                
                {(() => {
                  const emp = payrollData?.employees?.find((e: any) => e.id === showTrancheEditor);
                  const totalAmount = emp?.netSalary || 0;
                  const currentTotal = editingTranches[showTrancheEditor].reduce((sum: number, t: any) => sum + Number(t.amount), 0);
                  const difference = totalAmount - currentTotal;
                  const isValid = Math.abs(difference) < 1;
                  
                  return (
                    <div className={`p-4 rounded-lg ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Expected Total:</span>
                          <span>{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Current Total:</span>
                          <span>{formatCurrency(currentTotal)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-bold">Difference:</span>
                          <span className={difference !== 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                            {formatCurrency(Math.abs(difference))} {difference > 0 ? '(short)' : difference < 0 ? '(over)' : '✓'}
                          </span>
                        </div>
                      </div>
                      {!isValid && (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Tranches must total exactly {formatCurrency(totalAmount)}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowTrancheEditor(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!showTrancheEditor) return;
                const emp = payrollData?.employees?.find((e: any) => e.id === showTrancheEditor);
                const totalAmount = emp?.netSalary || 0;
                const currentTotal = editingTranches[showTrancheEditor].reduce((sum: number, t: any) => sum + Number(t.amount), 0);
                const isValid = Math.abs(totalAmount - currentTotal) < 1;
                
                if (!isValid) {
                  toast.error(`Tranches must total exactly ${formatCurrency(totalAmount)}`);
                  return;
                }
                
                toast.success(`✅ Tranches updated for ${emp?.firstName} ${emp?.lastName}`);
                setShowTrancheEditor(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Tranches
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Instructions */}
      {!payrollData && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Maker-Checker Workflow</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li><strong>Maker</strong> initiates payroll and submits for approval</li>
                  <li><strong>Checker</strong> reviews and approves or rejects</li>
                  <li><strong>Finance</strong> processes approved payroll as bulk payment</li>
                  <li>Employees receive salary automatically</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove Employee Confirmation Dialog */}
      <AlertDialog open={showRemoveEmployeeDialog} onOpenChange={setShowRemoveEmployeeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee from Payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{employeeToRemove?.employeeName}</strong> from this payroll batch? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowRemoveEmployeeDialog(false);
                setEmployeeToRemove(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveEmployee}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Employee'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

