"use client";
import React, { createContext, useContext } from "react";
import { useMerchantAuth } from "@/lib/context/MerchantAuthContext";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { isSessionMerchantOwnAccount } from "@/lib/auth/sessionPayload";
import { FULL_OWNER_PERMISSIONS } from "@/lib/utils/permissions";

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
  const viewingChildMerchantId =
    (session?.user as any)?.viewingChildMerchantId ?? null;
  const viewingChildMerchantName =
    (session?.user as any)?.viewingChildMerchantName ?? null;
  const sessionMerchants = (session?.user as any)?.merchants || (userData as any)?.merchants || [];

  const {
    data: profile,
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['userProfile', userData?.id, sessionMerchantCode, viewingChildMerchantId],
    queryFn: async () => {
      if (viewingChildMerchantId) {
        const { getChildMerchantWallet } = await import('@/lib/api/super-merchant.api');
        const childWallet = await getChildMerchantWallet(viewingChildMerchantId);
        const businessName =
          childWallet.businessTradeName ||
          viewingChildMerchantName ||
          childWallet.merchantCode ||
          sessionMerchantCode ||
          'Business';

        return {
          merchantId: childWallet.merchantId,
          merchant_names: businessName,
          merchant_code: childWallet.merchantCode,
          owner_name: '',
          merchant_phone: '',
          business_email: '',
          merchant_balance: childWallet.balance || 0,
          merchant_card: '',
          merchant_card_exp: '',
          merchant_card_number: '',
          merchant_status: 'ACTIVE',
          merchant_transactions: [],
          businessWallet: {
            balance: childWallet.balance,
            collectionBalance: childWallet.collectionBalance,
            disbursementBalance: childWallet.disbursementBalance,
            currency: childWallet.currency,
            merchantId: childWallet.merchantId,
            merchant: {
              id: childWallet.merchantId,
              merchantCode: childWallet.merchantCode,
              businessTradeName: businessName,
            },
          },
          userType: (session?.user as any)?.userType || userData?.userType,
          role: (session?.user as any)?.role || userData?.role,
          isTeamMember: false,
          isWalletOwner: false,
          isSuperMerchantViewingChild: true,
          walletPermissions: { ...FULL_OWNER_PERMISSIONS },
          merchantData: {
            id: childWallet.merchantId,
            merchantCode: childWallet.merchantCode,
            businessTradeName: businessName,
          },
          merchantBusinessTradeName: businessName,
          businessTradeName: businessName,
          merchantCode: childWallet.merchantCode,
        };
      }

      // Check if user is a team member by checking for wallet team membership
      const userType = (session?.user as any)?.userType || userData?.userType;
      const userRole = (session?.user as any)?.role || userData?.role;

      // Team members and owners both use /wallet/me/business endpoint
      let businessWallet: any = null;
      let merchantCode: string | undefined;
      let isTeamMember = false;

      try {
        try {
          const { getMyBusinessWallet } = await import('@/lib/api/wallet.api');
          businessWallet = await getMyBusinessWallet();

          if (businessWallet?.merchant) {
            merchantCode = (businessWallet.merchant as { merchantCode?: string }).merchantCode;
            businessWallet.merchantData = businessWallet.merchant;
          }
        } catch (walletError: any) {
          const { resolveChildMerchantIdFromSession } = await import('@/lib/api/wallet.api');
          const childId =
            viewingChildMerchantId || (await resolveChildMerchantIdFromSession());
          if (childId) {
            const { getChildMerchantWallet } = await import('@/lib/api/super-merchant.api');
            const childWallet = await getChildMerchantWallet(childId);
            businessWallet = {
              balance: childWallet.balance,
              collectionBalance: childWallet.collectionBalance,
              disbursementBalance: childWallet.disbursementBalance,
              currency: childWallet.currency,
              merchantId: childWallet.merchantId,
              userId: childWallet.userId,
              merchant: {
                id: childWallet.merchantId,
                merchantCode: childWallet.merchantCode,
                businessTradeName: childWallet.businessTradeName,
              },
            };
            merchantCode = childWallet.merchantCode;
            businessWallet.merchantData = businessWallet.merchant;
          }
        }
      } catch (error: any) {
        console.error('UserProfile wallet fetch error:', error);
      }

      // When no wallet, use session merchant (selected at login)
      if (!merchantCode && sessionMerchantCode) {
        merchantCode = sessionMerchantCode;
      }

      const effectiveCode = String(merchantCode || sessionMerchantCode || '');
      const sessionMerchant = sessionMerchants.find((m: any) => String(m?.merchantCode || '') === effectiveCode)
        || (sessionMerchants.length === 1 ? sessionMerchants[0] : null);

      // Team member if: wallet accessRole/permissions present, wallet owned by someone else,
      // or session merchant explicitly marked not own account.
      const hasTeamWalletMeta = !!(
        businessWallet?.accessRole ||
        businessWallet?.permissions
      );
      const walletOwnedByOther =
        !!businessWallet?.userId &&
        !!userData?.id &&
        businessWallet.userId !== userData.id;
      const sessionSaysNotOwner =
        !!sessionMerchant && sessionMerchant.isOwnAccount === false;

      const isSuperMerchantChildView =
        !!viewingChildMerchantId ||
        (walletOwnedByOther &&
          sessionMerchants.some(
            (m: { isSuperMerchant?: boolean; isOwnAccount?: boolean }) =>
              m.isSuperMerchant === true && m.isOwnAccount === true,
          ));

      isTeamMember =
        !isSuperMerchantChildView &&
        (hasTeamWalletMeta || walletOwnedByOther || sessionSaysNotOwner);

      const isWalletOwner =
        !isTeamMember &&
        !!businessWallet &&
        !!userData?.id &&
        businessWallet.userId === userData.id &&
        isSessionMerchantOwnAccount(sessionMerchant ?? { isOwnAccount: true });

      const merchantData = businessWallet?.merchantData || userData?.merchant || (sessionMerchant ? {
        businessTradeName: sessionMerchant.businessTradeName,
        merchantCode: sessionMerchant.merchantCode,
      } : null);

      let businessName = merchantData?.businessTradeName ||
                         sessionMerchant?.businessTradeName ||
                         businessWallet?.description?.replace(/^Business wallet for\s+/i, '') ||
                         (merchantCode || sessionMerchantCode ? `Business · ${merchantCode || sessionMerchantCode}` : null) ||
                         'Business';

      const rawCode = merchantCode || sessionMerchantCode;
      const codeToFetch = rawCode ? String(rawCode).padStart(4, '0') : '';
      if (codeToFetch && (businessName === 'Business' || businessName?.startsWith('Business ·'))) {
        try {
          const apiClient = (await import('@/lib/api/client')).default;
          const res = await apiClient.get(`/merchant-kyc/search-by-code/${codeToFetch}`);
          const fetchedName = res?.data?.merchant?.businessTradeName || res?.data?.businessTradeName;
          if (fetchedName && fetchedName !== 'Business') {
            businessName = fetchedName;
          }
        } catch {
          // keep fallback business name
        }
      }
      const ownerName = merchantData && (merchantData.ownerFirstName || merchantData.ownerLastName)
        ? `${merchantData.ownerFirstName || ''} ${merchantData.ownerLastName || ''}`.trim()
        : userData?.profile
          ? `${userData.profile.firstName || ''} ${userData.profile.lastName || ''}`.trim()
          : (session?.user as any)?.name || '';
      const businessPhone = merchantData?.registeredPhoneNumber || userData?.phone || '';
      const businessEmail = merchantData?.businessEmail || userData?.email || '';

      const walletTeamRole = businessWallet?.accessRole || (isTeamMember ? null : undefined);
      let walletPermissions = businessWallet?.permissions;
      if (isSuperMerchantChildView) {
        walletPermissions = { ...FULL_OWNER_PERMISSIONS };
      }
      const effectiveRole = walletTeamRole || userRole;

      return {
        merchantId: businessWallet?.merchantId || userData?.id || '',
        merchant_names: businessName || 'N/A',
        merchant_code: merchantCode || sessionMerchantCode || merchantData?.merchantCode || (userData?.merchant?.merchantCode) || '',
        owner_name: ownerName,
        merchant_phone: businessPhone,
        business_email: businessEmail,
        merchant_balance: businessWallet?.balanceHidden ? null : (businessWallet?.balance || 0),
        merchant_card: '',
        merchant_card_exp: '',
        merchant_card_number: '',
        merchant_status: userData?.status || 'ACTIVE',
        merchant_transactions: [],
        businessWallet,
        userType,
        role: effectiveRole,
        isTeamMember,
        isWalletOwner,
        isSuperMerchantViewingChild: isSuperMerchantChildView,
        walletPermissions: walletPermissions,
        merchantData: merchantData,
        merchantBusinessTradeName: merchantData?.businessTradeName || sessionMerchant?.businessTradeName,
        businessTradeName: merchantData?.businessTradeName || sessionMerchant?.businessTradeName,
        ownerPhone: businessPhone,
        ownerEmail: businessEmail,
        merchantCode: merchantCode || sessionMerchantCode || merchantData?.merchantCode,
        phone: businessPhone,
        email: businessEmail,
        businessAddress: merchantData?.businessAddress,
        ownerNationalId: merchantData?.ownerNationalId,
        userProfile: userData?.profile,
        isVerified: merchantData?.isVerified || userData?.isVerified || false
      };
    },
    enabled: (isAuthenticated || !!session) && !!userData?.id,
    // Completely opt out of background refetching – only manual refetch() should update this.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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
