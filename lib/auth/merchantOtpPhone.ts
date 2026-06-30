/** Normalize merchant portal phone to the same 256XXXXXXXXX format used in login input. */
export function normalizeMerchantPortalPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10 && digits.startsWith('0')) {
    return `256${digits.slice(1)}`
  }
  if (digits.length === 9) {
    return `256${digits}`
  }
  if (digits.length === 12 && digits.startsWith('256')) {
    return digits
  }
  return digits
}

export const MERCHANT_OTP_PHONE_KEY = 'merchantOtpPhone'

export function rememberMerchantOtpPhone(phone: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(MERCHANT_OTP_PHONE_KEY, normalizeMerchantPortalPhone(phone))
}

export function readMerchantOtpPhone(fallback?: string | null): string {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(MERCHANT_OTP_PHONE_KEY)
    if (stored) return stored
  }
  return normalizeMerchantPortalPhone(fallback || '')
}

export function clearMerchantOtpPhone() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(MERCHANT_OTP_PHONE_KEY)
}
