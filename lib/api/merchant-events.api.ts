import apiClient from './client'

export interface MerchantEventListItem {
  id: string
  merchantId?: string
  walletId?: string
  eventCode: string
  title: string
  description?: string
  bannerUrl?: string
  location?: string
  startsAt: string
  endsAt: string
  salesStartAt?: string
  salesEndAt?: string
  currency: string
  status: string
  isPublic?: boolean
  isActive?: boolean
  capacity?: number
  ticketsSold?: number
  tierCount?: number
  orderCount?: number
  attendeeCount?: number
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface MerchantEventListResponse {
  items: MerchantEventListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ListMerchantEventsParams {
  page?: number
  limit?: number
  status?: string
  isActive?: boolean
  isPublic?: boolean
  search?: string
}

function buildListQueryParams(params: ListMerchantEventsParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    out[key] = value as string | number | boolean
  }
  return out
}

export async function listMerchantEvents(
  params: ListMerchantEventsParams = {}
): Promise<MerchantEventListResponse> {
  const response = await apiClient.get<MerchantEventListResponse>('/merchant-events', {
    params: buildListQueryParams(params),
  })
  return response.data
}

export interface MerchantEventGrossSalesByCurrencyDto {
  currency: string
  grossSales: number
}

export interface StatusCount {
  status: string
  count: number
}

export interface MerchantEventsStatisticsResponse {
  totalEvents: number
  activeEvents: number
  totalTiers: number
  totalOrders: number
  paidOrders: number
  grossSalesByCurrency: MerchantEventGrossSalesByCurrencyDto[]
  totalAttendees: number
  checkedInCount: number
  ticketsSoldTotal: number
  orderStatusBreakdown: StatusCount[]
  paymentStatusBreakdown: StatusCount[]
}

export async function getMerchantEventsStatistics(): Promise<MerchantEventsStatisticsResponse> {
  const response = await apiClient.get<MerchantEventsStatisticsResponse>(
    '/merchant-events/statistics'
  )
  return response.data
}

/** POST /merchant-events — aligns with CreateMerchantEventWithTiersDto */
export interface CreateMerchantEventTierPayload {
  tierCode?: string
  name: string
  description?: string
  price: number
  currency?: string
  quantity: number
  minPerOrder?: number
  maxPerOrder?: number
  salesStartAt?: string
  salesEndAt?: string
  metadata?: Record<string, unknown>
}

export interface CreateMerchantEventWithTiersPayload {
  title: string
  startsAt: string
  walletId?: string
  eventCode?: string
  description?: string
  bannerUrl?: string
  location?: string
  endsAt?: string
  salesStartAt?: string
  salesEndAt?: string
  currency?: string
  isPublic?: boolean
  capacity?: number
  metadata?: Record<string, unknown>
  tiers: CreateMerchantEventTierPayload[]
}

export interface MerchantEventTierDetailResponse {
  id?: string
  tierCode?: string
  name: string
  description?: string | null
  price?: number
  currency?: string
  quantity?: number
  sold?: number
}

export interface MerchantEventWithTiersResponse extends MerchantEventListItem {
  tiers: MerchantEventTierDetailResponse[]
}

export async function createMerchantEventWithTiers(
  payload: CreateMerchantEventWithTiersPayload
): Promise<MerchantEventWithTiersResponse> {
  const response = await apiClient.post<MerchantEventWithTiersResponse>('/merchant-events', payload)
  return response.data
}

/** POST /merchant-events/upload-banner — multipart field name: `banner` */
export interface EventBannerUploadResponse {
  bannerUrl: string
  fileName: string
  originalName: string
  mimeType: string
  size: number
}

export type UploadEventBannerOptions = {
  onUploadProgress?: (percentLoaded: number) => void
  signal?: AbortSignal
}

export async function uploadEventBanner(
  file: File,
  options?: UploadEventBannerOptions
): Promise<EventBannerUploadResponse> {
  const formData = new FormData()
  formData.append('banner', file)

  const response = await apiClient.post<EventBannerUploadResponse>(
    '/merchant-events/upload-banner',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: options?.signal,
      onUploadProgress: (e) => {
        const total = e.total
        if (total && options?.onUploadProgress) {
          options.onUploadProgress(Math.round((e.loaded * 100) / total))
        }
      },
    }
  )
  return response.data
}

/** GET /merchant-events/:id — full event with tiers, summary, and sales statistics */
export interface MerchantEventTierFull {
  id: string
  eventId?: string
  tierCode?: string
  name: string
  description?: string | null
  price: number
  currency?: string
  quantity: number
  soldCount?: number
  minPerOrder?: number
  maxPerOrder?: number
  salesStartAt?: string | null
  salesEndAt?: string | null
  status?: string
  isActive?: boolean
  metadata?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface MerchantEventSummary {
  tierCount?: number
  orderCount?: number
  paidOrderCount?: number
  attendeeCount?: number
  checkedInCount?: number
  ticketsSold?: number
  capacity?: number
  remainingCapacity?: number
  grossSales?: number
}

export interface MerchantEventTierSalesRow {
  tierId: string
  tierCode?: string
  name: string
  quantity: number
  soldCount?: number
  availableCount?: number
  grossSales?: number
  paidOrderCount?: number
  paidTicketCount?: number
}

export interface MerchantEventSalesStatistics {
  orderStatusBreakdown?: StatusCount[]
  paymentStatusBreakdown?: StatusCount[]
  tierSales?: MerchantEventTierSalesRow[]
}

export interface MerchantEventDetailResponse extends MerchantEventListItem {
  tiers?: MerchantEventTierFull[]
  summary?: MerchantEventSummary
  salesStatistics?: MerchantEventSalesStatistics
}

export async function getMerchantEventById(id: string): Promise<MerchantEventDetailResponse> {
  const response = await apiClient.get<MerchantEventDetailResponse>(`/merchant-events/${id}`)
  return response.data
}

export interface MerchantEventCheckoutUrlResponse {
  checkoutUrl: string
  eventCode: string
}

export async function getMerchantEventCheckoutUrl(
  eventId: string
): Promise<MerchantEventCheckoutUrlResponse> {
  const response = await apiClient.get<MerchantEventCheckoutUrlResponse>(
    `/merchant-events/${eventId}/checkout-url`
  )
  return response.data
}
