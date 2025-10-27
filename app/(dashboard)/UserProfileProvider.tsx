"use client";
import React, { createContext, useContext } from "react";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useSession } from "next-auth/react";
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
      // Use merchant business data if available, fallback to profile data
      const merchantData = userData?.merchant;
      const businessName = merchantData?.businessTradeName || 
                          `${userData?.profile?.firstName || ''} ${userData?.profile?.lastName || ''}`.trim();
      const ownerName = merchantData 
        ? `${merchantData.ownerFirstName} ${merchantData.ownerLastName}` 
        : businessName;
      const businessPhone = merchantData?.registeredPhoneNumber || userData?.phone || '';
      const businessEmail = merchantData?.businessEmail || userData?.email || '';
      
      console.log('📊 UserProfile - Building profile from:', {
        source: session ? 'NextAuth session' : 'MerchantAuthContext',
        hasMerchant: !!merchantData,
        businessName,
        ownerName,
        phone: businessPhone,
        email: businessEmail,
        merchantData: merchantData
      });
      
      return {
        profile: {
          merchantId: userData?.id || '',
          merchant_names: businessName || 'N/A',
          owner_name: ownerName,
          merchant_phone: businessPhone,
          business_email: businessEmail,
          merchant_balance: 0,
          merchant_card: '',
          merchant_card_exp: '',
          merchant_card_number: '',
          merchant_status: userData?.status || 'ACTIVE',
          merchant_transactions: [],
          // Keep raw merchant data for reference
          merchantData: merchantData
        }
      };
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
