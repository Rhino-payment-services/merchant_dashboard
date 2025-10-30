/**
 * Uganda Payroll Tax and Deduction Calculator
 * Based on Uganda Revenue Authority (URA) tax bands and NSSF regulations
 */

export interface SalaryBreakdown {
  grossSalary: number;
  nssf: number;
  taxableIncome: number;
  paye: number;
  totalDeductions: number;
  netSalary: number;
  breakdownDetails: {
    nssfEmployee: number;
    nssfEmployer: number;
    payeBands: {
      band: string;
      amount: number;
      rate: string;
    }[];
  };
}

/**
 * Calculate NSSF (National Social Security Fund) contribution
 * Employee contributes 5% of gross salary (capped at UGX 200,000)
 * Employer also contributes 10% (capped at UGX 400,000)
 */
export function calculateNSSF(grossSalary: number): { employee: number; employer: number } {
  const NSSF_EMPLOYEE_RATE = 0.05; // 5%
  const NSSF_EMPLOYER_RATE = 0.10; // 10%
  const NSSF_EMPLOYEE_CAP = 200000; // UGX 200,000 max
  const NSSF_EMPLOYER_CAP = 400000; // UGX 400,000 max

  const employeeContribution = Math.min(grossSalary * NSSF_EMPLOYEE_RATE, NSSF_EMPLOYEE_CAP);
  const employerContribution = Math.min(grossSalary * NSSF_EMPLOYER_RATE, NSSF_EMPLOYER_CAP);

  return {
    employee: Math.round(employeeContribution),
    employer: Math.round(employerContribution)
  };
}

/**
 * Calculate PAYE (Pay As You Earn) Tax
 * Uganda Tax Bands (2024):
 * - First UGX 235,000: 0%
 * - Next UGX 235,000 (235,001 - 470,000): 10%
 * - Next UGX 235,000 (470,001 - 705,000): 20%
 * - Above UGX 705,000: 30%
 */
export function calculatePAYE(taxableIncome: number): { amount: number; bands: Array<{ band: string; amount: number; rate: string }> } {
  const bands = [
    { limit: 235000, rate: 0.00, label: 'First UGX 235,000' },
    { limit: 235000, rate: 0.10, label: 'Next UGX 235,000' },
    { limit: 235000, rate: 0.20, label: 'Next UGX 235,000' },
    { limit: Infinity, rate: 0.30, label: 'Above UGX 705,000' }
  ];

  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const bandBreakdown: Array<{ band: string; amount: number; rate: string }> = [];

  for (const band of bands) {
    if (remainingIncome <= 0) break;

    const taxableInBand = Math.min(remainingIncome, band.limit);
    const taxForBand = taxableInBand * band.rate;

    if (taxableInBand > 0) {
      bandBreakdown.push({
        band: band.label,
        amount: Math.round(taxForBand),
        rate: `${(band.rate * 100).toFixed(0)}%`
      });
    }

    totalTax += taxForBand;
    remainingIncome -= taxableInBand;
  }

  return {
    amount: Math.round(totalTax),
    bands: bandBreakdown
  };
}

/**
 * Calculate complete salary breakdown
 * @param grossSalary - Employee's gross salary
 * @param additionalDeductions - Any additional deductions (loans, advances, etc.)
 */
export function calculateSalaryBreakdown(
  grossSalary: number,
  additionalDeductions: number = 0
): SalaryBreakdown {
  // Step 1: Calculate NSSF
  const nssf = calculateNSSF(grossSalary);
  
  // Step 2: Calculate taxable income (Gross - NSSF employee contribution)
  const taxableIncome = grossSalary - nssf.employee;
  
  // Step 3: Calculate PAYE on taxable income
  const paye = calculatePAYE(taxableIncome);
  
  // Step 4: Calculate total deductions
  const totalDeductions = nssf.employee + paye.amount + additionalDeductions;
  
  // Step 5: Calculate net salary
  const netSalary = grossSalary - totalDeductions;

  return {
    grossSalary: Math.round(grossSalary),
    nssf: nssf.employee,
    taxableIncome: Math.round(taxableIncome),
    paye: paye.amount,
    totalDeductions: Math.round(totalDeductions),
    netSalary: Math.round(netSalary),
    breakdownDetails: {
      nssfEmployee: nssf.employee,
      nssfEmployer: nssf.employer,
      payeBands: paye.bands
    }
  };
}

/**
 * Format currency for display
 */
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get salary summary text
 */
export function getSalarySummary(breakdown: SalaryBreakdown): string {
  return `Gross: ${formatUGX(breakdown.grossSalary)} → Net: ${formatUGX(breakdown.netSalary)} (Deductions: ${formatUGX(breakdown.totalDeductions)})`;
}

