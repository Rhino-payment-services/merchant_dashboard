"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  AlertCircle,
  Lock,
  BadgeCheck,
  Wallet,
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

type PaymentChannel = 'choose' | 'momo' | 'rukapay'
type PaymentStep = 'form' | 'processing' | 'success' | 'error' | 'rukapay_instructions'

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000] as const

const QUICK_LABELS: Record<number, string> = {
  5000: '5K',
  10000: '10K',
  20000: '20K',
  50000: '50K',
}

const DEFAULT_RUKAPAY_DIAL_STEPS = [
  'Dial *289# on the phone number you entered',
  'Select My Account (00)',
  'Select Pending payments',
  'Choose this payment and enter your RukaPay PIN',
]

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

function getMerchantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function extractNationalDigits(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('256')) cleaned = cleaned.slice(3)
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1)
  return cleaned.slice(0, 9)
}

function formatNationalPhoneDisplay(digits: string): string {
  const d = extractNationalDigits(digits)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:py-10">
      {children}
    </div>
  )
}

function CheckoutHeader() {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Image
          src="/images/logo.jpg"
          alt="RukaPay"
          width={28}
          height={28}
          className="h-7 w-7 rounded-md object-cover"
          priority
        />
        <span className="text-sm font-medium text-foreground">RukaPay</span>
      </div>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden />
        Secure
      </span>
    </header>
  )
}

