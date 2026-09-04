import apiClient from './client';
import type { UserPermissions } from '@/lib/utils/permissions';

export interface TeamMember extends UserPermissions {
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
  canViewReports: boolean;
  canCollectPayments: boolean;
  canInitiatePayments: boolean;
  canLiquidate: boolean;
  canApprovePayments: boolean;
  canManagePayroll: boolean;
  canManageEvents: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  paymentSmsNotificationsEnabled?: boolean;
  paymentEmailNotificationsEnabled?: boolean;
  invitedAt: string;
  acceptedAt?: string;
  lastAccessAt?: string;
  createdAt: string;
  updatedAt: string;
  /** True when an existing account was linked (no new password). */
  linkedExistingUser?: boolean;
}

export interface TeamListResponse {
  members: TeamMember[];
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
}

export type TeamPermissionPayload = Partial<UserPermissions>;

export interface InviteTeamMemberDto extends TeamPermissionPayload {
  walletId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
}

export interface AddTeamMemberDirectDto {
  walletId?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  permissions?: TeamPermissionPayload;
}

export interface UpdateTeamMemberDto extends TeamPermissionPayload {
  role?: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  status?: 'ACTIVE' | 'SUSPENDED';
  paymentSmsNotificationsEnabled?: boolean;
  paymentEmailNotificationsEnabled?: boolean;
}

export interface TransferOwnershipDto {
  newOwnerUserId: string;
  password?: string;
  otp?: string;
}

export async function getWalletTeam(walletId: string): Promise<TeamListResponse> {
  const response = await apiClient.get(`/wallet/${walletId}/team`);
  return response.data;
}

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

export async function updateTeamMember(
  memberId: string,
  data: UpdateTeamMemberDto
): Promise<TeamMember> {
  const response = await apiClient.patch(`/wallet/team/${memberId}`, data);
  return response.data;
}

export async function removeTeamMember(memberId: string): Promise<{ success: boolean }> {
  const response = await apiClient.delete(`/wallet/team/${memberId}`);
  return response.data;
}

export async function requestTransferOwnershipOtp(
  walletId: string
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const response = await apiClient.post(`/wallet/${walletId}/transfer-ownership/request-otp`);
  return response.data;
}

export async function transferOwnership(
  walletId: string,
  data: TransferOwnershipDto
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/wallet/${walletId}/transfer-ownership`, data);
  return response.data;
}

export async function getAccessibleWallets(): Promise<any[]> {
  const response = await apiClient.get('/wallet/my-accessible-wallets');
  return response.data;
}

export async function getMyBusinessWallet(): Promise<{
  id: string;
  walletType: string;
  balance: number;
  currency: string;
  permissions?: import('@/lib/utils/permissions').UserPermissions;
  accessRole?: string;
}> {
  const { getMyBusinessWallet: fetchBusinessWallet } = await import('./wallet.api');
  return fetchBusinessWallet();
}

export async function acceptTeamInvitation(data: {
  teamMemberId: string;
  password: string;
}): Promise<{ success: boolean; user: any }> {
  const response = await apiClient.post('/wallet/team/accept-invitation', data);
  return response.data;
}

export async function addOwnerEmailAuth(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean }> {
  const response = await apiClient.post('/wallet/owner/add-email-auth', data);
  return response.data;
}
