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
  area?: string
  meterNumber?: string
  customerType?: string
  metadata?: Record<string, any>
}

export function isElectricityMeterType(value?: string | null): boolean {
  const v = (value ?? '').trim().toUpperCase()
  return v === 'PREPAID' || v === 'POSTPAID'
}

export function isElectricityUtility(provider?: string | null): boolean {
  const p = (provider ?? '').trim().toUpperCase().replace(/_/g, '-')
  return p === 'UMEME' || p === 'YAKALAST'
}

export function extractValidatedBillArea(validation: {
  billArea?: string
  customerType?: string
  validationResult?: {
    area?: string
    customerType?: string
    data?: { customerType?: string; area?: string }
  }
}): string | undefined {
  const raw =
    validation.billArea ||
    validation.customerType ||
    validation.validationResult?.data?.customerType ||
    validation.validationResult?.customerType ||
    validation.validationResult?.data?.area ||
    validation.validationResult?.area
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  if (isElectricityMeterType(trimmed)) return trimmed.toUpperCase()
  return trimmed
}

/** Merge validated customer name + PREPAID/POSTPAID (or NWSC area) onto bill payment state. */
export function applyValidationToBillPayment<T extends BillPaymentFields>(
  item: T,
  validation: {
    recipientName?: string
    billArea?: string
    customerType?: string
  },
): T {
  let next: T = { ...item }
  const name = validation.recipientName?.trim()
  if (name) {
    next = { ...next, recipientName: name, customerName: name }
  }
  const billArea = validation.billArea || validation.customerType
  if (billArea) {
    next = applyValidatedBillArea(next, billArea)
  }
  return next
}

/** Apply PREPAID/POSTPAID (UMEME/YAKALAST) or NWSC area from validation onto a bill item. */
export function applyValidatedBillArea<T extends BillPaymentFields>(
  item: T,
  billArea: string | undefined,
): T {
  if (!billArea?.trim()) return item

  const area = isElectricityMeterType(billArea)
    ? billArea.trim().toUpperCase()
    : billArea.trim()

  if (isElectricityUtility(item.utilityProvider)) {
    if (!isElectricityMeterType(area)) return item
    return {
      ...item,
      area,
      meterNumber: area,
      customerType: area,
      metadata: {
        ...(item.metadata || {}),
        customerType: area,
        meterNumber: area,
      },
    }
  }

  // NWSC and other billers that use geographic area
  return {
    ...item,
    area,
    metadata: {
      ...(item.metadata || {}),
      ...(area ? { area } : {}),
    },
  }
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
