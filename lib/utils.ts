import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize phone to E.164 for API lookups (e.g. +256742600203)
 * Handles 0742600203, 256742600203, 742600203, +256742600203
 */
export function normalizePhoneForSearch(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed
  if (digits.startsWith('256') && digits.length >= 12) {
    return `+${digits}`
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return `+256${digits.slice(1)}`
  }
  if (digits.length === 9 && !digits.startsWith('0')) {
    return `+256${digits}`
  }
  if (trimmed.startsWith('+')) return trimmed
  return `+${digits}`
}

/**
 * Normalize Ugandan phone for API (no "+" prefix).
 * Accepts 07..., 256..., +256..., 7... and returns 256XXXXXXXXX.
 */
export function normalizePhoneToUganda(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('256') && digits.length >= 12) return digits
  if (digits.startsWith('0') && digits.length >= 10) return '256' + digits.slice(1)
  if (digits.length === 9 && !digits.startsWith('0')) return '256' + digits
  if (digits.length >= 9) return digits.startsWith('256') ? digits : '256' + digits
  return digits
}

/** MTN / Airtel from Uganda MSISDN prefix (after 256). */
export function inferMnoProviderFromUganda(phone: string): 'MTN' | 'Airtel' | undefined {
  const n = normalizePhoneToUganda(phone)
  if (!n || n.length < 5) return undefined
  const prefix = n.startsWith('256') ? n.slice(3, 5) : n.slice(0, 2)
  if (['77', '78', '76', '39'].includes(prefix)) return 'MTN'
  if (['75', '70', '74', '20'].includes(prefix)) return 'Airtel'
  return undefined
}

export function normalizeMnoProviderLabel(
  provider: string | undefined,
): 'MTN' | 'Airtel' | undefined {
  if (!provider?.trim()) return undefined
  const u = provider.trim().toUpperCase()
  if (u === 'MTN') return 'MTN'
  if (u === 'AIRTEL') return 'Airtel'
  return undefined
}

/** User-selected network wins; otherwise infer from phone. Never defaults to MTN. */
export function resolveAirtimeMnoProvider(
  mnoProvider: string | undefined,
  phone: string | undefined,
): 'MTN' | 'Airtel' | undefined {
  return normalizeMnoProviderLabel(mnoProvider) ?? inferMnoProviderFromUganda(phone || '')
}
