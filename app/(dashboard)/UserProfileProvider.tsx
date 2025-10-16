"use client";
import React, { createContext, useContext } from "react";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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
  const { user, isAuthenticated } = useMerchantAuth();

  const {
    data: profile,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      // For now, return the user data from the auth context as profile
      // You can later enhance this to fetch additional profile data if needed
      return {
        profile: {
          merchantId: user?.id || '',
          merchant_names: `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim(),
          merchant_phone: user?.phone || '',
          merchant_balance: 0,
          merchant_card: '',
          merchant_card_exp: '',
          merchant_card_number: '',
          merchant_status: user?.status || 'ACTIVE',
          merchant_transactions: []
        }
      };
    },
    enabled: isAuthenticated && !!user?.id,
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
