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

/** Read super-merchant child context from NextAuth session (client only). */
export async function resolveChildMerchantIdFromSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()
    const id = (session?.user as { viewingChildMerchantId?: string | null })
      ?.viewingChildMerchantId
    return id?.trim() ? id.trim() : null
  } catch {
    return null
  }
}

export interface MyBusinessWallet {
  id: string
  walletType: string
  balance: number
  currency: string
  permissions?: Record<string, boolean>
  accessRole?: string
  merchantId?: string
  merchant?: Record<string, unknown>
  balanceHidden?: boolean
  collectionBalance?: number
  disbursementBalance?: number
  userId?: string
}

/**
 * Fetch the current business wallet (owner, team member, or super-merchant child view).
 */
export const getMyBusinessWallet = async (): Promise<MyBusinessWallet> => {
  const childMerchantId = await resolveChildMerchantIdFromSession()
  if (childMerchantId) {
    const { getChildMerchantWallet } = await import('./super-merchant.api')
    const wallet = await getChildMerchantWallet(childMerchantId)
    return {
      id: wallet.merchantId,
      walletType: 'BUSINESS',
      balance: wallet.balance,
      currency: wallet.currency,
      merchantId: wallet.merchantId,
      collectionBalance: wallet.collectionBalance,
      disbursementBalance: wallet.disbursementBalance,
      userId: wallet.userId,
      merchant: {
        id: wallet.merchantId,
        merchantCode: wallet.merchantCode,
        businessTradeName: wallet.businessTradeName,
      },
    }
  }

  const response = await apiClient.get('/wallet/me/business')
  return response.data
}

/**
 * Get merchant wallet balance
 * Uses /wallet/me/business to explicitly get the business wallet
 */
export const getWalletBalance = async (childMerchantId?: string): Promise<WalletBalance> => {
  try {
    const effectiveChildId =
      childMerchantId ?? (await resolveChildMerchantIdFromSession()) ?? undefined

    if (effectiveChildId) {
      const { getChildMerchantWallet } = await import('./super-merchant.api')
      const wallet = await getChildMerchantWallet(effectiveChildId)
      return {
        userId: wallet.userId,
        balance: wallet.balance,
        collectionBalance: wallet.collectionBalance,
        disbursementBalance: wallet.disbursementBalance,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt,
      }
    }

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
export const getMyTransactions = async (
  params?: {
  page?: number
  limit?: number
  status?: string
  type?: string
  startDate?: string
  endDate?: string
},
  childMerchantId?: string,
  merchantCode?: string | null,
): Promise<TransactionsResponse> => {
  try {
    const effectiveChildId =
      childMerchantId ?? (await resolveChildMerchantIdFromSession()) ?? undefined

    if (effectiveChildId) {
      const response = await apiClient.get(
        `/super-merchant/child-merchant/${effectiveChildId}/transactions`,
        { params },
      )
      return response.data
    }

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

