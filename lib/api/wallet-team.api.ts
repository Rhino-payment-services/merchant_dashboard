import apiClient from './client';

/**
 * Get all wallets the current user can access (owned or team member)
 */
export async function getAccessibleWallets(): Promise<any[]> {
  try {
    const response = await apiClient.get('/wallet/my-accessible-wallets');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching accessible wallets:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch accessible wallets');
  }
}

export interface AccessibleWallet {
  id: string;
  userId: string;
  walletType: string;
  currency: string;
  balance: number;
  isActive: boolean;
  description?: string;
  merchantId?: string;
  accessRole: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  permissions?: {
    canViewBalance: boolean;
    canViewTransactions: boolean;
    canInitiatePayments: boolean;
    canApprovePayments: boolean;
    canManageTeam: boolean;
  };
}

