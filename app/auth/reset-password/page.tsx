"use client"

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Circle, Eye, EyeOff, ShieldAlert, ShieldCheck } from 'lucide-react'
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

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problem, setProblem] = useState<ResetTokenProblem>(() =>
    !token ? 'invalid' : isResetTokenExpired(token) ? 'expired' : null,
  )
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Reset Password - RukaPay Merchant'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const invalid = validateNewPassword(password, confirm)
    if (invalid) {
      setError(invalid)
      return
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
              <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className="rounded-lg" />
            </div>
            <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
          </div>
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Reset password</h1>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {done ? (
            <div className="space-y-4 text-center">
              <ShieldCheck className="h-12 w-12 text-green-600 mx-auto" />
              <p className="font-medium text-gray-900">Your password has been reset</p>
              <p className="text-sm text-gray-600">You can now sign in with your new password.</p>
              <Button asChild className="w-full">
                <Link href="/auth/login?tab=team">Go to sign in</Link>
              </Button>
            </div>
          ) : problem ? (
            <div className="space-y-4 text-center">
              <ShieldAlert className="h-12 w-12 text-amber-600 mx-auto" />
              <p className="font-medium text-gray-900">{PROBLEM_COPY[problem].title}</p>
              <p className="text-sm text-gray-600">{PROBLEM_COPY[problem].body}</p>
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">Request a new link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/auth/login?tab=team">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="password">New password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-gray-500"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-1 text-xs">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li key={rule.label} className={`flex items-center gap-1 ${ok ? 'text-green-600' : 'text-gray-500'}`}>
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
              <div>
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
