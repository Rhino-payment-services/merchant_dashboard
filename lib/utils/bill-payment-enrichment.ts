import { normalizePhoneToUganda } from '@/lib/utils'
import { isUmemeUtility } from '@/lib/utils/bill-area-field'

export function isAirtimeOrDataUtility(provider?: string | null) {
  const p = (provider ?? '').trim().toUpperCase()
  return p === 'AIRTIME' || p === 'DATA_BUNDLES'
}

export function isUtilityBillPayment(mode?: string, provider?: string | null) {
  return mode === 'UTILITIES' && !isAirtimeOrDataUtility(provider)
}

export type BillPaymentFields = {
  mode?: string
  utilityProvider?: string
  customerRef?: string
  utilityAccountNumber?: string
  phoneNumber?: string
  customerName?: string
  recipientName?: string
  accountName?: string
}

export function enrichUtilityBillFields<T extends BillPaymentFields>(item: T): T {
  if (item.mode !== 'UTILITIES') return item

  const enriched = { ...item }
  const meterRef =
    enriched.customerRef?.trim() || enriched.utilityAccountNumber?.trim()
  if (meterRef) {
    enriched.customerRef = meterRef
    enriched.utilityAccountNumber = meterRef
  }
  if (enriched.phoneNumber?.trim()) {
    if (
      isAirtimeOrDataUtility(enriched.utilityProvider) ||
      isUmemeUtility(enriched.utilityProvider)
    ) {
      enriched.phoneNumber = normalizePhoneToUganda(enriched.phoneNumber)
    }
  }
  return enriched
}

export function resolveBillCustomerName(item: BillPaymentFields): string | undefined {
  return (
    item.customerName?.trim() ||
    item.recipientName?.trim() ||
    item.accountName?.trim() ||
    undefined
  )
}

export function extractValidatedCustomerName(validation: {
  recipientName?: string
  validationResult?: {
    customerName?: string
    data?: { customerName?: string }
  }
}): string | undefined {
  return (
    validation.recipientName?.trim() ||
    validation.validationResult?.customerName?.trim() ||
    validation.validationResult?.data?.customerName?.trim() ||
    undefined
  )
}
