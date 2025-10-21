 import apiClient from './client'

export interface WalletBalance {
  userId: string
  balance: number
  currency: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  walletId: string
  type: string
  status: string
  direction: string
  amount: number
  currency: string
  fee: number
  netAmount: number
  reference: string
  description: string
  createdAt: string
  processedAt: string | null
  metadata?: any
}

export interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
}

/**
 * Get merchant wallet balance
 * Uses /wallet/me/business to explicitly get the business wallet
 */
export const getWalletBalance = async (): Promise<WalletBalance> => {
  try {
    const response = await apiClient.get('/wallet/me/business')
    return response.data
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error)
    throw new Error(error.response?.data?.message || 'Failed to fetch wallet balance')
  }
}

/**
 * Get merchant transactions
 */
export const getMyTransactions = async (params?: {
  page?: number
  limit?: number
  status?: string
  type?: string
  startDate?: string
  endDate?: string
}): Promise<TransactionsResponse> => {
  try {
    const response = await apiClient.get('/transactions/my-transactions', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    throw new Error(error.response?.data?.message || 'Failed to fetch transactions')
  }
}

