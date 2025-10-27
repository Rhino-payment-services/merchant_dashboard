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
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PayrollEmployeesPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/employees', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch employees');

      const data = await response.json();
      setEmployees(data);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      // Mock data for development
      setEmployees([
        {
          id: '1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phoneNumber: '+256700123456',
          employeeNumber: 'EMP001',
          paymentMethod: 'MOBILE_MONEY',
          baseSalary: 2000000,
          employmentType: 'FULL_TIME'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          ...formData,
          baseSalary: Number(formData.baseSalary)
        })
      });

      if (!response.ok) throw new Error('Failed to add employee');

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
      const response = await fetch(`/api/payroll/employees/${selectedEmployee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          ...formData,
          baseSalary: Number(formData.baseSalary)
        })
      });

      if (!response.ok) throw new Error('Failed to update employee');

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
      const response = await fetch(`/api/payroll/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete employee');

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
  };

  const openEditDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || '',
      phoneNumber: employee.phoneNumber,
      employeeNumber: employee.employeeNumber,
      paymentMethod: employee.paymentMethod,
      baseSalary: employee.baseSalary.toString(),
      employmentType: employee.employmentType,
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
                        {employee.employmentType.replace('_', ' ').toLowerCase()}
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
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-green-600">
                          {formatCurrency(employee.baseSalary)}
                        </span>
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
                <label className="text-sm font-medium">Base Salary (UGX) *</label>
                <Input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({...formData, baseSalary: e.target.value})}
                  placeholder="2000000"
                  className="mt-1"
                />
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
