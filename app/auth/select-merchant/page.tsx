"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Building2, CheckCircle2, Clock, ChevronRight, ArrowRight } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthStatus from '@/components/auth/AuthStatus'
import AuthLoading from '@/components/auth/AuthLoading'
import { authButtonClass } from '@/components/auth/authStyles'
import { cn } from '@/lib/utils'
import { useAccessibleMerchants } from '@/lib/hooks/useAccessibleMerchants'
import { useMerchantSwitch } from '@/lib/hooks/useMerchantSwitch'

type Merchant = ReturnType<typeof useAccessibleMerchants>['merchants'][number]

const rowClass =
  "group flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/50 hover:bg-slate-50/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  )
}

function SelectMerchantContent() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { switchMerchant, switching: merchantSwitching } = useMerchantSwitch()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMerchantCode, setSelectedMerchantCode] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Select Merchant - RukaPay'
  }, [])

  const { merchants, loadingChildren } = useAccessibleMerchants()
  const hasPendingMerchant = (session?.user as any)?.hasPendingMerchant === true

  const handleSelectMerchant = async (merchant: (typeof merchants)[number]) => {
    setIsLoading(true)
    setSelectedMerchantCode(merchant.merchantCode)
    const success = await switchMerchant(merchant, '/')
    if (!success) {
      setIsLoading(false)
      setSelectedMerchantCode(null)
    }
  }

  // Show full-screen loader while switching (or initial session / child merchant load)
  if (isLoading || merchantSwitching || status === 'loading' || loadingChildren) {
    return (
      <AuthShell>
        <AuthStatus
          tone="loading"
          title={selectedMerchantCode ? 'Switching merchant…' : 'Loading…'}
          description={
            selectedMerchantCode ? (
              <>
                Loading dashboard for <span className="font-medium text-slate-800">{selectedMerchantCode}</span>
              </>
            ) : undefined
          }
        />
      </AuthShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <AuthShell>
        <AuthStatus
          tone="info"
          title="Please log in first"
          description="You need to sign in before choosing a business account."
          actions={
            <Button onClick={() => router.push('/auth/login')} className={authButtonClass}>
              Go to login
            </Button>
          }
        />
      </AuthShell>
    )
  }

  // Pending KYC - no merchant record yet
  if (hasPendingMerchant && merchants.length === 0) {
    return (
      <AuthShell>
        <AuthStatus
          tone="info"
          title="Complete your registration"
          description="Your account is set up. Please complete your KYC to activate your merchant account."
          actions={
            <Button onClick={() => router.push('/dashboard/kyc')} className={authButtonClass}>
              Complete KYC
              <ArrowRight aria-hidden />
            </Button>
          }
        />
      </AuthShell>
    )
  }

  // Single merchant - auto proceed to dashboard
  if (merchants.length === 1) {
    const m = merchants[0]
    const currentCode = (session?.user as any)?.merchantCode
    if (currentCode !== m.merchantCode) {
      handleSelectMerchant(m)
      return null // loader above will render on next tick once isLoading=true
    }
    router.replace('/')
    return null
  }

  // No merchants, no pending - go to dashboard (fallback)
  if (merchants.length === 0 && !hasPendingMerchant) {
    router.replace('/')
    router.refresh()
    return null
  }

  const merchantRow = (m: Merchant) => (
    <li key={m.id}>
      <button type="button" onClick={() => handleSelectMerchant(m)} disabled={isLoading} className={rowClass}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              m.isChildMerchant ? "bg-slate-100 text-slate-500" : "bg-primary/5 text-primary"
            )}
          >
            <Building2 className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-slate-900">{m.businessTradeName || 'Business'}</p>
            <p className="text-[13px] text-slate-500">
              Code: {m.merchantCode}
              {!m.isChildMerchant && !m.isOwnAccount ? ' · Team access' : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!m.isChildMerchant && !m.isOwnAccount && <Badge className="bg-violet-50 text-violet-700">Team</Badge>}
          {!m.isChildMerchant &&
            (m.isActive ? (
              <Badge className="bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-3" aria-hidden /> Active
              </Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-700">
                <Clock className="size-3" aria-hidden /> Pending
              </Badge>
            ))}
          <ChevronRight
            className="size-4 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        </div>
      </button>
    </li>
  )

  const ownMerchants = merchants.filter((m) => !m.isChildMerchant)
  const childMerchants = merchants.filter((m) => m.isChildMerchant)

  return (
    <AuthShell>
      <AuthHeader
        title="Choose a business"
        description="Choose which business account to access, including merchants assigned under your super merchant account."
      />

      <ul className="mt-8 space-y-2.5">{ownMerchants.map(merchantRow)}</ul>

      {childMerchants.length > 0 && (
        <>
          <p className="mt-6 border-t border-slate-100 pt-5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Child merchants
          </p>
          <ul className="mt-3 space-y-2.5">{childMerchants.map(merchantRow)}</ul>
        </>
      )}

      <p className="mt-8 text-center text-[13px] text-slate-500">
        You can switch between accounts anytime from the dashboard.
      </p>
    </AuthShell>
  )
}

export default function SelectMerchantPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SelectMerchantContent />
    </Suspense>
  )
}
