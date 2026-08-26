import { slimSessionMerchants, slimSessionUser } from './sessionPayload'

export type MerchantVerifyOtpResponse = {
  success?: boolean
  message?: string
  user?: {
    id: string
    email?: string | null
    phone?: string | null
    password?: string | null
    role?: string
    userType?: string
    subscriberType?: string
    merchantCode?: string | null
    merchants?: unknown[]
    hasPendingMerchant?: boolean
    hasPassword?: boolean
    mustChangePassword?: boolean
    isFirstLogin?: boolean
    mustSetupMerchantPortalPin?: boolean
    merchantPortalPinSet?: boolean
    pinLoginEnabled?: boolean
    profile?: { firstName?: string; lastName?: string } | null
    [key: string]: unknown
  }
  accessToken?: string
  refreshToken?: string
}

export function mapMerchantVerifyResponseToAuthUser(data: MerchantVerifyOtpResponse) {
  const user = data.user
  if (!data.success || !user || !data.accessToken || !data.refreshToken) {
    throw new Error(data.message || 'OTP verification failed')
  }

  const name =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.phone ||
    user.email ||
    'Merchant'

  return {
    id: user.id,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    name,
    role: user.role,
    userType: user.userType,
    subscriberType: user.subscriberType,
    merchantCode: user.merchantCode ?? undefined,
    merchants: slimSessionMerchants(user.merchants || []),
    hasPendingMerchant: user.hasPendingMerchant || false,
    hasPassword: user.hasPassword ?? !!user.password,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: slimSessionUser({
      ...user,
      mustChangePassword: user.mustChangePassword || user.isFirstLogin || false,
      isFirstLogin: user.isFirstLogin || false,
      mustSetupMerchantPortalPin: user.mustSetupMerchantPortalPin || false,
      merchantPortalPinSet: user.merchantPortalPinSet || false,
      pinLoginEnabled: user.pinLoginEnabled || false,
    }),
  }
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axiosLikeError(error)) {
    const data = error.response?.data
    if (typeof data?.message === 'string') return data.message
    if (Array.isArray(data?.message)) return data.message[0] || fallback
    if (typeof data?.error === 'string') return data.error
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function axiosLikeError(
  error: unknown,
): error is { response?: { data?: { message?: string | string[]; error?: string } } } {
  return typeof error === 'object' && error !== null && 'response' in error
}
