import apiClient from './client';

export interface TeamMember {
  id: string;
  walletId: string;
  userId: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  canViewBalance: boolean;
  canViewTransactions: boolean;
  canInitiatePayments: boolean;
  canApprovePayments: boolean;
  canManageTeam: boolean;
  invitedAt: string;
  acceptedAt?: string;
  lastAccessAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamListResponse {
  members: TeamMember[];
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
}

export interface InviteTeamMemberDto {
  walletId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  canViewBalance?: boolean;
  canViewTransactions?: boolean;
  canInitiatePayments?: boolean;
  canApprovePayments?: boolean;
  canManageTeam?: boolean;
}

export interface AddTeamMemberDirectDto {
  walletId?: string;
  email: string;
  password: string; // Temporary password - user will change via email setup
  firstName: string;
  lastName: string;
  phoneNumber?: string; // Optional phone number
  role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  permissions?: {
    canViewBalance?: boolean;
    canViewTransactions?: boolean;
    canInitiatePayments?: boolean;
    canApprovePayments?: boolean;
    canManageTeam?: boolean;
  };
}

export interface UpdateTeamMemberDto {
  role?: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  status?: 'ACTIVE' | 'SUSPENDED';
  canViewBalance?: boolean;
  canViewTransactions?: boolean;
  canInitiatePayments?: boolean;
  canApprovePayments?: boolean;
  canManageTeam?: boolean;
}

export interface TransferOwnershipDto {
  newOwnerUserId: string;
  password?: string;
  otp?: string;
}

/**
 * Get all team members for a wallet
 */
export async function getWalletTeam(walletId: string): Promise<TeamListResponse> {
  const response = await apiClient.get(`/wallet/${walletId}/team`);
  return response.data;
}

/**
 * Invite team member (sends email invitation)
 */
export async function inviteTeamMember(
  walletId: string,
  data: Omit<InviteTeamMemberDto, 'walletId'>
): Promise<TeamMember> {
  const response = await apiClient.post(`/wallet/${walletId}/team/invite`, {
    ...data,
    walletId,
  });
  return response.data;
}

/**
 * Add team member directly (no invitation email)
 */
export async function addTeamMemberDirect(
  walletId: string,
  data: AddTeamMemberDirectDto
): Promise<TeamMember> {
  const response = await apiClient.post(`/wallet/${walletId}/team/add-direct`, {
    ...data,
    walletId,
  });
  return response.data;
}

/**
 * Update team member permissions
 */
export async function updateTeamMember(
  memberId: string,
  data: UpdateTeamMemberDto
): Promise<TeamMember> {
  const response = await apiClient.patch(`/wallet/team/${memberId}`, data);
  return response.data;
}

/**
 * Remove team member
 */
export async function removeTeamMember(memberId: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete(`/wallet/team/${memberId}`);
  return response.data;
}

/**
 * Request OTP for wallet ownership transfer (for merchants)
 */
export async function requestTransferOwnershipOtp(
  walletId: string
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const response = await apiClient.post(`/wallet/${walletId}/transfer-ownership/request-otp`);
  return response.data;
}

/**
 * Transfer wallet ownership
 */
export async function transferOwnership(
  walletId: string,
  data: TransferOwnershipDto
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/wallet/${walletId}/transfer-ownership`, data);
  return response.data;
}

/**
 * Get wallets I can access (owner or team member)
 */
export async function getAccessibleWallets(): Promise<any[]> {
  const response = await apiClient.get('/wallet/my-accessible-wallets');
  return response.data;
}

/**
 * Get my business wallet
 */
export async function getMyBusinessWallet(): Promise<{ id: string; walletType: string; balance: number; currency: string }> {
  const response = await apiClient.get('/wallet/me/business');
  return response.data;
}

/**
 * Set password for invited team member
 */
export async function acceptTeamInvitation(data: {
  teamMemberId: string;
  password: string;
}): Promise<{ success: boolean; user: any }> {
  const response = await apiClient.post('/wallet/team/accept-invitation', data);
  return response.data;
}

/**
 * Add email and password to owner account
 */
export async function addOwnerEmailAuth(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean }> {
  const response = await apiClient.post('/wallet/owner/add-email-auth', data);
  return response.data;
}

