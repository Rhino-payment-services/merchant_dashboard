"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { mockPayrolls, mockEmployees } from "@/app/lib/mockData";
import { useUserProfile } from "../../UserProfileProvider";

interface PayslipData {
  employeeDetails: {
    name: string;
    employeeId: string;
    department: string;
    position: string;
    email: string;
  };
  payPeriod: {
    month: string;
    year: number;
    payDate: Date;
  };
  earnings: {
    basicSalary: number;
    allowances: {
      housing: number;
      transport: number;
      medical: number;
      meal: number;
      other: number;
    };
    overtime: number;
    bonuses: number;
    grossPay: number;
  };
  deductions: {
    tax: number;
    nssf: number;
    advances: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
  paymentMethod: string;
  paymentReference: string;
  leaveBalance: number;
  workingDays: number;
}

export default function PayslipPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { profile, loading: profileLoading } = useUserProfile();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState<string>("all");
  const searchParams = useSearchParams();
  const payrollIdFromQuery = searchParams?.get('payrollId');

  const merchant_id = session?.user?.merchantId;
  const merchantName = profile?.profile?.merchant_names || "RUKAPAY MERCHANT";

  // Fetch payrolls
  const fetchPayrolls = async () => {
    if (!merchant_id) return;
    
    try {
      setLoading(true);
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.get(`${endpoint}/employees/payroll`, {
        params: { merchantId: merchant_id }
      });

      if (response.status === 200) {
        let payrollsData = [];
        if (response.data && response.data.data && Array.isArray(response.data.data.payrolls)) {
          payrollsData = response.data.data.payrolls;
        } else if (Array.isArray(response.data)) {
          payrollsData = response.data;
        }
        setPayrolls(payrollsData);
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      // Use mock data as fallback
      setPayrolls(mockPayrolls);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    if (!merchant_id) return;
    
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.get(`${endpoint}/employees/employees`, {
        params: { merchantId: merchant_id }
      });

      if (response.status === 200) {
        let employeesData = [];
        if (response.data && response.data.data && Array.isArray(response.data.data.employees)) {
          employeesData = response.data.data.employees;
        } else if (Array.isArray(response.data)) {
          employeesData = response.data;
        }
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Use mock data as fallback
      setEmployees(mockEmployees);
    }
  };

  // Get all paid payslips from all payrolls
  const getPaidPayslips = () => {
    const paidPayslips: any[] = [];
    
    payrolls.forEach(payroll => {
      // Only process payrolls with status "paid"
      if (payroll.rdbs_status === "paid" && payroll.rdbs_employees && Array.isArray(payroll.rdbs_employees)) {
        payroll.rdbs_employees.forEach((emp: any) => {
          // Try to find employee in employees array, or use payroll data as fallback
          const employee = employees.find(e => e._id === emp.rdbs_employee_id) || {
            _id: emp.rdbs_employee_id,
            rdbs_name: emp.rdbs_employee_name,
            rdbs_email: emp.rdbs_employee_email || `${emp.rdbs_employee_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            rdbs_department: emp.rdbs_department || 'General',
            rdbs_job_title: emp.rdbs_job_title || 'Employee',
            rdbs_leave_balance: emp.rdbs_leave_balance || 0
          };
          
          paidPayslips.push({
            id: `${payroll._id}-${emp.rdbs_employee_id}`,
            payrollId: payroll._id,
            employeeId: emp.rdbs_employee_id,
            employeeName: emp.rdbs_employee_name,
            employeeEmail: employee.rdbs_email,
            checkAmount: emp.rdbs_net_salary,
            paymentDate: new Date(payroll.rdbs_paid_at || payroll.rdbs_created_at),
            payCycle: `${payroll.rdbs_payroll_month} ${payroll.rdbs_payroll_year}`,
            payroll: payroll,
            employee: employee,
            employeeData: emp
          });
        });
      }
    });
    
    return paidPayslips;
  };

  // Filter payslips based on search and selected payroll
  const getFilteredPayslips = () => {
    let payslips = getPaidPayslips();
    
    // Filter by selected payroll
    if (selectedPayroll !== "all") {
      payslips = payslips.filter(p => p.payrollId === selectedPayroll);
    }
    
    // Filter by search term
    if (searchTerm) {
      payslips = payslips.filter(p => 
        p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.payCycle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return payslips.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  };

  // Handle view payslip
  const handleViewPayslip = (payslip: any) => {
    // Navigate to detailed payslip view with payroll and employee data
    router.push(`/payroll/payslip/detail?payrollId=${payslip.payrollId}&employeeId=${payslip.employeeId}`);
  };

  useEffect(() => {
    if (status === 'authenticated' && merchant_id) {
      fetchPayrolls();
      fetchEmployees();
    }
  }, [status, merchant_id]);

  // Set selected payroll from query parameter
  useEffect(() => {
    if (payrollIdFromQuery) {
      setSelectedPayroll(payrollIdFromQuery);
    }
  }, [payrollIdFromQuery]);

  const filteredPayslips = getFilteredPayslips();
  const payrollOptions = payrolls.map(p => ({ id: p._id, name: p.rdbs_payroll_month }));

  // Debug logging
  console.log('Payrolls:', payrolls);
  console.log('Employees:', employees);
  console.log('Filtered Payslips:', filteredPayslips);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Paid Payslips</h2>
          <div className="flex gap-3">
            <Link href="/payroll">
              <Button variant="outline">Back to Payrolls</Button>
            </Link>
            <Link href="/payroll/generate">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Generate New Payroll
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Employees
              </label>
              <Input
                placeholder="Search by name, email, or pay cycle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Cycle
              </label>
              <select
                value={selectedPayroll}
                onChange={(e) => setSelectedPayroll(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="all">All Pay Cycles</option>
                {payrollOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Payslips Table */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Pay Cycle Records</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredPayslips.length} paid payslips
            </p>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading payslips...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <span>Pay Cycle</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Check Amount</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v4m-6 0v4a2 2 0 002 2h4a2 2 0 002-2v-4m-6 0v4a2 2 0 002 2h4a2 2 0 002-2v-4" />
                        </svg>
                        <span>Payment Date</span>
                      </div>
                    </TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-lg font-medium">No paid payslips found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayslips.map((payslip) => (
                      <TableRow key={payslip.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <input type="checkbox" className="rounded border-gray-300" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {payslip.employeeName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{payslip.employeeName}</div>
                              <div className="text-sm text-gray-500">{payslip.employeeEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          UGX {payslip.checkAmount?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell>
                          {payslip.paymentDate.toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal underline"
                            onClick={() => handleViewPayslip(payslip)}
                          >
                            View Payslip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 