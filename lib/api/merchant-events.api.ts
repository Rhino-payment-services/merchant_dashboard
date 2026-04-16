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
