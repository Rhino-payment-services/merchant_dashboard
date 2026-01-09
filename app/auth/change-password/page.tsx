"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const isFirstLogin = searchParams.get('firstLogin') === 'true';

  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password validation
  const passwordValid = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  useEffect(() => {
    document.title = isFirstLogin ? 'Set Your Password - RukaPay Merchant' : 'Change Password - RukaPay Merchant';
  }, [isFirstLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirstLogin && !currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!newPassword || !confirmPassword) {
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

    setIsLoading(true);

    try {
      const userData = (session?.user as any)?.userData;
      const userId = userData?.id || (session?.user as any)?.id;

      if (!userId) {
        toast.error('Session expired. Please login again.');
        router.push('/auth/login');
        return;
      }

      // Call change password API (using same admin API)
      const endpoint = isFirstLogin 
        ? '/auth/set-password'  // Admin API for first login
        : '/auth/change-password';  // Admin API for password change

      const payload = isFirstLogin
        ? { password: newPassword }
        : { currentPassword, newPassword };

      const response = await apiClient.post(endpoint, payload);

      if (response.data.success) {
        setIsSuccess(true);
        toast.success(isFirstLogin ? 'Password set successfully!' : 'Password changed successfully!');
        
        // Update session to remove mustChangePassword flag
        await update({
          ...session,
          user: {
            ...session?.user,
            userData: {
              ...userData,
              mustChangePassword: false,
              isFirstLogin: false
            }
          }
        });

        // Redirect after a short delay
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2000);
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
                <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className='rounded-lg' />
              </div>
              <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
            </div>
            <h1 className="text-3xl font-bold text-[#08163d] mb-3">Password {isFirstLogin ? 'Set' : 'Changed'}!</h1>
            <p className="text-gray-600 text-lg">Your password has been {isFirstLogin ? 'set' : 'changed'} successfully</p>
          </div>

          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                Redirecting to dashboard...
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please login again to continue.
                </p>
                <Button
                  onClick={() => router.push('/auth/login?tab=team')}
                  className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg"
                >
                  Go to Login
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
              <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className='rounded-lg' />
            </div>
            <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
          </div>
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">
            {isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </h1>
          <p className="text-gray-600 text-lg">
            {isFirstLogin 
              ? 'Welcome! Please set a secure password for your account.'
              : 'Update your password to keep your account secure.'
            }
          </p>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {isFirstLogin && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">First Login Required</p>
                  <p>You must set a password before accessing the dashboard.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password (only for password change, not first login) */}
            {!isFirstLogin && (
              <div>
                <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Current Password *</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password *</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`pl-10 ${newPassword && !passwordValid ? 'border-red-300 focus:ring-red-500' : ''}`}
                  required
                />
              </div>
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className={`text-xs flex items-center gap-1 ${passwordValid ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordValid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    At least 8 characters
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
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
              disabled={isLoading || !passwordValid || !passwordsMatch || (!isFirstLogin && !currentPassword)}
              className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
            >
              {isLoading 
                ? (isFirstLogin ? 'Setting Password...' : 'Changing Password...') 
                : (isFirstLogin ? 'Set Password' : 'Change Password')
              }
            </Button>

            {!isFirstLogin && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-main-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ChangePasswordContent />
    </Suspense>
  );
}
