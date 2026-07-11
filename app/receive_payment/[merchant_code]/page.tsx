"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Shield,
  Zap,
  AlertCircle,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MerchantInfo {
  id: string
  merchantCode: string
  businessName: string
  displayName: string
  logo?: string
  description?: string
  businessType?: string
  category?: string
  website?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
  currency: string
  status: string
  isActive: boolean
  acceptPayments: boolean
  minPayment: number
  maxPayment: number
  createdAt: string
  settings: {
    acceptMultipleCurrencies: boolean
    requireReceipt: boolean
    showMerchantInfo: boolean
    allowTaxCollection: boolean
  }
}

interface PaymentPageProps {
  params: Promise<{
    merchant_code: string
  }>
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000] as const

function formatAmountLabel(value: string): string {
  const n = parseFloat(value)
  if (!value || isNaN(n) || n <= 0) return ''
  return new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(n)
}

function formatCurrencyDisplay(amount: string, currency = 'UGX'): string {
  const label = formatAmountLabel(amount)
  if (!label) return '—'
  return `${currency} ${label}`
}

function getMerchantName(merchant: MerchantInfo): string {
  return merchant.displayName || merchant.businessName
}

function PageShell({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <div
      className={cn(
        'min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:py-12',
        centered && 'lg:flex lg:flex-col lg:justify-center'
      )}
    >
      <div className="mx-auto w-full max-w-[1200px]">{children}</div>
    </div>
  )
}

function StatusCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={cn(
        'mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:p-8',
        className
      )}
    >
      {children}
    </Card>
  )
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-main-600 text-xs font-semibold text-white">
        {number}
      </span>
      <span className="pt-0.5 text-sm text-gray-600">{text}</span>
    </div>
  )
}

function TrustList({ className }: { className?: string }) {
  const items = [
    { icon: Shield, text: 'Secure payment' },
    { icon: Zap, text: 'Instant Mobile Money transfer' },
    { icon: Smartphone, text: 'MTN & Airtel support' },
    { icon: CheckCircle, text: 'Payment processed by RukaPay' },
  ]

  return (
    <ul className={cn('space-y-3', className)}>
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
          <Icon className="h-4 w-4 shrink-0 text-main-600" aria-hidden />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

function PageFooter({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('mt-8 text-center', compact && 'mt-6')}>
      {compact && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-green-500" aria-hidden />
            Secure payment
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-blue-500" aria-hidden />
            Instant transfer
          </span>
        </div>
      )}
      <p className="text-sm text-gray-500">
        Powered by <span className="font-semibold text-main-600">RukaPay</span>
      </p>
    </div>
  )
}

