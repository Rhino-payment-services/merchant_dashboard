"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Building2, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useAccessibleMerchants } from '@/lib/hooks/useAccessibleMerchants'
import { useMerchantSwitch } from '@/lib/hooks/useMerchantSwitch'

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
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-main-600 border-t-transparent rounded-full animate-spin mx-auto" />
          {selectedMerchantCode ? (
            <>
              <p className="text-gray-700 font-medium text-lg">Switching merchant…</p>
              <p className="text-sm text-gray-500">
                Loading dashboard for <span className="font-semibold">{selectedMerchantCode}</span>
              </p>
            </>
          ) : (
            <p className="text-gray-600">Loading…</p>
          )}
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-600">Please log in first</p>
          <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  // Pending KYC - no merchant record yet
  if (hasPendingMerchant && merchants.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className="rounded-lg mx-auto" />
            <span className="text-2xl font-bold text-[#08163d] block mt-2">RukaPay</span>
          </div>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Complete Your Registration</h2>
            <p className="text-gray-600 mb-6">
              Your account is set up. Please complete your KYC to activate your merchant account.
            </p>
            <Button onClick={() => router.push('/dashboard/kyc')} className="w-full">
              Complete KYC
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className="rounded-lg mr-3" />
            <span className="text-3xl font-bold text-[#08163d]">RukaPay</span>
          </div>
          <h1 className="text-2xl font-bold text-[#08163d] mb-2">Select Merchant Account</h1>
          <p className="text-gray-600">
            Choose which business account to access, including merchants assigned under your super merchant account.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          {merchants.filter((m) => m.isOwnAccount).map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelectMerchant(m)}
              disabled={isLoading}
              className="w-full p-4 rounded-lg border border-gray-200 hover:border-main-500 hover:bg-main-50/50 transition-all text-left flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-lg bg-main-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-main-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{m.businessTradeName || 'Business'}</p>
                  <p className="text-sm text-gray-500">Code: {m.merchantCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {m.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                    <CheckCircle className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                )}
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
          {merchants.some((m) => m.isChildMerchant) && (
            <>
              <p className="text-xs font-semibold text-gray-500 pt-2 border-t">Child Merchants</p>
              {merchants.filter((m) => m.isChildMerchant).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMerchant(m)}
                  disabled={isLoading}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-main-500 hover:bg-main-50/50 transition-all text-left flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{m.businessTradeName || 'Business'}</p>
                      <p className="text-sm text-gray-500">Code: {m.merchantCode}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </>
          )}
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          You can switch between accounts anytime from the dashboard
        </p>
      </div>
    </div>
  )
}

export default function SelectMerchantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-main-600 border-t-transparent rounded-full" />
      </div>
    }>
      <SelectMerchantContent />
    </Suspense>
  )
}
