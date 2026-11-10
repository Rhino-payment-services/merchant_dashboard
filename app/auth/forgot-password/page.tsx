"use client"

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MailCheck } from 'lucide-react'
import { requestPasswordReset } from '@/lib/auth/passwordReset'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(() => searchParams.get('email') || '')
  const [isLoading, setIsLoading] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Forgot Password - RukaPay Merchant'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address')
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
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Forgot password</h1>
          <p className="text-gray-600">For team members who sign in with email and password.</p>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {sentMessage ? (
            <div className="space-y-4 text-center">
              <MailCheck className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-gray-700">{sentMessage}</p>
              <p className="text-xs text-gray-500">
                Didn&apos;t get an email? Check your spam folder or try again in a few minutes.
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/login?tab=team">Back to sign in</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setSentMessage(null)}
              >
                Send another link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="mt-1"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}

          <p className="text-xs text-center text-gray-500 mt-6">
            Remember your password?{' '}
            <Link href="/auth/login?tab=team" className="text-main-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
