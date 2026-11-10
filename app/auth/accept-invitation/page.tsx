"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import AuthShell from '@/components/auth/AuthShell';
import AuthStatus from '@/components/auth/AuthStatus';
import AuthLoading from '@/components/auth/AuthLoading';
import { authButtonClass } from '@/components/auth/authStyles';
import { toast } from 'sonner';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Accept Invitation - RukaPay Merchant';
  }, []);

  useEffect(() => {
    if (token) {
      acceptInvitation();
    } else {
      setError('Invalid invitation link - no token provided');
      setIsLoading(false);
    }
  }, [token]);

  const acceptInvitation = async () => {
    try {
      // TODO: Call the accept invitation API
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          // Add any other required fields
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        toast.success('Invitation accepted! You can now set your password.');

        // Redirect to set password page after a short delay
        setTimeout(() => {
          router.push(`/auth/set-password?token=${token}&email=${data.user?.email || ''}`);
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      setError(error.message || 'Failed to accept invitation');
      toast.error(error.message || 'Failed to accept invitation');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AuthShell>
        <AuthStatus
          tone="loading"
          title="Accepting your invitation"
          description="Please wait while we activate your team member account…"
        />
      </AuthShell>
    );
  }

  if (error) {
    return (
      <AuthShell>
        <AuthStatus
          tone="error"
          title="We couldn't accept this invitation"
          description={error}
          actions={
            <Button onClick={() => router.push('/auth/login')} className={authButtonClass}>
              Go to login
            </Button>
          }
        >
          <p className="text-[13px] text-slate-500">
            The invitation link may be expired or invalid. Please contact your team administrator for a new invitation.
          </p>
        </AuthStatus>
      </AuthShell>
    );
  }

  if (isSuccess) {
    return (
      <AuthShell>
        <AuthStatus
          tone="success"
          title="Invitation accepted"
          description="Your account has been successfully activated. You'll be redirected to set up your password."
        >
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Redirecting to password setup…
          </p>
        </AuthStatus>
      </AuthShell>
    );
  }

  return null;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
