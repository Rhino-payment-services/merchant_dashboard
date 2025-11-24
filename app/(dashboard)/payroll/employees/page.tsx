"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PhoneNumberInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  Briefcase,
  DollarSign,
  Calculator,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { calculateSalaryBreakdown, formatUGX, SalaryBreakdown } from '@/lib/utils/salary-calculator';
import { 
  getPayrollEmployees, 
  addPayrollEmployee, 
  updatePayrollEmployee, 
  deletePayrollEmployee,
  PayrollEmployee 
} from '@/lib/api/payroll.api';

export default function PayrollEmployeesPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    employeeNumber: '',
    paymentMethod: 'MOBILE_MONEY',
    baseSalary: '',
    employmentType: 'FULL_TIME',
    // Bank details (optional)
    accountNumber: '',
    accountName: '',
    bankName: '',
  });

  // Salary breakdown state
  const [salaryBreakdown, setSalaryBreakdown] = useState<SalaryBreakdown | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate salary breakdown when gross salary changes
  useEffect(() => {
    if (formData.baseSalary && parseFloat(formData.baseSalary) > 0) {
      const breakdown = calculateSalaryBreakdown(parseFloat(formData.baseSalary));
      setSalaryBreakdown(breakdown);
    } else {
      setSalaryBreakdown(null);
    }
  }, [formData.baseSalary]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await getPayrollEmployees();
      setEmployees(data);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    setLoading(true);
    try {
      // Build clean payload without baseSalary - only send fields expected by backend
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber,
        employeeNumber: formData.employeeNumber || undefined,
        paymentMethod: formData.paymentMethod,
        grossSalary: Number(formData.baseSalary),
        employmentType: formData.employmentType,
      };

      // Add bank details only if payment method is BANK_TRANSFER
      if (formData.paymentMethod === 'BANK_TRANSFER') {
        if (formData.bankName) payload.bankName = formData.bankName;
        if (formData.accountNumber) payload.accountNumber = formData.accountNumber;
        if (formData.accountName) payload.accountName = formData.accountName;
      }

      await addPayrollEmployee(payload);

      toast.success('✅ Employee added successfully');
      setShowAddDialog(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      // Build clean payload without baseSalary - only send fields expected by backend
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber,
        employeeNumber: formData.employeeNumber || undefined,
        paymentMethod: formData.paymentMethod,
        grossSalary: Number(formData.baseSalary),
        employmentType: formData.employmentType,
      };

      // Add bank details only if payment method is BANK_TRANSFER
      if (formData.paymentMethod === 'BANK_TRANSFER') {
        if (formData.bankName) payload.bankName = formData.bankName;
        if (formData.accountNumber) payload.accountNumber = formData.accountNumber;
        if (formData.accountName) payload.accountName = formData.accountName;
      }

      await updatePayrollEmployee(selectedEmployee.id, payload);

      toast.success('✅ Employee updated successfully');
      setShowEditDialog(false);
      setSelectedEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    setLoading(true);
    try {
      await deletePayrollEmployee(employeeId);
      toast.success('✅ Employee deleted successfully');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      employeeNumber: '',
      paymentMethod: 'MOBILE_MONEY',
      baseSalary: '',
      employmentType: 'FULL_TIME',
      accountNumber: '',
      accountName: '',
      bankName: '',
    });
    setSalaryBreakdown(null);
    setShowBreakdown(false);
  };

  const openEditDialog = (employee: PayrollEmployee) => {
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || '',
      phoneNumber: employee.phoneNumber,
      employeeNumber: employee.employeeNumber || '',
      paymentMethod: employee.paymentMethod,
      baseSalary: (employee.grossSalary || (employee as any).baseSalary).toString(),
      employmentType: employee.employmentType || 'FULL_TIME',
      accountNumber: employee.accountNumber || '',
      accountName: employee.accountName || '',
      bankName: employee.bankName || '',
    });
    setShowEditDialog(true);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Employees</h1>
          <p className="text-gray-600 mt-2">
            Manage employees and their salary information
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Employees List */}
      <div className="grid gap-4">
        {employees.length === 0 ? (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  No Employees Added
                </h3>
                <p className="text-blue-800 mb-4">
                  Add your first employee to start managing payroll
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Employee
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {employee.employeeNumber}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {employee.employmentType?.replace('_', ' ')?.toLowerCase() || 'N/A'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      {employee.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{employee.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{employee.phoneNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span className="capitalize">
                          {employee.paymentMethod.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Gross: {formatUGX(employee.grossSalary || (employee as any).baseSalary || 0)}</span>
                            <span className="font-semibold text-green-600">
                              Net: {formatUGX(calculateSalaryBreakdown(employee.grossSalary || (employee as any).baseSalary || 0).netSalary)}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          <Calculator className="h-3 w-3 inline mr-1" />
                          NSSF: {formatUGX(calculateSalaryBreakdown(employee.grossSalary || (employee as any).baseSalary || 0).nssf)} • 
                          PAYE: {formatUGX(calculateSalaryBreakdown(employee.grossSalary || (employee as any).baseSalary || 0).paye)}
                        </div>
                      </div>
                    </div>

                    {employee.paymentMethod === 'BANK_TRANSFER' && employee.accountNumber && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <strong>Bank:</strong> {employee.bankName} • 
                        <strong> Account:</strong> {employee.accountNumber}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Enter employee details and salary information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Doe"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@company.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Optional - for business access</p>
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <PhoneNumberInput
                  value={formData.phoneNumber}
                  onChange={(value) => setFormData({...formData, phoneNumber: value})}
                  placeholder="700 123 456"
                  defaultCountry="ug"
                />
                <p className="text-xs text-gray-500 mt-1">Required - for salary payments</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Employee Number *</label>
                <Input
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData({...formData, employeeNumber: e.target.value})}
                  placeholder="EMP001"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gross Salary (UGX) *</label>
                <Input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({...formData, baseSalary: e.target.value})}
                  placeholder="2000000"
                  className="mt-1"
                />
                {salaryBreakdown && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">Salary Breakdown</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="h-6 px-2"
                      >
                        <Info className="w-4 h-4 mr-1" />
                        {showBreakdown ? 'Hide' : 'Details'}
                      </Button>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gross Salary:</span>
                        <span className="font-semibold text-gray-900">{formatUGX(salaryBreakdown.grossSalary)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>- NSSF (5%):</span>
                        <span>{formatUGX(salaryBreakdown.nssf)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>- PAYE Tax:</span>
                        <span>{formatUGX(salaryBreakdown.paye)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-blue-300">
                        <span className="font-semibold text-green-700">Net Salary:</span>
                        <span className="font-bold text-green-700">{formatUGX(salaryBreakdown.netSalary)}</span>
                      </div>
                    </div>

                    {showBreakdown && (
                      <div className="mt-3 pt-3 border-t border-blue-200 space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-gray-700">NSSF Breakdown:</span>
                          <div className="ml-2 space-y-1 text-gray-600">
                            <div>Employee: {formatUGX(salaryBreakdown.breakdownDetails.nssfEmployee)} (5%)</div>
                            <div>Employer: {formatUGX(salaryBreakdown.breakdownDetails.nssfEmployer)} (10%)</div>
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">PAYE Tax Bands:</span>
                          <div className="ml-2 space-y-1 text-gray-600">
                            {salaryBreakdown.breakdownDetails.payeBands.map((band, idx) => (
                              <div key={idx}>
                                {band.band}: {formatUGX(band.amount)} ({band.rate})
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Payment Method *</label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="WALLET">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Employment Type *</label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) => setFormData({...formData, employmentType: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="TEMPORARY">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.paymentMethod === 'BANK_TRANSFER' && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Bank Account Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Bank Name</label>
                    <Input
                      value={formData.bankName}
                      onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                      placeholder="Stanbic Bank"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Account Number</label>
                      <Input
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                        placeholder="1234567890"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Account Name</label>
                      <Input
                        value={formData.accountName}
                        onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddEmployee}
              disabled={loading || !formData.firstName || !formData.lastName || !formData.phoneNumber || !formData.baseSalary}
              className="bg-blue-600"
            >
              {loading ? 'Adding...' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog - Similar structure */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee details and salary information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Same form fields as Add Dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <PhoneNumberInput
                  value={formData.phoneNumber}
                  onChange={(value) => setFormData({...formData, phoneNumber: value})}
                  placeholder="700 123 456"
                  defaultCountry="ug"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Base Salary (UGX) *</label>
                <Input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({...formData, baseSalary: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method *</label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({...formData, paymentMethod: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="WALLET">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setSelectedEmployee(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEmployee}
              disabled={loading}
              className="bg-blue-600"
            >
              {loading ? 'Updating...' : 'Update Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
