import apiClient from './client'

export interface ChildMerchant {
  id: string
  merchantCode: string
  businessTradeName: string
  isActive: boolean
  isVerified: boolean
  businessCity: string
  createdAt: string
}

export interface SuperMerchantDashboard {
  superMerchant: {
    id: string
    userId: string
    merchantCode: string
    businessTradeName: string
    isActive: boolean
    isVerified: boolean
    childMerchantsCount: number
  }
  totalChildMerchants: number
  activeChildMerchants: number
  verifiedChildMerchants: number
  totalWalletBalance: number
  totalTransactionsCount: number
  totalTransactionVolume: number
  childMerchants: ChildMerchant[]
}

export interface IsSuperMerchantResponse {
  isSuperMerchant: boolean
}

export interface HasSuperMerchantAccountResponse {
  hasSuperMerchantAccount: boolean
}

/**
 * Check if a specific merchant is a SUPER_MERCHANT (merchant-level check)
 */
export const checkMerchantIsSuperMerchant = async (merchantId: string): Promise<boolean> => {
  try {
    const response = await apiClient.get<IsSuperMerchantResponse>(`/super-merchant/is-super-merchant/merchant/${merchantId}`)
    return response.data?.isSuperMerchant ?? false
  } catch (error: any) {
    console.error('Error checking merchant super merchant status:', error)
    return false
  }
}

/**
 * Check if a user has any super merchant accounts (user-level check)
 * @deprecated Use checkMerchantIsSuperMerchant for merchant-level checks
 */
export const checkIsSuperMerchant = async (userId: string): Promise<boolean> => {
  try {
    const response = await apiClient.get<HasSuperMerchantAccountResponse>(`/super-merchant/is-super-merchant/user/${userId}`)
    return response.data.hasSuperMerchantAccount
  } catch (error: any) {
    console.error('Error checking super merchant status:', error)
    return false
  }
}

export interface SuperMerchantDashboardResult {
  data: SuperMerchantDashboard | null
  error?: string
  status?: number
}

/**
 * Get super merchant dashboard data with aggregate stats
 */
export const getSuperMerchantDashboard = async (merchantId: string): Promise<SuperMerchantDashboardResult> => {
  try {
    const response = await apiClient.get<SuperMerchantDashboard>(`/super-merchant/dashboard/${merchantId}`)
    return { data: response.data }
  } catch (error: any) {
    console.error('Error fetching super merchant dashboard:', error)
    const status = error?.response?.status
    const message = error?.response?.data?.message || error?.message
    return {
      data: null,
      error: typeof message === 'string' ? message : Array.isArray(message) ? message[0] : 'Unable to load super merchant dashboard',
      status,
    }
  }
}

/**
 * Get child merchants of a super merchant
 */
export const getChildMerchants = async (superMerchantId: string): Promise<{ childMerchants: ChildMerchant[]; total: number }> => {
  try {
    const response = await apiClient.get(`/super-merchant/child-merchants/${superMerchantId}`)
    const payload = (response.data as { data?: { childMerchants?: ChildMerchant[]; total?: number } })?.data ?? response.data
    const childMerchants = payload?.childMerchants ?? []
    return {
      childMerchants,
      total: payload?.total ?? childMerchants.length,
    }
  } catch (error: any) {
    console.error('Error fetching child merchants:', error)
    return { childMerchants: [], total: 0 }
  }
}
