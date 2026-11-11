"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import AuthShell from '@/components/auth/AuthShell'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthLoading from '@/components/auth/AuthLoading'
import { authButtonClass } from '@/components/auth/authStyles'
import { toast } from 'sonner'
import { setupMerchantPortalPin } from '@/lib/auth/merchantPortalAuth'

type PinErrors = { currentPin?: string; newPin?: string; confirmPin?: string }

function SetupPortalPinContent() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [errors, setErrors] = useState<PinErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const currentRef = useRef<HTMLInputElement>(null)
  const newRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

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

  const pinField = (
    id: keyof PinErrors,
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
        setErrors((current) => ({ ...current, [id]: undefined }))
      }}
      error={errors[id]}
      required
    />
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: PinErrors = {}
    if (portalPinSet && !currentPin) nextErrors.currentPin = 'Enter your current portal PIN.'
    if (!newPin) nextErrors.newPin = 'Enter a portal PIN.'
    if (!confirmPin) nextErrors.confirmPin = 'Confirm your portal PIN.'
    setErrors(nextErrors)
    if (nextErrors.currentPin) return currentRef.current?.focus()
    if (nextErrors.newPin) return newRef.current?.focus()
    if (nextErrors.confirmPin) return confirmRef.current?.focus()

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
    return <AuthLoading />
  }

  return (
    <AuthShell>
      <AuthHeader
        title={portalPinSet ? 'Change portal PIN' : 'Set up portal PIN'}
        description="This PIN is for signing in to the merchant dashboard only. It is separate from your mobile app PIN."
      />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {portalPinSet && pinField('currentPin', 'Current portal PIN', currentPin, setCurrentPin, currentRef)}
        {pinField('newPin', portalPinSet ? 'New portal PIN' : 'Portal PIN (4–6 digits)', newPin, setNewPin, newRef)}
        {pinField('confirmPin', 'Confirm portal PIN', confirmPin, setConfirmPin, confirmRef)}

        <Button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            'Save portal PIN'
          )}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function SetupPortalPinPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SetupPortalPinContent />
    </Suspense>
  )
}
