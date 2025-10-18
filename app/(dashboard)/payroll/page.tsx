"use client";
import React, { useState, useEffect } from "react";
import { Card } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";

// Mock payrolls
const payrolls = [
  // Paid payrolls
  {
    id: "PR-001",
    name: "June 2024 Payroll",
    date: "2024-06-30",
    total: 6000,
    type: "Monthly",
    status: "Paid",
    paymentMethod: "bank",
    reference: "REF123456",
    employees: [
      { id: "EMP-001", name: "John Doe", amount: 2000, status: "Paid", paymentMethod: "bank", reference: "EMPREF001" },
      { id: "EMP-002", name: "Jane Smith", amount: 1800, status: "Paid", paymentMethod: "mobile_money", reference: "EMPREF002" },
      { id: "EMP-003", name: "Alice Brown", amount: 2200, status: "Paid", paymentMethod: "rukapay", reference: "EMPREF003" },
    ],
  },
  {
    id: "PR-004",
    name: "May 2024 Payroll",
    date: "2024-05-31",
    total: 5800,
    type: "Monthly",
    status: "Paid",
    paymentMethod: "mobile_money",
    reference: "REF987654",
    employees: [
      { id: "EMP-001", name: "John Doe", amount: 1900, status: "Paid", paymentMethod: "mobile_money", reference: "EMPREF009" },
      { id: "EMP-002", name: "Jane Smith", amount: 1900, status: "Paid", paymentMethod: "bank", reference: "EMPREF010" },
      { id: "EMP-003", name: "Alice Brown", amount: 2000, status: "Paid", paymentMethod: "rukapay", reference: "EMPREF011" },
    ],
  },
  {
    id: "PR-005",
    name: "April 2024 Payroll",
    date: "2024-04-30",
    total: 5700,
    type: "Monthly",
    status: "Paid",
    paymentMethod: "rukapay",
    reference: "REF246810",
    employees: [
      { id: "EMP-001", name: "John Doe", amount: 1800, status: "Paid", paymentMethod: "rukapay", reference: "EMPREF012" },
      { id: "EMP-002", name: "Jane Smith", amount: 1900, status: "Paid", paymentMethod: "bank", reference: "EMPREF013" },
      { id: "EMP-003", name: "Alice Brown", amount: 2000, status: "Paid", paymentMethod: "mobile_money", reference: "EMPREF014" },
    ],
  },
  // Active payrolls
  {
    id: "PR-002",
    name: "July 2024 Payroll",
    date: "2024-07-31",
    total: 6200,
    type: "Monthly",
    status: "Active",
    paymentMethod: "mobile_money",
    reference: "REF654321",
    employees: [
      { id: "EMP-001", name: "John Doe", amount: 2100, status: "Pending", paymentMethod: "mobile_money", reference: "EMPREF004" },
      { id: "EMP-002", name: "Jane Smith", amount: 1900, status: "Pending", paymentMethod: "bank", reference: "EMPREF005" },
      { id: "EMP-003", name: "Alice Brown", amount: 2200, status: "Pending", paymentMethod: "rukapay", reference: "EMPREF006" },
    ],
  },
  {
    id: "PR-006",
    name: "August 2024 Payroll",
    date: "2024-08-31",
    total: 6300,
    type: "Monthly",
    status: "Active",
    paymentMethod: "bank",
    reference: "REF112233",
    employees: [
      { id: "EMP-001", name: "John Doe", amount: 2100, status: "Pending", paymentMethod: "bank", reference: "EMPREF015" },
      { id: "EMP-002", name: "Jane Smith", amount: 2100, status: "Pending", paymentMethod: "mobile_money", reference: "EMPREF016" },
      { id: "EMP-003", name: "Alice Brown", amount: 2100, status: "Pending", paymentMethod: "rukapay", reference: "EMPREF017" },
    ],
  },
  {
    id: "PR-007",
    name: "September 2024 Payroll",
    date: "2024-09-30",
    total: 6400,
    type: "Monthly",
    status: "Active",
    paymentMethod: "rukapay",
    reference: "REF445566",
    employees: [
      { id: "EMP-001", name: "John Doe", amount: 2200, status: "Pending", paymentMethod: "rukapay", reference: "EMPREF018" },
      { id: "EMP-002", name: "Jane Smith", amount: 2100, status: "Pending", paymentMethod: "bank", reference: "EMPREF019" },
      { id: "EMP-003", name: "Alice Brown", amount: 2100, status: "Pending", paymentMethod: "mobile_money", reference: "EMPREF020" },
    ],
  },
  // Pending payrolls
  {
    id: "PR-003",
    name: "Special Bonus",
    date: "2024-07-15",
    total: 3000,
    type: "Bonus",
    status: "Pending",
    paymentMethod: "rukapay",
    reference: "REFBONUS",
    employees: [
      { id: "EMP-004", name: "Bob Lee", amount: 1500, status: "Pending", paymentMethod: "bank", reference: "EMPREF007" },
      { id: "EMP-005", name: "Chris Green", amount: 1500, status: "Pending", paymentMethod: "mobile_money", reference: "EMPREF008" },
    ],
  },
  {
    id: "PR-008",
    name: "Year-End Bonus",
    date: "2024-12-20",
    total: 5000,
    type: "Bonus",
    status: "Pending",
    paymentMethod: "bank",
    reference: "REFBONUS2",
    employees: [
      { id: "EMP-006", name: "Diana Prince", amount: 2500, status: "Pending", paymentMethod: "bank", reference: "EMPREF021" },
      { id: "EMP-007", name: "Clark Kent", amount: 2500, status: "Pending", paymentMethod: "mobile_money", reference: "EMPREF022" },
    ],
  },
  {
    id: "PR-009",
    name: "Holiday Allowance",
    date: "2024-12-24",
    total: 4000,
    type: "Allowance",
    status: "Pending",
    paymentMethod: "mobile_money",
    reference: "REFALLOW",
    employees: [
      { id: "EMP-008", name: "Bruce Wayne", amount: 2000, status: "Pending", paymentMethod: "mobile_money", reference: "EMPREF023" },
      { id: "EMP-009", name: "Selina Kyle", amount: 2000, status: "Pending", paymentMethod: "bank", reference: "EMPREF024" },
    ],
  },
];

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
];

