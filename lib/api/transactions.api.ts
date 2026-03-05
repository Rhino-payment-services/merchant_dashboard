import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query"
import apiClient from './client'

// API_URL is already set in apiClient, no need to redefine
// Uses environment-specific URLs from client.ts

// Types for transaction filtering
export interface TransactionFilter {
  type?: string
  status?: string
  direction?: string
  currency?: string
  startDate?: string
  endDate?: string
  month?: string // YYYY-MM format
  minAmount?: number
  maxAmount?: number
  page?: number
  limit?: number
  metadata?: any
}

// Transaction response types
export interface Transaction {
  id: string
  transactionId: string
  userId: string
  amount: number
  currency: string
  type: string
  status: string
  direction: string
  /** Actual business wallet flavour used for this transaction (BUSINESS_COLLECTION, BUSINESS_DISBURSEMENT, etc.) */
  businessWalletType?: string
  description?: string
  reference?: string
  channel?: string
  fee?: number
  netAmount?: number
  externalReference?: string
  createdAt: string
  updatedAt: string
  wallet?: {
    id: string
    balance: number
    currency: string
  }
  counterparty?: {
    id: string
    name: string
    phone?: string
  }
  metadata?: {
    revenue?: {
      amount: number
      currency?: string
    }
    [key: string]: any
  }
}

export interface TransactionsResponse {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalAmount: number
    totalFee: number
    completedCount: number
    pendingCount: number
    failedCount: number
  }
}

// API functions
const getMyTransactions = async (
  filter: TransactionFilter = {},
  childMerchantId?: string,
  /** Current business merchant code – sent so backend returns that business's transactions */
  merchantCode?: string | null
): Promise<TransactionsResponse> => {
  const params = new URLSearchParams()
  
  // Add filter parameters
  if (filter.type) params.append('type', filter.type)
  if (filter.status) params.append('status', filter.status)
  if (filter.direction) params.append('direction', filter.direction)
  if (filter.currency) params.append('currency', filter.currency)
  if (filter.startDate) params.append('startDate', filter.startDate)
  if (filter.endDate) params.append('endDate', filter.endDate)
  if (filter.month) params.append('month', filter.month)
  if (filter.minAmount) params.append('minAmount', filter.minAmount.toString())
  if (filter.maxAmount) params.append('maxAmount', filter.maxAmount.toString())
  if (filter.page) params.append('page', filter.page.toString())
  if (filter.limit) params.append('limit', filter.limit.toString())
  
  // If viewing child merchant transactions (for super merchants)
  if (childMerchantId) {
    params.append('merchantId', childMerchantId)
  }
  if (merchantCode) {
    params.append('merchantCode', String(merchantCode).trim())
  }

  // Use explicit BUSINESS wallet transactions endpoint
  // This ensures that ONLY business wallet transactions are shown in merchant dashboard
  // Personal wallet transactions will NEVER appear here
  // For super merchants viewing child merchant transactions, use the child merchant endpoint
  const endpoint = childMerchantId 
    ? `/super-merchant/child-merchant/${childMerchantId}/transactions`
    : `/wallet/me/business/transactions`
  const config: { headers?: Record<string, string> } = {}
  if (merchantCode) {
    config.headers = { 'X-Merchant-Code': String(merchantCode).trim() }
  }
  const response = await apiClient.get(`${endpoint}?${params.toString()}`, config)
  
  // Transform backend response to match frontend expected format
  const backendData = response.data
  const page = backendData.page || filter.page || 1
  // Use the limit from filter (what we requested) if backend limit seems wrong (too high)
  // Otherwise use backend limit (what was actually used)
  const requestedLimit = filter.limit || 20
  const backendLimit = backendData.limit || requestedLimit
  // If backend limit is unreasonably high (>100), use the requested limit instead
  const limit = backendLimit > 100 ? requestedLimit : backendLimit
  const total = backendData.total || 0
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Pagination Debug:', {
      requestedLimit,
      backendLimit,
      usedLimit: limit,
      total,
      totalPages,
      page
    })
  }
  
  return {
    transactions: backendData.transactions || [],
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    summary: {
      totalAmount: 0,
      totalFee: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0
    }
  }
}

const getTransactionById = async (transactionId: string): Promise<Transaction> => {
  const response = await apiClient.get(`/transactions/${transactionId}`)
  return response.data
}

// React Query hooks
export const useMyTransactions = (
  filter?: TransactionFilter,
  childMerchantId?: string,
  /** Current business merchant code – when this changes (e.g. user switches business), query key changes so we refetch that business's transactions instead of reusing cache */
  merchantCode?: string | null
) => useQuery({
  queryKey: ['transactions', 'my-transactions', filter, childMerchantId, merchantCode],
  queryFn: () => getMyTransactions(filter, childMerchantId, merchantCode),
  staleTime: 30000, // 30 seconds
  retry: 3,
  refetchOnWindowFocus: false,
})

export const useTransaction = (transactionId: string, enabled = true) => useQuery({
  queryKey: ['transaction', transactionId],
  queryFn: () => getTransactionById(transactionId),
  enabled: enabled && !!transactionId,
  staleTime: 60000, // 1 minute
})

export const useMyTransactionsInfinite = (filter: TransactionFilter = {}) => {
  return useInfiniteQuery({
    queryKey: ['transactions', 'my-transactions-infinite', filter],
    queryFn: ({ pageParam = 1 }) => 
      getMyTransactions({ ...filter, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.pagination.page
      const totalPages = lastPage.pagination.totalPages
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    staleTime: 30000,
  })
}

// Export the raw API function for direct use
export { getMyTransactions, getTransactionById }
