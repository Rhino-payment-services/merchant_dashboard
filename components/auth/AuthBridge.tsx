"use client";

import { useSession } from 'next-auth/react';
import { useMerchantAuth } from '../../lib/context/MerchantAuthContext';
import { useEffect } from 'react';

export default function AuthBridge() {
  const { data: session, status } = useSession();
  const { login, logout, isAuthenticated } = useMerchantAuth();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Extract user data from NextAuth session
      const userData = {
        id: (session.user as any).id,
        old_id: null, // Required by MerchantUser interface
        email: session.user.email || '',
        phone: (session.user as any).phone || '',
        role: (session.user as any).role || 'USER',
        userType: (session.user as any).userType || 'SUBSCRIBER',
        subscriberType: (session.user as any).subscriberType || 'MERCHANT',
        status: 'ACTIVE',
        isVerified: true,
        otpPreference: 'SMS',
        enableSmsOtp: true,
        enableEmailOtp: false,
        kycStatus: 'APPROVED',
        verificationLevel: 'FULL',
        canHaveWallet: true,
        merchantCode: (session.user as any).merchantCode || null,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {
          id: 'profile-id',
          userId: (session.user as any).id,
          firstName: (session.user as any).userData?.profile?.firstName || '',
          middleName: (session.user as any).userData?.profile?.middleName || null,
          lastName: (session.user as any).userData?.profile?.lastName || '',
          dateOfBirth: (session.user as any).userData?.profile?.dateOfBirth || '',
          gender: (session.user as any).userData?.profile?.gender || '',
          nationalId: (session.user as any).userData?.profile?.nationalId || null,
          address: (session.user as any).userData?.profile?.address || '',
          city: (session.user as any).userData?.profile?.city || '',
          country: (session.user as any).userData?.profile?.country || 'UG',
          typeData: (session.user as any).userData?.profile?.typeData || {},
          profileType: (session.user as any).userData?.profile?.profileType || 'MERCHANT',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      };

      const accessToken = (session as any).accessToken;
      const refreshToken = (session as any).refreshToken;

      console.log('🔗 AuthBridge: Syncing NextAuth session to MerchantAuthContext');
      console.log('🔗 User data:', userData);
      console.log('🔗 Access token exists:', !!accessToken);

      if (accessToken && refreshToken) {
        // Sync NextAuth session to MerchantAuthContext
        login(userData, accessToken, refreshToken);
      }
    } else if (status === 'unauthenticated' && isAuthenticated) {
      console.log('🔗 AuthBridge: NextAuth unauthenticated, logging out from MerchantAuthContext');
      logout();
    }
  }, [session, status, login, logout, isAuthenticated]);

  // This component doesn't render anything
  return null;
}
