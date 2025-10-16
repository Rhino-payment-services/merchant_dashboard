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
  redirectTo = '/auth/login' 
}: MerchantAuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-main-50 via-white to-main-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-main-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show redirect message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-main-50 via-white to-main-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting to Login</h1>
          <p className="text-gray-600">Please sign in to access your merchant dashboard</p>
        </div>
      </div>
    )
  }

  // Render children if authenticated
  return <>{children}</>
}
