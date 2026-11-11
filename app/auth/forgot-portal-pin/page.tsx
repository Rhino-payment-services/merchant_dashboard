"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { FieldError } from '@/components/ui/field-message'
import { PhoneNumberInput } from '@/components/ui/phone-input'
import AuthShell from '@/components/auth/AuthShell'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthLoading from '@/components/auth/AuthLoading'
import { authButtonClass, authLinkClass } from '@/components/auth/authStyles'
import { toast } from 'sonner'
import {
  normalizeMerchantPortalPhone,
  rememberMerchantOtpPhone,
} from '@/lib/auth/merchantOtpPhone'
import {
  requestMerchantPortalPinResetOtp,
  resetMerchantPortalPinWithOtp,
} from '@/lib/auth/merchantPortalAuth'

type ResetErrors = { otp?: string; newPin?: string; confirmPin?: string }

function ForgotPortalPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phoneNumber, setPhoneNumber] = useState(
    () => searchParams.get('phoneNumber') || '',
  )
  const [otp, setOtp] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'phone' | 'reset'>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [phoneError, setPhoneError] = useState<string>()
  const [errors, setErrors] = useState<ResetErrors>({})
  const otpRef = useRef<HTMLInputElement>(null)
  const newPinRef = useRef<HTMLInputElement>(null)
  const confirmPinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Reset Portal PIN - RukaPay Merchant'
  }, [])

  const clearError = (field: keyof ResetErrors) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = normalizeMerchantPortalPhone(phoneNumber)
    if (!normalized) {
      setPhoneError('Enter a valid phone number.')
      document.getElementById('phone')?.focus()
      return
    }

    setIsLoading(true)
    try {
      await requestMerchantPortalPinResetOtp(normalized)
      rememberMerchantOtpPhone(normalized)
      toast.success('OTP sent to your phone')
      setStep('reset')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = normalizeMerchantPortalPhone(phoneNumber)
    if (!normalized) {
      setPhoneError('Enter a valid phone number.')
      setStep('phone')
      return
    }

    const nextErrors: ResetErrors = {}
    if (!otp || otp.replace(/\D/g, '').length !== 6) nextErrors.otp = 'Enter the 6-digit OTP.'
    if (newPin.length < 4 || newPin.length > 6) nextErrors.newPin = 'PIN must be 4 to 6 digits.'
    else if (newPin !== confirmPin) nextErrors.confirmPin = 'PINs do not match.'
    setErrors(nextErrors)
    if (nextErrors.otp) return otpRef.current?.focus()
    if (nextErrors.newPin) return newPinRef.current?.focus()
    if (nextErrors.confirmPin) return confirmPinRef.current?.focus()

    setIsLoading(true)
    try {
      const result = await resetMerchantPortalPinWithOtp(
        normalized,
        otp,
        newPin,
        confirmPin,
      )
      toast.success(result.message || 'Portal PIN reset successfully')
      router.push('/auth/login')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset PIN')
    } finally {
      setIsLoading(false)
    }
  }

  const pinField = (
    id: 'newPin' | 'confirmPin',
    label: string,
    value: string,
    setValue: (value: string) => void,
    ref: React.RefObject<HTMLInputElement | null>,
  ) => (
    <TextField
      ref={ref}
      variant="floating"
      id={id}
      type="password"
      label={label}
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => {
        setValue(e.target.value.replace(/\D/g, ''))
        clearError(id)
      }}
      error={errors[id]}
      required
    />
  )

  const displayPhone = normalizeMerchantPortalPhone(phoneNumber) || phoneNumber

  return (
    <AuthShell>
      {step === 'phone' ? (
        <>
          <AuthHeader
            backHref="/auth/login"
            title="Reset portal PIN"
            description="Enter the phone number linked to your merchant account and we'll send you a 6-digit code."
          />

          <form onSubmit={handleSendOtp} noValidate className="mt-8 space-y-5">
            <div>
              <PhoneNumberInput
                variant="auth"
                label="Phone number"
                inputId="phone"
                invalid={!!phoneError}
                describedBy={phoneError ? 'phone-error' : undefined}
                value={phoneNumber}
                onChange={(value) => {
                  setPhoneNumber(value)
                  setPhoneError(undefined)
                }}
                placeholder="700 123 456"
                defaultCountry="ug"
              />
              <FieldError id="phone-error" message={phoneError} />
            </div>
            <Button type="submit" className={authButtonClass} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Sending OTP…
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </form>
        </>
      ) : (
        <>
          <AuthHeader
            onBack={() => setStep('phone')}
            backLabel="Change phone number"
            title="Choose a new PIN"
            description={
              <>
                Enter the code sent to{' '}
                <span className="font-medium text-slate-800">+{displayPhone.replace(/^\+/, '')}</span> and your new portal PIN.
              </>
            }
          />

          <form onSubmit={handleResetPin} noValidate className="mt-8 space-y-5">
            <TextField
              ref={otpRef}
              variant="floating"
              id="otp"
              label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''))
                clearError('otp')
              }}
              error={errors.otp}
              className="tracking-[0.35em]"
              required
            />
            {pinField('newPin', 'New portal PIN', newPin, setNewPin, newPinRef)}
            {pinField('confirmPin', 'Confirm new portal PIN', confirmPin, setConfirmPin, confirmPinRef)}

            <Button type="submit" className={authButtonClass} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Resetting…
                </>
              ) : (
                'Reset portal PIN'
              )}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Didn&apos;t get the code?{' '}
              <button
                type="button"
                onClick={() => setStep('phone')}
                disabled={isLoading}
                className={`${authLinkClass} cursor-pointer disabled:opacity-50`}
              >
                Resend OTP
              </button>
            </p>
          </form>
        </>
      )}

      <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        Remember your PIN?{' '}
        <Link href="/auth/login" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default function ForgotPortalPinPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ForgotPortalPinContent />
    </Suspense>
  )
}
