import type { CheckInErrorCode } from '@/types/gate'

export const CHECK_IN_ERROR_MESSAGES: Record<string, string> = {
  TICKET_NOT_FOUND: 'Ticket code not found. Please verify and try again.',
  ALREADY_CHECKED_IN: 'This ticket was already scanned.',
  WRONG_EVENT: 'This ticket is for a different event.',
  TICKET_CANCELLED: 'This ticket has been cancelled.',
  EVENT_NOT_TODAY: 'This event is not scheduled for today.',
  TICKET_INACTIVE: 'This ticket is not active.',
  CHECK_IN_WINDOW: 'Check-in is outside the allowed window.',
}

function formatTime(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export function getCheckInErrorMessage(
  errorCode: string | undefined,
  body?: {
    message?: string
    checkedInAt?: string
    attendeeName?: string
    eventTitle?: string
  }
): string {
  if (body?.message && body.message.trim()) {
    return body.message.trim()
  }

  const base = (errorCode && CHECK_IN_ERROR_MESSAGES[errorCode]) || 'Check-in could not be completed.'

  if (errorCode === 'ALREADY_CHECKED_IN') {
    const when = formatTime(body?.checkedInAt)
    const who = body?.attendeeName
    const parts = [base]
    if (who) parts.push(`Guest: ${who}.`)
    if (when) parts.push(`Previously scanned: ${when}.`)
    return parts.join(' ')
  }

  return base
}

export function isKnownCheckInErrorCode(code: string | undefined): code is CheckInErrorCode {
  return Boolean(code && code in CHECK_IN_ERROR_MESSAGES)
}
