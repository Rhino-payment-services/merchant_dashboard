"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { SelectField } from '@/components/ui/select-field'
import { FieldError } from '@/components/ui/field-message'
import { PhoneNumberInput } from '@/components/ui/phone-input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AuthShell from '@/components/auth/AuthShell'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthStatus from '@/components/auth/AuthStatus'
import AuthLoading from '@/components/auth/AuthLoading'
import FormAlert from '@/components/auth/FormAlert'
import { authButtonClass, authLinkClass, authSecondaryButtonClass } from '@/components/auth/authStyles'
import { Phone, ArrowLeft, ArrowRight, Loader2, Mail, Search } from 'lucide-react'
import { toast } from 'sonner'
import { API_URL } from '@/lib/config'
import { cn, normalizePhoneForSearch } from '@/lib/utils'
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

const STEP1_FIELDS: Array<keyof SignupFormData> = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalId', 'phoneNumber', 'email']
const STEP2_FIELDS: Array<keyof SignupFormData> = ['businessTradeName', 'registeredBusinessName', 'businessType', 'businessAddress', 'businessCity']

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
]

const BUSINESS_TYPE_OPTIONS = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'LIMITED_COMPANY', label: 'Limited Liability Company' },
  { value: 'PUBLIC_COMPANY', label: 'Public Company' },
  { value: 'COOPERATIVE', label: 'Cooperative' },
  { value: 'NGO', label: 'NGO' },
  { value: 'OTHER', label: 'Other' },
]

const COUNTRY_OPTIONS = [
  { value: 'UG', label: 'Uganda' },
  { value: 'KE', label: 'Kenya' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'RW', label: 'Rwanda' },
]

const segmentTriggerClass =
  "h-full gap-2 rounded-[5px] text-[13px] text-slate-500 transition-colors duration-150 hover:text-slate-800 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"

function focusFirstError(errors: Record<string, string>, order: Array<keyof SignupFormData>) {
  const first = order.find((field) => errors[field])
  if (first) document.getElementById(first)?.focus()
}

