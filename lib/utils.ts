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
