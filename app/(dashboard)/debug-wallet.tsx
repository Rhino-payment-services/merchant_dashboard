"use client"

import { useSession } from "next-auth/react";
import { useUserProfile } from "./UserProfileProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";

export default function DebugWallet() {
  const { data: session } = useSession();
  const { profile, loading } = useUserProfile();
  const [fixing, setFixing] = useState(false);

  const handleFixUserType = async () => {
    try {
      setFixing(true);
      const response = await apiClient.post('/wallet/fix-user-type');
      toast.success(response.data.message);
      
      // Wait a moment then reload the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fix user type');
    } finally {
      setFixing(false);
    }
  };

  if (!session) return null;

  return (
    <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-lg">🐛 Debug: Wallet Access</h3>
        {(session?.user as any)?.userType === 'STAFF' && (
          <Button 
            onClick={handleFixUserType} 
            disabled={fixing}
            size="sm"
            variant="destructive"
          >
            {fixing ? 'Fixing...' : '🔧 Fix User Type (STAFF → SUBSCRIBER)'}
          </Button>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Session User ID:</strong> {(session.user as any)?.id || 'N/A'}
        </div>
        <div>
          <strong>User Type:</strong> {(session.user as any)?.userType || 'N/A'}
        </div>
        <div>
          <strong>User Role:</strong> {(session.user as any)?.role || 'N/A'}
        </div>
        <div>
          <strong>Loading Profile:</strong> {loading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Profile Merchant ID:</strong> {profile?.merchantId || 'N/A'}
        </div>
        <div>
          <strong>Profile Merchant Name:</strong> {profile?.merchant_names || profile?.merchantBusinessTradeName || profile?.businessTradeName || 'N/A'}
        </div>
        <div>
          <strong>Profile Balance:</strong> {profile?.merchant_balance || 0}
        </div>
        <div>
          <strong>Has Business Wallet:</strong> {profile?.businessWallet ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Is Team Member:</strong> {profile?.isTeamMember ? 'Yes' : 'No'}
        </div>
        {profile?.businessWallet && profile && (
          <div className="mt-2">
            <strong>Business Wallet:</strong>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-48">
              {JSON.stringify(profile.businessWallet, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
}

