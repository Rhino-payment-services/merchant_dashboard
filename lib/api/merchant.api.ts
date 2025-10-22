import apiClient from './client'

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

