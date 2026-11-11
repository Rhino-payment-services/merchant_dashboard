"use client"

import React, { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import AuthShell from '@/components/auth/AuthShell'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthStatus from '@/components/auth/AuthStatus'
import AuthLoading from '@/components/auth/AuthLoading'
import FormAlert from '@/components/auth/FormAlert'
import { authButtonClass, authLinkClass, authSecondaryButtonClass, EMAIL_PATTERN } from '@/components/auth/authStyles'
import { requestPasswordReset } from '@/lib/auth/passwordReset'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(() => searchParams.get('email') || '')
  const [isLoading, setIsLoading] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Forgot Password - RukaPay Merchant'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError(email.trim() ? 'Enter a valid email address.' : 'Enter your email address.')
      emailRef.current?.focus()
      return
    }
    setIsLoading(true)
    try {
      setSentMessage(await requestPasswordReset(email))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (sentMessage) {
    return (
      <AuthShell>
        <AuthStatus
          tone="success"
          title="Check your email"
          description={sentMessage}
          actions={
            <>
              <Button asChild className={authButtonClass}>
                <Link href="/auth/login?tab=team">Back to sign in</Link>
              </Button>
              <Button type="button" variant="outline" className={authSecondaryButtonClass} onClick={() => setSentMessage(null)}>
                Send another link
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-slate-500">
            Didn&apos;t get an email? Check your spam folder or try again in a few minutes.
          </p>
        </AuthStatus>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeader
        backHref="/auth/login?tab=team"
        title="Reset your password"
        description="Enter the email you use to sign in and we'll send you a link to reset your password. For team members who sign in with email and password."
      />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <TextField
          ref={emailRef}
          variant="floating"
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          placeholder="you@business.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailError(undefined)
          }}
          error={emailError}
          required
        />

        <Button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        Remember your password?{' '}
        <Link href="/auth/login?tab=team" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
