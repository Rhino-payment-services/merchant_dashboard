"use client"

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PinInput } from '@/components/ui/pin-input'
import { PhoneNumberInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  normalizeMerchantPortalPhone,
  rememberMerchantOtpPhone,
} from '@/lib/auth/merchantOtpPhone'
import {
  requestMerchantPortalPinResetOtp,
  resetMerchantPortalPinWithOtp,
} from '@/lib/auth/merchantPortalAuth'

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

  useEffect(() => {
    document.title = 'Reset Portal PIN - RukaPay Merchant'
  }, [])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = normalizeMerchantPortalPhone(phoneNumber)
    if (!normalized) {
      toast.error('Please enter a valid phone number')
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
      toast.error('Please enter a valid phone number')
      return
    }
    if (!otp || otp.replace(/\D/g, '').length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error('PIN must be 4 to 6 digits')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
              <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className="rounded-lg" />
            </div>
            <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
          </div>
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Reset portal PIN</h1>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <div className="mt-2">
                  <PhoneNumberInput
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    placeholder="700 123 456"
                    defaultCountry="ug"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending OTP…' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <Label htmlFor="otp">OTP code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit OTP"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPin">New portal PIN</Label>
                <div className="mt-1">
                  <PinInput
                    id="newPin"
                    value={newPin}
                    onChange={setNewPin}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPin">Confirm new portal PIN</Label>
                <div className="mt-1">
                  <PinInput
                    id="confirmPin"
                    value={confirmPin}
                    onChange={setConfirmPin}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting…' : 'Reset portal PIN'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
                disabled={isLoading}
              >
                Resend OTP
              </Button>
            </form>
          )}

          <p className="text-xs text-center text-gray-500 mt-6">
            Remember your PIN?{' '}
            <Link href="/auth/login" className="text-main-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPortalPinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ForgotPortalPinContent />
    </Suspense>
  )
}
