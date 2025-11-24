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
  MoreVertical,
  Trash2,
  Edit,
  Key,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
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
  requestTransferOwnershipOtp
} from '@/lib/api/team.api';
import type { TeamMember } from '@/lib/api/team.api';
import { useUserProfile } from '../UserProfileProvider';

export default function TeamManagementPage() {
  const { data: session } = useSession();
  const [businessWalletId, setBusinessWalletId] = useState<string>('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAddDirectDialog, setShowAddDirectDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'MEMBER' as 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER'
  });

  const [addDirectForm, setAddDirectForm] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
    password: string;
  }>({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'MEMBER',
    password: '' // Temporary password - user will change via email
  });

  const [transferForm, setTransferForm] = useState({
    newOwnerUserId: '',
    password: '',
    otp: ''
  });
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Get user profile to check if user is a merchant
  const { profile } = useUserProfile();
  const isMerchant = !!(profile?.merchantCode || profile?.merchant_code);

  // Get merchant's business wallet directly
  const { data: businessWallet, isLoading: walletLoading, error: walletError } = useMyBusinessWallet();

  useEffect(() => {
    if (businessWallet?.id) {
      setBusinessWalletId(businessWallet.id);
      console.log('✅ Business wallet found:', businessWallet.id);
    } else if (walletError) {
      console.error('❌ Error fetching business wallet:', walletError);
    }
  }, [businessWallet, walletError]);

  // Fetch team members (only if we have a wallet ID)
  const { data: teamData, isLoading, refetch } = useWalletTeam(businessWalletId);
  const teamMembers = teamData?.members || [];

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
      await inviteTeamMember(businessWalletId, inviteForm);
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(businessWalletId) });
      toast.success('Team member invited successfully! They will receive an email with instructions to set up their account.');
      setShowInviteDialog(false);
      setInviteForm({ email: '', firstName: '', lastName: '', phoneNumber: '', role: 'MEMBER' });
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
      ...addDirectForm,
      password: tempPassword
    };

    try {
      console.log('Adding team member to wallet:', businessWalletId, { ...formData, password: '[HIDDEN]' });
      await addTeamMemberDirect(businessWalletId, formData);
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.walletTeam(businessWalletId) });
      toast.success('Team member added successfully! Login credentials have been sent to their email.');
      setShowAddDirectDialog(false);
      setAddDirectForm({ email: '', firstName: '', lastName: '', phoneNumber: '', role: 'MEMBER', password: '' });
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error(error.response?.data?.message || 'Failed to add team member');
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
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Show error if wallet fetch failed
  if (walletError && !businessWalletId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Error Loading Wallet</h3>
                <p className="text-sm text-red-800">
                  Failed to load business wallet. Please try refreshing or contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no business wallet found
  if (!businessWalletId && !walletLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">No Business Wallet Found</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  You need a business wallet to manage team members. Please create one first or contact support.
                </p>
                <p className="text-xs text-yellow-700">
                  Debug: Wallet ID = {businessWalletId || 'null'}, Loading = {walletLoading ? 'true' : 'false'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">
            Manage who has access to your business wallet
          </p>
          {businessWallet && (
            <p className="text-xs text-gray-500 mt-1">
              Wallet: {businessWallet.id} | Balance: {businessWallet.balance?.toLocaleString()} {businessWallet.currency}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showAddDirectDialog} onOpenChange={setShowAddDirectDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <UserPlus className="h-4 w-4 mr-2" />
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
                    onValueChange={(value: any) => setAddDirectForm({ ...addDirectForm, role: value })}
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
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Mail className="h-4 w-4 mr-2" />
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
                    onValueChange={(value: any) => setInviteForm({ ...inviteForm, role: value })}
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
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {teamMembers.filter(m => m.status === 'ACTIVE').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {teamMembers.filter(m => m.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowTransferDialog(true)}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer Ownership
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to your business wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No team members yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Invite team members to help manage your business wallet
              </p>
              <Button 
                className="mt-4 bg-green-600 hover:bg-green-700"
                onClick={() => setShowAddDirectDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {member.firstName?.[0] || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}`
                            : member.email
                          }
                        </p>
                        <Badge className={roleColors[member.role]}>
                          {member.role}
                        </Badge>
                        <Badge className={statusColors[member.status]}>
                          {member.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      
                      <div className="flex gap-2 mt-2">
                        {member.canViewBalance && (
                          <Badge variant="outline" className="text-xs">
                            View Balance
                          </Badge>
                        )}
                        {member.canInitiatePayments && (
                          <Badge variant="outline" className="text-xs">
                            Initiate Payments
                          </Badge>
                        )}
                        {member.canApprovePayments && (
                          <Badge variant="outline" className="text-xs">
                            Approve Payments
                          </Badge>
                        )}
                        {member.canManageTeam && (
                          <Badge variant="outline" className="text-xs">
                            Manage Team
                          </Badge>
                        )}
                      </div>

                      {member.status === 'PENDING' && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Invited {new Date(member.invitedAt).toLocaleDateString()} - Waiting for acceptance
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role !== 'OWNER' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* Edit member */}}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {member.firstName} {member.lastName} from your team. They will no longer have access to the wallet.
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
              ))}
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

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">About Team Access</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Add Member</strong>: Create account and send login credentials via email</li>
                <li>• <strong>Send Invite</strong>: Email invitation (they set password via secure link)</li>
                <li>• <strong>Transfer Ownership</strong>: Hand over complete control</li>
                <li>• All actions are logged for security and audit purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

