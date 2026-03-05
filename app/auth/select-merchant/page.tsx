"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Building2, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

function SelectMerchantContent() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMerchantCode, setSelectedMerchantCode] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Select Merchant - RukaPay'
  }, [])

  const merchants = (session?.user as any)?.merchants || []
  const hasPendingMerchant = (session?.user as any)?.hasPendingMerchant === true

  const handleSelectMerchant = async (merchantCode: string) => {
    setIsLoading(true)
    setSelectedMerchantCode(merchantCode)
    try {
      await update({ merchantCode })
      toast.success('Merchant selected')
      // Wait for session to propagate before navigating so dashboard fetches use correct X-Merchant-Code
      await new Promise(resolve => setTimeout(resolve, 400))
      const { getSession } = await import('next-auth/react')
      const updatedSession = await getSession()
      const updatedCode = (updatedSession?.user as any)?.merchantCode
      if (updatedCode === merchantCode || String(updatedCode) === String(merchantCode)) {
        router.push('/')
        router.refresh()
      } else {
        // Session not yet propagated - wait a bit more then navigate anyway
        await new Promise(resolve => setTimeout(resolve, 300))
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      toast.error('Failed to switch merchant')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-main-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{status === 'loading' ? 'Loading...' : 'Please log in first'}</p>
          {status === 'unauthenticated' && (
            <Button onClick={() => router.push('/auth/login')} className="mt-4">
              Go to Login
            </Button>
          )}
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
      handleSelectMerchant(m.merchantCode)
      return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-main-600 border-t-transparent rounded-full" /></div>
    }
    router.replace('/')
    router.refresh()
    return null
  }

  // No merchants, no pending - go to dashboard (fallback)
  if (merchants.length === 0 && !hasPendingMerchant) {
    router.replace('/')
    router.refresh()
    return null
  }

  // Multiple merchants - show selection
  if (isLoading && selectedMerchantCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-main-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-gray-700 font-medium text-lg">Switching merchant...</div>
          <div className="text-sm text-gray-500">
            Loading dashboard for code <span className="font-semibold">{selectedMerchantCode}</span>
          </div>
        </div>
      </div>
    )
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
            You have multiple merchant accounts. Choose which one to access.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          {merchants.map((m: { id: string; merchantCode: string; businessTradeName: string; isActive: boolean; isVerified?: boolean }) => (
            <button
              key={m.id}
              onClick={() => handleSelectMerchant(m.merchantCode)}
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
