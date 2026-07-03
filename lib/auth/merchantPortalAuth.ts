import { API_URL } from '@/lib/config'
import { normalizeMerchantPortalPhone } from '@/lib/auth/merchantOtpPhone'

export type MerchantLoginOptions = {
  success?: boolean
  otpEnabled?: boolean
  pinEnabled?: boolean
  portalPinSet?: boolean
  pinSetupRequired?: boolean
}

export async function fetchMerchantLoginOptions(
  rawPhone: string,
): Promise<MerchantLoginOptions | null> {
  const phoneNumber = normalizeMerchantPortalPhone(rawPhone)
  if (!phoneNumber) return null

  try {
    const response = await fetch(
      `${API_URL}/auth/merchant/login-options?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    )
    if (!response.ok) return null
    return (await response.json()) as MerchantLoginOptions
  } catch {
    return null
  }
}

/** Resolve post-login path for merchant owners (OTP or PIN). */
export function resolveMerchantOwnerPostLoginPath(session: {
  user?: Record<string, unknown>
}): string {
  const user = session?.user as Record<string, unknown> | undefined
  const userData = (user?.userData || user?.user) as Record<string, unknown> | undefined
  const merchants = (user?.merchants as unknown[]) || []
  const hasPendingMerchant = user?.hasPendingMerchant === true

  if (userData?.mustChangePassword || userData?.isFirstLogin) {
    return '/auth/change-password?firstLogin=true'
  }

  if (userData?.mustSetupMerchantPortalPin) {
    return '/auth/setup-portal-pin'
  }

  if (merchants.length > 1 || (hasPendingMerchant && merchants.length === 0)) {
    return '/auth/select-merchant'
  }

  return '/'
}

export async function setupMerchantPortalPin(
  accessToken: string,
  newPin: string,
  confirmPin: string,
  currentPin?: string,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_URL}/auth/merchant/setup-portal-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ newPin, confirmPin, currentPin }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.success) {
    throw new Error(
      (typeof data.message === 'string' && data.message) ||
        'Failed to set merchant portal PIN',
    )
  }
  return data
}
