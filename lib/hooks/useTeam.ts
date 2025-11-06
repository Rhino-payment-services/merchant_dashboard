import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWalletTeam,
  inviteTeamMember,
  addTeamMemberDirect,
  updateTeamMember,
  removeTeamMember,
  transferOwnership,
  getAccessibleWallets,
  getMyBusinessWallet,
  addOwnerEmailAuth,
  InviteTeamMemberDto,
  AddTeamMemberDirectDto,
  UpdateTeamMemberDto,
  TransferOwnershipDto
} from '../api/team.api';
import { toast } from 'sonner';

// Query keys for caching
export const teamQueryKeys = {
  all: ['team'] as const,
  walletTeam: (walletId: string) => ['team', 'wallet', walletId] as const,
  accessibleWallets: ['team', 'accessible-wallets'] as const,
};

/**
 * Get wallet team members
 */
export function useWalletTeam(walletId: string) {
  return useQuery({
    queryKey: teamQueryKeys.walletTeam(walletId),
    queryFn: () => getWalletTeam(walletId),
    enabled: !!walletId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get accessible wallets (owned or team member)
 */
export function useAccessibleWallets() {
  return useQuery({
    queryKey: teamQueryKeys.accessibleWallets,
    queryFn: getAccessibleWallets,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get my business wallet (for merchants)
 */
export function useMyBusinessWallet() {
  return useQuery({
    queryKey: ['wallet', 'business'] as const,
    queryFn: getMyBusinessWallet,
    staleTime: 60000, // 1 minute
    retry: 1,
  });
}

/**
 * Invite team member
 */
export function useInviteTeamMember(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InviteTeamMemberDto, 'walletId'>) =>
      inviteTeamMember(walletId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(walletId) });
      toast.success('Team member invited successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to invite team member');
    },
  });
}

/**
 * Add team member directly
 */
export function useAddTeamMemberDirect(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddTeamMemberDirectDto) =>
      addTeamMemberDirect(walletId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(walletId) });
      toast.success('Team member added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add team member');
    },
  });
}

/**
 * Update team member
 */
export function useUpdateTeamMember(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateTeamMemberDto }) =>
      updateTeamMember(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(walletId) });
      toast.success('Team member updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update team member');
    },
  });
}

/**
 * Remove team member
 */
export function useRemoveTeamMember(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeTeamMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(walletId) });
      toast.success('Team member removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove team member');
    },
  });
}

/**
 * Transfer ownership
 */
export function useTransferOwnership(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferOwnershipDto) =>
      transferOwnership(walletId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(walletId) });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.accessibleWallets });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to transfer ownership');
    },
  });
}

/**
 * Add owner email auth
 */
export function useAddOwnerEmailAuth() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      addOwnerEmailAuth(data),
    onSuccess: () => {
      toast.success('Email authentication added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add email authentication');
    },
  });
}

