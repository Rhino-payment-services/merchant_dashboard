import { API_URL } from '@/lib/config'

/** Join API_URL (no trailing slash) with path segments */
function apiUrl(path: string): string {
  const base = API_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  const body = await parseJson<{ message?: string; error?: string }>(response)
  const msg =
    body.message ||
    body.error ||
    response.statusText ||
    `Request failed (${response.status})`
  throw new Error(msg)
}

/** --- Public event detail (GET public/events/:eventCode) --- */

export interface PublicMerchantEventTierDto {
  id: string
  tierCode?: string
  name: string
  description?: string | null
  price: number
  currency?: string
  quantity?: number
  sold?: number
  availableCount?: number
  minPerOrder?: number
  maxPerOrder?: number
  salesStartAt?: string | null
  salesEndAt?: string | null
}

export interface PublicMerchantEventDetailResponse {
  eventCode: string
  title: string
  description?: string | null
  bannerUrl?: string | null
  location?: string | null
  startsAt: string
  endsAt?: string | null
  currency: string
  checkoutUrl?: string | null
  tiers: PublicMerchantEventTierDto[]
  merchantName?: string | null
  merchantCode?: string
}

/** GET public/events/:eventCode/status */
export interface PublicMerchantEventStatusResponse {
  /** Backend may use any combination of these flags */
  isActive?: boolean
  isSalesOpen?: boolean
  canPurchase?: boolean
  salesOpen?: boolean
  message?: string | null
  reason?: string | null
}

/** POST public/events/:eventCode/orders */
export interface CreatePublicMerchantEventOrderBody {
  tierId: string
  quantity: number
  buyerPhone: string
  buyerEmail?: string
  buyerName?: string
}

export type MerchantEventOrderStatus = string
export type TransactionStatus = string

export interface PublicMerchantEventOrderCreatedResponse {
  id: string
  orderReference: string
  paymentToken?: string | null
  eventCode: string
  tierId: string
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: string
  status: MerchantEventOrderStatus
  paymentStatus: TransactionStatus
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicMerchantEventOrderTransactionSummary {
  id: string
  reference: string
  status: TransactionStatus
  amount: number
  currency: string
  externalReference?: string | null
}

export interface PublicMerchantEventOrderEventSummary {
  eventCode: string
  title: string
  startsAt: string
  endsAt?: string | null
}

export interface PublicMerchantEventOrderTierSummary {
  tierId: string
  tierCode: string
  name: string
}

export interface PublicMerchantEventOrderDetailResponse {
  id: string
  orderReference: string
  merchantCode: string
  event: PublicMerchantEventOrderEventSummary
  tier: PublicMerchantEventOrderTierSummary
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: string
  status: MerchantEventOrderStatus
  paymentStatus: TransactionStatus
  expiresAt?: string | null
  paidAt?: string | null
  transaction?: PublicMerchantEventOrderTransactionSummary | null
  createdAt: string
  updatedAt: string
}

export interface PayPublicMerchantEventOrderBody {
  network?: 'MTN' | 'AIRTEL'
}

export interface PublicMerchantEventOrderPayResponse {
  success: boolean
  orderReference: string
  transactionReference?: string
  status?: string
  message: string
  merchantName?: string
  amount?: number
  currency?: string
  error?: string
}

export type MerchantEventAttendeeStatus = string

export interface PublicMerchantEventTicketItem {
  id: string
  ticketCode: string
  attendeeName: string
  attendeePhone?: string | null
  attendeeEmail?: string | null
  status: MerchantEventAttendeeStatus
  tierCode?: string | null
  tierName?: string | null
}

export interface PublicMerchantEventOrderTicketsResponse {
  orderReference: string
  tickets: PublicMerchantEventTicketItem[]
}

const enc = encodeURIComponent

export async function getPublicEventStatus(
  eventCode: string
): Promise<PublicMerchantEventStatusResponse> {
  const response = await fetch(apiUrl(`/public/events/${enc(eventCode)}/status`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  await throwIfNotOk(response)
  return parseJson<PublicMerchantEventStatusResponse>(response)
}

export async function getPublicEventByCode(
  eventCode: string
): Promise<PublicMerchantEventDetailResponse> {
  const response = await fetch(apiUrl(`/public/events/${enc(eventCode)}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  await throwIfNotOk(response)
  return parseJson<PublicMerchantEventDetailResponse>(response)
}

export async function createPublicEventOrder(
  eventCode: string,
  body: CreatePublicMerchantEventOrderBody
): Promise<PublicMerchantEventOrderCreatedResponse> {
  const response = await fetch(apiUrl(`/public/events/${enc(eventCode)}/orders`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  await throwIfNotOk(response)
  return parseJson<PublicMerchantEventOrderCreatedResponse>(response)
}

export async function getPublicOrder(
  orderReference: string
): Promise<PublicMerchantEventOrderDetailResponse> {
  const response = await fetch(apiUrl(`/public/events/orders/${enc(orderReference)}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  await throwIfNotOk(response)
  return parseJson<PublicMerchantEventOrderDetailResponse>(response)
}

export async function payPublicOrder(
  orderReference: string,
  body: PayPublicMerchantEventOrderBody
): Promise<PublicMerchantEventOrderPayResponse> {
  const response = await fetch(
    apiUrl(`/public/events/orders/${enc(orderReference)}/pay`),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  const data = await parseJson<PublicMerchantEventOrderPayResponse>(response)
  if (!response.ok) {
    throw new Error(data.message || data.error || `Payment failed (${response.status})`)
  }
  return data
}

export async function getPublicOrderTickets(
  orderReference: string
): Promise<PublicMerchantEventOrderTicketsResponse> {
  const response = await fetch(
    apiUrl(`/public/events/orders/${enc(orderReference)}/tickets`),
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  await throwIfNotOk(response)
  return parseJson<PublicMerchantEventOrderTicketsResponse>(response)
}
