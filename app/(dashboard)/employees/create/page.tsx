"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import axios from "axios";
import { useSession } from "next-auth/react";


const employmentTypes = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

const salaryScales = [
  { value: "standard", label: "Standard" },
  { value: "senior", label: "Senior" },
  { value: "executive", label: "Executive" },
  { value: "entry", label: "Entry Level" },
];

export default function CreateEmployeePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    rdbs_name: "",
    rdbs_nid: "",
    rdbs_phone: "",
    rdbs_email: "",
    rdbs_nok: "",
    rdbs_city: "",
    rdbs_address: "",
    
    // Employment Details
    rdbs_job_title: "",
    rdbs_department: "",
    rdbs_reports_to: "",
    rdbs_employment_type: "full_time",
    rdbs_hire_date: "",
    rdbs_employee_id: "",
    rdbs_contract_end_date: "",
    rdbs_probation_end_date: "",
    
    // Salary and Compensation
    rdbs_salary: "",
    rdbs_salary_scale: "standard",
    rdbs_bonus_percentage: "0",
    
    // Bank Details
    rdbs_bank_name: "",
    rdbs_bank_account: "",
    rdbs_bank_account_name: "",
    
    // Tax and Insurance
    rdbs_tax_id: "",
    rdbs_insurance_number: "",
    rdbs_nssf_number: "",
    
    // Emergency Contact
    rdbs_emergency_contact: "",
    rdbs_emergency_phone: "",
    
    // Education and Skills
    rdbs_education: "",
    rdbs_skills: "",
    rdbs_work_experience: "",
    
    // Performance and Leave
    rdbs_leave_balance: "21",
    rdbs_performance_rating: "3",
    rdbs_last_performance_review: "",
    
    // Additional Information
    rdbs_target: "",
    rdbs_notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<any>(null);

  const steps = [
    { id: 1, title: "Basic Information", description: "Personal details and contact information" },
    { id: 2, title: "Employment Details", description: "Job information and employment type" },
    { id: 3, title: "Salary & Bank Details", description: "Salary, compensation, and bank information" },
    { id: 4, title: "Additional Information", description: "Emergency contact, education, and other details" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Basic Information
        if (!formData.rdbs_name.trim()) newErrors.rdbs_name = "Name is required";
        if (!formData.rdbs_nid.trim()) newErrors.rdbs_nid = "National ID is required";
        if (!formData.rdbs_phone.trim()) newErrors.rdbs_phone = "Phone number is required";
        if (!formData.rdbs_city.trim()) newErrors.rdbs_city = "City is required";
        if (formData.rdbs_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.rdbs_email)) {
          newErrors.rdbs_email = "Invalid email format";
        }
        if (formData.rdbs_phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.rdbs_phone)) {
          newErrors.rdbs_phone = "Invalid phone number format";
        }
        break;
      case 2: // Employment Details
        if (!formData.rdbs_job_title.trim()) newErrors.rdbs_job_title = "Job title is required";
        if (!formData.rdbs_department.trim()) newErrors.rdbs_department = "Department is required";
        if (!formData.rdbs_hire_date) newErrors.rdbs_hire_date = "Hire date is required";
        if (!formData.rdbs_employee_id.trim()) newErrors.rdbs_employee_id = "Employee ID is required";
        break;
      case 3: // Salary and Bank Details
        if (!formData.rdbs_salary || Number(formData.rdbs_salary) <= 0) newErrors.rdbs_salary = "Valid salary is required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.rdbs_name.trim()) newErrors.rdbs_name = "Name is required";
    if (!formData.rdbs_nid.trim()) newErrors.rdbs_nid = "National ID is required";
    if (!formData.rdbs_phone.trim()) newErrors.rdbs_phone = "Phone number is required";
    if (!formData.rdbs_city.trim()) newErrors.rdbs_city = "City is required";
    if (!formData.rdbs_job_title.trim()) newErrors.rdbs_job_title = "Job title is required";
    if (!formData.rdbs_department.trim()) newErrors.rdbs_department = "Department is required";
    if (!formData.rdbs_hire_date) newErrors.rdbs_hire_date = "Hire date is required";
    if (!formData.rdbs_employee_id.trim()) newErrors.rdbs_employee_id = "Employee ID is required";
    if (!formData.rdbs_salary || Number(formData.rdbs_salary) <= 0) newErrors.rdbs_salary = "Valid salary is required";
    
    // Email validation
    if (formData.rdbs_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.rdbs_email)) {
      newErrors.rdbs_email = "Invalid email format";
    }
    
    // Phone validation (basic)
    if (formData.rdbs_phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.rdbs_phone)) {
      newErrors.rdbs_phone = "Invalid phone number format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      setErrors({});
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSuccessModalOK = () => {
    setShowSuccessModal(false);
    setCreatedEmployee(null);
    router.push('/employees');
  };

  const merchant_id = session?.user?.merchantId;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL|| 'http://localhost:7600';
      console.log("endpoint", endpoint);
      const response = await axios.post(`${endpoint}/employees/employees`, {
          ...formData,
          rdbs_salary: Number(formData.rdbs_salary),
          rdbs_bonus_percentage: Number(formData.rdbs_bonus_percentage),
          rdbs_leave_balance: Number(formData.rdbs_leave_balance),
          rdbs_performance_rating: Number(formData.rdbs_performance_rating),
          rdbs_skills: formData.rdbs_skills ? formData.rdbs_skills.split(',').map(s => s.trim()) : [],
          rdbs_access: 'employee',
          rdbs_is_active: true,
          merchant_id: merchant_id,
        });

      if (response.status === 200) {
        console.log("response.data", response);
        setCreatedEmployee(response.data);
        setShowSuccessModal(true);
      } else {
        alert(`Error creating employee: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Error creating employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Create New Employee</h1>
              <p className="text-gray-600">Add a new team member to your organization</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Back to Employees
            </Button>
          </div>
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
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input
                    type="text"
                    value={formData.rdbs_name}
                    onChange={(e) => handleInputChange("rdbs_name", e.target.value)}
                    placeholder="Enter full name"
                    className={errors.rdbs_name ? "border-red-500" : ""}
                  />
                  {errors.rdbs_name && <p className="text-red-500 text-xs mt-1">{errors.rdbs_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">National ID *</label>
                  <Input
                    type="text"
                    value={formData.rdbs_nid}
                    onChange={(e) => handleInputChange("rdbs_nid", e.target.value)}
                    placeholder="Enter national ID"
                    className={errors.rdbs_nid ? "border-red-500" : ""}
                  />
                  {errors.rdbs_nid && <p className="text-red-500 text-xs mt-1">{errors.rdbs_nid}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <Input
                    type="tel"
                    value={formData.rdbs_phone}
                    onChange={(e) => handleInputChange("rdbs_phone", e.target.value)}
                    placeholder="Enter phone number"
                    className={errors.rdbs_phone ? "border-red-500" : ""}
                  />
                  {errors.rdbs_phone && <p className="text-red-500 text-xs mt-1">{errors.rdbs_phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.rdbs_email}
                    onChange={(e) => handleInputChange("rdbs_email", e.target.value)}
                    placeholder="Enter email address"
                    className={errors.rdbs_email ? "border-red-500" : ""}
                  />
                  {errors.rdbs_email && <p className="text-red-500 text-xs mt-1">{errors.rdbs_email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Next of Kin</label>
                  <Input
                    type="text"
                    value={formData.rdbs_nok}
                    onChange={(e) => handleInputChange("rdbs_nok", e.target.value)}
                    placeholder="Enter next of kin name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    type="text"
                    value={formData.rdbs_city}
                    onChange={(e) => handleInputChange("rdbs_city", e.target.value)}
                    placeholder="Enter city"
                    className={errors.rdbs_city ? "border-red-500" : ""}
                  />
                  {errors.rdbs_city && <p className="text-red-500 text-xs mt-1">{errors.rdbs_city}</p>}
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea
                    value={formData.rdbs_address}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("rdbs_address", e.target.value)}
                    placeholder="Enter full address"
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Employment Details */}
          {currentStep === 2 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Job Title *</label>
                <Input
                  type="text"
                  value={formData.rdbs_job_title}
                  onChange={(e) => handleInputChange("rdbs_job_title", e.target.value)}
                  placeholder="Enter job title"
                  className={errors.rdbs_job_title ? "border-red-500" : ""}
                />
                {errors.rdbs_job_title && <p className="text-red-500 text-xs mt-1">{errors.rdbs_job_title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <Input
                  type="text"
                  value={formData.rdbs_department}
                  onChange={(e) => handleInputChange("rdbs_department", e.target.value)}
                  placeholder="Enter department"
                  className={errors.rdbs_department ? "border-red-500" : ""}
                />
                {errors.rdbs_department && <p className="text-red-500 text-xs mt-1">{errors.rdbs_department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reports To</label>
                <Input
                  type="text"
                  value={formData.rdbs_reports_to}
                  onChange={(e) => handleInputChange("rdbs_reports_to", e.target.value)}
                  placeholder="Enter supervisor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Employment Type *</label>
                <select
                  value={formData.rdbs_employment_type}
                  onChange={(e) => handleInputChange("rdbs_employment_type", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {employmentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hire Date *</label>
                <Input
                  type="date"
                  value={formData.rdbs_hire_date}
                  onChange={(e) => handleInputChange("rdbs_hire_date", e.target.value)}
                  className={errors.rdbs_hire_date ? "border-red-500" : ""}
                />
                {errors.rdbs_hire_date && <p className="text-red-500 text-xs mt-1">{errors.rdbs_hire_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <Input
                  type="text"
                  value={formData.rdbs_employee_id}
                  onChange={(e) => handleInputChange("rdbs_employee_id", e.target.value)}
                  placeholder="Enter employee ID"
                  className={errors.rdbs_employee_id ? "border-red-500" : ""}
                />
                {errors.rdbs_employee_id && <p className="text-red-500 text-xs mt-1">{errors.rdbs_employee_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contract End Date</label>
                <Input
                  type="date"
                  value={formData.rdbs_contract_end_date}
                  onChange={(e) => handleInputChange("rdbs_contract_end_date", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Probation End Date</label>
                <Input
                  type="date"
                  value={formData.rdbs_probation_end_date}
                  onChange={(e) => handleInputChange("rdbs_probation_end_date", e.target.value)}
                />
              </div>
            </div>
          </Card>
          )}

                    {/* Step 3: Salary and Bank Details */}
          {currentStep === 3 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-600">Salary and Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Salary (UGX) *</label>
                  <Input
                    type="number"
                    value={formData.rdbs_salary}
                    onChange={(e) => handleInputChange("rdbs_salary", e.target.value)}
                    placeholder="Enter salary amount"
                    className={errors.rdbs_salary ? "border-red-500" : ""}
                  />
                  {errors.rdbs_salary && <p className="text-red-500 text-xs mt-1">{errors.rdbs_salary}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Salary Scale</label>
                  <select
                    value={formData.rdbs_salary_scale}
                    onChange={(e) => handleInputChange("rdbs_salary_scale", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {salaryScales.map(scale => (
                      <option key={scale.value} value={scale.value}>{scale.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bonus Percentage (%)</label>
                  <Input
                    type="number"
                    value={formData.rdbs_bonus_percentage}
                    onChange={(e) => handleInputChange("rdbs_bonus_percentage", e.target.value)}
                    placeholder="Enter bonus percentage"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bank Name</label>
                  <Input
                    type="text"
                    value={formData.rdbs_bank_name}
                    onChange={(e) => handleInputChange("rdbs_bank_name", e.target.value)}
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Number</label>
                  <Input
                    type="text"
                    value={formData.rdbs_bank_account}
                    onChange={(e) => handleInputChange("rdbs_bank_account", e.target.value)}
                    placeholder="Enter account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Name</label>
                  <Input
                    type="text"
                    value={formData.rdbs_bank_account_name}
                    onChange={(e) => handleInputChange("rdbs_bank_account_name", e.target.value)}
                    placeholder="Enter account holder name"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Step 4: Additional Information */}
          {currentStep === 4 && (
            <>
              {/* Tax and Insurance */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-red-600">Tax and Insurance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax ID</label>
                    <Input
                      type="text"
                      value={formData.rdbs_tax_id}
                      onChange={(e) => handleInputChange("rdbs_tax_id", e.target.value)}
                      placeholder="Enter tax ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Insurance Number</label>
                    <Input
                      type="text"
                      value={formData.rdbs_insurance_number}
                      onChange={(e) => handleInputChange("rdbs_insurance_number", e.target.value)}
                      placeholder="Enter insurance number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">NSSF Number</label>
                    <Input
                      type="text"
                      value={formData.rdbs_nssf_number}
                      onChange={(e) => handleInputChange("rdbs_nssf_number", e.target.value)}
                      placeholder="Enter NSSF number"
                    />
                  </div>
                </div>
              </Card>

              {/* Emergency Contact */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-yellow-600">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
                    <Input
                      type="text"
                      value={formData.rdbs_emergency_contact}
                      onChange={(e) => handleInputChange("rdbs_emergency_contact", e.target.value)}
                      placeholder="Enter emergency contact name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Emergency Contact Phone</label>
                    <Input
                      type="tel"
                      value={formData.rdbs_emergency_phone}
                      onChange={(e) => handleInputChange("rdbs_emergency_phone", e.target.value)}
                      placeholder="Enter emergency contact phone"
                    />
                  </div>
                </div>
              </Card>

              {/* Education and Skills */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-indigo-600">Education and Skills</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Education</label>
                    <textarea
                      value={formData.rdbs_education}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("rdbs_education", e.target.value)}
                      placeholder="Enter education details"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Skills (comma-separated)</label>
                    <textarea
                      value={formData.rdbs_skills}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("rdbs_skills", e.target.value)}
                      placeholder="Enter skills (e.g., JavaScript, React, Project Management)"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Work Experience</label>
                    <textarea
                      value={formData.rdbs_work_experience}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("rdbs_work_experience", e.target.value)}
                      placeholder="Enter work experience details"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </Card>

              {/* Performance and Leave */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-teal-600">Performance and Leave</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Leave Balance (days)</label>
                    <Input
                      type="number"
                      value={formData.rdbs_leave_balance}
                      onChange={(e) => handleInputChange("rdbs_leave_balance", e.target.value)}
                      placeholder="Enter leave balance"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Performance Rating (1-5)</label>
                    <Input
                      type="number"
                      value={formData.rdbs_performance_rating}
                      onChange={(e) => handleInputChange("rdbs_performance_rating", e.target.value)}
                      placeholder="Enter performance rating"
                      min="1"
                      max="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Last Performance Review</label>
                    <Input
                      type="date"
                      value={formData.rdbs_last_performance_review}
                      onChange={(e) => handleInputChange("rdbs_last_performance_review", e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Additional Information */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Target</label>
                    <Input
                      type="text"
                      value={formData.rdbs_target}
                      onChange={(e) => handleInputChange("rdbs_target", e.target.value)}
                      placeholder="Enter target/goals"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={formData.rdbs_notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("rdbs_notes", e.target.value)}
                      placeholder="Enter any additional notes"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </Card>
            </>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Employee"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Creating Employee...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we save the employee information</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employee Created Successfully!</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Name:</span> {createdEmployee.rdbs_name}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Department:</span> {createdEmployee.rdbs_department}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Employee ID:</span> {createdEmployee.rdbs_employee_id}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Job Title:</span> {createdEmployee.rdbs_job_title}
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