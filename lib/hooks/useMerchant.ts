import { useQuery } from '@tanstack/react-query'
import { 
  searchMerchantByCode, 
  getMyMerchantDetails, 
  verifyWalletSeparation,
  type MerchantDetails 
} from '../api/merchant.api'

/**
 * Hook to search merchant by merchant code
 * 
 * @param merchantCode - The merchant code to search for
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with merchant details
 * 
 * @example
 * const { data: merchant, isLoading, error } = useSearchMerchantByCode('MERCH-12345')
 */
export const useSearchMerchantByCode = (merchantCode: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['merchant', 'search', merchantCode],
    queryFn: () => searchMerchantByCode(merchantCode),
    enabled: enabled && !!merchantCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

/**
 * Hook to get current merchant's details
 * Automatically fetches the merchant code from the user's session
 * 
 * @returns Query result with current merchant's details
 * 
 * @example
 * const { data: myMerchant, isLoading, error } = useMyMerchantDetails()
 */
export const useMyMerchantDetails = () => {
  return useQuery({
    queryKey: ['merchant', 'my-details'],
    queryFn: () => getMyMerchantDetails(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

/**
 * Hook to verify wallet separation for a merchant
 * Returns a summary of wallet isolation status
 * 
 * @param merchantCode - The merchant code to verify
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with wallet separation status
 * 
 * @example
 * const { data: verification, isLoading } = useVerifyWalletSeparation('MERCH-12345')
 * if (verification?.areWalletsSeparate) {
 *   console.log('✅ Wallets are properly separated')
 * }
 */
export const useVerifyWalletSeparation = (merchantCode: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['merchant', 'verify-separation', merchantCode],
    queryFn: () => verifyWalletSeparation(merchantCode),
    enabled: enabled && !!merchantCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

/**
 * Type exports for convenience
 */
export type { MerchantDetails }

