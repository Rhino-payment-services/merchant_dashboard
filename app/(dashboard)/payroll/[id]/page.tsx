"use client"
import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

// Mock payroll data for demonstration
const initialPayrollEmployees = [
  { id: "EMP-001", name: "John Doe", salary: 2000, deduction: 100, addition: 50, status: "Unpaid" },
  { id: "EMP-002", name: "Jane Smith", salary: 1800, deduction: 80, addition: 0, status: "Unpaid" },
  { id: "EMP-003", name: "Alice Brown", salary: 2200, deduction: 120, addition: 100, status: "Unpaid" },
];

type StatusType = "Unpaid" | "Pending" | "Paid";
const statusColor: Record<StatusType, string> = {
  Unpaid: "text-red-600 bg-red-50",
  Pending: "text-yellow-700 bg-yellow-50",
  Paid: "text-green-600 bg-green-50",
};

export default function PayrollDetailsPage() {
  const params = useParams();
  const payrollId = params?.id;
  const [employees, setEmployees] = useState(initialPayrollEmployees);
  const [paying, setPaying] = useState(false);

  const handlePayAll = async () => {
    setPaying(true);
    for (let i = 0; i < employees.length; i++) {
      setEmployees(prev =>
        prev.map((emp, idx) =>
          idx === i ? { ...emp, status: "Pending" } : emp
        )
      );
      await new Promise(res => setTimeout(res, 1500));
      setEmployees(prev =>
        prev.map((emp, idx) =>
          idx === i ? { ...emp, status: "Paid" } : emp
        )
      );
    }
    setPaying(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">Payroll Details: {payrollId}</h2>
        </div>
        <Card className="overflow-x-auto mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Deduction</TableHead>
                <TableHead>Addition</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    No employees found in this payroll.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-gray-100 transition">
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>UGX {emp.salary.toLocaleString()}</TableCell>
                    <TableCell>UGX {emp.deduction.toLocaleString()}</TableCell>
                    <TableCell>UGX {emp.addition.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">UGX {(emp.salary - emp.deduction + emp.addition).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[emp.status as StatusType]}`}>{emp.status}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handlePayAll} disabled={paying}>
            {paying ? "Paying..." : "Pay All Employees"}
          </Button>
        </div>
      </div>
    </div>
  );
}