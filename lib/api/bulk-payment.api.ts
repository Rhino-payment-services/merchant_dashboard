import apiClient from './client'

export interface BulkTransactionItem {
  itemId: string
  mode: 'WALLET_TO_MNO' | 'WALLET_TO_BANK' | 'WALLET_TO_WALLET' | 'UTILITIES' | 'WALLET_TO_MERCHANT' | 'WALLET_TO_INTERNAL_MERCHANT' | 'WALLET_TO_EXTERNAL_MERCHANT'
  amount: number
  currency: string
  description?: string  // ✅ Optional now, auto-generated if not provided
  reference?: string
  walletType?: 'PERSONAL' | 'BUSINESS'  // ✅ Specify which wallet to use (PERSONAL or BUSINESS)
  
  // MNO fields
  phoneNumber?: string
  mnoProvider?: string
  recipientName?: string
  
  // Bank fields
  accountNumber?: string
  bankSortCode?: string
  bankName?: string
  accountName?: string
  swiftCode?: string
  
  // Wallet fields
  recipientPhone?: string
  recipientUserId?: string
  
  // Utility fields
  utilityProvider?: string
  utilityAccountNumber?: string
  customerRef?: string
  area?: string
  
  // Merchant fields
  merchantCode?: string
  merchantId?: string
  orderId?: string
  invoiceNumber?: string
  
  metadata?: Record<string, any>
}

export interface CreateBulkTransactionRequest {
  userId: string
  transactions: BulkTransactionItem[]
  description?: string
  reference?: string
  processInParallel?: boolean
  stopOnFirstFailure?: boolean
  maxConcurrency?: number
  metadata?: Record<string, any>
}

export interface BulkTransactionItemResult {
  itemId: string
  mode?: string
  transactionId?: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING'
  amount: number
  currency: string
  externalReference?: string
  error?: string
  errorMessage?: string  // Backend uses this field
  processedAt: string
}

export interface BulkTransactionResponse {
  bulkTransactionId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL_SUCCESS' | 'SUCCESS'
  // New backend format
  totalTransactions?: number
  successfulTransactions?: number
  failedTransactions?: number
  pendingTransactions?: number
  transactionResults?: BulkTransactionItemResult[]
  totalAmount?: number
  totalFees?: number
  currency?: string
  // Old format (backward compatibility)
  totalItems?: number
  processedItems?: number
  successfulItems?: number
  failedItems?: number
  pendingItems?: number
  results?: BulkTransactionItemResult[]
  // Common fields
  actualTPS?: number
  processingTime?: number
  createdAt?: string
  updatedAt?: string
  completedAt?: string
  errorMessage?: string
  rateLimitStatus?: {
    remaining: number
    resetTime: number
  }
}

/**
 * Validate bulk recipients before payment
 */
export const validateBulkRecipients = async (
  items: BulkTransactionItem[]
): Promise<{
  totalItems: number
  validItems: number
  invalidItems: number
  results: Array<{
    itemId: string
    isValid: boolean
    accountName?: string
    phoneNumber?: string
    mnoProvider?: string
    accountNumber?: string
    bankName?: string
    error?: string
    validatedAt: string
  }>
  validatedAt: string
}> => {
  try {
    const response = await apiClient.post('/transactions/bulk/validate', { items })
    return response.data
  } catch (error: any) {
    console.error('Error validating bulk recipients:', error)
    throw new Error(error.response?.data?.message || 'Failed to validate bulk recipients')
  }
}

/**
 * Process bulk transaction
 */
export const processBulkTransactionAsync = async (
  request: CreateBulkTransactionRequest
): Promise<BulkTransactionResponse> => {
  try {
    const response = await apiClient.post('/transactions/bulk/async', request)
    return response.data
  } catch (error: any) {
    console.error('Error processing bulk transaction async:', error)
    throw new Error(error.response?.data?.message || 'Failed to process bulk transaction')
  }
}

export const getBulkTransactionStatus = async (
  bulkTransactionId: string
): Promise<BulkTransactionResponse> => {
  try {
    const response = await apiClient.get(`/transactions/bulk/${bulkTransactionId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching bulk transaction status:', error)
    throw new Error(error.response?.data?.message || 'Failed to fetch bulk transaction status')
  }
}


/**
 * Retry failed transactions in a bulk
 */
export const retryFailedTransactions = async (
  bulkTransactionId: string,
  itemIds?: string[]
): Promise<BulkTransactionResponse> => {
  try {
    const response = await apiClient.post(`/transactions/bulk/${bulkTransactionId}/retry`, {
      itemIds
    })
    return response.data
  } catch (error: any) {
    console.error('Error retrying failed transactions:', error)
    throw new Error(error.response?.data?.message || 'Failed to retry transactions')
  }
}

/**
 * Get bulk transaction list
 */
export const getBulkTransactionList = async (params?: {
  page?: number
  limit?: number
  status?: string
  userId?: string
}): Promise<{
  bulkTransactions: BulkTransactionResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}> => {
  try {
    const response = await apiClient.get('/transactions/bulk', { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching bulk transaction list:', error)
    throw new Error(error.response?.data?.message || 'Failed to fetch bulk transactions')
  }
}

