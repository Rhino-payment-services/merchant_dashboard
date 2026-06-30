import { encode } from 'next-auth/jwt'
import type { MerchantVerifyOtpResponse } from './merchantOtpUser'
import { mapMerchantVerifyResponseToAuthUser } from './merchantOtpUser'

export const MERCHANT_SESSION_MAX_AGE = 4 * 60 * 60

const ALLOWED_COOKIE_SIZE = 4096
const ESTIMATED_EMPTY_COOKIE_SIZE = 163
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE

type SessionCookieOptions = {
  httpOnly: boolean
  sameSite: 'lax'
  path: string
  secure: boolean
  maxAge: number
}

export function getNextAuthSessionCookieName() {
  const useSecureCookies = process.env.NODE_ENV === 'production'
  return useSecureCookies
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
}

export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MERCHANT_SESSION_MAX_AGE,
  }
}

/** Match NextAuth session cookie chunking for large JWT payloads. */
export function buildSessionCookieChunks(name: string, value: string, options: SessionCookieOptions) {
  const chunkCount = Math.ceil(value.length / CHUNK_SIZE)

  if (chunkCount <= 1) {
    return [{ name, value, options }]
  }

  const cookies: Array<{ name: string; value: string; options: SessionCookieOptions }> = []
  for (let i = 0; i < chunkCount; i++) {
    cookies.push({
      name: `${name}.${i}`,
      value: value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      options,
    })
  }

  return cookies
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

export function resolveMerchantLoginRedirect(data: MerchantVerifyOtpResponse) {
  const authUser = mapMerchantVerifyResponseToAuthUser(data)
  const merchants = authUser.merchants || []

  if (authUser.user?.mustChangePassword || authUser.user?.isFirstLogin) {
    return '/auth/change-password?firstLogin=true'
  }

  if (merchants.length > 1 || (authUser.hasPendingMerchant && merchants.length === 0)) {
    return '/auth/select-merchant'
  }

  return '/'
}
