"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserProfile } from "../../../UserProfileProvider";

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

export default function PayslipDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: profileLoading } = useUserProfile();
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPayslip, setGeneratingPayslip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payrollId = searchParams?.get('payrollId');
  const employeeId = searchParams?.get('employeeId');
  const merchant_id = session?.user?.merchantId;
  const merchantName = profile?.profile?.merchant_names || "RUKAPAY MERCHANT";

  // Generate payslip data
  const generatePayslipData = (payroll: any, employee: any): PayslipData => {
    const employeeData = payroll.rdbs_employees.find((emp: any) => emp.rdbs_employee_id === employee._id);
    
    if (!employeeData) {
      throw new Error('Employee not found in payroll');
    }

    const allowances = employeeData.rdbs_allowances || {
      rdbs_housing: 0,
      rdbs_transport: 0,
      rdbs_medical: 0,
      rdbs_meal: 0,
      rdbs_other: 0
    };

    const deductions = employeeData.rdbs_deductions || {
      rdbs_lunch: 0,
      rdbs_advances: 0,
      rdbs_fines: 0,
      rdbs_other: 0,
      rdbs_loan_repayment: 0
    };

    const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (val || 0), 0);
    const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (val || 0), 0);

    return {
      employeeDetails: {
        name: employee.rdbs_name,
        employeeId: employee.rdbs_employee_id,
        department: employee.rdbs_department,
        position: employee.rdbs_job_title,
        email: employee.rdbs_email
      },
      payPeriod: {
        month: payroll.rdbs_payroll_month,
        year: payroll.rdbs_payroll_year,
        payDate: new Date(payroll.rdbs_created_at)
      },
      earnings: {
        basicSalary: employeeData.rdbs_basic_salary || 0,
        allowances: {
          housing: allowances.rdbs_housing || 0,
          transport: allowances.rdbs_transport || 0,
          medical: allowances.rdbs_medical || 0,
          meal: allowances.rdbs_meal || 0,
          other: allowances.rdbs_other || 0
        },
        overtime: employeeData.rdbs_overtime || 0,
        bonuses: employeeData.rdbs_bonus || 0,
        grossPay: employeeData.rdbs_gross_salary || 0
      },
      deductions: {
        tax: employeeData.rdbs_paye || 0,
        nssf: employeeData.rdbs_nssf_employee || 0,
        advances: deductions.rdbs_advances || 0,
        otherDeductions: totalDeductions - (deductions.rdbs_advances || 0),
        totalDeductions: totalDeductions
      },
      netPay: employeeData.rdbs_net_salary || 0,
      paymentMethod: employeeData.rdbs_payment_method || 'bank',
      paymentReference: employeeData.rdbs_payment_reference || '',
      leaveBalance: employee.rdbs_leave_balance || 0,
      workingDays: 22 // Default working days per month
    };
  };

  // Fetch payslip data
  const fetchPayslipData = async () => {
    if (!merchant_id || !payrollId || !employeeId) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      
      // Fetch all payrolls and find the specific one
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
        
        // Find the specific payroll
        const payroll = payrollsData.find((p: any) => p._id === payrollId);
        
        if (payroll) {
          // Find the specific employee in the payroll
          const employeeData = payroll.rdbs_employees.find((emp: any) => emp.rdbs_employee_id === employeeId);
          
          if (employeeData) {
            // Create employee object from payroll data
            const employee = {
              _id: employeeData.rdbs_employee_id,
              rdbs_name: employeeData.rdbs_employee_name,
              rdbs_employee_id: employeeData.rdbs_employee_id,
              rdbs_department: employeeData.rdbs_department || 'General',
              rdbs_job_title: employeeData.rdbs_job_title || 'Employee',
              rdbs_email: employeeData.rdbs_employee_email || `${employeeData.rdbs_employee_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
              rdbs_leave_balance: employeeData.rdbs_leave_balance || 0
            };
            
            const payslip = generatePayslipData(payroll, employee);
            setPayslipData(payslip);
          } else {
            setError('Employee not found in payroll');
          }
        } else {
          setError('Payroll not found');
        }
      } else {
        setError('Failed to fetch payroll data');
      }
    } catch (error: any) {
      console.error('Error fetching payslip data:', error);
      setError(error.response?.data?.message || 'Failed to fetch payslip data');
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF payslip
  const generatePDF = async () => {
    if (!payslipData) return;
    
    try {
      setGeneratingPayslip(true);
      
      // For now, we'll create a simple HTML payslip that can be printed
      const payslipHTML = generatePayslipHTML(payslipData, merchantName);
      
      // Open in new window for printing
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(payslipHTML);
        newWindow.document.close();
        newWindow.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPayslip(false);
    }
  };

  // Generate payslip HTML
  const generatePayslipHTML = (data: PayslipData, merchantName: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${data.employeeDetails.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; color: #333; }
          .payslip-title { font-size: 18px; color: #666; margin-top: 10px; }
          .employee-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-section { flex: 1; }
          .info-section h3 { margin: 0 0 10px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .earnings-deductions { display: flex; gap: 30px; margin-bottom: 30px; }
          .section { flex: 1; }
          .section h3 { margin: 0 0 15px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .amount-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-row { border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; font-weight: bold; }
          .net-pay { background: #f0f8ff; padding: 15px; border-radius: 5px; text-align: center; }
          .net-pay h2 { margin: 0; color: #333; }
          .net-pay .amount { font-size: 24px; color: #2c5aa0; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${merchantName}</div>
          <div class="payslip-title">PAYSLIP</div>
          <div>Period: ${data.payPeriod.month} ${data.payPeriod.year}</div>
        </div>

        <div class="employee-info">
          <div class="info-section">
            <h3>Employee Information</h3>
            <div class="info-row">
              <span class="label">Name:</span>
              <span class="value">${data.employeeDetails.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Employee ID:</span>
              <span class="value">${data.employeeDetails.employeeId}</span>
            </div>
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${data.employeeDetails.department}</span>
            </div>
            <div class="info-row">
              <span class="label">Position:</span>
              <span class="value">${data.employeeDetails.position}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>Payment Details</h3>
            <div class="info-row">
              <span class="label">Payment Method:</span>
              <span class="value">${data.paymentMethod.toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Date:</span>
              <span class="value">${data.payPeriod.payDate.toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Reference:</span>
              <span class="value">${data.paymentReference || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Leave Balance:</span>
              <span class="value">${data.leaveBalance} days</span>
            </div>
          </div>
        </div>

        <div class="earnings-deductions">
          <div class="section">
            <h3>Earnings</h3>
            <div class="amount-row">
              <span class="label">Basic Salary:</span>
              <span class="value">UGX ${data.earnings.basicSalary.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Housing Allowance:</span>
              <span class="value">UGX ${data.earnings.allowances.housing.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Transport Allowance:</span>
              <span class="value">UGX ${data.earnings.allowances.transport.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Medical Allowance:</span>
              <span class="value">UGX ${data.earnings.allowances.medical.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Meal Allowance:</span>
              <span class="value">UGX ${data.earnings.allowances.meal.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Other Allowances:</span>
              <span class="value">UGX ${data.earnings.allowances.other.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Overtime:</span>
              <span class="value">UGX ${data.earnings.overtime.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Bonuses:</span>
              <span class="value">UGX ${data.earnings.bonuses.toLocaleString()}</span>
            </div>
            <div class="amount-row total-row">
              <span class="label">Gross Pay:</span>
              <span class="value">UGX ${data.earnings.grossPay.toLocaleString()}</span>
            </div>
          </div>

          <div class="section">
            <h3>Deductions</h3>
            <div class="amount-row">
              <span class="label">PAYE Tax:</span>
              <span class="value">UGX ${data.deductions.tax.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">NSSF:</span>
              <span class="value">UGX ${data.deductions.nssf.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Advances:</span>
              <span class="value">UGX ${data.deductions.advances.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span class="label">Other Deductions:</span>
              <span class="value">UGX ${data.deductions.otherDeductions.toLocaleString()}</span>
            </div>
            <div class="amount-row total-row">
              <span class="label">Total Deductions:</span>
              <span class="value">UGX ${data.deductions.totalDeductions.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="net-pay">
          <h2>NET PAY</h2>
          <div class="amount">UGX ${data.netPay.toLocaleString()}</div>
        </div>

        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is a computer generated payslip. No signature required.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Email payslip
  const emailPayslip = async () => {
    if (!payslipData || !employeeId || !payrollId) return;
    
    try {
      setGeneratingPayslip(true);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.post(`${endpoint}/payroll/payslip/email`, {
        merchantId: merchant_id,
        employeeId: employeeId,
        payrollId: payrollId,
        email: payslipData.employeeDetails.email
      });

      if (response.status === 200) {
        alert('Payslip sent successfully!');
      } else {
        alert('Failed to send payslip');
      }
    } catch (error) {
      console.error('Error sending payslip:', error);
      alert('Failed to send payslip');
    } finally {
      setGeneratingPayslip(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && merchant_id) {
      fetchPayslipData();
    }
  }, [status, merchant_id, payrollId, employeeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading payslip...</p>
        </div>
      </div>
    );
  }

  if (error || !payslipData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Payslip</h2>
            <p className="text-gray-600 mb-6">{error || 'Payslip not found'}</p>
            <Link href="/payroll/payslip">
              <Button>Back to Payslips</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Payslip Details</h2>
            <p className="text-gray-600">
              {payslipData.employeeDetails.name} - {payslipData.payPeriod.month} {payslipData.payPeriod.year}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/payroll/payslip">
              <Button variant="outline">Back to Payslips</Button>
            </Link>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={generatePDF}
              disabled={generatingPayslip}
            >
              {generatingPayslip ? 'Generating...' : 'Print PDF'}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={emailPayslip}
              disabled={generatingPayslip}
            >
              {generatingPayslip ? 'Sending...' : 'Email Payslip'}
            </Button>
          </div>
        </div>

        {/* Payslip Content */}
        <Card className="p-8">
          {/* Company Header */}
          <div className="text-center border-b-2 border-gray-300 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-800">{merchantName}</h1>
            <h2 className="text-xl text-gray-600 mt-2">PAYSLIP</h2>
            <p className="text-gray-500 mt-1">
              Period: {payslipData.payPeriod.month} {payslipData.payPeriod.year}
            </p>
          </div>

          {/* Employee and Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4">
                Employee Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Name:</span>
                  <span>{payslipData.employeeDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Employee ID:</span>
                  <span>{payslipData.employeeDetails.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Department:</span>
                  <span>{payslipData.employeeDetails.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Position:</span>
                  <span>{payslipData.employeeDetails.position}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4">
                Payment Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Payment Method:</span>
                  <span className="capitalize">{payslipData.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Payment Date:</span>
                  <span>{payslipData.payPeriod.payDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Reference:</span>
                  <span>{payslipData.paymentReference || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Leave Balance:</span>
                  <span>{payslipData.leaveBalance} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4">
                Earnings
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span>UGX {payslipData.earnings.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Housing Allowance:</span>
                  <span>UGX {payslipData.earnings.allowances.housing.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transport Allowance:</span>
                  <span>UGX {payslipData.earnings.allowances.transport.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medical Allowance:</span>
                  <span>UGX {payslipData.earnings.allowances.medical.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Meal Allowance:</span>
                  <span>UGX {payslipData.earnings.allowances.meal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Allowances:</span>
                  <span>UGX {payslipData.earnings.allowances.other.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime:</span>
                  <span>UGX {payslipData.earnings.overtime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonuses:</span>
                  <span>UGX {payslipData.earnings.bonuses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 font-semibold">
                  <span>Gross Pay:</span>
                  <span>UGX {payslipData.earnings.grossPay.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4">
                Deductions
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>PAYE Tax:</span>
                  <span>UGX {payslipData.deductions.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>NSSF:</span>
                  <span>UGX {payslipData.deductions.nssf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advances:</span>
                  <span>UGX {payslipData.deductions.advances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Deductions:</span>
                  <span>UGX {payslipData.deductions.otherDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 font-semibold">
                  <span>Total Deductions:</span>
                  <span>UGX {payslipData.deductions.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-blue-50 p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">NET PAY</h2>
            <div className="text-4xl font-bold text-blue-600">
              UGX {payslipData.netPay.toLocaleString()}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm mt-8 pt-6 border-t border-gray-200">
            <p>This is a computer generated payslip. No signature required.</p>
            <p className="mt-1">Generated on: {new Date().toLocaleString()}</p>
          </div>
        </Card>
      </div>
    </div>
  );
} 