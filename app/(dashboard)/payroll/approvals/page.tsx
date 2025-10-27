"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Eye,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

// Transaction limit
const TRANSACTION_LIMIT = 3500000; // 3.5M UGX

// Helper functions
const needsTranching = (amount: number) => amount > TRANSACTION_LIMIT;
const calculateTranches = (amount: number) => {
  if (amount <= TRANSACTION_LIMIT) return 1;
  return Math.ceil(amount / TRANSACTION_LIMIT);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function PayrollApprovalsPage() {
  const { data: session } = useSession();
  const [pendingPayrolls, setPendingPayrolls] = useState<any[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  
  const userRole = (session as any)?.user?.role;
  const isChecker = true; // Check permissions: PAYROLL_APPROVE

  useEffect(() => {
    fetchPendingPayrolls();
  }, []);

  const fetchPendingPayrolls = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/payroll/pending', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch pending payrolls');

      const data = await response.json();
      setPendingPayrolls(data);
    } catch (error: any) {
      console.error('Error fetching payrolls:', error);
      // Mock data for development
      setPendingPayrolls([
        {
          id: '1',
          paymentMonth: '2025-10',
          totalEmployees: 50,
          totalGross: 150000000,
          totalDeductions: 20000000,
          totalNet: 130000000,
          status: 'PENDING',
          initiatedBy: 'John Maker',
          initiatedAt: new Date().toISOString(),
          employees: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayroll) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          payrollBatchId: selectedPayroll.id,
          notes: approvalNotes
        })
      });

      if (!response.ok) throw new Error('Failed to approve payroll');

      toast.success(`✅ Payroll approved for ${selectedPayroll.totalEmployees} employees`);
      setShowApproveDialog(false);
      setApprovalNotes('');
      setSelectedPayroll(null);
      fetchPendingPayrolls();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayroll || !rejectionReason.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          payrollBatchId: selectedPayroll.id,
          reason: rejectionReason
        })
      });

      if (!response.ok) throw new Error('Failed to reject payroll');

      toast.success(`❌ Payroll rejected`);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedPayroll(null);
      fetchPendingPayrolls();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject payroll');
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollDetails = async (payrollId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payroll/${payrollId}`, {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to load payroll details');

      const data = await response.json();
      setSelectedPayroll(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
    };

    return (
      <Badge variant="outline" className={colors[status] || 'bg-gray-100'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Payroll Approvals</h1>
        <p className="text-gray-600 mt-2">
          Review and approve pending payroll batches
        </p>
      </div>

      {/* Pending Payrolls List */}
      {!selectedPayroll && (
        <div className="space-y-4">
          {pendingPayrolls.length === 0 ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    No Pending Approvals
                  </h3>
                  <p className="text-blue-800">
                    All payroll batches have been processed
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingPayrolls.map((payroll) => {
              const tranchedEmployees = payroll.employees?.filter((emp: any) => 
                needsTranching(emp.netSalary)
              ).length || 0;

              return (
                <Card 
                  key={payroll.id} 
                  className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle>
                            Payroll - {formatDate(payroll.paymentMonth + '-01')}
                          </CardTitle>
                          {getStatusBadge(payroll.status)}
                        </div>
                        <CardDescription className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Initiated by: <strong>{payroll.initiatedBy}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>Date: {formatDate(payroll.initiatedAt)}</span>
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs font-medium">Employees</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          {payroll.totalEmployees}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs font-medium">Gross Total</span>
                        </div>
                        <p className="text-lg font-bold text-green-900">
                          {formatCurrency(payroll.totalGross)}
                        </p>
                      </div>
                      
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 mb-1">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Deductions</span>
                        </div>
                        <p className="text-lg font-bold text-red-900">
                          {formatCurrency(payroll.totalDeductions)}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-700 mb-1">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Net Total</span>
                        </div>
                        <p className="text-lg font-bold text-purple-900">
                          {formatCurrency(payroll.totalNet)}
                        </p>
                      </div>
                    </div>

                    {tranchedEmployees > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-orange-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {tranchedEmployees} employee{tranchedEmployees > 1 ? 's' : ''} will have tranched payments (>3.5M)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => loadPayrollDetails(payroll.id)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      
                      {isChecker && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              setShowApproveDialog(true);
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          
                          <Button
                            onClick={() => {
                              setSelectedPayroll(payroll);
                              setShowRejectDialog(true);
                            }}
                            variant="outline"
                            className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                          >
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Payroll Details View */}
      {selectedPayroll && !showApproveDialog && !showRejectDialog && (
        <div className="space-y-6">
          <Button
            variant="outline"
            onClick={() => setSelectedPayroll(null)}
            className="mb-4"
          >
            ← Back to List
          </Button>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Payroll Details - {formatDate(selectedPayroll.paymentMonth + '-01')}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Initiated by <strong>{selectedPayroll.initiatedBy}</strong> on{' '}
                    {formatDate(selectedPayroll.initiatedAt)}
                  </CardDescription>
                </div>
                {getStatusBadge(selectedPayroll.status)}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Gross Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedPayroll.totalGross)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Deductions</p>
                  <p className="text-2xl font-bold text-red-600">
                    -{formatCurrency(selectedPayroll.totalDeductions)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Net Payable</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedPayroll.totalNet)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Payment Breakdown</CardTitle>
              <CardDescription>
                {selectedPayroll.totalEmployees} employees • Review all details before approving
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedPayroll.employees?.map((emp: any) => {
                  const hasTranching = needsTranching(emp.netSalary);
                  const trancheCount = calculateTranches(emp.netSalary);
                  
                  return (
                    <div
                      key={emp.id}
                      className={`p-4 border rounded-lg ${
                        hasTranching ? 'border-orange-300 bg-orange-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">
                              {emp.firstName} {emp.lastName}
                            </h4>
                            {hasTranching && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                {trancheCount} tranches
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{emp.phoneNumber}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {emp.paymentMethod?.replace('_', ' ').toLowerCase()}
                          </p>
                          
                          {hasTranching && (
                            <div className="mt-2 text-xs text-orange-700">
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Payment will be split into {trancheCount} tranches</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-gray-600">Gross: </span>
                              <span className="font-medium">{formatCurrency(emp.grossSalary)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Deductions: </span>
                              <span className="font-medium text-red-600">
                                -{formatCurrency(emp.totalDeductions)}
                              </span>
                            </div>
                            <div className="pt-1 border-t">
                              <span className="text-gray-600">Net: </span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(emp.netSalary)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Approval Actions */}
          {isChecker && selectedPayroll.status === 'PENDING' && (
            <Card className="border-2 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Button
                    onClick={() => setShowApproveDialog(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Approve Payroll
                  </Button>
                  
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    variant="outline"
                    className="flex-1 border-red-600 text-red-600 hover:bg-red-50 h-12 text-lg"
                  >
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    Reject Payroll
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve payroll for <strong>{selectedPayroll?.totalEmployees} employees</strong>.
              <br />
              Total amount: <strong>{formatCurrency(selectedPayroll?.totalNet || 0)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Approval Notes (Optional)
            </label>
            <Textarea
              placeholder="e.g., Verified all amounts, approved for processing"
              value={approvalNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApprovalNotes('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Approving...' : 'Confirm Approval'}
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
              This will be sent back to the initiator for corrections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Rejection Reason (Required)
            </label>
            <Textarea
              placeholder="e.g., Incorrect salary amounts for John Doe, Missing deductions for 3 employees"
              value={rejectionReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
              rows={4}
              className="border-red-300 focus:border-red-500"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={loading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Card for Checkers */}
      {!selectedPayroll && pendingPayrolls.length > 0 && (
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Approval Guidelines</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Review all employee details carefully</li>
                  <li>Verify gross salaries and deductions</li>
                  <li>Check for tranched payments (>3.5M)</li>
                  <li>Ensure total amounts are correct</li>
                  <li>Approve only if everything is accurate</li>
                  <li>Provide clear rejection reasons if needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