function MerchantPanel({ merchant }: { merchant: MerchantInfo }) {
  const name = getMerchantName(merchant)

  return (
    <div className="rounded-2xl border border-main-200/50 bg-gradient-to-br from-main-50/80 to-white p-6 lg:p-8">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-main-50 ring-1 ring-main-200">
          {merchant.logo ? (
            <Image
              src={merchant.logo}
              alt={name}
              width={80}
              height={80}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-main-600 text-2xl font-bold text-white">
              {name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold text-[#08163d] lg:text-3xl">{name}</h1>
          {merchant.description && (
            <p className="mt-1 break-words text-sm text-gray-600 lg:text-base">{merchant.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {merchant.businessType && (
              <Badge variant="info" className="text-xs px-2.5 py-0.5">
                {merchant.businessType}
              </Badge>
            )}
            {merchant.category && merchant.category !== 'General' && (
              <Badge variant="success" className="text-xs px-2.5 py-0.5">
                {merchant.category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-main-200/40 pt-5">
        <h2 className="text-lg font-semibold text-[#08163d]">Make a secure payment</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Enter your details to pay via Mobile Money. You will receive a USSD prompt on your phone to
          confirm the transaction.
        </p>
      </div>

      <div className="mt-6 hidden lg:block">
        <TrustList />
      </div>
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-gray-200', className)} />
}

function PaymentPageSkeleton() {
  return (
    <div
      className="animate-pulse"
      role="status"
      aria-busy="true"
      aria-label="Loading merchant information"
    >
      <span className="sr-only">Loading merchant information</span>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
        {/* Left: merchant panel */}
        <div className="rounded-2xl border border-main-200/50 bg-gradient-to-br from-main-50/80 to-white p-6 lg:p-8">
          <div className="mb-5 flex items-start gap-4">
            <SkeletonBlock className="h-20 w-20 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <SkeletonBlock className="h-7 w-3/4" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
              <div className="flex gap-2 pt-1">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>

          <div className="border-t border-main-200/40 pt-5 space-y-3">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
          </div>

          <div className="mt-6 hidden space-y-3 lg:block">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <SkeletonBlock className="h-4 w-4 shrink-0 rounded-full" />
                <SkeletonBlock className="h-4 w-52" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: checkout card */}
        <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:p-8">
          <div className="mb-6 space-y-2">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-4 w-64" />
          </div>

          <div className="space-y-5">
            {/* Phone */}
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-32" />
              <div className="flex overflow-hidden rounded-md border border-gray-200">
                <SkeletonBlock className="h-12 w-16 shrink-0 rounded-none" />
                <SkeletonBlock className="h-12 flex-1 rounded-none bg-gray-100" />
              </div>
              <SkeletonBlock className="h-3 w-48" />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-[52px] w-full" />
              <SkeletonBlock className="h-3 w-40" />
              <div className="flex flex-wrap gap-2 pt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-8 w-24 rounded-full" />
                ))}
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="h-3 w-10" />
              </div>
              <SkeletonBlock className="h-12 w-full" />
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex justify-between gap-4">
                <SkeletonBlock className="h-4 w-16 bg-gray-100" />
                <SkeletonBlock className="h-4 w-32 bg-gray-100" />
              </div>
              <div className="flex justify-between gap-4">
                <SkeletonBlock className="h-4 w-14 bg-gray-100" />
                <SkeletonBlock className="h-7 w-24 bg-gray-100" />
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-3">
                <SkeletonBlock className="h-4 w-28 bg-gray-100" />
                <SkeletonBlock className="h-4 w-24 bg-gray-100" />
              </div>
            </div>

            {/* Button */}
            <SkeletonBlock className="h-12 w-full rounded-md" />
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:hidden">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <SkeletonBlock className="mx-auto h-4 w-36" />
      </div>
    </div>
  )
}

export default function ReceivePaymentPage({ params }: PaymentPageProps) {
  const [merchantCode, setMerchantCode] = useState<string>('')
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMerchantLoading, setIsMerchantLoading] = useState(true)
  const [paymentStep, setPaymentStep] = useState<'form' | 'confirm' | 'processing' | 'success' | 'error'>('form')
  const [transactionRef, setTransactionRef] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    params.then(p => setMerchantCode(p.merchant_code))
  }, [params])

  useEffect(() => {
    if (!merchantCode) return

    const fetchMerchantInfo = async () => {
      try {
        const { API_URL } = await import('@/lib/config')
        const response = await fetch(`${API_URL}/merchant/${merchantCode}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Merchant not found with this code')
          } else if (response.status === 403) {
            throw new Error('This merchant is not accepting payments at the moment')
          }
          throw new Error(`Failed to fetch merchant: ${response.statusText}`)
        }

        const merchantData = await response.json()
        setMerchantInfo(merchantData)
      } catch (error) {
        console.error('Failed to fetch merchant info:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to load merchant information')
      } finally {
        setIsMerchantLoading(false)
      }
    }

    fetchMerchantInfo()
  }, [merchantCode])

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '')

    if (cleaned.startsWith('0')) {
      cleaned = '256' + cleaned.substring(1)
    }

    if (!cleaned.startsWith('256')) {
      cleaned = '256' + cleaned
    }

    return cleaned
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phoneNumber || !amount) {
      toast.error('Please fill in all required fields')
      return
    }

    const numAmount = parseFloat(amount)
    if (numAmount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    if (numAmount < 500) {
      toast.error('Minimum payment amount is 500 UGX')
      return
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (formattedPhone.length !== 12) {
      toast.error('Please enter a valid phone number')
      return
    }

    setPaymentStep('processing')
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { API_URL } = await import('@/lib/config')

      const response = await fetch(`${API_URL}/public/merchant-payment/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantCode: merchantCode,
          phoneNumber: formattedPhone,
          amount: numAmount,
          ...(paymentDescription.trim() && { description: paymentDescription.trim() }),
        }),
      })

      const result = await response.json()

      if (result.transactionReference) {
        setTransactionRef(result.transactionReference)
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Payment failed')
      }
      if (result.status === 'FAILED') {
        throw new Error(result.error || result.message || 'Payment failed')
      }

      if (result.status === 'SUCCESS') {
        setPaymentStep('success')
        setIsLoading(false)
        toast.success('Payment successful!')
        return
      }

      if (
        result.status === 'PROCESSING' ||
        result.status === 'PENDING' ||
        result.transactionReference
      ) {
        setPaymentStep('processing')
        setIsLoading(false)
        toast.success('Payment initiated! Check your phone for USSD prompt.')
        return
      }

      throw new Error(result.message || result.error || 'Payment status unknown')
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentStep('error')
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed. Please try again.')
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.')
      setIsLoading(false)
    }
  }

  const merchantName = merchantInfo ? getMerchantName(merchantInfo) : ''
  const currency = merchantInfo?.currency || 'UGX'
  const amountLabel = formatAmountLabel(amount)
  const hasValidAmount = amountLabel !== ''

  if (isMerchantLoading) {
    return (
      <PageShell centered>
        <PaymentPageSkeleton />
      </PageShell>
    )
  }

  if (!merchantInfo) {
    return (
      <PageShell centered>
        <StatusCard className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-red-600">Merchant Not Found</h2>
          <p className="mb-6 text-gray-600">
            The merchant code you scanned is invalid or expired.
          </p>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </StatusCard>
        <PageFooter />
      </PageShell>
    )
  }

  if (!merchantInfo.isActive || !merchantInfo.acceptPayments) {
    return (
      <PageShell centered>
        <StatusCard className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-orange-600">Merchant Not Accepting Payments</h2>
          <p className="mb-6 text-gray-600">
            This merchant ({merchantName}) is currently not accepting payments.
          </p>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </StatusCard>
        <PageFooter />
      </PageShell>
    )
  }

  if (paymentStep === 'processing') {
    return (
      <PageShell centered>
        <StatusCard>
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Smartphone className="h-8 w-8 animate-pulse text-blue-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#08163d]">Check your phone</h2>
            <p className="mb-6 text-gray-600">
              A Mobile Money prompt has been sent to{' '}
              <span className="font-semibold text-gray-900">{phoneNumber}</span>
            </p>
          </div>

          <div className="mb-6 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-blue-700">Merchant</span>
              <span className="break-words text-right font-medium text-blue-900">{merchantName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-blue-700">Amount</span>
              <span className="font-bold text-blue-900">{formatCurrencyDisplay(amount, currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-blue-700">Phone</span>
              <span className="font-medium text-blue-900">{phoneNumber}</span>
            </div>
            {transactionRef && (
              <div className="border-t border-blue-200 pt-3">
                <p className="text-xs text-blue-600">Transaction reference</p>
                <p className="break-all font-mono text-sm text-blue-900">{transactionRef}</p>
              </div>
            )}
          </div>

          <div className="mb-6 space-y-3">
            <StepItem number={1} text="Check your phone for the Mobile Money prompt" />
            <StepItem number={2} text="Confirm the merchant name and amount" />
            <StepItem number={3} text="Enter your Mobile Money PIN" />
            <StepItem number={4} text="Wait for the SMS confirmation" />
          </div>

          <Button
            onClick={() => {
              setPaymentStep('form')
              setIsLoading(false)
              setPhoneNumber('')
              setAmount('')
              setPaymentDescription('')
            }}
            variant="outline"
            className="w-full"
          >
            Cancel &amp; Go Back
          </Button>
        </StatusCard>
        <PageFooter />
      </PageShell>
    )
  }

  if (paymentStep === 'success') {
    return (
      <PageShell centered>
        <StatusCard>
          <div className="text-center">
            <CheckCircle className="mx-auto mb-6 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold text-[#08163d]">Payment Successful!</h2>
            <p className="mb-6 text-gray-600">
              Your payment of{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrencyDisplay(amount, currency)}
              </span>{' '}
              has been sent to {merchantName}.
            </p>
          </div>

          <div className="mb-6 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Merchant</span>
              <span className="break-words text-right font-medium text-gray-900">{merchantName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-[#08163d]">{formatCurrencyDisplay(amount, currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{phoneNumber}</span>
            </div>
            {paymentDescription.trim() && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Reference</span>
                <span className="break-words text-right font-medium text-gray-900">
                  {paymentDescription.trim()}
                </span>
              </div>
            )}
            {transactionRef && (
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500">Transaction reference</p>
                <p className="break-all font-mono text-sm text-gray-900">{transactionRef}</p>
              </div>
            )}
          </div>

          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            <p>You will receive a confirmation SMS shortly.</p>
            <p className="mt-1">The merchant will also receive a payment notification.</p>
          </div>

          <Button
            onClick={() => {
              setPaymentStep('form')
              setPhoneNumber('')
              setAmount('')
              setPaymentDescription('')
              setTransactionRef('')
            }}
            className="h-12 w-full bg-main-600 text-base font-semibold hover:bg-main-700"
          >
            Make Another Payment
          </Button>
        </StatusCard>
        <PageFooter />
      </PageShell>
    )
  }

  if (paymentStep === 'error') {
    return (
      <PageShell centered>
        <StatusCard>
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#08163d]">Payment Failed</h2>
            <p className="mb-6 text-gray-600">
              {errorMessage || 'Your payment could not be processed. Please check your details and try again.'}
            </p>
          </div>

          {(phoneNumber || hasValidAmount) && (
            <div className="mb-6 space-y-3 rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm">
              {hasValidAmount && (
                <div className="flex justify-between gap-4">
                  <span className="text-red-700">Amount</span>
                  <span className="font-medium text-red-900">{formatCurrencyDisplay(amount, currency)}</span>
                </div>
              )}
              {phoneNumber && (
                <div className="flex justify-between gap-4">
                  <span className="text-red-700">Phone</span>
                  <span className="font-medium text-red-900">{phoneNumber}</span>
                </div>
              )}
              {transactionRef && (
                <div className="border-t border-red-100 pt-3">
                  <p className="text-xs text-red-600">Transaction reference</p>
                  <p className="break-all font-mono text-sm text-red-900">{transactionRef}</p>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => {
              setPaymentStep('form')
              setErrorMessage('')
              setTransactionRef('')
            }}
            className="h-12 w-full bg-main-600 text-base font-semibold hover:bg-main-700"
          >
            Try Again
          </Button>
        </StatusCard>
        <PageFooter />
      </PageShell>
    )
  }

  return (
    <PageShell centered>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
        <MerchantPanel merchant={merchantInfo} />

        <Card className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#08163d]">Payment details</h2>
            <p className="mt-1 text-sm text-gray-600">
              Fill in your Mobile Money details to complete your payment.
            </p>
          </div>

          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-5">
              {/* Phone */}
              <div>
                <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-gray-700">
                  Your phone number
                </label>
                <div className="flex overflow-hidden rounded-md border border-input focus-within:border-main-600 focus-within:ring-2 focus-within:ring-main-200">
                  <span className="flex h-12 items-center border-r border-input bg-gray-50 px-3 text-sm font-medium text-gray-600">
                    +256
                  </span>
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Smartphone className="h-4 w-4 text-gray-400" aria-hidden />
                    </div>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="700 000 000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-12 rounded-none border-0 pl-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Enter your MTN or Airtel number</p>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="mb-2 block text-sm font-medium text-gray-700">
                  Amount to pay
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-gray-500">
                    UGX
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    placeholder="5,000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-[52px] border-input pl-14 text-xl font-semibold focus-visible:border-main-600 focus-visible:ring-main-200"
                    step="100"
                    min="500"
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Minimum payment: UGX 500</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(String(preset))}
                      className={cn(
                        'text-xs',
                        amount === String(preset) &&
                          'border-main-600 bg-main-50 text-main-600 hover:bg-main-50'
                      )}
                    >
                      UGX {formatAmountLabel(String(preset))}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="paymentDescription" className="text-sm font-medium text-gray-700">
                    Payment reference <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <span className="text-xs text-gray-400">{paymentDescription.length}/100</span>
                </div>
                <Input
                  id="paymentDescription"
                  type="text"
                  placeholder="Invoice number, order number, or reason"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  maxLength={100}
                  className="h-12 focus-visible:border-main-600 focus-visible:ring-main-200"
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Paying to</span>
                    <span className="break-words text-right font-medium text-gray-900">{merchantName}</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-gray-500">Amount</span>
                    <span
                      aria-live="polite"
                      className={cn(
                        'text-right font-bold',
                        hasValidAmount ? 'text-2xl text-[#08163d]' : 'text-lg text-gray-400'
                      )}
                    >
                      {hasValidAmount ? `${currency} ${amountLabel}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-2.5">
                    <span className="text-gray-500">Payment method</span>
                    <span className="font-medium text-gray-900">Mobile Money</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !phoneNumber || !amount}
                aria-busy={isLoading}
                className="h-12 w-full bg-main-600 text-base font-semibold hover:bg-main-700 focus-visible:ring-main-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <>
                    {hasValidAmount ? `Pay ${currency} ${amountLabel}` : 'Pay now'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <PageFooter compact />
    </PageShell>
  )
}
