import { encode } from 'next-auth/jwt'
import type { MerchantVerifyOtpResponse } from './merchantOtpUser'
import { mapMerchantVerifyResponseToAuthUser } from './merchantOtpUser'

export const MERCHANT_SESSION_MAX_AGE = 4 * 60 * 60

export function getNextAuthSessionCookieName() {
  const useSecureCookies = process.env.NODE_ENV === 'production'
  return useSecureCookies
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
}

export async function createMerchantSessionToken(data: MerchantVerifyOtpResponse) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('Auth is not configured')
  }

  const authUser = mapMerchantVerifyResponseToAuthUser(data)

  return encode({
    token: {
      sub: authUser.id,
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      accessToken: authUser.accessToken,
      refreshToken: authUser.refreshToken,
      role: authUser.role,
      userType: authUser.userType,
      subscriberType: authUser.subscriberType,
      merchantCode: authUser.merchantCode,
      merchants: authUser.merchants,
      hasPendingMerchant: authUser.hasPendingMerchant,
      hasPassword: authUser.hasPassword,
      user: authUser.user,
    },
    secret,
    maxAge: MERCHANT_SESSION_MAX_AGE,
  })
}
