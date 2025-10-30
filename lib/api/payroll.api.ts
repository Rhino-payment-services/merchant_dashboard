import apiClient from './client';

export interface PayrollEmployee {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phoneNumber: string;
  employeeNumber?: string;
  grossSalary: number;
  netSalary?: number;
  totalDeductions?: number;
  paymentMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER';
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phoneNumber: string;
  employeeNumber?: string;
  grossSalary: number;
  paymentMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER';
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

/**
 * Get all payroll employees
 */
export async function getPayrollEmployees(): Promise<PayrollEmployee[]> {
  try {
    const response = await apiClient.get('/payroll/employees');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payroll employees:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch employees');
  }
}

/**
 * Add a new payroll employee
 */
export async function addPayrollEmployee(data: CreateEmployeeDto): Promise<PayrollEmployee> {
  try {
    const response = await apiClient.post('/payroll/employees', data);
    return response.data;
  } catch (error: any) {
    console.error('Error adding payroll employee:', error);
    throw new Error(error.response?.data?.message || 'Failed to add employee');
  }
}

/**
 * Update payroll employee
 */
export async function updatePayrollEmployee(id: string, data: UpdateEmployeeDto): Promise<PayrollEmployee> {
  try {
    const response = await apiClient.patch(`/payroll/employees/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating payroll employee:', error);
    throw new Error(error.response?.data?.message || 'Failed to update employee');
  }
}

/**
 * Delete payroll employee
 */
export async function deletePayrollEmployee(id: string): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.delete(`/payroll/employees/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting payroll employee:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete employee');
  }
}

