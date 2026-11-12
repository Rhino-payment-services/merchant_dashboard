import { API_URL } from '@/lib/config'

/** Shown for every request so the page never reveals whether an email is registered. */
export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for this email, a password reset link has been sent. The link expires in 1 hour.'

/** Same rules as the backend ResetPasswordDto. */
export const PASSWORD_RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 && p.length <= 100 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) },
]

export function validateNewPassword(password: string, confirm: string): string | null {
  const failed = PASSWORD_RULES.find((r) => !r.test(password))
  if (failed) return `Password needs: ${failed.label.toLowerCase()}`
  if (/[^A-Za-z\d@$!%*?&]/.test(password)) {
    return 'Password may only contain letters, numbers and @$!%*?&'
  }
  if (password !== confirm) return 'Passwords do not match'
  return null
}

export type ResetTokenProblem = 'expired' | 'invalid' | 'used' | null

/** Maps backend reset errors to the page state shown to the user. */
export function classifyResetError(message: string): ResetTokenProblem {
  const m = message.toLowerCase()
  if (m.includes('expired')) return 'expired'
  if (m.includes('already been used')) return 'used'
  if (
    m.includes('invalid reset token') ||
    m.includes('token validation failed') ||
    m.includes('token email mismatch') ||
    m.includes('token missing') ||
    m.includes('user not found')
  ) {
    return 'invalid'
  }
  return null
}

/** Rough client-side expiry check of the JWT `exp` claim (the server is authoritative). */
export function isResetTokenExpired(token: string, nowMs = Date.now()): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp * 1000 <= nowMs
  } catch {
    return false
  }
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) return body.message.join('. ')
    return body.message || fallback
  } catch {
    return fallback
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), channel: 'MERCHANT_PORTAL' }),
  })
  if (!response.ok && response.status >= 500) {
    throw new Error('We could not process your request right now. Please try again.')
  }
  if (!response.ok && response.status === 400) {
    throw new Error(await readMessage(response, 'Please enter a valid email address'))
  }
  return FORGOT_PASSWORD_GENERIC_MESSAGE
}

export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<string> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  })
  if (!response.ok) {
    throw new Error(await readMessage(response, 'Failed to reset password'))
  }
  return readMessage(response, 'Password reset successfully.')
}
