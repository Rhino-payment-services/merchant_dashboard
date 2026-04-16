import apiClient from './client'

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
