"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import Image from 'next/image';
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
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
                <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className='rounded-lg' />
              </div>
              <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
            </div>
            <h1 className="text-3xl font-bold text-[#08163d] mb-3">Accepting Invitation</h1>
            <p className="text-gray-600 text-lg">Please wait while we process your invitation...</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Processing Your Invitation
                </h3>
                <p className="text-sm text-gray-600">
                  We're activating your team member account...
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
                <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className='rounded-lg' />
              </div>
              <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
            </div>
            <h1 className="text-3xl font-bold text-[#08163d] mb-3">Invitation Error</h1>
            <p className="text-gray-600 text-lg">There was a problem accepting your invitation</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Accept Invitation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {error}
                </p>
                <p className="text-xs text-gray-500">
                  The invitation link may be expired or invalid. Please contact your team administrator for a new invitation.
                </p>
              </div>

              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg"
              >
                Go to Login
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
                <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className='rounded-lg' />
              </div>
              <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
            </div>
            <h1 className="text-3xl font-bold text-[#08163d] mb-3">Invitation Accepted!</h1>
            <p className="text-gray-600 text-lg">Your team member account has been activated</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to the Team!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your account has been successfully activated. You'll be redirected to set up your password.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to password setup...</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-main-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
