"use client"

import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  invitedAt: string;
  acceptedAt?: string;
  canViewBalance: boolean;
  canViewTransactions: boolean;
  canInitiatePayments: boolean;
  canApprovePayments: boolean;
  canManageTeam: boolean;
}

export default function TeamManagementPage() {
  const { data: session } = useSession();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'MEMBER' as TeamMember['role']
  });

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
    
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }

    setIsInviting(true);
    
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/wallet/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        },
        body: JSON.stringify({
          walletId: 'current-wallet-id', // Get from context/session
          ...inviteForm
        })
      });

      if (!response.ok) {
        throw new Error('Failed to invite team member');
      }

      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInviteDialog(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'MEMBER' });
      
      // Refresh team members list
      // await fetchTeamMembers();
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/wallet/team/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      toast.success('Team member removed');
      // Refresh list
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove team member');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-2">
          Manage who has access to your business wallet
        </p>
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
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to grant access to your business wallet
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
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={inviteForm.firstName}
                        onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={inviteForm.lastName}
                        onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={inviteForm.role} 
                      onValueChange={(value: any) => setInviteForm({ ...inviteForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <div>
                            <div className="font-medium">Admin</div>
                            <div className="text-xs text-gray-500">Can manage team & approve payments</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="ACCOUNTANT">
                          <div>
                            <div className="font-medium">Accountant</div>
                            <div className="text-xs text-gray-500">Can view all & initiate payments</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="MEMBER">
                          <div>
                            <div className="font-medium">Member</div>
                            <div className="text-xs text-gray-500">Basic view access</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          <div>
                            <div className="font-medium">Viewer</div>
                            <div className="text-xs text-gray-500">Read-only access</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {roleDescriptions[inviteForm.role]}
                    </p>
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
                      disabled={isInviting}
                    >
                      {isInviting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowInviteDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Your First Member
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">About Team Access</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Team members login with <strong>email and password</strong></li>
                <li>• Each member has specific permissions based on their role</li>
                <li>• All actions are logged for security and audit purposes</li>
                <li>• You can remove team members at any time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

