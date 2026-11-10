"use client"

import React, { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import AuthShell from '@/components/auth/AuthShell'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthStatus from '@/components/auth/AuthStatus'
import AuthLoading from '@/components/auth/AuthLoading'
import FormAlert from '@/components/auth/FormAlert'
import { authButtonClass, authSecondaryButtonClass } from '@/components/auth/authStyles'
import { cn } from '@/lib/utils'
import {
  PASSWORD_RULES,
  classifyResetError,
  isResetTokenExpired,
  resetPassword,
  validateNewPassword,
  type ResetTokenProblem,
} from '@/lib/auth/passwordReset'

const PROBLEM_COPY: Record<Exclude<ResetTokenProblem, null>, { title: string; body: string }> = {
  expired: {
    title: 'This link has expired',
    body: 'Password reset links are valid for 1 hour. Request a new link to continue.',
  },
  used: {
    title: 'This link has already been used',
    body: 'Your password was already changed with this link. Request a new link if you need to reset it again.',
  },
  invalid: {
    title: 'This link is not valid',
    body: 'The reset link is incomplete or incorrect. Request a new link to continue.',
  },
}

type PasswordErrors = { password?: string; confirm?: string }

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<ResetTokenProblem>(() =>
    !token ? 'invalid' : isResetTokenExpired(token) ? 'expired' : null,
  )
  const [done, setDone] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Reset Password - RukaPay Merchant'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const invalid = validateNewPassword(password, confirm)
    if (invalid) {
      if (invalid === 'Passwords do not match') {
        setErrors({ confirm: invalid })
        confirmRef.current?.focus()
      } else {
        setErrors({ password: invalid })
        passwordRef.current?.focus()
      }
      return
    }
    setErrors({})
    setIsLoading(true)
    try {
      await resetPassword(token, password, confirm)
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password'
      const tokenProblem = classifyResetError(message)
      if (tokenProblem) setProblem(tokenProblem)
      else setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell>
        <AuthStatus
          tone="success"
          title="Your password has been reset"
          description="You can now sign in with your new password."
          actions={
            <Button asChild className={authButtonClass}>
              <Link href="/auth/login?tab=team">Go to sign in</Link>
            </Button>
          }
        />
      </AuthShell>
    )
  }

  if (problem) {
    return (
      <AuthShell>
        <AuthStatus
          tone="warning"
          title={PROBLEM_COPY[problem].title}
          description={PROBLEM_COPY[problem].body}
          actions={
            <>
              <Button asChild className={authButtonClass}>
                <Link href="/auth/forgot-password">Request a new link</Link>
              </Button>
              <Button asChild variant="outline" className={authSecondaryButtonClass}>
                <Link href="/auth/login?tab=team">Back to sign in</Link>
              </Button>
            </>
          }
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeader
        backHref="/auth/login?tab=team"
        title="Choose a new password"
        description="You'll use it the next time you sign in."
      />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <div>
          <TextField
            ref={passwordRef}
            variant="floating"
            id="password"
            type="password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((current) => ({ ...current, password: undefined }))
            }}
            error={errors.password}
            aria-describedby="password-rules"
            required
          />
          <ul id="password-rules" className="mt-3 grid gap-1.5 text-[13px] sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password)
              return (
                <li
                  key={rule.label}
                  className={cn('flex items-center gap-1.5 transition-colors', ok ? 'text-primary' : 'text-slate-500')}
                >
                  {ok ? <CheckCircle2 className="size-3.5 shrink-0" aria-hidden /> : <Circle className="size-3.5 shrink-0" aria-hidden />}
                  {rule.label}
                </li>
              )
            })}
          </ul>
        </div>

        <TextField
          ref={confirmRef}
          variant="floating"
          id="confirm"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            setErrors((current) => ({ ...current, confirm: undefined }))
          }}
          error={errors.confirm}
          required
        />

        <Button type="submit" className={authButtonClass} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Resetting…
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
