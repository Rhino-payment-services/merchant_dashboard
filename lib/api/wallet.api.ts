 import apiClient from './client'

export interface WalletBalance {
  userId: string
  balance: number
  collectionBalance?: number
  disbursementBalance?: number
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
    const isNetworkError = !(error?.response)
    const message = isNetworkError
      ? 'Unable to reach server. Please check your connection.'
      : (error.response?.data?.message || 'Failed to fetch wallet balance')
    throw new Error(message)
  }
}

export interface SweepResult {
  collectionWalletId: string
  disbursementWalletId: string
  amount: number
  reference: string
  sweepFeePercent: number
  sweepFeeAmount: number
  netToDisbursement: number
}

/**
 * Sweep amount from collection wallet to disbursement wallet (no transfer fee).
 * Collection/MNO fees are already deducted when payments are collected.
 */
export const sweepToDisbursement = async (amount: number, merchantCode?: string): Promise<SweepResult> => {
  try {
    const response = await apiClient.post('/wallet/me/sweep-to-disbursement', { amount, merchantCode })
    return response.data
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to sweep to disbursement'
    throw new Error(message)
  }
}

/**
 * Get merchant transactions
 * Uses /wallet/me/business/transactions to explicitly get BUSINESS wallet transactions ONLY
 * This ensures that ONLY business wallet transactions are shown in the merchant dashboard
 * Personal wallet transactions will NEVER appear here
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
    const response = await apiClient.get('/wallet/me/business/transactions', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching business wallet transactions:', error)
    const isNetworkError = !(error?.response)
    const message = isNetworkError
      ? 'Unable to reach server. Please check your connection.'
      : (error.response?.data?.message || 'Failed to fetch business wallet transactions')
    throw new Error(message)
  }
}

