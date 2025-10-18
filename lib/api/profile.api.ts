import apiClient from './client';
import axios from 'axios';
import { API_URL } from '../config';

// Create a custom API client instance for profile API calls
const createAuthenticatedClient = (token: string) => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// Types for API responses
export interface UserProfile {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  userType: string;
  status: string;
  isVerified: boolean;
  otpPreference: string;
  enableSmsOtp: boolean;
  enableEmailOtp: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions?: string[];
  profile?: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: string;
    nationalId?: string;
    address?: string;
    city?: string;
    country: string;
    preferredLanguage: string;
    marketingConsent: boolean;
    subscriptionTier: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
  updatedAt: Date;
}

export interface WalletInfo {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantProfile {
  merchantId: string;
  merchant_names: string;
  merchant_phone: string;
  merchant_balance: number;
  merchant_card: string;
  merchant_card_exp: string;
  merchant_card_number: string;
  merchant_status: string;
  merchant_transactions: any[];
}

// API Functions
export const getUserProfile = async (accessToken: string): Promise<UserProfile> => {
  try {
    console.log('🔄 API: Fetching user profile from /users/me');
    const client = createAuthenticatedClient(accessToken);
    const response = await client.get('/users/me');
    console.log('✅ API: User profile response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ API: Error fetching user profile:', error);
    console.error('❌ API: Error response:', error.response?.data);
    console.error('❌ API: Error status:', error.response?.status);
    throw new Error(error.response?.data?.message || 'Failed to fetch user profile');
  }
};

export const getWalletBalance = async (accessToken: string): Promise<WalletBalance> => {
  try {
    console.log('🔄 API: Fetching wallet balance from /wallet/me/balance');
    const client = createAuthenticatedClient(accessToken);
    const response = await client.get('/wallet/me/balance');
    console.log('✅ API: Wallet balance response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ API: Error fetching wallet balance:', error);
    console.error('❌ API: Error response:', error.response?.data);
    console.error('❌ API: Error status:', error.response?.status);
    throw new Error(error.response?.data?.message || 'Failed to fetch wallet balance');
  }
};

export const getWalletInfo = async (): Promise<WalletInfo> => {
  try {
    const response = await apiClient.get('/wallet/me');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching wallet info:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch wallet info');
  }
};

// Helper function to transform user profile data to merchant profile format
export const transformToMerchantProfile = (
  userProfile: UserProfile,
  walletBalance: WalletBalance,
  walletInfo?: WalletInfo
): MerchantProfile => {
  console.log('🔄 Transform: Input userProfile:', userProfile);
  console.log('🔄 Transform: Input walletBalance:', walletBalance);
  
  const firstName = userProfile.profile?.firstName || '';
  const lastName = userProfile.profile?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

  console.log('🔄 Transform: firstName:', firstName, 'lastName:', lastName, 'fullName:', fullName);

  const transformed = {
    merchantId: userProfile.id,
    merchant_names: fullName,
    merchant_phone: userProfile.phone || 'N/A',
    merchant_balance: walletBalance.balance,
    merchant_card: 'N/A', // Not available in current API
    merchant_card_exp: 'N/A', // Not available in current API
    merchant_card_number: 'N/A', // Not available in current API
    merchant_status: userProfile.status,
    merchant_transactions: [], // Will be fetched separately if needed
  };
  
  console.log('🔄 Transform: Output transformed profile:', transformed);
  
  return transformed;
};
