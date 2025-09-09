export const users = [
  { userId: 'u001', name: 'Alice Johnson', phoneNumber: '+256712345678', pin: '12345' },
  { userId: 'u002', name: 'Bob Smith', phoneNumber: '+256701234567', pin: '54321' },
  { userId: 'u003', name: 'Charlie Brown', phoneNumber: '+254712345678', pin: '11111' },
  { userId: 'u004', name: 'Diana Prince', phoneNumber: '+255712345678', pin: '22222' },
  { userId: 'u005', name: 'Ethan Hunt', phoneNumber: '+250712345678', pin: '33333' },
];

export const DEFAULT_OTP = '99999';

// Mock payroll data for testing
export const mockPayrolls = [
  {
    _id: 'payroll-001',
    rdbs_payroll_month: 'January 2024',
    rdbs_payroll_year: 2024,
    rdbs_created_at: '2024-01-31T00:00:00.000Z',
    rdbs_total_net_salary: 14586000,
    rdbs_status: 'paid',
    rdbs_employees: [
      {
        rdbs_employee_id: 'emp-001',
        rdbs_employee_name: 'Jamie Croquetas',
        rdbs_net_salary: 14586000,
        rdbs_paid: true,
        rdbs_payment_method: 'bank',
        rdbs_basic_salary: 12000000,
        rdbs_gross_salary: 15000000,
        rdbs_paye: 2000000,
        rdbs_nssf_employee: 1000000,
        rdbs_overtime: 500000,
        rdbs_bonus: 0,
        rdbs_allowances: {
          rdbs_housing: 1000000,
          rdbs_transport: 500000,
          rdbs_medical: 300000,
          rdbs_meal: 200000,
          rdbs_other: 0
        },
        rdbs_deductions: {
          rdbs_lunch: 0,
          rdbs_advances: 0,
          rdbs_fines: 0,
          rdbs_other: 0,
          rdbs_loan_repayment: 0
        }
      }
    ]
  },
  {
    _id: 'payroll-002',
    rdbs_payroll_month: 'February 2024',
    rdbs_payroll_year: 2024,
    rdbs_created_at: '2024-02-29T00:00:00.000Z',
    rdbs_total_net_salary: 19586000,
    rdbs_status: 'paid',
    rdbs_employees: [
      {
        rdbs_employee_id: 'emp-002',
        rdbs_employee_name: 'Iyamiris Cel Santander',
        rdbs_net_salary: 19586000,
        rdbs_paid: true,
        rdbs_payment_method: 'mobile_money',
        rdbs_basic_salary: 15000000,
        rdbs_gross_salary: 20000000,
        rdbs_paye: 2500000,
        rdbs_nssf_employee: 1200000,
        rdbs_overtime: 800000,
        rdbs_bonus: 0,
        rdbs_allowances: {
          rdbs_housing: 1200000,
          rdbs_transport: 600000,
          rdbs_medical: 400000,
          rdbs_meal: 300000,
          rdbs_other: 0
        },
        rdbs_deductions: {
          rdbs_lunch: 0,
          rdbs_advances: 0,
          rdbs_fines: 0,
          rdbs_other: 0,
          rdbs_loan_repayment: 0
        }
      }
    ]
  },
  {
    _id: 'payroll-003',
    rdbs_payroll_month: 'March 2024',
    rdbs_payroll_year: 2024,
    rdbs_created_at: '2024-03-31T00:00:00.000Z',
    rdbs_total_net_salary: 24000000,
    rdbs_status: 'paid',
    rdbs_employees: [
      {
        rdbs_employee_id: 'emp-003',
        rdbs_employee_name: 'Iver Make Up',
        rdbs_net_salary: 24000000,
        rdbs_paid: true,
        rdbs_payment_method: 'bank',
        rdbs_basic_salary: 18000000,
        rdbs_gross_salary: 25000000,
        rdbs_paye: 3000000,
        rdbs_nssf_employee: 1500000,
        rdbs_overtime: 1000000,
        rdbs_bonus: 0,
        rdbs_allowances: {
          rdbs_housing: 1500000,
          rdbs_transport: 800000,
          rdbs_medical: 500000,
          rdbs_meal: 400000,
          rdbs_other: 0
        },
        rdbs_deductions: {
          rdbs_lunch: 0,
          rdbs_advances: 0,
          rdbs_fines: 0,
          rdbs_other: 0,
          rdbs_loan_repayment: 0
        }
      }
    ]
  }
];

export const mockEmployees = [
  {
    _id: 'emp-001',
    rdbs_name: 'Jamie Croquetas',
    rdbs_employee_id: 'EMP001',
    rdbs_department: 'Engineering',
    rdbs_job_title: 'Senior Developer',
    rdbs_email: 'jamie@example.com',
    rdbs_leave_balance: 15
  },
  {
    _id: 'emp-002',
    rdbs_name: 'Iyamiris Cel Santander',
    rdbs_employee_id: 'EMP002',
    rdbs_department: 'Marketing',
    rdbs_job_title: 'Marketing Manager',
    rdbs_email: 'lyamiris@example.com',
    rdbs_leave_balance: 12
  },
  {
    _id: 'emp-003',
    rdbs_name: 'Iver Make Up',
    rdbs_employee_id: 'EMP003',
    rdbs_department: 'Sales',
    rdbs_job_title: 'Sales Representative',
    rdbs_email: 'iver@example.com',
    rdbs_leave_balance: 18
  }
]; 