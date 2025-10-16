"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Label component not available, using semantic HTML instead
// Alert component not available, using custom div instead
import { Loader2, CheckCircle, Clock, ArrowLeft, CreditCard, Smartphone } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useMerchantAuth } from '@/lib/context/MerchantAuthContext'

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

export default function ReceivePaymentPage({ params }: PaymentPageProps) {
  const { user } = useMerchantAuth()
  const [merchantCode, setMerchantCode] = useState<string>('')
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMerchantLoading, setIsMerchantLoading] = useState(true)
  const [paymentStep, setPaymentStep] = useState<'form' | 'confirm' | 'processing' | 'success' | 'error'>('form')

  // Extract merchant code from params
  useEffect(() => {
    params.then(p => setMerchantCode(p.merchant_code))
  }, [params])

  // Fetch merchant information
  useEffect(() => {
    if (!merchantCode) return
    
    const fetchMerchantInfo = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL
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

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber || !amount) {
      toast.error('Please fill in all required fields')
      return
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    setPaymentStep('processing')
    setIsLoading(true)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Here you would call your actual payment API
      setPaymentStep('success')
      toast.success('Payment processed successfully!')
    } catch (error) {
      setPaymentStep('error')
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: merchantInfo?.currency || 'UGX'
    }).format(parseFloat(amount) || 0)
  }

  if (isMerchantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-main-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading merchant...</h2>
          <p className="text-gray-600">Please wait while we fetch merchant information</p>
        </div>
      </div>
    )
  }

  if (!merchantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Merchant Not Found</h2>
          <span className="text-gray-600 mb-4">The merchant code you scanned is invalid or expired.</span>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  // Check if merchant is active and accepts payments
  if (!merchantInfo.isActive || !merchantInfo.acceptPayments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <h2 className="text-xl font-semibold text-orange-600 mb-2">Merchant Not Accepting Payments</h2>
          <p className="text-gray-600 mb-4">
            This merchant ({merchantInfo.displayName || merchantInfo.businessName}) is currently not accepting payments.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  if (paymentStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-4">
                  Your payment of <span className="font-semibold">{formatCurrency(amount)}</span> has been sent to {merchantInfo.displayName || merchantInfo.businessName}.
                </p>
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">
              You will receive a confirmation SMS shortly
            </p>
          </div>
          <Button onClick={() => {
            setPaymentStep('form')
            setPhoneNumber('')
            setAmount('')
          }} className="w-full">
            Make Another Payment
          </Button>
        </Card>
      </div>
    )
  }

  if (paymentStep === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">
            Your payment could not be processed. Please check your details and try again.
          </p>
          <Button onClick={() => setPaymentStep('form')} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-main-50 to-main-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {merchantInfo.logo ? (
              <Image 
                src={merchantInfo.logo} 
                alt={merchantInfo.displayName || merchantInfo.businessName}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="text-2xl font-bold text-white">
                {(merchantInfo.displayName || merchantInfo.businessName).charAt(0)}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{merchantInfo.displayName || merchantInfo.businessName}</h1>
          {merchantInfo.description && (
            <p className="text-gray-600 mb-4">{merchantInfo.description}</p>
          )}
                {merchantInfo.businessType && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {merchantInfo.businessType}
                  </span>
                )}
                {merchantInfo.category && merchantInfo.category !== 'General' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 ml-2">
                    {merchantInfo.category}
                  </span>
                )}
        </div>

        {/* Payment Form */}
        <Card className="p-6 mb-6">
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 mb-2 block">
                  Your Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+256 700 000 000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="amount" className="text-sm font-medium text-gray-700 mb-2 block">
                  Amount to Pay
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  You are about to send {formatCurrency(amount)} to {merchantInfo.displayName || merchantInfo.businessName}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full py-3 text-lg font-semibold"
                disabled={isLoading || !phoneNumber || !amount}
              >
                {isLoading ? (
              <LoadingSpinner />
                ) : (
                  <>
                    Pay {formatCurrency(amount)}
                    <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Trust Indicators */}
        <Card className="p-4 bg-gray-50">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Secure Payment
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-blue-500 mr-1" />
              Instant Transfer
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold text-main-600">RukaPay</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      Processing...
    </div>
  )
}