export default function PayrollPage() {
  const { data: session, status } = useSession();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [payingEmployees, setPayingEmployees] = useState<Set<string>>(new Set());
  const [paymentResults, setPaymentResults] = useState<Record<string, { status: 'success' | 'failed', message: string }>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [employeePaymentMethods, setEmployeePaymentMethods] = useState<Record<string, 'bank' | 'mobile_money'>>({});
  const [paymentProgress, setPaymentProgress] = useState<Record<string, 'pending' | 'processing' | 'success' | 'failed'>>({});
  
  // Find the latest payroll by date
  const latestPayroll = payrolls.reduce((latest, p) =>
    !latest || new Date(p.rdbs_created_at) > new Date(latest.rdbs_created_at) ? p : latest, undefined as any
  );
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>(latestPayroll?._id || "");
  const [statusFilter, setStatusFilter] = useState<string>("draft");

  const merchant_id = session?.user?.merchantId;

  // Fetch payrolls from API
  const fetchPayrolls = async () => {
    if (!merchant_id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      console.log("enpo", endpoint)
      const response = await axios.get(`${endpoint}/employees/payroll`, {
        params: {
          merchantId: merchant_id
        }
      });
      console.log("payrollll", response)

      if (response.status === 200) {
        console.log("Payrolls fetched:", response.data);
        
        // Handle different response structures
        let payrollsData = [];
        if (response.data && response.data.data && Array.isArray(response.data.data.payrolls)) {
          payrollsData = response.data.data.payrolls;
        } else if (Array.isArray(response.data)) {
          payrollsData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          payrollsData = response.data.data;
        } else if (response.data && Array.isArray(response.data.payrolls)) {
          payrollsData = response.data.payrolls;
        } else {
          console.warn("Unexpected response structure:", response.data);
          payrollsData = [];
        }
        
        setPayrolls(payrollsData);
      } else {
        setError('Failed to fetch payrolls');
      }
    } catch (error: any) {
      console.error('Error fetching payrolls:', error);
      setError(error.response?.data?.message || 'Failed to fetch payrolls');
    } finally {
      setLoading(false);
    }
  };

  // Pay employee through bank
  const payEmployeeBank = async (employee: any, payrollId: string): Promise<boolean> => {
    if (!merchant_id) return false;
    
    try {
      setPayingEmployees(prev => new Set(prev).add(employee.rdbs_employee_id));
      setError(null);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.post(`${endpoint}/abc/secure/merchant/bank/cash-deposit`, {
        accountNumber: employee.rdbs_bank_account,
        amount: employee.rdbs_net_salary,
        bankSortCode: employee.rdbs_bank_name,
        purposeOfTransaction: "salary_payment",
        narration: "payment",
        customerPhoneNumber: employee.rdbs_employee_phone,
        gender: "not_specified",
        sourceOfFunds: "business",
        merchantId: merchant_id,
        merchantName: session?.user?.name || "Merchant"
      });

      if (response.data.status === 1) {
        console.log("Bank payment successful:", response.data);
        setPaymentResults(prev => ({
          ...prev,
          [employee.rdbs_employee_id]: { status: 'success', message: 'Payment successful' }
        }));
        // Update employee status to paid
        await updateEmployeePaymentStatus(payrollId, employee.rdbs_employee_id, true);
        return true;
      } else {
        console.error("Bank payment failed:", response.data);
        setPaymentResults(prev => ({
          ...prev,
          [employee.rdbs_employee_id]: { status: 'failed', message: response.data.message || 'Payment failed' }
        }));
        return false;
      }
    } catch (error: any) {
      console.error('Error processing bank payment:', error);
      setPaymentResults(prev => ({
        ...prev,
        [employee.rdbs_employee_id]: { status: 'failed', message: error.response?.data?.message || 'Payment failed' }
      }));
      return false;
    } finally {
      setPayingEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.rdbs_employee_id);
        return newSet;
      });
    }
  };

  // Pay employee through mobile money
  const payEmployeeMobileMoney = async (employee: any, payrollId: string): Promise<boolean> => {
    if (!merchant_id) return false;
    
    try {
      setPayingEmployees(prev => new Set(prev).add(employee.rdbs_employee_id));
      setError(null);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.post(`${endpoint}/abc/secure/merchant/mobile-money/post-disbursement-transaction`, {
        phoneNumber: employee.rdbs_mobile_money,
        amount: employee.rdbs_net_salary,
        narration: "payment",
        merchantId: merchant_id,
        merchantName: session?.user?.name || "Merchant"
      });

      if (response.data.status === 1) {
        console.log("Mobile money payment successful:", response.data);
        setPaymentResults(prev => ({
          ...prev,
          [employee.rdbs_employee_id]: { status: 'success', message: 'Payment successful' }
        }));
        // Update employee status to paid
        await updateEmployeePaymentStatus(payrollId, employee.rdbs_employee_id, true);
        return true;
      } else {
        console.error("Mobile money payment failed:", response.data);
        setPaymentResults(prev => ({
          ...prev,
          [employee.rdbs_employee_id]: { status: 'failed', message: response.data.message || 'Payment failed' }
        }));
        return false;
      }
    } catch (error: any) {
      console.error('Error processing mobile money payment:', error);
      setPaymentResults(prev => ({
        ...prev,
        [employee.rdbs_employee_id]: { status: 'failed', message: error.response?.data?.message || 'Payment failed' }
      }));
      return false;
    } finally {
      setPayingEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(employee.rdbs_employee_id);
        return newSet;
      });
    }
  };

  // Pay all employees in a payroll
  const payAllEmployees = async (payroll: any) => {
    if (!payroll.rdbs_employees || payroll.rdbs_employees.length === 0) return;
    
    const unpaidEmployees = payroll.rdbs_employees.filter((emp: any) => !emp.rdbs_paid);
    
    // Initialize progress for all employees
    const initialProgress: Record<string, 'pending' | 'processing' | 'success' | 'failed'> = {};
    unpaidEmployees.forEach((emp: any) => {
      initialProgress[emp.rdbs_employee_id] = 'pending';
    });
    setPaymentProgress(initialProgress);
    
    // Close payment modal immediately
    setShowPaymentModal(false);
    setEmployeePaymentMethods({});
    
    for (let i = 0; i < unpaidEmployees.length; i++) {
      const employee = unpaidEmployees[i];
      const paymentMethod = employeePaymentMethods[employee.rdbs_employee_id];
      
      // Set current employee to processing
      setPaymentProgress(prev => ({
        ...prev,
        [employee.rdbs_employee_id]: 'processing'
      }));
      
      try {
        if (paymentMethod === "bank" && employee.rdbs_bank_account) {
          const result = await payEmployeeBank(employee, payroll._id);
          setPaymentProgress(prev => ({
            ...prev,
            [employee.rdbs_employee_id]: result ? 'success' : 'failed'
          }));
        } else if (paymentMethod === "mobile_money" && employee.rdbs_mobile_money) {
          const result = await payEmployeeMobileMoney(employee, payroll._id);
          setPaymentProgress(prev => ({
            ...prev,
            [employee.rdbs_employee_id]: result ? 'success' : 'failed'
          }));
        } else {
          setPaymentProgress(prev => ({
            ...prev,
            [employee.rdbs_employee_id]: 'failed'
          }));
        }
      } catch (error) {
        setPaymentProgress(prev => ({
          ...prev,
          [employee.rdbs_employee_id]: 'failed'
        }));
      }
      
      // Add a small delay between payments
      if (i < unpaidEmployees.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Clear progress after all payments are done
    setTimeout(() => {
      setPaymentProgress({});
    }, 5000);
  };

  // Update employee payment status
  const updateEmployeePaymentStatus = async (payrollId: string, employeeId: string, isPaid: boolean) => {
    if (!merchant_id) return;
    
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.patch(`${endpoint}/payroll/${payrollId}/employee/${employeeId}/payment`, {
        merchant_id: merchant_id,
        paid: isPaid
      });

      if (response.status === 200) {
        console.log("Employee payment status updated:", response.data);
        // Refresh payrolls to get updated data
        await fetchPayrolls();
      }
    } catch (error: any) {
      console.error('Error updating employee payment status:', error);
    }
  };

  // Change payroll status
  const changePayrollStatus = async (payrollId: string, newStatus: string) => {
    if (!merchant_id) return;
    
    try {
      setUpdatingStatus(payrollId);
      setError(null);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.patch(`${endpoint}/employees/payroll/${payrollId}/status`, {
        merchant_id: merchant_id,
        status: newStatus
      });

      if (response.status === 200) {
        console.log("Payroll status updated:", response.data);
        // Refresh payrolls to get updated data
        await fetchPayrolls();
      } else {
        setError('Failed to update payroll status');
      }
    } catch (error: any) {
      console.error('Error updating payroll status:', error);
      setError(error.response?.data?.message || 'Failed to update payroll status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Fetch payrolls when session is available
  useEffect(() => {
    if (status === 'authenticated' && merchant_id) {
      fetchPayrolls();
    }
  }, [status, merchant_id]);

  // Filter payrolls by status
  const filteredPayrolls = (Array.isArray(payrolls) ? payrolls : []).filter(p =>
    (statusFilter === "All" || p.rdbs_status === statusFilter)
  );

  // Payrolls for dropdown (filtered by status)
  const payrollNameOptions = (Array.isArray(payrolls) ? payrolls : [])
    .filter(p => statusFilter === "All" || p.rdbs_status === statusFilter)
    .map(p => ({ id: p._id, name: p.rdbs_payroll_month }));

  // Always show the selected payroll, even if not in the filtered list
  const selectedPayroll = (Array.isArray(payrolls) ? payrolls : []).find(p => p._id === selectedPayrollId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Payroll Management</h1>
              <p className="text-gray-600">Generate and manage employee payrolls</p>
            </div>
            <div className="flex gap-3">
              <Link href="/payroll/payslip">
                <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                  View Paid Payslips
                </Button>
              </Link>
              <Link href="/payroll/generate">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Generate Payroll
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {/* Filter Bar */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          {/* Status Toggle Buttons */}
          <div className="flex gap-2 mb-2">
            {statusOptions.map(opt => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(opt.value);
                  // If the selected payroll is not in the new filter, select the first payroll of that status
                  const filtered = payrolls.filter(p => p.status === opt.value);
                  if (!filtered.some(p => p.id === selectedPayrollId)) {
                    setSelectedPayrollId(filtered[0]?.id || "");
                  }
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs font-medium">Payroll Name:</label>
            <select
              value={selectedPayrollId}
              onChange={e => setSelectedPayrollId(e.target.value)}
              className="text-xs border rounded px-2 py-2 bg-white"
            >
              {payrollNameOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {/* Always show the selected payroll in the dropdown if not already present */}
              {selectedPayrollId && !payrollNameOptions.some(p => p.id === selectedPayrollId) && (
                <option value={selectedPayrollId}>
                  {payrolls.find(p => p.id === selectedPayrollId)?.name || selectedPayrollId}
                </option>
              )}
            </select>
          </div>
        </div>
        {/* Payroll Table */}
        <Card className="overflow-x-auto mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payroll Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    No payrolls found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayrolls.map(p => (
                  <TableRow key={p._id} className="hover:bg-gray-100 transition">
                    <TableCell>{p.rdbs_payroll_month}</TableCell>
                    <TableCell>{new Date(p.rdbs_created_at).toLocaleDateString()}</TableCell>
                    <TableCell>UGX {p.rdbs_total_net_salary?.toLocaleString() || '0'}</TableCell>
                    <TableCell>Monthly</TableCell>
                    <TableCell className="capitalize">Bank</TableCell>
                    <TableCell>{p._id}</TableCell>
                    <TableCell>
                      <span className={
                        p.rdbs_status === "paid"
                          ? "text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"
                          : p.rdbs_status === "approved"
                          ? "text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium"
                          : p.rdbs_status === "reviewed"
                          ? "text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs font-medium"
                          : p.rdbs_status === "draft"
                          ? "text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-medium"
                          : "text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"
                      }>
                        {p.rdbs_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPayrollId(p._id)}>View</Button>
                        
                        {/* View Payslips for paid payrolls */}
                        {p.rdbs_status === "paid" && (
                          <Link href={`/payroll/payslip?payrollId=${p._id}`}>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              View Payslips
                            </Button>
                          </Link>
                        )}
                        
                        {/* Status Change Buttons */}
                        {p.rdbs_status === "draft" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={() => changePayrollStatus(p._id, "reviewed")}
                            disabled={updatingStatus === p._id}
                          >
                            {updatingStatus === p._id ? "Updating..." : "Review"}
                          </Button>
                        )}
                        
                        {p.rdbs_status === "reviewed" && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => changePayrollStatus(p._id, "approved")}
                              disabled={updatingStatus === p._id}
                            >
                              {updatingStatus === p._id ? "Updating..." : "Approve"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => changePayrollStatus(p._id, "cancelled")}
                              disabled={updatingStatus === p._id}
                            >
                              {updatingStatus === p._id ? "Updating..." : "Reject"}
                            </Button>
                          </>
                        )}
                        
                        {p.rdbs_status === "approved" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-purple-600 border-purple-600 hover:bg-purple-50"
                            onClick={() => changePayrollStatus(p._id, "paid")}
                            disabled={updatingStatus === p._id}
                          >
                            {updatingStatus === p._id ? "Updating..." : "Mark Paid"}
                          </Button>
                        )}
                        
                        {(p.rdbs_status === "draft" || p.rdbs_status === "reviewed" || p.rdbs_status === "approved") && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => changePayrollStatus(p._id, "cancelled")}
                            disabled={updatingStatus === p._id}
                          >
                            {updatingStatus === p._id ? "Updating..." : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
        {/* Employees Table for Selected Payroll */}
        {selectedPayroll && (
          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedPayroll.rdbs_payroll_month} Employees</h3>
              {selectedPayroll.rdbs_status === "approved" && (
                <div className="flex gap-2">
                  <span className="text-sm text-gray-600">
                    Status: <span className="font-medium text-blue-600">{selectedPayroll.rdbs_status}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Pay All Employees
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      console.log("Selected payroll:", selectedPayroll);
                      console.log("Employees:", selectedPayroll.rdbs_employees);
                    }}
                  >
                    Debug Info
                  </Button>
                </div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  {selectedPayroll.rdbs_status === "approved" && (
                    <TableHead>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPayroll.rdbs_employees?.map((emp: any) => (
                  <TableRow key={emp.rdbs_employee_id}>
                    <TableCell>{emp.rdbs_employee_name}</TableCell>
                    <TableCell>UGX {emp.rdbs_basic_salary?.toLocaleString() || '0'}</TableCell>
                    <TableCell>UGX {emp.rdbs_gross_salary?.toLocaleString() || '0'}</TableCell>
                    <TableCell>UGX {emp.rdbs_net_salary?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="capitalize">{emp.rdbs_payment_method?.replace('_', ' ') || 'bank'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {/* Payment Progress Status */}
                        {paymentProgress[emp.rdbs_employee_id] && (
                          <>
                            {paymentProgress[emp.rdbs_employee_id] === 'pending' && (
                              <div className="flex items-center text-gray-500">
                                <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-1"></div>
                                <span className="text-xs">Pending</span>
                              </div>
                            )}
                            {paymentProgress[emp.rdbs_employee_id] === 'processing' && (
                              <div className="flex items-center text-blue-600">
                                <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-1"></div>
                                <span className="text-xs font-medium">Processing...</span>
                              </div>
                            )}
                            {paymentProgress[emp.rdbs_employee_id] === 'success' && (
                              <div className="flex items-center text-green-600">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium">Paid</span>
                              </div>
                            )}
                            {paymentProgress[emp.rdbs_employee_id] === 'failed' && (
                              <div className="flex items-center text-red-600">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium">Failed</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Regular Status (when no progress) */}
                        {!paymentProgress[emp.rdbs_employee_id] && (
                          <span className={
                            emp.rdbs_paid
                              ? "text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"
                              : "text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-xs font-medium"
                          }>
                            {emp.rdbs_paid ? 'Paid' : 'Pending'}
                          </span>
                        )}
                        
                        {/* Payment Status Indicator */}
                        {payingEmployees.has(emp.rdbs_employee_id) && (
                          <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                            Processing Payment...
                          </span>
                        )}
                        
                        {/* Payment Result */}
                        {paymentResults[emp.rdbs_employee_id] && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            paymentResults[emp.rdbs_employee_id].status === 'success'
                              ? 'text-green-600 bg-green-50'
                              : 'text-red-600 bg-red-50'
                          }`}>
                            {paymentResults[emp.rdbs_employee_id].status === 'success' ? '✓ Paid' : '✗ Failed'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {selectedPayroll.rdbs_status === "approved" && (
                      <TableCell>
                        {!emp.rdbs_paid && !payingEmployees.has(emp.rdbs_employee_id) ? (
                          <div className="flex gap-2">
                            {emp.rdbs_payment_method === "bank" && emp.rdbs_bank_account && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => payEmployeeBank(emp, selectedPayroll._id)}
                                disabled={payingEmployees.has(emp.rdbs_employee_id)}
                              >
                                Pay Bank
                              </Button>
                            )}
                            {emp.rdbs_payment_method === "mobile_money" && emp.rdbs_mobile_money && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                onClick={() => payEmployeeMobileMoney(emp, selectedPayroll._id)}
                                disabled={payingEmployees.has(emp.rdbs_employee_id)}
                              >
                                Pay Mobile
                              </Button>
                            )}
                            {(!emp.rdbs_payment_method || (!emp.rdbs_bank_account && !emp.rdbs_mobile_money)) && (
                              <span className="text-xs text-gray-500">No payment method</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {emp.rdbs_paid ? "Already paid" : "Processing..."}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>



      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]  flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select Payment Methods</h3>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Choose payment method for each unpaid employee in {selectedPayroll.rdbs_payroll_month}
              </p>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">Employees to be paid:</h4>
              <div className="space-y-4">
                {selectedPayroll.rdbs_employees
                  ?.filter((emp: any) => !emp.rdbs_paid)
                  .map((emp: any) => (
                    <div key={emp.rdbs_employee_id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{emp.rdbs_employee_name}</h5>
                          <p className="text-sm text-gray-600">UGX {emp.rdbs_net_salary?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`paymentMethod-${emp.rdbs_employee_id}`}
                            value="bank"
                            checked={employeePaymentMethods[emp.rdbs_employee_id] === 'bank'}
                            onChange={() => setEmployeePaymentMethods(prev => ({
                              ...prev,
                              [emp.rdbs_employee_id]: 'bank'
                            }))}
                            className="text-blue-600"
                            disabled={!emp.rdbs_bank_account}
                          />
                          <span className={`text-sm font-medium ${!emp.rdbs_bank_account ? 'text-gray-400' : ''}`}>
                            Bank Transfer
                            {emp.rdbs_bank_account && (
                              <span className="text-xs text-gray-500 ml-2">({emp.rdbs_bank_account})</span>
                            )}
                          </span>
                        </label>
                        
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`paymentMethod-${emp.rdbs_employee_id}`}
                            value="mobile_money"
                            checked={employeePaymentMethods[emp.rdbs_employee_id] === 'mobile_money'}
                            onChange={() => setEmployeePaymentMethods(prev => ({
                              ...prev,
                              [emp.rdbs_employee_id]: 'mobile_money'
                            }))}
                            className="text-blue-600"
                            disabled={!emp.rdbs_mobile_money}
                          />
                          <span className={`text-sm font-medium ${!emp.rdbs_mobile_money ? 'text-gray-400' : ''}`}>
                            Mobile Money
                            {emp.rdbs_mobile_money && (
                              <span className="text-xs text-gray-500 ml-2">({emp.rdbs_mobile_money})</span>
                            )}
                          </span>
                        </label>
                        
                        {!emp.rdbs_bank_account && !emp.rdbs_mobile_money && (
                          <p className="text-xs text-red-500 mt-2">No payment details available</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setEmployeePaymentMethods({});
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => payAllEmployees(selectedPayroll)}
                disabled={Object.keys(employeePaymentMethods).length === 0}
              >
                Pay All Employees
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 