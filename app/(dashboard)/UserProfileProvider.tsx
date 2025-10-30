"use client";
import React, { createContext, useContext } from "react";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getAccessibleWallets } from "@/lib/api/wallet-team.api";

type UserProfile = {
  profile: {
  merchantId: string;
  merchant_balance: any;
  merchant_card: string;
  merchant_card_exp: string;
  merchant_card_number: string;
  merchant_names: string;
  merchant_phone: string;
  merchant_status: string;
  merchant_transactions: any[];
  // Wallet access information for team members
  accessibleWallets?: any[];
  primaryWallet?: any;
  userType?: string;
  role?: string;
  }
  // Add other fields as needed
};

type UserProfileContextType = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
};

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  loading: true,
  error: null,
  refetch: () => {},
  isRefetching: false,
});

export const useUserProfile = () => useContext(UserProfileContext);

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useMerchantAuth();
  const { data: session } = useSession();
  
  // Get user data from session (preferred) or MerchantAuthContext
  const userData = (session?.user as any)?.userData || user;

  const {
    data: profile,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['userProfile', userData?.id],
    queryFn: async () => {
      // Check if user is a team member by checking for wallet team membership
      const userType = (session?.user as any)?.userType || userData?.userType;
      const userRole = (session?.user as any)?.role || userData?.role;
      
      console.log('📊 UserProfile - Initial user check:', {
        userId: userData?.id,
        userType, // Should be SUBSCRIBER for team members, STAFF for RukaPay employees
        userRole,
        hasMerchant: !!(userData?.merchant),
        hasMerchantId: !!(userData?.merchantId)
      });

      // Team members and owners both use /wallet/me/business endpoint
      // Backend now checks team member access automatically
      let businessWallet: any = null;
      let merchantCode: string | undefined;
      let isTeamMember = false;
      
      try {
        console.log('📊 UserProfile - Fetching business wallet...');
        
        // Try to fetch business wallet (works for both owners and team members now)
        try {
          // Use the apiClient which already has token management
          const apiClient = (await import('@/lib/api/client')).default;
          const walletResponse = await apiClient.get('/wallet/me/business');
          businessWallet = walletResponse.data;
          
          console.log('📊 UserProfile - Business wallet fetched:', {
            walletId: businessWallet?.id,
            balance: businessWallet?.balance,
            merchantId: businessWallet?.merchantId,
            hasMerchantData: !!businessWallet?.merchant,
            merchantInWallet: businessWallet?.merchant
          });

          // Check if user owns this wallet or is a team member
          isTeamMember = businessWallet?.userId !== userData?.id;
          
          // Merchant data should now be included in the wallet response
          if (businessWallet?.merchant) {
            merchantCode = businessWallet.merchant.merchantCode;
            businessWallet.merchantData = businessWallet.merchant;
            
            console.log('📊 UserProfile - Merchant data from wallet:', {
              merchantCode,
              businessName: businessWallet.merchant.businessTradeName,
              ownerName: `${businessWallet.merchant.ownerFirstName} ${businessWallet.merchant.ownerLastName}`
            });
          } else {
            console.warn('📊 UserProfile - No merchant data in wallet response');
          }
        } catch (walletError: any) {
          console.log('📊 UserProfile - No business wallet access:', walletError.response?.data?.message);
          // User has no business wallet access (neither owner nor team member)
        }
      } catch (error: any) {
        console.error('📊 UserProfile - Error in wallet fetch:', error);
      }

      // Use merchant business data from wallet or userData
      const merchantData = businessWallet?.merchantData || userData?.merchant;
      
      console.log('📊 UserProfile - Merchant data check:', {
        hasWalletMerchantData: !!businessWallet?.merchantData,
        hasUserMerchantData: !!userData?.merchant,
        merchantData: merchantData,
        businessTradeName: merchantData?.businessTradeName,
        walletDescription: businessWallet?.description
      });
      
      const businessName = merchantData?.businessTradeName || 
                          businessWallet?.description?.replace('Business wallet for ', '') ||
                          `${userData?.profile?.firstName || ''} ${userData?.profile?.lastName || ''}`.trim() ||
                          'N/A';
      const ownerName = merchantData 
        ? `${merchantData.ownerFirstName} ${merchantData.ownerLastName}` 
        : businessName;
      const businessPhone = merchantData?.registeredPhoneNumber || userData?.phone || '';
      const businessEmail = merchantData?.businessEmail || userData?.email || '';
      
      console.log('📊 UserProfile - Building profile from:', {
        source: session ? 'NextAuth session' : 'MerchantAuthContext',
        hasMerchant: !!merchantData,
        hasBusinessWallet: !!businessWallet,
        isTeamMember,
        businessName,
        ownerName,
        phone: businessPhone,
        email: businessEmail,
        walletId: businessWallet?.id
      });
      
      const profileData = {
        profile: {
          merchantId: businessWallet?.merchantId || userData?.id || '',
          merchant_names: businessName || 'N/A',
          merchant_code: merchantCode || merchantData?.merchantCode || (userData?.merchant?.merchantCode) || '',
          owner_name: ownerName,
          merchant_phone: businessPhone,
          business_email: businessEmail,
          merchant_balance: businessWallet?.balance || 0,
          merchant_card: '',
          merchant_card_exp: '',
          merchant_card_number: '',
          merchant_status: userData?.status || 'ACTIVE',
          merchant_transactions: [],
          // Wallet data
          businessWallet,
          userType,
          role: userRole,
          isTeamMember,
          // Keep raw merchant data for reference
          merchantData: merchantData
        }
      };

      console.log('📊 UserProfile - Final profile data:', {
        ...profileData,
        merchant_code: profileData.profile.merchant_code,
        merchant_names: profileData.profile.merchant_names,
        merchant_balance: profileData.profile.merchant_balance
      });
      return profileData;
    },
    enabled: (isAuthenticated || !!session) && !!userData?.id,
    refetchOnWindowFocus: false, // Only refetch when user explicitly refreshes
    refetchOnMount: false, // Don't auto-refetch on component mount
    staleTime: Infinity, // Data doesn't become stale automatically
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return (
    <UserProfileContext.Provider value={{ 
      profile: profile || null, 
      loading, 
      error: error?.message || null,
      refetch,
      isRefetching
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}
