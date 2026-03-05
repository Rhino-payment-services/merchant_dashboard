"use client";
import React, { createContext, useContext } from "react";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getAccessibleWallets } from "@/lib/api/wallet-team.api";

type UserProfile = {
  merchantId: string;
  merchant_balance: any;
  merchant_card: string;
  merchant_card_exp: string;
  merchant_card_number: string;
  merchant_names: string;
  merchant_phone: string;
  merchant_status: string;
  merchant_transactions: any[];
  merchant_code?: string;
  owner_name?: string;
  business_email?: string;
  businessWallet?: any;
  isTeamMember?: boolean;
  isWalletOwner?: boolean; // NEW: True if user is original wallet owner (not a team member)
  // Wallet access information for team members
  accessibleWallets?: any[];
  primaryWallet?: any;
  userType?: string;
  role?: string;
  // Merchant business name properties (various field names for compatibility)
  merchantBusinessTradeName?: string;
  businessTradeName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  merchantCode?: string;
  phone?: string;
  email?: string;
  businessAddress?: string;
  // Make type extensible for any additional properties
  [key: string]: any;
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
  const userData = (session?.user as any)?.userData || (session?.user as any)?.user || user;
  const sessionMerchantCode = (session?.user as any)?.merchantCode ?? (userData as any)?.merchantCode;
  const sessionMerchants = (session?.user as any)?.merchants || (userData as any)?.merchants || [];

  const {
    data: profile,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['userProfile', userData?.id, sessionMerchantCode],
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

      // When no wallet, use session merchant (selected at login)
      if (!merchantCode && sessionMerchantCode) {
        merchantCode = sessionMerchantCode;
      }

      // Use merchant business data from wallet, userData, or session merchants (when no wallet)
      const effectiveCode = String(merchantCode || sessionMerchantCode || '');
      const sessionMerchant = sessionMerchants.find((m: any) => String(m?.merchantCode || '') === effectiveCode)
        || (sessionMerchants.length === 1 ? sessionMerchants[0] : null);
      
      console.log('📊 UserProfile - Session merchants debug:', {
        sessionMerchants,
        effectiveCode,
        sessionMerchant,
        sessionMerchantBusinessTradeName: sessionMerchant?.businessTradeName
      });
      const merchantData = businessWallet?.merchantData || userData?.merchant || (sessionMerchant ? {
        businessTradeName: sessionMerchant.businessTradeName,
        merchantCode: sessionMerchant.merchantCode,
      } : null);
      
      console.log('📊 UserProfile - Merchant data check:', {
        hasWalletMerchantData: !!businessWallet?.merchantData,
        hasUserMerchantData: !!userData?.merchant,
        merchantData: merchantData,
        businessTradeName: merchantData?.businessTradeName,
        walletDescription: businessWallet?.description
      });
      
      // Business name: from wallet/merchant data, or session merchants, or API fallback
      let businessName = merchantData?.businessTradeName || 
                         sessionMerchant?.businessTradeName ||
                         businessWallet?.description?.replace(/^Business wallet for\s+/i, '') ||
                         (merchantCode || sessionMerchantCode ? `Business · ${merchantCode || sessionMerchantCode}` : null) ||
                         'Business';

      // API fallback: fetch merchant by code when we have code but no real business name yet
      const rawCode = merchantCode || sessionMerchantCode;
      const codeToFetch = rawCode ? String(rawCode).padStart(4, '0') : '';
      console.log('📊 UserProfile - API fallback check:', {
        rawCode,
        codeToFetch,
        currentBusinessName: businessName,
        shouldFetch: codeToFetch && (businessName === 'Business' || businessName?.startsWith('Business ·'))
      });
      if (codeToFetch && (businessName === 'Business' || businessName?.startsWith('Business ·'))) {
        try {
          const apiClient = (await import('@/lib/api/client')).default;
          console.log('📊 UserProfile - Calling API: /merchant-kyc/search-by-code/' + codeToFetch);
          const res = await apiClient.get(`/merchant-kyc/search-by-code/${codeToFetch}`);
          console.log('📊 UserProfile - API response:', res?.data);
          const fetchedName = res?.data?.merchant?.businessTradeName || res?.data?.businessTradeName;
          console.log('📊 UserProfile - Fetched business name:', fetchedName);
          if (fetchedName && fetchedName !== 'Business') {
            businessName = fetchedName;
          }
        } catch (err) {
          console.error('📊 UserProfile - API fallback error:', err);
        }
      }
      const ownerName = merchantData && (merchantData.ownerFirstName || merchantData.ownerLastName)
        ? `${merchantData.ownerFirstName || ''} ${merchantData.ownerLastName || ''}`.trim()
        : userData?.profile
          ? `${userData.profile.firstName || ''} ${userData.profile.lastName || ''}`.trim()
          : (session?.user as any)?.name || '';
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
      
      // Get wallet team member role if user is a team member
      // The wallet API now returns accessRole and permissions for team members
      const walletTeamRole = businessWallet?.accessRole || (isTeamMember ? null : undefined);
      const walletPermissions = businessWallet?.permissions;
      
      // Use wallet team role if available, otherwise use base user role
      const effectiveRole = walletTeamRole || userRole;

      const profileData = {
        merchantId: businessWallet?.merchantId || userData?.id || '',
        merchant_names: businessName || 'N/A',
        merchant_code: merchantCode || sessionMerchantCode || merchantData?.merchantCode || (userData?.merchant?.merchantCode) || '',
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
        role: effectiveRole, // Use wallet team role if available
        isTeamMember,
        // NEW: Flag to identify original wallet owner vs team members
        // Original owner: Wallet.userId === user.id (isTeamMember = false)
        // Team member: Has WalletTeamMember record (isTeamMember = true)
        isWalletOwner: !isTeamMember && !!businessWallet,
        // Include wallet team permissions if available
        walletPermissions: walletPermissions,
        // Keep raw merchant data for reference
        merchantData: merchantData,
        // Additional merchant name fields for compatibility
        merchantBusinessTradeName: merchantData?.businessTradeName || sessionMerchant?.businessTradeName,
        businessTradeName: merchantData?.businessTradeName || sessionMerchant?.businessTradeName,
        ownerPhone: businessPhone,
        ownerEmail: businessEmail,
        merchantCode: merchantCode || sessionMerchantCode || merchantData?.merchantCode,
        phone: businessPhone,
        email: businessEmail,
        businessAddress: merchantData?.businessAddress,
        // Owner National ID from merchant data
        ownerNationalId: merchantData?.ownerNationalId,
        // User profile data for fallback
        userProfile: userData?.profile,
        // Verification status
        isVerified: merchantData?.isVerified || userData?.isVerified || false
      };

      console.log('📊 UserProfile - Final profile data:', {
        ...profileData,
        merchant_code: profileData.merchant_code,
        merchant_names: profileData.merchant_names,
        merchant_balance: profileData.merchant_balance
      });
      return profileData;
    },
    enabled: (isAuthenticated || !!session) && !!userData?.id,
    // Avoid aggressive background refetches; refresh only when explicitly requested
    staleTime: 60_000, // 60 seconds
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
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
