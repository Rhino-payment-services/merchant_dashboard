"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneNumberInput } from '@/components/ui/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, User, Building2, ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertCircle, Mail, MapPin } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { API_URL } from '@/lib/config'
import Link from 'next/link'

interface SignupFormData {
  // Personal Information
  firstName: string
  lastName: string
  middleName: string
  dateOfBirth: string
  gender: string
  nationalId: string
  phoneNumber: string
  email: string
  
  // Business Information
  businessTradeName: string
  registeredBusinessName: string
  businessType: string
  businessAddress: string
  businessCity: string
  businessCountry: string
}

function SignupContent() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    phoneNumber: '',
    email: '',
    businessTradeName: '',
    registeredBusinessName: '',
    businessType: '',
    businessAddress: '',
    businessCity: '',
    businessCountry: 'UG'
  })

  useEffect(() => {
    document.title = 'Sign Up - RukaPay Merchant'
  }, [])

  const handleChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is changed
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    setApiError(null)
  }

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.firstName.trim()) errors.firstName = 'First name is required'
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required'
    if (!formData.gender) errors.gender = 'Gender is required'
    if (!formData.nationalId.trim()) errors.nationalId = 'National ID is required'
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required'
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.businessTradeName.trim()) errors.businessTradeName = 'Business trade name is required'
    if (!formData.registeredBusinessName.trim()) errors.registeredBusinessName = 'Registered business name is required'
    if (!formData.businessType) errors.businessType = 'Business type is required'
    if (!formData.businessAddress.trim()) errors.businessAddress = 'Business address is required'
    if (!formData.businessCity.trim()) errors.businessCity = 'City is required'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    
    setIsSubmitting(true)
    setApiError(null)
    
    try {
      const response = await fetch(`${API_URL}/auth/merchant/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Personal Information
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName || undefined,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          nationalId: formData.nationalId,
          phone: formData.phoneNumber,
          email: formData.email,
          
          // Business Information
          businessInfo: {
            businessTradeName: formData.businessTradeName,
            registeredBusinessName: formData.registeredBusinessName,
            businessType: formData.businessType,
            businessAddress: formData.businessAddress,
            businessCity: formData.businessCity,
            businessCountry: formData.businessCountry
          },
          
          // Contact Information
          contactInfo: {
            registeredPhoneNumber: formData.phoneNumber,
            businessEmail: formData.email
          }
        })
      })

      const data = await response.json()

      if ((response.ok || response.status === 201) && data.success) {
        setStep(3)
        toast.success('Registration successful!')
      } else {
        // Handle specific error messages
        const errorMessage = data.message || 'Registration failed'
        
        if (errorMessage.toLowerCase().includes('phone') || errorMessage.toLowerCase().includes('mobile')) {
          setFormErrors(prev => ({ ...prev, phoneNumber: 'This phone number is already registered' }))
          setApiError('Phone number conflict: This phone number is already registered. Please use a different number or login instead.')
          setStep(1) // Go back to step 1 where phone is
        } else if (errorMessage.toLowerCase().includes('email')) {
          setFormErrors(prev => ({ ...prev, email: 'This email is already registered' }))
          setApiError('Email conflict: This email is already registered. Please use a different email or login instead.')
          setStep(1) // Go back to step 1 where email is
        } else if (errorMessage.toLowerCase().includes('national') || errorMessage.toLowerCase().includes('nin')) {
          setFormErrors(prev => ({ ...prev, nationalId: 'This National ID is already registered' }))
          setApiError('National ID conflict: This National ID is already registered.')
          setStep(1)
        } else if (errorMessage.toLowerCase().includes('business')) {
          setFormErrors(prev => ({ ...prev, businessTradeName: 'This business name is already registered' }))
          setApiError('Business name conflict: This business name is already registered.')
        } else {
          setApiError(errorMessage)
        }
        
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      const errorMessage = error.message || 'Something went wrong. Please try again.'
      setApiError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Business Info', icon: Building2 },
    { number: 3, title: 'Complete', icon: CheckCircle }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Page Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
              <Image src="/images/logo.jpg" alt="RukaPay" width={48} height={48} className='rounded-lg' />
            </div>
            <span className="text-3xl font-bold text-[#08163d]">RukaPay</span>
          </div>
          <h1 className="text-2xl font-bold text-[#08163d] mb-2">Merchant Registration</h1>
          <p className="text-gray-600">Join RukaPay and start accepting payments</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-6 px-4">
          {steps.map((s, index) => {
            const StepIcon = s.icon
            const isActive = step === s.number
            const isCompleted = step > s.number
            
            return (
              <div key={s.number} className="flex flex-col items-center relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isActive ? 'bg-main-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'text-main-600 font-medium' : 'text-gray-500'}`}>
                  {s.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`absolute top-5 left-[50px] w-[calc(100%-20px)] h-0.5 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} style={{ width: '80px' }} />
                )}
              </div>
            )
          })}
        </div>

        <Card className="p-6 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {apiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="John"
                    className={formErrors.firstName ? 'border-red-500' : ''}
                  />
                  {formErrors.firstName && <p className="text-xs text-red-500">{formErrors.firstName}</p>}
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className={formErrors.lastName ? 'border-red-500' : ''}
                  />
                  {formErrors.lastName && <p className="text-xs text-red-500">{formErrors.lastName}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => handleChange('middleName', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className={formErrors.dateOfBirth ? 'border-red-500' : ''}
                  />
                  {formErrors.dateOfBirth && <p className="text-xs text-red-500">{formErrors.dateOfBirth}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                    <SelectTrigger className={formErrors.gender ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.gender && <p className="text-xs text-red-500">{formErrors.gender}</p>}
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="nationalId">National ID *</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) => handleChange('nationalId', e.target.value)}
                    placeholder="CM12345678ABC"
                    className={formErrors.nationalId ? 'border-red-500' : ''}
                  />
                  {formErrors.nationalId && <p className="text-xs text-red-500">{formErrors.nationalId}</p>}
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <PhoneNumberInput
                  value={formData.phoneNumber}
                  onChange={(value) => handleChange('phoneNumber', value)}
                  placeholder="700 123 456"
                  defaultCountry="ug"
                />
                {formErrors.phoneNumber && <p className="text-xs text-red-500">{formErrors.phoneNumber}</p>}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="merchant@example.com"
                    className={`pl-10 ${formErrors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
              </div>
              
              <Button onClick={handleNextStep} className="w-full mt-4">
                Next: Business Info
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Business Information */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
              
              <div className="space-y-1">
                <Label htmlFor="businessTradeName">Business Trade Name *</Label>
                <Input
                  id="businessTradeName"
                  value={formData.businessTradeName}
                  onChange={(e) => handleChange('businessTradeName', e.target.value)}
                  placeholder="e.g., John's Electronics"
                  className={formErrors.businessTradeName ? 'border-red-500' : ''}
                />
                {formErrors.businessTradeName && <p className="text-xs text-red-500">{formErrors.businessTradeName}</p>}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="registeredBusinessName">Registered Business Name *</Label>
                <Input
                  id="registeredBusinessName"
                  value={formData.registeredBusinessName}
                  onChange={(e) => handleChange('registeredBusinessName', e.target.value)}
                  placeholder="e.g., John's Electronics Ltd"
                  className={formErrors.registeredBusinessName ? 'border-red-500' : ''}
                />
                {formErrors.registeredBusinessName && <p className="text-xs text-red-500">{formErrors.registeredBusinessName}</p>}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="businessType">Business Type *</Label>
                <Select value={formData.businessType} onValueChange={(value) => handleChange('businessType', value)}>
                  <SelectTrigger className={formErrors.businessType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLE_PROPRIETORSHIP">Sole Proprietorship</SelectItem>
                    <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                    <SelectItem value="LIMITED_LIABILITY">Limited Liability Company</SelectItem>
                    <SelectItem value="CORPORATION">Corporation</SelectItem>
                    <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
                    <SelectItem value="NGO">NGO</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.businessType && <p className="text-xs text-red-500">{formErrors.businessType}</p>}
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="businessAddress">Business Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="businessAddress"
                    value={formData.businessAddress}
                    onChange={(e) => handleChange('businessAddress', e.target.value)}
                    placeholder="Street address"
                    className={`pl-10 ${formErrors.businessAddress ? 'border-red-500' : ''}`}
                  />
                </div>
                {formErrors.businessAddress && <p className="text-xs text-red-500">{formErrors.businessAddress}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="businessCity">City *</Label>
                  <Input
                    id="businessCity"
                    value={formData.businessCity}
                    onChange={(e) => handleChange('businessCity', e.target.value)}
                    placeholder="Kampala"
                    className={formErrors.businessCity ? 'border-red-500' : ''}
                  />
                  {formErrors.businessCity && <p className="text-xs text-red-500">{formErrors.businessCity}</p>}
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="businessCountry">Country</Label>
                  <Select value={formData.businessCountry} onValueChange={(value) => handleChange('businessCountry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UG">Uganda</SelectItem>
                      <SelectItem value="KE">Kenya</SelectItem>
                      <SelectItem value="TZ">Tanzania</SelectItem>
                      <SelectItem value="RW">Rwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your merchant account has been created. You can now login with your phone number to access your dashboard.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>1. Login to your merchant dashboard</li>
                  <li>2. Complete your KYC verification by uploading required documents</li>
                  <li>3. Start accepting payments!</li>
                </ol>
              </div>
              <Button onClick={() => router.push('/auth/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </Card>

        {/* Login Link */}
        {step !== 3 && (
          <p className="text-center mt-4 text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-main-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-main-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