function MerchantBlock({ merchant }: { merchant: MerchantInfo }) {
  const name = getMerchantName(merchant)
  const category = merchant.category || merchant.businessType

  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary/10">
        {merchant.logo ? (
          <Image
            src={merchant.logo}
            alt={name}
            width={56}
            height={56}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {getMerchantInitials(name)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{name}</h1>
        <Badge variant="success" className="gap-1 px-2 py-0.5 text-[10px] normal-case">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          Verified
        </Badge>
      </div>
      {category && (
        <p className="mt-1 text-sm text-muted-foreground">{category}</p>
      )}
    </div>
  )
}

function FieldHint({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-muted-foreground">
      {children}
    </p>
  )
}

function DetailRows({
  rows,
}: {
  rows: Array<{ label: string; value: React.ReactNode }>
}) {
  return (
    <div className="space-y-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="text-right font-medium text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-muted', className)} />
}

function PaymentPageSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-busy="true" aria-label="Loading">
      <span className="sr-only">Loading merchant information</span>
      <div className="mb-8 flex items-center justify-between">
        <SkeletonBlock className="h-7 w-28" />
        <SkeletonBlock className="h-4 w-14" />
      </div>
      <div className="mb-8 flex flex-col items-center gap-3">
        <SkeletonBlock className="h-14 w-14 rounded-full" />
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-4 w-20" />
      </div>
      <div className="space-y-5">
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  )
}

export default function ReceivePaymentPage({ params }: PaymentPageProps) {
  const [merchantCode, setMerchantCode] = useState<string>('')
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null)
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('choose')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDescription, setPaymentDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMerchantLoading, setIsMerchantLoading] = useState(true)
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('form')
  const [transactionRef, setTransactionRef] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [dialInstructions, setDialInstructions] = useState<string[]>(DEFAULT_RUKAPAY_DIAL_STEPS)
  const phoneInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (
      !isMerchantLoading &&
      merchantInfo?.isActive &&
      merchantInfo.acceptPayments &&
      paymentStep === 'form' &&
      paymentChannel !== 'choose'
    ) {
      phoneInputRef.current?.focus()
    }
  }, [isMerchantLoading, merchantInfo, paymentStep, paymentChannel])

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

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(formatNationalPhoneDisplay(value))
  }

  const resetFormFields = () => {
    setPhoneNumber('')
    setAmount('')
    setPaymentDescription('')
    setTransactionRef('')
    setErrorMessage('')
    setDialInstructions(DEFAULT_RUKAPAY_DIAL_STEPS)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (paymentChannel === 'choose') {
      toast.error('Please choose how you want to pay')
      return
    }

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

      if (paymentChannel === 'rukapay') {
        const response = await fetch(`${API_URL}/public/merchant-payment/rukapay-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantCode,
            payerPhone: formattedPhone,
            amount: numAmount,
            ...(paymentDescription.trim() && { description: paymentDescription.trim() }),
          }),
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.message || result.error || 'Failed to create payment request')
        }
        if (result.id) {
          setTransactionRef(result.id)
        }
        if (Array.isArray(result.dialInstructions) && result.dialInstructions.length > 0) {
          setDialInstructions(result.dialInstructions)
        }
        setPaymentStep('rukapay_instructions')
        setIsLoading(false)
        toast.success('Payment request created. Dial *289# to approve.')
        return
      }

      const response = await fetch(`${API_URL}/public/merchant-payment/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode,
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
  const displayPhone = phoneNumber || '—'
  const payButtonLabel =
    paymentChannel === 'rukapay'
      ? hasValidAmount
        ? `Continue · ${currency} ${amountLabel}`
        : 'Continue to *289#'
      : hasValidAmount
        ? `Pay ${currency} ${amountLabel}`
        : 'Pay now'

  if (isMerchantLoading) {
    return (
      <PageShell>
        <PaymentPageSkeleton />
      </PageShell>
    )
  }

  if (!merchantInfo) {
    return (
      <PageShell>
        <CheckoutHeader />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">Merchant not found</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            The merchant code you scanned is invalid or expired.
          </p>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </PageShell>
    )
  }

  if (!merchantInfo.isActive || !merchantInfo.acceptPayments) {
    return (
      <PageShell>
        <CheckoutHeader />
        <MerchantBlock merchant={merchantInfo} />
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="mb-2 text-xl font-semibold">Not accepting payments</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {merchantName} is currently not accepting payments.
          </p>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </PageShell>
    )
  }

  if (paymentStep === 'rukapay_instructions') {
    return (
      <PageShell>
        <CheckoutHeader />
        <MerchantBlock merchant={merchantInfo} />
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Approve on *289#</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Use the RukaPay wallet on{' '}
            <span className="font-medium text-foreground">{displayPhone}</span>. Dial{' '}
            <span className="font-medium text-foreground">*289#</span>
            {' '}→ My Account → Pending payments → PIN.
          </p>
        </div>

        <DetailRows
          rows={[
            { label: 'Merchant', value: merchantName },
            { label: 'Amount', value: formatCurrencyDisplay(amount, currency) },
            { label: 'Phone', value: displayPhone },
            ...(transactionRef
              ? [{ label: 'Request ID', value: <span className="font-mono text-xs">{transactionRef.slice(0, 8)}…</span> }]
              : []),
          ]}
        />

        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">How to complete payment</p>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {dialInstructions.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </div>

        <Button
          variant="ghost"
          className="mt-8 w-full"
          onClick={() => {
            setPaymentStep('form')
            setPaymentChannel('choose')
            setIsLoading(false)
            resetFormFields()
          }}
        >
          Done
        </Button>
      </PageShell>
    )
  }

  if (paymentStep === 'processing' && paymentChannel === 'momo') {
    return (
      <PageShell>
        <CheckoutHeader />
        <MerchantBlock merchant={merchantInfo} />
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-7 w-7 animate-pulse text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Check your phone</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            A Mobile Money prompt was sent to{' '}
            <span className="font-medium text-foreground">{displayPhone}</span>
          </p>
        </div>

        <DetailRows
          rows={[
            { label: 'Merchant', value: merchantName },
            { label: 'Amount', value: formatCurrencyDisplay(amount, currency) },
            { label: 'Phone', value: displayPhone },
            ...(transactionRef
              ? [{ label: 'Reference', value: <span className="font-mono text-xs">{transactionRef}</span> }]
              : []),
          ]}
        />

        <ol className="mt-8 space-y-2 text-sm text-muted-foreground">
          <li>1. Open the Mobile Money prompt</li>
          <li>2. Confirm merchant and amount</li>
          <li>3. Enter your PIN</li>
        </ol>

        <Button
          variant="ghost"
          className="mt-8 w-full"
          onClick={() => {
            setPaymentStep('form')
            setIsLoading(false)
            resetFormFields()
          }}
        >
          Cancel
        </Button>
      </PageShell>
    )
  }

  if (paymentStep === 'processing') {
    return (
      <PageShell>
        <CheckoutHeader />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Creating your payment request…</p>
        </div>
      </PageShell>
    )
  }

  if (paymentStep === 'success') {
    return (
      <PageShell>
        <CheckoutHeader />
        <div className="flex flex-1 flex-col items-center text-center">
          <CheckCircle className="mb-4 h-14 w-14 text-green-600" />
          <h2 className="mb-2 text-xl font-semibold">Payment successful</h2>
          <p className="mb-8 text-sm text-muted-foreground">
            {formatCurrencyDisplay(amount, currency)} sent to {merchantName}
          </p>
        </div>

        <DetailRows
          rows={[
            { label: 'Merchant', value: merchantName },
            { label: 'Amount', value: formatCurrencyDisplay(amount, currency) },
            { label: 'Phone', value: displayPhone },
            ...(paymentDescription.trim()
              ? [{ label: 'Description', value: paymentDescription.trim() }]
              : []),
            ...(transactionRef
              ? [{ label: 'Reference', value: <span className="font-mono text-xs">{transactionRef}</span> }]
              : []),
          ]}
        />

        <Button
          className="mt-8 h-12 w-full"
          onClick={() => {
            setPaymentStep('form')
            setPaymentChannel('choose')
            resetFormFields()
          }}
        >
          Make another payment
        </Button>
      </PageShell>
    )
  }

  if (paymentStep === 'error') {
    return (
      <PageShell>
        <CheckoutHeader />
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">Payment failed</h2>
          <p className="mb-8 text-sm text-muted-foreground">
            {errorMessage || 'Something went wrong. Please try again.'}
          </p>
        </div>

        <Button
          className="h-12 w-full"
          onClick={() => {
            setPaymentStep('form')
            setErrorMessage('')
            setTransactionRef('')
          }}
        >
          Try again
        </Button>
      </PageShell>
    )
  }

  if (paymentChannel === 'choose') {
    return (
      <PageShell>
        <CheckoutHeader />
        <MerchantBlock merchant={merchantInfo} />
        <p className="mb-4 text-center text-sm text-muted-foreground">Choose how to pay</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setPaymentChannel('rukapay')}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Pay with RukaPay</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Use your RukaPay wallet. After this page, dial *289# → My Account → Pending payments → enter PIN.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentChannel('momo')}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Mobile Money</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                MTN or Airtel. You will get a prompt on your phone to confirm with your MoMo PIN.
              </span>
            </span>
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <CheckoutHeader />
      <MerchantBlock merchant={merchantInfo} />

      <button
        type="button"
        onClick={() => setPaymentChannel('choose')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Change payment method
      </button>

      <div className="mb-5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {paymentChannel === 'rukapay' ? (
          <>
            Paying with <span className="font-medium text-foreground">RukaPay wallet</span>. Dial{' '}
            <span className="font-medium text-foreground">*289#</span>
            {' '}→ My Account → Pending payments → PIN.
          </>
        ) : (
          <>
            Paying with <span className="font-medium text-foreground">Mobile Money</span>. A prompt will be sent to your phone.
          </>
        )}
      </div>

      <form onSubmit={handlePaymentSubmit} className="flex flex-1 flex-col">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              {paymentChannel === 'rukapay' ? 'RukaPay phone number' : 'Phone number'}
            </Label>
            <div className="flex gap-2">
              <Input
                value="+256"
                readOnly
                tabIndex={-1}
                aria-hidden
                className="h-12 w-[4.75rem] shrink-0 text-center font-medium text-muted-foreground"
              />
              <Input
                ref={phoneInputRef}
                id="phoneNumber"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="700 123 456"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="h-12"
                required
                aria-describedby="phone-help"
              />
            </div>
            <FieldHint id="phone-help">
              {paymentChannel === 'rukapay'
                ? 'Must be the phone registered on your RukaPay account'
                : 'MTN or Airtel mobile money number'}
            </FieldHint>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                {currency}
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.]/g, '')
                  setAmount(next)
                }}
                className="h-14 pl-14 text-2xl font-semibold tracking-tight"
                required
                aria-describedby="amount-help"
              />
            </div>
            <FieldHint id="amount-help">Minimum {currency} 500</FieldHint>

            <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Quick amounts">
              {QUICK_AMOUNTS.map((preset) => {
                const selected = amount === String(preset)
                return (
                  <Button
                    key={preset}
                    type="button"
                    variant={selected ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setAmount(String(preset))}
                    aria-pressed={selected}
                    className="rounded-full px-4"
                  >
                    {QUICK_LABELS[preset]}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="paymentDescription">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <span className="text-xs text-muted-foreground">{paymentDescription.length}/100</span>
            </div>
            <Input
              id="paymentDescription"
              type="text"
              placeholder="Invoice, Order ID or Note"
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              maxLength={100}
              className="h-12"
            />
          </div>
        </div>

        <div className="mt-auto pt-8">
          <Button
            type="submit"
            disabled={isLoading || !phoneNumber || !amount}
            aria-busy={isLoading}
            className="h-12 w-full text-base"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {payButtonLabel}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {paymentChannel === 'rukapay'
              ? 'Next: dial *289# → My Account → Pending payments → PIN'
              : "You'll confirm on your phone with Mobile Money PIN"}
          </p>
        </div>
      </form>
    </PageShell>
  )
}
