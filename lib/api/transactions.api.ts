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
  description?: string
  reference?: string
  channel?: string
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
const getMyTransactions = async (filter: TransactionFilter = {}): Promise<TransactionsResponse> => {
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

  const response = await apiClient.get(`/transactions/my-transactions?${params.toString()}`)
  return response.data
}

const getTransactionById = async (transactionId: string): Promise<Transaction> => {
  const response = await apiClient.get(`/transactions/${transactionId}`)
  return response.data
}

// React Query hooks
export const useMyTransactions = (filter?: TransactionFilter) => useQuery({
  queryKey: ['transactions', 'my-transactions', filter],
  queryFn: () => getMyTransactions(filter),
  staleTime: 30000, // 30 seconds
  retry: 3,
  refetchOnWindowFocus: true,
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
