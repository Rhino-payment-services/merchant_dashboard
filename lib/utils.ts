import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize phone for API/DB — canonical Uganda storage: 256XXXXXXXXX (no +).
 */
export function normalizePhoneForSearch(phone: string): string {
  return normalizePhoneToUganda(phone)
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
