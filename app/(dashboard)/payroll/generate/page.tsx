"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import axios from "axios";
import { useSession } from "next-auth/react";

const paymentMethods = [
  { value: "bank", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
];

const months = [
  { value: "January", label: "January" },
  { value: "February", label: "February" },
  { value: "March", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "May" },
  { value: "June", label: "June" },
  { value: "July", label: "July" },
  { value: "August", label: "August" },
  { value: "September", label: "September" },
  { value: "October", label: "October" },
  { value: "November", label: "November" },
  { value: "December", label: "December" },
];

export default function GeneratePayrollPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPayroll, setCreatedPayroll] = useState<any>(null);

  const merchant_id = session?.user?.merchantId;

  const [payrollData, setPayrollData] = useState({
    // Payroll period
    rdbs_period: "",
    rdbs_payroll_month: "",
    rdbs_payroll_year: new Date().getFullYear(),
    
    // Payroll employees
    rdbs_employees: [] as any[],
    
    // Notes
    rdbs_notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 1, title: "Payroll Period", description: "Select payroll month and year" },
    { id: 2, title: "Select Employees", description: "Choose employees for this payroll" },
    { id: 3, title: "Salary Details", description: "Configure salary, allowances, and deductions" },
    { id: 4, title: "Review & Generate", description: "Review and generate payroll" },
  ];

  // Fetch employees for selection
  const fetchEmployees = async () => {
    if (!merchant_id) return;
    
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.get(`${endpoint}/employees/employees`, {
        params: {
          merchantId: merchant_id
        }
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
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && merchant_id) {
      fetchEmployees();
    }
  }, [status, merchant_id]);

  const handleInputChange = (field: string, value: any) => {
    setPayrollData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Payroll Period
        if (!payrollData.rdbs_payroll_month) newErrors.rdbs_payroll_month = "Month is required";
        if (!payrollData.rdbs_payroll_year) newErrors.rdbs_payroll_year = "Year is required";
        break;
      case 2: // Select Employees
        if (selectedEmployees.length === 0) newErrors.employees = "At least one employee must be selected";
        break;
      case 3: // Salary Details
        if (payrollData.rdbs_employees.length === 0) newErrors.employees = "Employee salary details are required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        // Prepare employee data for step 3
        const employeeData = selectedEmployees.map(empId => {
          const employee = employees.find(emp => emp._id === empId);
          return {
            rdbs_employee_id: empId,
            rdbs_employee_name: employee?.rdbs_name || '',
            rdbs_employee_phone: employee?.rdbs_phone || '',
            rdbs_basic_salary: employee?.rdbs_salary || 0,
            rdbs_gross_salary: employee?.rdbs_salary || 0,
            rdbs_allowances: {
              rdbs_housing: 0,
              rdbs_transport: 0,
              rdbs_medical: 0,
              rdbs_meal: 0,
              rdbs_other: 0
            },
            rdbs_deductions: {
              rdbs_lunch: 0,
              rdbs_advances: 0,
              rdbs_fines: 0,
              rdbs_other: 0,
              rdbs_loan_repayment: 0
            },
            rdbs_bonus: 0,
            rdbs_incentives: 0,
            rdbs_overtime: 0,
            rdbs_paye: 0,
            rdbs_nssf_employee: 0,
            rdbs_nssf_employer: 0,
            rdbs_net_salary: employee?.rdbs_salary || 0,
            rdbs_payment_method: 'bank',
            rdbs_bank_name: employee?.rdbs_bank_name || '',
            rdbs_bank_account: employee?.rdbs_bank_account || '',
            rdbs_mobile_money: employee?.rdbs_phone || '',
            rdbs_paid: false,
            rdbs_payment_date: null,
            rdbs_payment_reference: ''
          };
        });
        setPayrollData(prev => ({ ...prev, rdbs_employees: employeeData }));
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      setErrors({});
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const updateEmployeeSalary = (employeeId: string, field: string, value: number) => {
    setPayrollData(prev => ({
      ...prev,
      rdbs_employees: prev.rdbs_employees.map(emp => {
        if (emp.rdbs_employee_id === employeeId) {
          const updated = { ...emp };
          
          if (field.startsWith('allowances.')) {
            const allowanceField = field.split('.')[1];
            updated.rdbs_allowances = { ...updated.rdbs_allowances, [allowanceField]: value };
          } else if (field.startsWith('deductions.')) {
            const deductionField = field.split('.')[1];
            updated.rdbs_deductions = { ...updated.rdbs_deductions, [deductionField]: value };
          } else {
            updated[field] = value;
          }

          // Recalculate gross and net salary
          const allowances = Object.values(updated.rdbs_allowances).reduce((sum: number, val: any) => sum + (val || 0), 0);
          const deductions = Object.values(updated.rdbs_deductions).reduce((sum: number, val: any) => sum + (val || 0), 0);
          const bonus = updated.rdbs_bonus || 0;
          const incentives = updated.rdbs_incentives || 0;
          const overtime = updated.rdbs_overtime || 0;
          const paye = updated.rdbs_paye || 0;
          const nssfEmployee = updated.rdbs_nssf_employee || 0;

          updated.rdbs_gross_salary = updated.rdbs_basic_salary + allowances + bonus + incentives + overtime;
          updated.rdbs_net_salary = updated.rdbs_gross_salary - deductions - paye - nssfEmployee;

          return updated;
        }
        return emp;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      
      // Calculate totals
      const totals = payrollData.rdbs_employees.reduce((acc, emp) => ({
        totalEmployees: acc.totalEmployees + 1,
        totalGrossSalary: acc.totalGrossSalary + (emp.rdbs_gross_salary || 0),
        totalDeductions: acc.totalDeductions + Object.values(emp.rdbs_deductions).reduce((sum: number, val: any) => sum + (val || 0), 0),
        totalAllowances: acc.totalAllowances + Object.values(emp.rdbs_allowances).reduce((sum: number, val: any) => sum + (val || 0), 0),
        totalBonus: acc.totalBonus + (emp.rdbs_bonus || 0),
        totalPaye: acc.totalPaye + (emp.rdbs_paye || 0),
        totalNssfEmployee: acc.totalNssfEmployee + (emp.rdbs_nssf_employee || 0),
        totalNssfEmployer: acc.totalNssfEmployer + (emp.rdbs_nssf_employer || 0),
        totalNetSalary: acc.totalNetSalary + (emp.rdbs_net_salary || 0),
        totalCostToEmployer: acc.totalCostToEmployer + (emp.rdbs_gross_salary || 0) + (emp.rdbs_nssf_employer || 0)
      }), {
        totalEmployees: 0,
        totalGrossSalary: 0,
        totalDeductions: 0,
        totalAllowances: 0,
        totalBonus: 0,
        totalPaye: 0,
        totalNssfEmployee: 0,
        totalNssfEmployer: 0,
        totalNetSalary: 0,
        totalCostToEmployer: 0
      });

      const payrollPayload = {
        ...payrollData,
        rdbs_period: `${payrollData.rdbs_payroll_year}-${String(months.findIndex(m => m.value === payrollData.rdbs_payroll_month) + 1).padStart(2, '0')}`,
        rdbs_total_employees: totals.totalEmployees,
        rdbs_total_gross_salary: totals.totalGrossSalary,
        rdbs_total_deductions: totals.totalDeductions,
        rdbs_total_allowances: totals.totalAllowances,
        rdbs_total_bonus: totals.totalBonus,
        rdbs_total_paye: totals.totalPaye,
        rdbs_total_nssf_employee: totals.totalNssfEmployee,
        rdbs_total_nssf_employer: totals.totalNssfEmployer,
        rdbs_total_net_salary: totals.totalNetSalary,
        rdbs_total_cost_to_employer: totals.totalCostToEmployer,
        rdbs_status: 'draft',
        merchant_id: merchant_id
      };

      const response = await axios.post(`${endpoint}/employees/payroll`, payrollPayload);

      if (response.status === 200) {
        console.log("Payroll created:", response.data);
        setCreatedPayroll(response.data.data.payroll);
        setShowSuccessModal(true);
      } else {
        alert(`Error creating payroll: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error creating payroll:', error);
      alert('Error creating payroll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalOK = () => {
    setShowSuccessModal(false);
    setCreatedPayroll(null);
    router.push('/payroll');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Generate Payroll</h2>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Payrolls
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-sm text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Payroll Period */}
          {currentStep === 1 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">Payroll Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Month *</label>
                  <select
                    value={payrollData.rdbs_payroll_month}
                    onChange={(e) => handleInputChange("rdbs_payroll_month", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select Month</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  {errors.rdbs_payroll_month && <p className="text-red-500 text-xs mt-1">{errors.rdbs_payroll_month}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Year *</label>
                  <Input
                    type="number"
                    value={payrollData.rdbs_payroll_year}
                    onChange={(e) => handleInputChange("rdbs_payroll_year", parseInt(e.target.value))}
                    min={2020}
                    max={2030}
                    className={errors.rdbs_payroll_year ? "border-red-500" : ""}
                  />
                  {errors.rdbs_payroll_year && <p className="text-red-500 text-xs mt-1">{errors.rdbs_payroll_year}</p>}
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Select Employees */}
          {currentStep === 2 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">Select Employees</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">Select employees to include in this payroll:</p>
                {errors.employees && <p className="text-red-500 text-xs mb-2">{errors.employees}</p>}
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {employees.map(emp => (
                  <div key={emp._id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={emp._id}
                      checked={selectedEmployees.includes(emp._id)}
                      onChange={(e) => handleEmployeeSelection(emp._id, e.target.checked)}
                      className="mr-3"
                    />
                    <label htmlFor={emp._id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{emp.rdbs_name}</div>
                      <div className="text-sm text-gray-600">
                        {emp.rdbs_job_title} • {emp.rdbs_department} • UGX {emp.rdbs_salary?.toLocaleString() || '0'}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Step 3: Salary Details */}
          {currentStep === 3 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-600">Salary Details</h3>
              <div className="space-y-6">
                {payrollData.rdbs_employees.map((emp, index) => (
                  <div key={emp.rdbs_employee_id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{emp.rdbs_employee_name}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Basic Salary */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Basic Salary</label>
                        <Input
                          type="number"
                          value={emp.rdbs_basic_salary}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'rdbs_basic_salary', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      {/* Allowances */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Housing Allowance</label>
                        <Input
                          type="number"
                          value={emp.rdbs_allowances.rdbs_housing}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'allowances.rdbs_housing', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Transport Allowance</label>
                        <Input
                          type="number"
                          value={emp.rdbs_allowances.rdbs_transport}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'allowances.rdbs_transport', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Medical Allowance</label>
                        <Input
                          type="number"
                          value={emp.rdbs_allowances.rdbs_medical}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'allowances.rdbs_medical', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      {/* Deductions */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Lunch Deduction</label>
                        <Input
                          type="number"
                          value={emp.rdbs_deductions.rdbs_lunch}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'deductions.rdbs_lunch', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Advances</label>
                        <Input
                          type="number"
                          value={emp.rdbs_deductions.rdbs_advances}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'deductions.rdbs_advances', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">PAYE</label>
                        <Input
                          type="number"
                          value={emp.rdbs_paye}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'rdbs_paye', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">NSSF Employee</label>
                        <Input
                          type="number"
                          value={emp.rdbs_nssf_employee}
                          onChange={(e) => updateEmployeeSalary(emp.rdbs_employee_id, 'rdbs_nssf_employee', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Method</label>
                        <select
                          value={emp.rdbs_payment_method}
                          onChange={(e:any) => updateEmployeeSalary(emp.rdbs_employee_id, 'rdbs_payment_method', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          {paymentMethods.map(method => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Gross Salary:</span>
                          <div className="text-green-600">UGX {emp.rdbs_gross_salary?.toLocaleString() || '0'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Total Deductions:</span>
                          <div className="text-red-600">UGX {Object.values(emp.rdbs_deductions).reduce((sum: number, val: any) => sum + (val || 0), 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="font-medium">Net Salary:</span>
                          <div className="text-blue-600 font-semibold">UGX {emp.rdbs_net_salary?.toLocaleString() || '0'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Step 4: Review & Generate */}
          {currentStep === 4 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-600">Review & Generate</h3>
              
              {/* Payroll Summary */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Payroll Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Period</div>
                    <div className="font-semibold">{payrollData.rdbs_payroll_month} {payrollData.rdbs_payroll_year}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Employees</div>
                    <div className="font-semibold">{payrollData.rdbs_employees.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Gross</div>
                    <div className="font-semibold text-green-600">
                      UGX {payrollData.rdbs_employees.reduce((sum, emp) => sum + (emp.rdbs_gross_salary || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Net</div>
                    <div className="font-semibold text-blue-600">
                      UGX {payrollData.rdbs_employees.reduce((sum, emp) => sum + (emp.rdbs_net_salary || 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee List */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Employee Details</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Payment Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.rdbs_employees.map((emp) => (
                        <TableRow key={emp.rdbs_employee_id}>
                          <TableCell>{emp.rdbs_employee_name}</TableCell>
                          <TableCell>UGX {emp.rdbs_basic_salary?.toLocaleString() || '0'}</TableCell>
                          <TableCell>UGX {emp.rdbs_gross_salary?.toLocaleString() || '0'}</TableCell>
                          <TableCell>UGX {Object.values(emp.rdbs_deductions).reduce((sum: number, val: any) => sum + (val || 0), 0).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">UGX {emp.rdbs_net_salary?.toLocaleString() || '0'}</TableCell>
                          <TableCell className="capitalize">{emp.rdbs_payment_method}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={payrollData.rdbs_notes}
                  onChange={(e) => handleInputChange("rdbs_notes", e.target.value)}
                  placeholder="Add any notes about this payroll..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex justify-between gap-4 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            
            <div className="flex gap-4">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
              
              {currentStep < steps.length ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? "Generating..." : "Generate Payroll"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Generating Payroll...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we process the payroll</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payroll Generated Successfully!</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Payroll ID:</span> {createdPayroll._id}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Period:</span> {createdPayroll.rdbs_payroll_month} {createdPayroll.rdbs_payroll_year}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Employees:</span> {createdPayroll.rdbs_total_employees}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Total Gross Salary:</span> UGX {createdPayroll.rdbs_total_gross_salary?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Total Net Salary:</span> UGX {createdPayroll.rdbs_total_net_salary?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Status:</span> <span className="capitalize">{createdPayroll.rdbs_status}</span>
                </p>
              </div>
              <Button 
                onClick={handleSuccessModalOK}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 