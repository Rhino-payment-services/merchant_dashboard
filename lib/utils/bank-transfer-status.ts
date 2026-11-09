/** Detect async / ambiguous bank-transfer outcomes that must not look like hard failures. */
export function isBankTransferStillProcessing(input: {
  status?: unknown
  message?: unknown
  pending?: unknown
}): boolean {
  if (input.pending === true) return true
  const status = String(input.status || '').toUpperCase()
  if (status === 'PROCESSING' || status === 'PENDING') return true
  const message = String(input.message || '').toLowerCase()
  return (
    message.includes('still processing') ||
    message.includes('check back later') ||
    message.includes('being processed')
  )
}

export const BANK_TRANSFER_PROCESSING_MESSAGE =
  'Your bank transfer is still processing. Please check back later — do not retry the same transfer.'

/** Map timeout / transport noise to processing copy for bank send flows. */
export function mapBankTransferUserMessage(message: string): string {
  const upper = String(message || '').toUpperCase()
  if (
    upper.includes('STILL PROCESSING') ||
    upper.includes('CHECK BACK LATER') ||
    upper.includes('TIMED OUT') ||
    upper.includes('TIMEOUT') ||
    upper.includes('NO RESPONSE') ||
    upper.includes('ECONNABORTED') ||
    upper.includes('NETWORK ERROR')
  ) {
    return BANK_TRANSFER_PROCESSING_MESSAGE
  }
  return message || BANK_TRANSFER_PROCESSING_MESSAGE
}
