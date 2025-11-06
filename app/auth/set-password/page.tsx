"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Lock, Mail, Building2, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { acceptTeamInvitation } from '@/lib/api/team.api';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate passwords match
  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;

  useEffect(() => {
    document.title = 'Set Password - RukaPay Merchant';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!passwordValid) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Invalid invitation link. Please request a new invitation.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await acceptTeamInvitation({
        teamMemberId: token,
        password
      });

      if (result.success) {
        setIsSuccess(true);
        toast.success('Invitation accepted and password set successfully! You can now sign in.');
      } else {
        toast.error('Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      toast.error(error.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/auth/login?tab=team');
  };

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
            <h1 className="text-3xl font-bold text-[#08163d] mb-3">Account Activated!</h1>
            <p className="text-gray-600 text-lg">Your team member account is now ready</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to the team!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your password has been set successfully. You can now access the merchant dashboard.
                </p>
                <p className="text-xs text-gray-500">
                  Signed up as: <span className="font-medium">{email}</span>
                </p>
              </div>

              <Button
                onClick={handleSignIn}
                className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Sign In Now
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) {
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
            <h1 className="text-3xl font-bold text-[#08163d] mb-3">Invalid Link</h1>
            <p className="text-gray-600 text-lg">This invitation link is invalid or expired</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Link Expired or Invalid</h3>
                <p className="text-sm text-gray-600">
                  Please contact your business owner to send a new invitation.
                </p>
              </div>

              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Go to Login
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Set Your Password</h1>
          <p className="text-gray-600 text-lg">
            Welcome to the team! Create a secure password for your account.
          </p>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">{email}</span>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password *</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 ${password && !passwordValid ? 'border-red-300 focus:ring-red-500' : ''}`}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 ${confirmPassword && !passwordsMatch ? 'border-red-300 focus:ring-red-500' : ''}`}
                  required
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-600 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !passwordValid || !passwordsMatch}
              className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
            >
              {isLoading ? 'Setting Password...' : 'Set Password & Sign In'}
            </Button>

            <p className="text-xs text-center text-gray-500">
              By setting your password, you agree to our terms of service
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-main-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
