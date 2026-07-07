"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PinInput } from '@/components/ui/pin-input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { setupMerchantPortalPin } from '@/lib/auth/merchantPortalAuth'

function SetupPortalPinContent() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const userData = (session?.user as { userData?: { merchantPortalPinSet?: boolean } })?.userData
  const portalPinSet = userData?.merchantPortalPinSet === true

  useEffect(() => {
    document.title = 'Set Portal PIN - RukaPay Merchant'
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login')
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) {
      toast.error('Session expired. Please sign in again.')
      router.replace('/auth/login')
      return
    }

    setIsLoading(true)
    try {
      await setupMerchantPortalPin(
        accessToken,
        newPin,
        confirmPin,
        portalPinSet ? currentPin : undefined,
      )
      await update({
        user: {
          ...(session?.user as object),
          userData: {
            ...((session?.user as { userData?: Record<string, unknown> })?.userData || {}),
            merchantPortalPinSet: true,
            mustSetupMerchantPortalPin: false,
          },
        },
      })
      toast.success('Merchant portal PIN saved')
      router.replace('/')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save PIN')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-0">
        <h1 className="text-2xl font-bold text-[#08163d] mb-2">
          {portalPinSet ? 'Change portal PIN' : 'Set up portal PIN'}
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          This PIN is for signing in to the merchant dashboard only. It is separate from your mobile app PIN.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {portalPinSet && (
            <div>
              <Label htmlFor="currentPin">Current portal PIN</Label>
              <div className="mt-1">
                <PinInput
                  id="currentPin"
                  value={currentPin}
                  onChange={setCurrentPin}
                  required
                />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="newPin">{portalPinSet ? 'New portal PIN' : 'Portal PIN (4–6 digits)'}</Label>
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
            <Label htmlFor="confirmPin">Confirm portal PIN</Label>
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
            {isLoading ? 'Saving…' : 'Save portal PIN'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function SetupPortalPinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <SetupPortalPinContent />
    </Suspense>
  )
}