function SignupContent() {
  const router = useRouter()
  const [step, setStep] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  
  const [existingAccountUsed, setExistingAccountUsed] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [searchBy, setSearchBy] = useState<'phone' | 'email'>('phone')
  const [lookupError, setLookupError] = useState<string>()
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
    if ((field === 'phoneNumber' || field === 'email') && lookupError) setLookupError(undefined)
  }

  const handleLookup = async () => {
    const searchValue = searchBy === 'phone' ? formData.phoneNumber.trim() : formData.email.trim()
    const lookupFieldId = searchBy === 'phone' ? 'lookupPhone' : 'lookupEmail'
    if (!searchValue) {
      setLookupError(`Enter your ${searchBy === 'phone' ? 'phone number' : 'email'} to search.`)
      document.getElementById(lookupFieldId)?.focus()
      return
    }
    if (searchBy === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchValue)) {
      setLookupError('Enter a valid email address.')
      document.getElementById(lookupFieldId)?.focus()
      return
    }
    setLookupError(undefined)
    setIsLookingUp(true)
    setApiError(null)
    try {
      const params = new URLSearchParams()
      const valueToSend = searchBy === 'phone' ? normalizePhoneForSearch(searchValue) : searchValue
      params.set(searchBy, valueToSend)
      const response = await fetch(`${API_URL}/auth/merchant/lookup?${params.toString()}`)
      const data = await response.json()
      if (data.exists && data.user) {
        const u = data.user
        setFormData(prev => ({
          ...prev,
          firstName: u.firstName ?? prev.firstName,
          lastName: u.lastName ?? prev.lastName,
          middleName: u.middleName ?? prev.middleName,
          dateOfBirth: u.dateOfBirth ?? prev.dateOfBirth,
          gender: u.gender ?? prev.gender,
          nationalId: u.nationalId ?? prev.nationalId,
          phoneNumber: u.phone ?? prev.phoneNumber,
          email: u.email ?? prev.email
        }))
        toast.success('We found your account – your details have been prefilled')
      } else {
        toast.info('No existing account found. Please fill in your details below.')
      }
    } catch (err) {
      toast.error('Could not look up account. Please continue filling the form.')
    } finally {
      setIsLookingUp(false)
    }
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
    focusFirstError(errors, STEP1_FIELDS)
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
    focusFirstError(errors, STEP2_FIELDS)
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

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch (e) {
          // If JSON parsing fails, use response status text
          const errorMessage = response.statusText || 'Registration failed'
          setApiError(errorMessage)
          toast.error(errorMessage)
          return
        }

        // Extract error message from various response formats
        let errorMessage = 'Registration failed'
        
        // Handle validation errors (array format)
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ')
        } 
        // Handle error object with message property
        else if (errorData.message) {
          errorMessage = errorData.message
        }
        // Handle error object with error property
        else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : errorData.error.message || 'Registration failed'
        }
        // Handle data.message format
        else if (errorData.data?.message) {
          if (Array.isArray(errorData.data.message)) {
            errorMessage = errorData.data.message.join(', ')
          } else {
            errorMessage = errorData.data.message
          }
        }
        // Handle statusCode with message
        else if (errorData.statusCode && errorData.message) {
          errorMessage = Array.isArray(errorData.message) 
            ? errorData.message.join(', ')
            : errorData.message
        }

        // Show toast error for any error
        toast.error(errorMessage)

        // Handle specific error messages for form field highlighting
        const lowerMessage = errorMessage.toLowerCase()
        if (lowerMessage.includes('phone') || lowerMessage.includes('mobile')) {
          setFormErrors(prev => ({ ...prev, phoneNumber: 'This phone number is already registered' }))
          setApiError('Phone number conflict: This phone number is already registered. Please use a different number or login instead.')
          setStep(1) // Go back to step 1 where phone is
        } else if (lowerMessage.includes('email')) {
          setFormErrors(prev => ({ ...prev, email: 'This email is already registered' }))
          setApiError('Email conflict: This email is already registered. Please use a different email or login instead.')
          setStep(1) // Go back to step 1 where email is
        } else if (lowerMessage.includes('national') || lowerMessage.includes('nin')) {
          setFormErrors(prev => ({ ...prev, nationalId: 'This National ID is already registered' }))
          setApiError('National ID conflict: This National ID is already registered.')
          setStep(1)
        } else if (lowerMessage.includes('business')) {
          setFormErrors(prev => ({ ...prev, businessTradeName: 'This business name is already registered' }))
          setApiError('Business name conflict: This business name is already registered.')
        } else {
          setApiError(errorMessage)
        }
        return
      }

      const data = await response.json()

      if ((response.ok || response.status === 201) && data.success) {
        setExistingAccountUsed(!!data.existingAccountUsed)
        setSuccessMessage(data.message || null)
        setStep(3)
        const message = data.message || 'Registration successful!'
        toast.success(message, { duration: 5000 })
      } else {
        // Handle success response but with error message
        const errorMessage = data.message || 'Registration failed'
        setApiError(errorMessage)
        toast.error(errorMessage)
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      
      // Extract error message from various error formats
      let errorMessage = 'Something went wrong. Please try again.'
      
      if (error.response) {
        // Axios error with response
        const errorData = error.response.data
        if (Array.isArray(errorData?.message)) {
          errorMessage = errorData.message.join(', ')
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : errorData.error.message || errorMessage
        } else if (errorData?.data?.message) {
          errorMessage = Array.isArray(errorData.data.message)
            ? errorData.data.message.join(', ')
            : errorData.data.message
        }
      } else if (error.message) {
        // Network error or other error with message
        errorMessage = error.message
      }
      
      setApiError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const textField = (field: keyof SignupFormData, label: string, props: React.ComponentProps<typeof TextField> = {}) => (
    <TextField
      variant="floating"
      id={field}
      label={label}
      value={formData[field]}
      onChange={(e) => handleChange(field, e.target.value)}
      error={formErrors[field]}
      {...props}
    />
  )

  if (step === 3) {
    return (
      <AuthShell width="wide">
        <AuthStatus
          tone="success"
          title="Registration successful"
          description={
            existingAccountUsed
              ? (successMessage || 'Your new business has been linked to your existing account. Please login to complete KYC.')
              : 'Your merchant account has been created. You can now login with your phone number to access your dashboard.'
          }
          actions={
            <Button onClick={() => router.push('/auth/login')} className={authButtonClass}>
              Go to login
            </Button>
          }
        >
          <div className="space-y-4">
            {existingAccountUsed && (
              <FormAlert tone="warning" title="Existing account detected">
                Your phone number or email is already registered. Your new business has been linked to that account. Use your existing credentials to login.
              </FormAlert>
            )}
            <div className="rounded-lg border border-slate-200 px-4 py-4">
              <p className="text-sm font-medium text-slate-800">Next steps</p>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
                {[
                  'Login to your merchant dashboard',
                  'Complete your KYC verification by uploading required documents',
                  'Start accepting payments!',
                ].map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/5 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </AuthStatus>
      </AuthShell>
    )
  }

  return (
    <AuthShell width="wide">
      <AuthHeader
        title="Create your merchant account"
        description="Join RukaPay and start accepting payments."
      />

      <div className="mt-8">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-slate-700">
            Step {step} of 2 · {step === 1 ? 'Personal information' : 'Business information'}
          </span>
          <span className="text-slate-400">{step === 1 ? 'Next: Business' : 'Almost done'}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5" aria-hidden>
          <span className="h-1 rounded-full bg-primary" />
          <span className={cn("h-1 rounded-full transition-colors duration-300", step === 2 ? "bg-primary" : "bg-slate-200")} />
        </div>
      </div>

      {apiError && (
        <FormAlert tone="error" className="mt-6">
          {apiError}
        </FormAlert>
      )}

      {step === 1 && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleNextStep()
          }}
          className="mt-8"
        >
          <section>
            <h2 className="text-sm font-medium text-slate-800">Find your existing account</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Enter your phone or email to search for your existing account and prefill your details.
            </p>

            <Tabs value={searchBy} onValueChange={(v) => { setSearchBy(v as 'phone' | 'email'); setLookupError(undefined) }} className="mt-4">
              <TabsList className="grid h-9 w-44 grid-cols-2 rounded-md bg-slate-100 p-0.5">
                <TabsTrigger value="phone" className={segmentTriggerClass}>
                  <Phone className="size-3.5" aria-hidden />
                  Phone
                </TabsTrigger>
                <TabsTrigger value="email" className={segmentTriggerClass}>
                  <Mail className="size-3.5" aria-hidden />
                  Email
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {searchBy === 'phone' ? (
                  <PhoneNumberInput
                    variant="auth"
                    label="Phone number"
                    inputId="lookupPhone"
                    invalid={!!lookupError}
                    describedBy={lookupError ? 'lookup-error' : undefined}
                    value={formData.phoneNumber}
                    onChange={(value) => handleChange('phoneNumber', value)}
                    placeholder="700 123 456"
                    defaultCountry="ug"
                  />
                ) : (
                  <TextField
                    variant="floating"
                    id="lookupEmail"
                    type="email"
                    label="Email address"
                    placeholder="merchant@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    aria-invalid={lookupError ? true : undefined}
                    aria-describedby={lookupError ? 'lookup-error' : undefined}
                    className={lookupError ? 'border-error hover:border-error focus-visible:border-error focus-visible:ring-error/15' : undefined}
                  />
                )}
              </div>
              <Button
                type="button"
                onClick={handleLookup}
                disabled={isLookingUp}
                className={cn(authSecondaryButtonClass, "h-12 w-auto shrink-0 px-4")}
              >
                {isLookingUp ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
                {isLookingUp ? 'Searching...' : 'Search'}
              </Button>
            </div>
            <FieldError id="lookup-error" message={lookupError} />
          </section>

          <section className="mt-8 border-t border-slate-100 pt-8">
            <h2 className="text-sm font-medium text-slate-800">Your details</h2>
            <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {textField('firstName', 'First name', { autoComplete: 'given-name' })}
              {textField('lastName', 'Last name', { autoComplete: 'family-name' })}
              {textField('middleName', 'Middle name (optional)', { autoComplete: 'additional-name' })}
              {textField('dateOfBirth', 'Date of birth', { type: 'date', autoComplete: 'bday' })}
              <SelectField
                id="gender"
                label="Gender"
                value={formData.gender}
                onValueChange={(value) => handleChange('gender', value)}
                options={GENDER_OPTIONS}
                error={formErrors.gender}
              />
              {textField('nationalId', 'National ID', { placeholder: 'CM12345678ABC' })}
              <div>
                <PhoneNumberInput
                  variant="auth"
                  label="Phone number"
                  inputId="phoneNumber"
                  invalid={!!formErrors.phoneNumber}
                  describedBy={formErrors.phoneNumber ? 'phoneNumber-error' : undefined}
                  value={formData.phoneNumber}
                  onChange={(value) => handleChange('phoneNumber', value)}
                  placeholder="700 123 456"
                  defaultCountry="ug"
                />
                <FieldError id="phoneNumber-error" message={formErrors.phoneNumber} />
              </div>
              {textField('email', 'Email address', { type: 'email', autoComplete: 'email', placeholder: 'merchant@example.com' })}
            </div>
          </section>

          <Button type="submit" className={cn(authButtonClass, "mt-8")}>
            Continue to business info
            <ArrowRight aria-hidden />
          </Button>
        </form>
      )}

      {step === 2 && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="mt-8"
        >
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {textField('businessTradeName', 'Business trade name', { placeholder: "e.g., John's Electronics", containerClassName: 'sm:col-span-2' })}
            {textField('registeredBusinessName', 'Registered business name', { placeholder: "e.g., John's Electronics Ltd", containerClassName: 'sm:col-span-2' })}
            <SelectField
              id="businessType"
              label="Business type"
              value={formData.businessType}
              onValueChange={(value) => handleChange('businessType', value)}
              options={BUSINESS_TYPE_OPTIONS}
              error={formErrors.businessType}
              containerClassName="sm:col-span-2"
            />
            {textField('businessAddress', 'Business address', { placeholder: 'Street address', autoComplete: 'street-address', containerClassName: 'sm:col-span-2' })}
            {textField('businessCity', 'City', { placeholder: 'Kampala', autoComplete: 'address-level2' })}
            <SelectField
              id="businessCountry"
              label="Country"
              value={formData.businessCountry}
              onValueChange={(value) => handleChange('businessCountry', value)}
              options={COUNTRY_OPTIONS}
            />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={handlePrevStep} className={authSecondaryButtonClass}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting} className={authButtonClass}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Creating...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </div>
        </form>
      )}

      <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/auth/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SignupContent />
    </Suspense>
  )
}
