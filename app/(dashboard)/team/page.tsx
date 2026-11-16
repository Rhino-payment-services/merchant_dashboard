"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  ArrowRightLeft,
  Loader2,
  Phone
} from 'lucide-react';
import KpiCard from '@/app/components/KpiCard';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWalletTeam,
  useMyBusinessWallet,
  teamQueryKeys
} from '@/lib/hooks/useTeam';
import {
  inviteTeamMember,
  addTeamMemberDirect,
  removeTeamMember,
  transferOwnership,
  requestTransferOwnershipOtp,
  updateTeamMember,
} from '@/lib/api/team.api';
import type { TeamMember } from '@/lib/api/team.api';
import { useUserProfile } from '../UserProfileProvider';
import {
  TeamPermissionCheckboxes,
  type PermissionFormState,
} from '@/app/components/TeamPermissionCheckboxes';
import {
  canManageTeam,
  canManageDataBundleUsers,
  getDefaultPermissionsForRole,
  buildUserPermissionSession,
} from '@/lib/utils/permissions';
import { AccessDenied } from '@/app/components/AccessDenied';

const emptyPerms = (): PermissionFormState =>
  getDefaultPermissionsForRole('MEMBER');

export default function TeamManagementPage() {
  const { data: session } = useSession();
  const [businessWalletId, setBusinessWalletId] = useState<string>('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAddDirectDialog, setShowAddDirectDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'MEMBER' as 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER',
    permissions: emptyPerms(),
  });

  const [addDirectForm, setAddDirectForm] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
    password: string;
    permissions: PermissionFormState;
  }>({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'MEMBER',
    password: '',
    permissions: emptyPerms(),
  });

  const [editForm, setEditForm] = useState<{
    role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
    permissions: PermissionFormState;
    paymentSmsNotificationsEnabled: boolean;
    paymentEmailNotificationsEnabled: boolean;
  }>({
    role: 'MEMBER',
    permissions: emptyPerms(),
    paymentSmsNotificationsEnabled: false,
    paymentEmailNotificationsEnabled: false,
  });

  const [transferForm, setTransferForm] = useState({
    newOwnerUserId: '',
    password: '',
    otp: '',
  });
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const { profile } = useUserProfile();
  const isMerchant = !!(profile?.merchantCode || profile?.merchant_code);
  const featureCeiling = {
    featureLiquidation: !!(
      (profile as any)?.merchantData?.featureLiquidation ??
      (profile as any)?.businessWallet?.merchant?.featureLiquidation
    ),
    featureBulkPayments: !!(
      (profile as any)?.merchantData?.featureBulkPayments ??
      (profile as any)?.businessWallet?.merchant?.featureBulkPayments
    ),
    featurePayroll: !!(
      (profile as any)?.merchantData?.featurePayroll ??
      (profile as any)?.businessWallet?.merchant?.featurePayroll
    ),
    featurePayrollApprovals: !!(
      (profile as any)?.merchantData?.featurePayrollApprovals ??
      (profile as any)?.businessWallet?.merchant?.featurePayrollApprovals
    ),
    liquidationOnlyMode: !!(
      (profile as any)?.merchantData?.liquidationOnlyMode ??
      (profile as any)?.businessWallet?.merchant?.liquidationOnlyMode
    ),
    featureDataBundleDistribution: !!(
      (profile as any)?.merchantData?.featureDataBundleDistribution ??
      (profile as any)?.businessWallet?.merchant?.featureDataBundleDistribution
    ),
  };

  const userSession = buildUserPermissionSession({
    profile: profile as Parameters<typeof buildUserPermissionSession>[0]['profile'],
    viewingChildMerchantId:
      (session?.user as { viewingChildMerchantId?: string | null })?.viewingChildMerchantId ??
      null,
  });
  const canManage = canManageTeam(userSession);
  const permissionCeiling = {
    ...featureCeiling,
    canManageDataBundleUsers: canManageDataBundleUsers(userSession),
  };

  // Get merchant's business wallet directly
  const { data: businessWallet, isLoading: walletLoading, error: walletError } = useMyBusinessWallet();

  useEffect(() => {
    if (businessWallet?.id) {
      setBusinessWalletId(businessWallet.id);
    } else if (walletError) {
      console.error('Error fetching business wallet:', walletError);
    }
  }, [businessWallet, walletError]);

  // Fetch team members (only if we have a wallet ID)
  const { data: teamData, isLoading, refetch } = useWalletTeam(businessWalletId);
  const teamMembers = teamData?.members || [];
  const totalMembers = teamData?.totalMembers ?? teamMembers.length;
  const activeMembersCount =
    teamData?.activeMembers ?? teamMembers.filter((m) => m.status === 'ACTIVE').length;
  const pendingMembersCount =
    teamData?.pendingInvitations ?? teamMembers.filter((m) => m.status === 'PENDING').length;

  const memberPermissionLabels = (member: TeamMember) =>
    [
      member.canViewBalance && 'View Balance',
      member.canViewTransactions && 'View Tx',
      member.canViewReports && 'Reports',
      member.canCollectPayments && 'Collect',
      member.canInitiatePayments && 'Initiate Payments',
      member.canLiquidate && 'Liquidate',
      member.canApprovePayments && 'Approve Payments',
      member.canManagePayroll && 'Payroll',
      member.canManageEvents && 'Events',
      member.canManageTeam && 'Manage Team',
      member.canManageSettings && 'Settings',
      member.canUploadDataBundles && 'Data Bundles Maker',
      member.canApproveDataBundles && 'Data Bundles Checker',
      member.canViewDataBundleReports && 'Data Bundles Finance',
      member.canManageDataBundleUsers && 'Data Bundles Admin',
      member.canRetryDataBundles && 'Data Bundles Retry',
      member.paymentSmsNotificationsEnabled && 'Payment SMS',
      member.paymentEmailNotificationsEnabled && 'Payment Email',
    ].filter(Boolean) as string[];

  // Query client for manual mutations
  const queryClient = useQueryClient();

  const roleColors = {
    OWNER: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    ACCOUNTANT: 'bg-green-100 text-green-800',
    MEMBER: 'bg-gray-100 text-gray-800',
    VIEWER: 'bg-yellow-100 text-yellow-800',
  };

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    REMOVED: 'bg-gray-100 text-gray-800',
  };

  const roleDescriptions = {
    OWNER: 'Full access - Can manage everything including team',
    ADMIN: 'Can manage team and approve payments',
    ACCOUNTANT: 'Can view all and initiate payments',
    MEMBER: 'Basic access - View only',
    VIEWER: 'Read-only access to wallet',
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast.error('All fields are required');
      return;
    }

    if (!businessWalletId || businessWalletId === '') {
      toast.error('No business wallet found. Please refresh the page or contact support.');
      console.error('Business wallet ID missing:', businessWalletId);
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessWalletId)) {
      toast.error('Invalid wallet ID. Please refresh the page.');
      console.error('Invalid wallet ID format:', businessWalletId);
      return;
    }

    try {
      console.log('Inviting team member to wallet:', businessWalletId, inviteForm);
      const result = await inviteTeamMember(businessWalletId, {
        email: inviteForm.email,
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        phoneNumber: inviteForm.phoneNumber || undefined,
        role: inviteForm.role,
        ...inviteForm.permissions,
      });
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(businessWalletId) });
      if (result.linkedExistingUser) {
        toast.success(
          'Added as a team member. They can sign in with their existing RukaPay login.',
        );
      } else {
        toast.success(
          'Team member invited successfully! They will receive an email with instructions to set up their account.',
        );
      }
      setShowInviteDialog(false);
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'MEMBER',
        permissions: emptyPerms(),
      });
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      toast.error(error.response?.data?.message || 'Failed to invite team member');
    }
  };

  const handleAddMemberDirect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addDirectForm.email || !addDirectForm.firstName || !addDirectForm.lastName) {
      toast.error('All fields are required');
      return;
    }

    if (!businessWalletId || businessWalletId === '') {
      toast.error('No business wallet found. Please refresh the page or contact support.');
      console.error('Business wallet ID missing:', businessWalletId);
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessWalletId)) {
      toast.error('Invalid wallet ID. Please refresh the page.');
      console.error('Invalid wallet ID format:', businessWalletId);
      return;
    }

    // Generate a temporary secure password (user will change it via email)
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const formData = {
      email: addDirectForm.email,
      firstName: addDirectForm.firstName,
      lastName: addDirectForm.lastName,
      phoneNumber: addDirectForm.phoneNumber || undefined,
      role: addDirectForm.role,
      password: tempPassword,
      permissions: addDirectForm.permissions,
    };

    try {
      console.log('Adding team member to wallet:', businessWalletId, { ...formData, password: '[HIDDEN]' });
      const result = await addTeamMemberDirect(businessWalletId, formData);
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(businessWalletId) });
      if (result.linkedExistingUser) {
        toast.success(
          'Added as a team member. They can sign in with their existing RukaPay login.',
        );
      } else {
        toast.success(
          'Team member added successfully! Login credentials have been sent to their email.',
        );
      }
      setShowAddDirectDialog(false);
      setAddDirectForm({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'MEMBER',
        password: '',
        permissions: emptyPerms(),
      });
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error(error.response?.data?.message || 'Failed to add team member');
    }
  };

  const openEditMember = (member: TeamMember) => {
    if (member.role === 'OWNER') {
      toast.error('The OWNER membership cannot be edited');
      return;
    }
    setEditingMember(member);
    setEditForm({
      role: member.role,
      permissions: {
        canViewBalance: !!member.canViewBalance,
        canViewTransactions: !!member.canViewTransactions,
        canViewReports: member.canViewReports ?? true,
        canCollectPayments: !!member.canCollectPayments,
        canInitiatePayments: !!member.canInitiatePayments,
        canLiquidate: !!member.canLiquidate,
        canApprovePayments: !!member.canApprovePayments,
        canManagePayroll: !!member.canManagePayroll,
        canManageEvents: !!member.canManageEvents,
        canManageTeam: !!member.canManageTeam,
        canManageSettings: !!member.canManageSettings,
        canUploadDataBundles: !!member.canUploadDataBundles,
        canApproveDataBundles: !!member.canApproveDataBundles,
        canViewDataBundleReports: !!member.canViewDataBundleReports,
        canManageDataBundleUsers: !!member.canManageDataBundleUsers,
        canRetryDataBundles: !!member.canRetryDataBundles,
      },
      paymentSmsNotificationsEnabled: !!member.paymentSmsNotificationsEnabled,
      paymentEmailNotificationsEnabled: !!member.paymentEmailNotificationsEnabled,
    });
    setShowEditDialog(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      setSavingEdit(true);
      await updateTeamMember(editingMember.id, {
        role: editForm.role,
        ...editForm.permissions,
        paymentSmsNotificationsEnabled: editForm.paymentSmsNotificationsEnabled,
        paymentEmailNotificationsEnabled:
          editForm.paymentEmailNotificationsEnabled,
      });
      queryClient.invalidateQueries({
        queryKey: teamQueryKeys.walletTeam(businessWalletId),
      });
      toast.success('Member permissions updated');
      setShowEditDialog(false);
      setEditingMember(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update member');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember(memberId);
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(businessWalletId) });
      toast.success('Team member removed successfully');
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleRequestOtp = async () => {
    if (!businessWalletId) {
      toast.error('No business wallet found');
      return;
    }

    setIsRequestingOtp(true);
    try {
      const result = await requestTransferOwnershipOtp(businessWalletId);
      toast.success(result.message || 'OTP sent successfully to your phone number');
      setOtpSent(true);
    } catch (error: any) {
      console.error('Error requesting OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferForm.newOwnerUserId) {
      toast.error('New owner is required');
      return;
    }

    // For merchants, require OTP; for others, require password
    if (isMerchant && !transferForm.otp) {
      toast.error('OTP is required for merchant accounts');
      return;
    }

    if (!isMerchant && !transferForm.password) {
      toast.error('Password is required');
      return;
    }

    if (!businessWalletId) {
      toast.error('No business wallet found');
      return;
    }

    try {
      // Send only the appropriate field (OTP for merchants, password for others)
      const payload = {
        newOwnerUserId: transferForm.newOwnerUserId,
        ...(isMerchant ? { otp: transferForm.otp } : { password: transferForm.password })
      };
      
      const result = await transferOwnership(businessWalletId, payload);
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(businessWalletId) });
      // Invalidate user profile to refresh isWalletOwner flag for both old and new owner
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success(result.message);
      setShowTransferDialog(false);
      setTransferForm({ newOwnerUserId: '', password: '', otp: '' });
      setOtpSent(false);
      // Refresh the page to ensure all components get updated profile data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error transferring ownership:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer ownership');
    }
  };

  // Show loading while fetching wallet
  if (walletLoading || (isLoading && businessWalletId)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <AccessDenied description="You do not have permission to manage team members." />
    );
  }

  // Show error if wallet fetch failed
  if (walletError && !businessWalletId) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="flex gap-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <h3 className="text-[14px] font-semibold text-red-900">Error Loading Wallet</h3>
              <p className="mt-1 text-[12px] text-red-800">
                Failed to load business wallet. Please try refreshing or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no business wallet found
  if (!businessWalletId && !walletLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-[14px] font-semibold text-amber-900">No Business Wallet Found</h3>
              <p className="mt-1 text-[12px] text-amber-800">
                You need a business wallet to manage team members. Please create one first or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Team Management</h1>
          <p className="mt-0.5 text-[12px] text-gray-400">
            Manage who has access to your business wallet
          </p>
          {businessWallet && (
            <p className="mt-1 text-[12px] tabular-nums text-gray-500">
              Balance: {Number(businessWallet.balance ?? 0).toLocaleString()} {businessWallet.currency || 'UGX'}
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={showAddDirectDialog} onOpenChange={setShowAddDirectDialog}>
            <DialogTrigger asChild>
              <Button className="h-8 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create a team member account and send them an email with login credentials
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddMemberDirect} className="space-y-4">
                <div>
                  <Label htmlFor="add-email">Email Address *</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="member@company.com"
                    value={addDirectForm.email}
                    onChange={(e) => setAddDirectForm({ ...addDirectForm, email: e.target.value })}
                    required
                  />
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="add-firstName">First Name *</Label>
                    <Input
                      id="add-firstName"
                      placeholder="John"
                      value={addDirectForm.firstName}
                      onChange={(e) => setAddDirectForm({ ...addDirectForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-lastName">Last Name *</Label>
                    <Input
                      id="add-lastName"
                      placeholder="Doe"
                      value={addDirectForm.lastName}
                      onChange={(e) => setAddDirectForm({ ...addDirectForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="add-phoneNumber">Phone Number</Label>
                  <Input
                    id="add-phoneNumber"
                    type="tel"
                    placeholder="+256700123456"
                    value={addDirectForm.phoneNumber}
                    onChange={(e) => setAddDirectForm({ ...addDirectForm, phoneNumber: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional - Include country code (e.g., +256700123456)</p>
                </div>

                <div>
                  <Label htmlFor="add-role">Role *</Label>
                  <Select 
                    value={addDirectForm.role} 
                    onValueChange={(value: any) =>
                      setAddDirectForm({
                        ...addDirectForm,
                        role: value,
                        permissions: getDefaultPermissionsForRole(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                      <SelectItem value="ACCOUNTANT">Accountant - View & initiate</SelectItem>
                      <SelectItem value="MEMBER">Member - Basic view</SelectItem>
                      <SelectItem value="VIEWER">Viewer - Read only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <TeamPermissionCheckboxes
                  value={addDirectForm.permissions}
                  onChange={(permissions) =>
                    setAddDirectForm({ ...addDirectForm, permissions })
                  }
                  features={permissionCeiling}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDirectDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Add Member
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-8 rounded-full border-gray-200 px-3 text-[12px]">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Send Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an email invitation (they'll set their own password)
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="team.member@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="invite-phoneNumber">Phone Number</Label>
                  <Input
                    id="invite-phoneNumber"
                    type="tel"
                    placeholder="+256700123456"
                    value={inviteForm.phoneNumber}
                    onChange={(e) => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional - Include country code (e.g., +256700123456)</p>
                </div>

                <div>
                  <Label htmlFor="role">Role *</Label>
                    <Select
                    value={inviteForm.role}
                    onValueChange={(value: any) =>
                      setInviteForm({
                        ...inviteForm,
                        role: value,
                        permissions: getDefaultPermissionsForRole(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                      <SelectItem value="ACCOUNTANT">Accountant - View & initiate</SelectItem>
                      <SelectItem value="MEMBER">Member - Basic view</SelectItem>
                      <SelectItem value="VIEWER">Viewer - Read only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <TeamPermissionCheckboxes
                  value={inviteForm.permissions}
                  onChange={(permissions) =>
                    setInviteForm({ ...inviteForm, permissions })
                  }
                  features={permissionCeiling}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Send Invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard icon={Users} label="Total Members" value={String(totalMembers)} />
        <KpiCard icon={CheckCircle} label="Active" value={String(activeMembersCount)} />
        <KpiCard icon={Clock} label="Pending" value={String(pendingMembersCount)} />
      </div>
      <div>
        <Button
          variant="outline"
          className="h-8 rounded-full border-gray-200 px-3 text-[12px]"
          onClick={() => setShowTransferDialog(true)}
        >
          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
          Transfer Ownership
        </Button>
      </div>

      {/* Team Members List */}
      <Card className="rounded-2xl border-gray-100 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-[15px] font-semibold">Team Members</CardTitle>
          <CardDescription className="text-[12px]">
            People who have access to your business wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {teamMembers.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-[13px] font-medium text-gray-700">No team members yet</p>
              <p className="mt-1 text-[12px] text-gray-400">
                Invite team members to help manage your business wallet
              </p>
              <Button
                className="mt-4 h-8 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
                onClick={() => setShowAddDirectDialog(true)}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add Your First Member
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
              {teamMembers.map((member) => {
                const perms = memberPermissionLabels(member);
                const visiblePerms = perms.slice(0, 4);
                const extraPerms = perms.length - visiblePerms.length;
                const displayName =
                  member.firstName || member.lastName
                    ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                    : member.email;
                return (
                <div
                  key={member.id}
                  className="flex items-start justify-between gap-3 px-4 py-3.5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-700">
                      {(member.firstName?.[0] || member.email[0] || '?').toUpperCase()}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-gray-900">
                          {displayName}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[member.role]}`}>
                          {member.role}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[member.status]}`}>
                          {member.status}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {member.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {member.phone ? member.phone.replace(/^\+/, '') : '—'}
                        </span>
                      </div>
                      
                      {perms.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {visiblePerms.map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600"
                            >
                              {label}
                            </span>
                          ))}
                          {extraPerms > 0 && (
                            <span className="rounded-full border border-gray-100 bg-white px-2 py-0.5 text-[10px] text-gray-400">
                              +{extraPerms} more
                            </span>
                          )}
                        </div>
                      )}

                      {member.status === 'PENDING' && (
                        <p className="mt-1.5 text-[11px] text-amber-600">
                          Invited {new Date(member.invitedAt).toLocaleDateString()} - Waiting for acceptance
                        </p>
                      )}
                      {member.status === 'ACTIVE' && member.acceptedAt && (
                        <p className="mt-1.5 text-[11px] text-gray-400">
                          Active since {new Date(member.acceptedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {member.role !== 'OWNER' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditMember(member)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-800"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {displayName} from your team. They will no longer have access to the wallet.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Wallet Ownership</DialogTitle>
            <DialogDescription>
              Transfer complete ownership of this wallet to another team member. You will become an ADMIN member.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransferOwnership} className="space-y-4">
            <div>
              <Label htmlFor="newOwner">New Owner *</Label>
              <Select 
                value={transferForm.newOwnerUserId} 
                onValueChange={(value) => setTransferForm({ ...transferForm, newOwnerUserId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter(m => m.status === 'ACTIVE' && m.role !== 'OWNER')
                    .map(member => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.firstName} {member.lastName} ({member.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {isMerchant ? (
              <div>
                <Label htmlFor="transfer-otp">Enter OTP *</Label>
                <div className="flex gap-2">
                  <Input
                    id="transfer-otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={transferForm.otp}
                    onChange={(e) => setTransferForm({ ...transferForm, otp: e.target.value })}
                    maxLength={6}
                    required
                    disabled={!otpSent}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRequestOtp}
                    disabled={isRequestingOtp || otpSent}
                    className="whitespace-nowrap"
                  >
                    {isRequestingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : otpSent ? (
                      'OTP Sent'
                    ) : (
                      'Request OTP'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {otpSent 
                    ? 'OTP sent to your phone number. Enter the code to confirm transfer.'
                    : 'Click "Request OTP" to receive a verification code on your phone'}
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="transfer-password">Confirm Your Password *</Label>
                <Input
                  id="transfer-password"
                  type="password"
                  placeholder="Enter your password"
                  value={transferForm.password}
                  onChange={(e) => setTransferForm({ ...transferForm, password: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password confirmation required for security
                </p>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">Important:</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• You will become an ADMIN (no longer owner)</li>
                <li>• New owner gets full control of the wallet</li>
                <li>• This action cannot be undone without the new owner's consent</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTransferDialog(false);
                  setTransferForm({ newOwnerUserId: '', password: '', otp: '' });
                  setOtpSent(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Ownership
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit member permissions */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingMember(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>
              Update role and permissions for {editingMember?.email}. OWNER cannot
              be edited here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4">
            <div>
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: any) =>
                  setEditForm({
                    ...editForm,
                    role: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Role is a label; checkboxes below are the source of truth.
              </p>
            </div>
            <TeamPermissionCheckboxes
              value={editForm.permissions}
              onChange={(permissions) =>
                setEditForm({ ...editForm, permissions })
              }
              features={permissionCeiling}
              disabled={savingEdit}
            />
            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-medium">Payment confirmation</p>
              <p className="text-xs text-gray-500">
                Only ACTIVE members receive notifications. Pending invites are
                ignored until accepted.
              </p>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>SMS notifications</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={editForm.paymentSmsNotificationsEnabled}
                  disabled={savingEdit}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      paymentSmsNotificationsEnabled: e.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Email notifications</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={editForm.paymentEmailNotificationsEnabled}
                  disabled={savingEdit}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      paymentEmailNotificationsEnabled: e.target.checked,
                    })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save permissions'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex gap-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <h3 className="text-[13px] font-semibold text-gray-900">About Team Access</h3>
            <ul className="mt-1.5 space-y-1 text-[12px] text-gray-500">
              <li>• <strong className="font-medium text-gray-700">Add Member</strong>: Create account and send login credentials via email</li>
              <li>• <strong className="font-medium text-gray-700">Send Invite</strong>: Email invitation (they set password via secure link)</li>
              <li>• <strong className="font-medium text-gray-700">Transfer Ownership</strong>: Hand over complete control</li>
              <li>• All actions are logged for security and audit purposes</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

