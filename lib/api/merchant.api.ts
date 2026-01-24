import apiClient from './client'
import { toast } from 'sonner'

/**
 * Merchant search and management API
 */

export interface MerchantDetails {
  merchant: {
    id: string
    userId: string
    merchantCode: string
    businessTradeName: string
    businessType: string
    ownerName: string
    phone: string
    email: string
    isVerified: boolean
    isActive: boolean
    canTransact: boolean
    onboardedAt: string
    createdAt: string
  }
  user: {
    id: string
    phone: string
    email: string
    subscriberType: string
    userType: string
    kycStatus: string
    verificationLevel: string
    isVerified: boolean
    status: string
  }
  wallets: Array<{
    id: string
    walletType: 'PERSONAL' | 'BUSINESS'
    balance: number
    currency: string
    isActive: boolean
    isSuspended: boolean
    merchantId: string | null
    transactionCount: number
    recentTransactions: Array<{
      id: string
      type: string
      amount: number
      currency: string
      description: string
      createdAt: string
    }>
    createdAt: string
    updatedAt: string
  }>
  profile: {
    firstName: string
    lastName: string
    middleName?: string
  } | null
}

/**
 * Search merchant by merchant code
 * Returns comprehensive merchant details including:
 * - Merchant information
 * - User details
 * - All wallets (PERSONAL & BUSINESS)
 * - Transaction counts per wallet
 * - Recent transactions per wallet
 * 
 * This is useful for:
 * - Verifying merchant exists
 * - Checking wallet setup
 * - Confirming transaction separation
 * - Debugging merchant issues
 * 
 * @param merchantCode - The merchant code to search for (e.g., "MERCH-12345")
 * @returns Comprehensive merchant details
 */
export const searchMerchantByCode = async (merchantCode: string): Promise<MerchantDetails> => {
  try {
    const response = await apiClient.get(`/merchant-kyc/search-by-code/${merchantCode}`)
    return response.data
  } catch (error: any) {
    console.error('Error searching merchant by code:', error)
    
    if (error.response?.status === 404) {
      throw new Error(`Merchant not found with code: ${merchantCode}`)
    }
    
    throw new Error(error.response?.data?.message || 'Failed to search merchant')
  }
}

/**
 * Get current merchant's details (using their own merchant code from session)
 * This is a convenience function that gets the merchant code from the user's session
 * and then calls searchMerchantByCode
 * 
 * @returns Current merchant's details
 */
export const getMyMerchantDetails = async (): Promise<MerchantDetails> => {
  try {
    // First, get the current user to retrieve their merchant code
    const userResponse = await apiClient.get('/users/me')
    const merchantCode = userResponse.data.merchantCode
    
    if (!merchantCode) {
      throw new Error('Current user is not a merchant')
    }
    
    // Then search using their merchant code
    return await searchMerchantByCode(merchantCode)
  } catch (error: any) {
    console.error('Error getting my merchant details:', error)
    throw new Error(error.response?.data?.message || 'Failed to get merchant details')
  }
}

/**
 * Create a new merchant account
 * Handles all error cases and shows toast notifications
 * 
 * @param merchantData - Merchant KYC data
 * @returns Created merchant details
 */
export const createMerchant = async (merchantData: any): Promise<any> => {
  try {
    const response = await apiClient.post('/merchant-kyc/create', merchantData)
    toast.success('Merchant created successfully!')
    return response.data
  } catch (error: any) {
    console.error('Error creating merchant:', error)
    
    // Extract error message from various response formats
    let errorMessage = 'Failed to create merchant account'
    
    if (error.response?.data) {
      const errorData = error.response.data
      
      // Handle validation errors (array format)
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ')
      } 
      // Handle error object with message property
      else if (errorData.message) {
        errorMessage = errorData.message
      }
      // Handle error object with error property
      else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error.message || errorMessage
      }
      // Handle data.message format
      else if (errorData.data?.message) {
        if (Array.isArray(errorData.data.message)) {
          errorMessage = errorData.data.message.join(', ')
        } else {
          errorMessage = errorData.data.message
        }
      }
      // Handle statusCode with message
      else if (errorData.statusCode && errorData.message) {
        errorMessage = Array.isArray(errorData.message) 
          ? errorData.message.join(', ')
          : errorData.message
      }
    } else if (error.message) {
      // Network error or other error with message
      errorMessage = error.message
    }
    
    // Show toast error
    toast.error(errorMessage)
    
    // Re-throw error so caller can handle it if needed
    throw new Error(errorMessage)
  }
}

/**
 * Helper function to verify wallet separation for a merchant
 * Returns a summary of wallet isolation status
 */
export const verifyWalletSeparation = async (merchantCode: string): Promise<{
  hasPersonalWallet: boolean
  hasBusinessWallet: boolean
  personalWalletId: string | null
  businessWalletId: string | null
  personalTransactionCount: number
  businessTransactionCount: number
  areWalletsSeparate: boolean
  message: string
}> => {
  try {
    const merchantDetails = await searchMerchantByCode(merchantCode)
    
    const personalWallet = merchantDetails.wallets.find(w => w.walletType === 'PERSONAL')
    const businessWallet = merchantDetails.wallets.find(w => w.walletType === 'BUSINESS')
    
    const hasPersonalWallet = !!personalWallet
    const hasBusinessWallet = !!businessWallet
    const areWalletsSeparate = hasPersonalWallet && hasBusinessWallet && 
                                personalWallet.id !== businessWallet.id
    
    let message = ''
    if (!hasPersonalWallet && !hasBusinessWallet) {
      message = '❌ No wallets found for merchant'
    } else if (!hasPersonalWallet) {
      message = '⚠️ Missing personal wallet'
    } else if (!hasBusinessWallet) {
      message = '⚠️ Missing business wallet'
    } else if (!areWalletsSeparate) {
      message = '❌ Wallets are not properly separated'
    } else {
      message = '✅ Wallets are properly separated'
    }
    
    return {
      hasPersonalWallet,
      hasBusinessWallet,
      personalWalletId: personalWallet?.id || null,
      businessWalletId: businessWallet?.id || null,
      personalTransactionCount: personalWallet?.transactionCount || 0,
      businessTransactionCount: businessWallet?.transactionCount || 0,
      areWalletsSeparate,
      message
    }
  } catch (error: any) {
    console.error('Error verifying wallet separation:', error)
    throw new Error(error.response?.data?.message || 'Failed to verify wallet separation')
  }
}

