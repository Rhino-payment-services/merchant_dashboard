"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface MerchantAuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function MerchantAuthGuard({
  children,
  redirectTo = '/auth/login',
}: MerchantAuthGuardProps) {
  const { data: session, status } = useSession({
    required: false,
  })
  const router = useRouter()
  const hasSessionUser = Boolean(session?.user)

  useEffect(() => {
    if (status === 'unauthenticated' && !hasSessionUser) {
      router.push(redirectTo)
      return
    }

    if (status === 'authenticated' && hasSessionUser) {
      const userData = (session!.user as any)?.userData
      const mustChangePassword = userData?.mustChangePassword || userData?.isFirstLogin
      const currentPath = window.location.pathname

      if (mustChangePassword && !currentPath.includes('/auth/change-password')) {
        router.push('/auth/change-password?firstLogin=true')
      }
    }
  }, [status, hasSessionUser, session, router, redirectTo])

  // Keep the dashboard visible during merchant switches and other session updates.
  // updateSession() can briefly flip status away from "authenticated" while session data still exists.
  if (hasSessionUser) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-main-50 via-white to-main-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-main-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-main-50 via-white to-main-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting to Login</h1>
        <p className="text-gray-600">Please sign in to access your merchant dashboard</p>
      </div>
    </div>
  )
}
