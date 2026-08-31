import apiClient from './client'
import { validateTransaction, SinglePaymentDto } from './single-payment.api'
import {
  applyValidatedBillArea,
  enrichUtilityBillFields,
  extractValidatedBillArea,
  extractValidatedCustomerName,
  isElectricityMeterType,
  isElectricityUtility,
  isUtilityBillPayment,
  resolveBillCustomerName,
} from '@/lib/utils/bill-payment-enrichment'

export interface BulkTransactionItem {
  itemId: string
  mode: 'WALLET_TO_MNO' | 'WALLET_TO_BANK' | 'WALLET_TO_WALLET' | 'UTILITIES' | 'WALLET_TO_MERCHANT' | 'WALLET_TO_INTERNAL_MERCHANT' | 'WALLET_TO_EXTERNAL_MERCHANT' | 'MERCHANT_TO_WALLET'
  amount: number
  currency: string
  description?: string  // ✅ Optional now, auto-generated if not provided
  reference?: string
  walletType?: 'PERSONAL' | 'BUSINESS'  // ✅ Specify which wallet to use (PERSONAL or BUSINESS)
  
  // MNO fields
  phoneNumber?: string
  mnoProvider?: string
  recipientName?: string
  customerName?: string
  
  // Bank fields
  accountNumber?: string
  bankSortCode?: string
  bankName?: string
  accountName?: string
  swiftCode?: string
  
  // Wallet fields
  recipientPhone?: string
  recipientUserId?: string
  recipientPhoneNumber?: string
  
  // Utility fields
  utilityProvider?: string
  utilityAccountNumber?: string
  customerRef?: string
  area?: string
  /** UMEME/YAKALAST: PREPAID or POSTPAID from validation */
  meterNumber?: string
  customerType?: string
  
  // Merchant fields
  merchantCode?: string
  merchantId?: string
  orderId?: string
  invoiceNumber?: string
  
  metadata?: Record<string, any>
}

export interface CreateBulkTransactionRequest {
  userId: string
  channel?: string // ✅ Channel for metrics tracking (e.g., 'MERCHANT_PORTAL')
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
    const enrichedTransactions = await Promise.all(
      request.transactions.map(async (tx) => {
        let item = enrichUtilityBillFields({ ...tx })

        if (!isUtilityBillPayment(item.mode, item.utilityProvider)) {
          return item
        }

        let customerName = resolveBillCustomerName(item)
        const needsElectricityMeterType =
          isElectricityUtility(item.utilityProvider) &&
          !isElectricityMeterType(item.area) &&
          !isElectricityMeterType(item.meterNumber)

        if ((!customerName || needsElectricityMeterType) && request.userId) {
          console.log(
            `API: Bulk bill ${item.itemId} missing customerName or meter type — validating account first`,
          )
          const validation = await validateTransaction({
            mode: 'UTILITIES',
            amount: item.amount,
            currency: item.currency || 'UGX',
            walletType: item.walletType || 'BUSINESS',
            userId: request.userId,
            utilityProvider: item.utilityProvider,
            customerRef: item.customerRef,
            utilityAccountNumber: item.utilityAccountNumber,
            phoneNumber: item.phoneNumber,
            area: item.area,
          } satisfies SinglePaymentDto)
          customerName = extractValidatedCustomerName(validation)
          if (!customerName) {
            throw new Error(
              `Bill payment ${item.itemId}: ${
                validation.errors?.[0] ||
                'Could not load customer name. Validate the account and customer phone first.'
              }`,
            )
          }

          const billArea = extractValidatedBillArea(validation)
          if (!billArea && needsElectricityMeterType) {
            throw new Error(
              `Bill payment ${item.itemId}: Could not detect PREPAID or POSTPAID for this UMEME meter.`,
            )
          }
          item = applyValidatedBillArea(
            {
              ...item,
              customerName,
              recipientName: customerName,
            },
            billArea,
          )
        } else if (customerName && needsElectricityMeterType) {
          throw new Error(
            `Bill payment ${item.itemId}: PREPAID/POSTPAID meter type is required. Validate the UMEME account first.`,
          )
        }

        if (customerName && !item.customerName) {
          item = {
            ...item,
            customerName,
            recipientName: customerName,
            metadata: { ...(item.metadata || {}), customerName },
          }
        }

        return item
      }),
    )

    const response = await apiClient.post('/transactions/bulk/async', {
      ...request,
      transactions: enrichedTransactions,
    })
    return response.data
  } catch (error: any) {
    console.error('Error processing bulk transaction async:', error)
    throw new Error(error.response?.data?.message || error.message || 'Failed to process bulk transaction')
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
 * View bulk transactions (new endpoint)
 */
export const viewBulkTransactions = async (params?: {
  page?: number
  limit?: number
}): Promise<{
  bulkTransactions: BulkTransactionResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}> => {
  try {
    console.log('🔍 [Bulk API] Viewing bulk transactions with params:', params);
    console.log('🔍 [Bulk API] API_URL:', process.env.NEXT_PUBLIC_DEV_API_URL || process.env.NEXT_PUBLIC_API_URL);
    
    const response = await apiClient.get('/transactions/bulk/view', { params });
    console.log('🔍 [Bulk API] Raw response:', response);
    console.log('🔍 [Bulk API] Response data:', response.data);
    
    // Ensure we always return the expected structure
    const result = {
      bulkTransactions: response.data?.bulkTransactions || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      limit: response.data?.limit || 20,
      totalPages: response.data?.totalPages || 0
    };
    
    console.log('🔍 [Bulk API] Processed result:', result);
    return result;
  } catch (error: any) {
    console.error('❌ [Bulk API] Error viewing bulk transactions:', error);
    console.error('❌ [Bulk API] Error response:', error.response?.data);
    console.error('❌ [Bulk API] Error status:', error.response?.status);
    console.error('❌ [Bulk API] Error statusText:', error.response?.statusText);
    console.error('❌ [Bulk API] Error headers:', error.response?.headers);
    
    // Return empty structure instead of throwing error
    return {
      bulkTransactions: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    };
  }
}

/**
 * Get bulk transaction list
 */
export const getBulkTransactionList = async (params?: {
  page?: number
  limit?: number
}): Promise<{
  bulkTransactions: BulkTransactionResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}> => {
  try {
    console.log('🔍 [Bulk API] Fetching bulk transaction list with params:', params);
    console.log('🔍 [Bulk API] API_URL:', process.env.NEXT_PUBLIC_DEV_API_URL || process.env.NEXT_PUBLIC_API_URL);
    
    const response = await apiClient.get('/transactions/bulk', { params });
    console.log('🔍 [Bulk API] Raw response:', response);
    console.log('🔍 [Bulk API] Response data:', response.data);
    
    // Ensure we always return the expected structure
    const result = {
      bulkTransactions: response.data?.bulkTransactions || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      limit: response.data?.limit || 20,
      totalPages: response.data?.totalPages || 0
    };
    
    console.log('🔍 [Bulk API] Processed result:', result);
    return result;
  } catch (error: any) {
    console.error('❌ [Bulk API] Error fetching bulk transaction list:', error);
    console.error('❌ [Bulk API] Error response:', error.response?.data);
    console.error('❌ [Bulk API] Error status:', error.response?.status);
    console.error('❌ [Bulk API] Error statusText:', error.response?.statusText);
    console.error('❌ [Bulk API] Error headers:', error.response?.headers);
    
    // Return empty structure instead of throwing error
    return {
      bulkTransactions: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    };
  }
}

