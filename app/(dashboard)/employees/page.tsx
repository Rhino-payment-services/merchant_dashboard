"use client"
import React, { useState, useEffect } from "react";
import { Card } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import Link from "next/link";
import axios from "axios";
import { useSession } from "next-auth/react";



export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<any>(null);

  const merchant_id = session?.user?.merchantId;

  // Fetch employees from API
  const fetchEmployees = async () => {
    if (!merchant_id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:7600';
      const response = await axios.get(`${endpoint}/employees/employees`, {
        params: {
          merchantId: merchant_id
        }
      });

      if (response.status === 200) {
        console.log("Employees fetched:", response.data);
        
        // Handle the specific API response structure
        let employeesData = [];
        let paginationData = null;
        
        if (response.data && response.data.data && Array.isArray(response.data.data.employees)) {
          employeesData = response.data.data.employees;
          paginationData = response.data.data.pagination;
          console.log("Employees data:", employeesData);
          console.log("Pagination data:", paginationData);
        } else if (Array.isArray(response.data)) {
          employeesData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          employeesData = response.data.data;
        } else if (response.data && Array.isArray(response.data.employees)) {
          employeesData = response.data.employees;
        } else if (response.data && Array.isArray(response.data.result)) {
          employeesData = response.data.result;
        } else {
          console.warn("Unexpected response structure:", response.data);
          employeesData = [];
        }
        
        setEmployees(employeesData);
        setPagination(paginationData);
      } else {
        setError('Failed to fetch employees');
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setError(error.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees when session is available
  useEffect(() => {
    if (status === 'authenticated' && merchant_id) {
      fetchEmployees();
    }
  }, [status, merchant_id]);

  // Filter employees based on search
  const filtered = (Array.isArray(employees) ? employees : []).filter(
    emp =>
      emp.rdbs_employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      emp.rdbs_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.rdbs_email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.rdbs_job_title?.toLowerCase().includes(search.toLowerCase()) ||
      emp.rdbs_department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold">All Employees</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="Search by name, email, role, or department..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />
            <Link href="/employees/create">
              <Button>Add Employee</Button>
            </Link>
          </div>
        </div>
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-400">
                    {error}
                    <div className="mt-2">
                      <Button size="sm" onClick={fetchEmployees} variant="outline">
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    {search ? 'No employees found matching your search.' : 'No employees found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(emp => (
                  <TableRow key={emp._id || emp.rdbs_employee_id} className="hover:bg-gray-100 transition">
                    <TableCell className="font-mono text-xs">{emp.rdbs_employee_id}</TableCell>
                    <TableCell>{emp.rdbs_name}</TableCell>
                    <TableCell>{emp.rdbs_email || 'N/A'}</TableCell>
                    <TableCell>{emp.rdbs_phone}</TableCell>
                    <TableCell>{emp.rdbs_job_title}</TableCell>
                    <TableCell>{emp.rdbs_department}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        emp.rdbs_is_active ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                      }`}>
                        {emp.rdbs_is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
        
        {/* Pagination Info */}
        {pagination && (
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              Showing page {pagination.currentPage} of {pagination.totalPages} 
              ({pagination.totalEmployees} total employees)
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 