"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface MerchantUser {
  id: string
  old_id: string | null
  email: string
  phone: string
  role: string
  userType: string
  subscriberType: string
  status: string
  isVerified: boolean
  otpPreference: string
  enableSmsOtp: boolean
  enableEmailOtp: boolean
  kycStatus: string
  verificationLevel: string
  canHaveWallet: boolean
  merchantCode?: string | null
  lastLoginAt: string
  createdAt: string
  updatedAt: string
  profile: {
    id: string
    userId: string
    firstName: string
    middleName: string | null
    lastName: string
    dateOfBirth: string
    gender: string
    nationalId: string | null
    address: string
    city: string
    country: string
    typeData: any
    profileType: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

interface AuthState {
  isAuthenticated: boolean
  user: MerchantUser | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (userData: MerchantUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateAuthData: (userData?: MerchantUser) => void
}

const MerchantAuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateAuthData: () => {}
})

export const useMerchantAuth = () => {
  const context = useContext(MerchantAuthContext)
  if (!context) {
    throw new Error('useMerchantAuth must be used within a MerchantAuthProvider')
  }
  return context
}

interface MerchantAuthProviderProps {
  children: ReactNode
}

export const MerchantAuthProvider = ({ children }: MerchantAuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  })

  // Check authentication on mount and when localStorage changes
  useEffect(() => {
    checkAuthFromStorage()
  }, [])

  // Listen for storage changes (for logout from other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      checkAuthFromStorage()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const checkAuthFromStorage = () => {
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      const merchantData = localStorage.getItem('merchantData')
      const authTimestamp = localStorage.getItem('authTimestamp')

      // Check if session is expired (24 hours)
      if (authTimestamp) {
        const tokenAge = Date.now() - parseInt(authTimestamp)
        const isExpired = tokenAge > 24 * 60 * 60 * 1000 // 24 hours in milliseconds

        if (isExpired) {
          logout()
          return
        }
      }

      if (isAuthenticated && accessToken && refreshToken && merchantData) {
        const userData = JSON.parse(merchantData) as MerchantUser
        
        setAuthState({
          isAuthenticated: true,
          user: userData,
          accessToken,
          refreshToken,
          isLoading: false,
        })
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('Error checking auth from storage:', error)
      setAuthState({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      })
    }
  }

  const login = (userData: MerchantUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('merchantData', JSON.stringify(userData))
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('authTimestamp', Date.now().toString())

    setAuthState({
      isAuthenticated: true,
      user: userData,
      accessToken,
      refreshToken,
      isLoading: false,
    })
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('merchantData')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('authTimestamp')

    setAuthState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    })
  }

  const updateAuthData = (userData?: MerchantUser) => {
    if (userData) {
      localStorage.setItem('merchantData', JSON.stringify(userData))
      setAuthState(prev => ({
        ...prev,
        user: userData,
      }))
    } else {
      checkAuthFromStorage()
    }
  }

  return (
    <MerchantAuthContext.Provider 
      value={{
        ...authState,
        login,
        logout,
        updateAuthData,
      }}
    >
      {children}
    </MerchantAuthContext.Provider>
  )
}
