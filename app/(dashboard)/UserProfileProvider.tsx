"use client";
import React, { createContext, useContext } from "react";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile, getWalletBalance, transformToMerchantProfile } from "@/lib/api/profile.api";

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
  merchant_transactions: any[]
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
  const { user, isAuthenticated, accessToken } = useMerchantAuth();

  const {
    data: profile,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching profile data for user:', user?.id);
        console.log('🔍 Auth state:', { isAuthenticated, user: user?.id });
        console.log('🔍 Access token from context:', !!accessToken);
        console.log('🔍 Access token length:', accessToken?.length || 0);
        
        if (!accessToken) {
          console.error('❌ No access token found in auth context');
          throw new Error('No access token found');
        }
        
        console.log('🔑 Using access token:', accessToken.substring(0, 20) + '...');
        
        // Fetch user profile and wallet balance in parallel
        const [userProfile, walletBalance] = await Promise.all([
          getUserProfile(accessToken),
          getWalletBalance(accessToken)
        ]);

        console.log('📊 User Profile API Response:', userProfile);
        console.log('💰 Wallet Balance API Response:', walletBalance);

        // Transform the data to merchant profile format
        const merchantProfile = transformToMerchantProfile(userProfile, walletBalance);
        
        console.log('🔄 Transformed Merchant Profile:', merchantProfile);

        return {
          profile: merchantProfile
        };
      } catch (error) {
        console.error('❌ Error fetching profile data:', error);
        console.log('🔄 Falling back to auth context data');
        
        // Fallback to auth context data if API fails
        const fallbackProfile = {
          merchantId: user?.id || '',
          merchant_names: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'N/A',
          merchant_phone: user?.phone || 'N/A',
          merchant_balance: 0,
          merchant_card: 'N/A',
          merchant_card_exp: 'N/A',
          merchant_card_number: 'N/A',
          merchant_status: user?.status || 'ACTIVE',
          merchant_transactions: []
        };
        
        console.log('🔄 Fallback Profile:', fallbackProfile);
        
        return {
          profile: fallbackProfile
        };
      }
    },
    enabled: (() => {
      const enabled = isAuthenticated && !!user?.id;
      console.log('🔍 Query enabled check:', { isAuthenticated, userId: user?.id, enabled });
      return enabled;
    })(),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue polling even when tab is not active
    staleTime: 10000, // Consider data stale after 10 seconds
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
