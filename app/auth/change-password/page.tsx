"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import AuthShell from '@/components/auth/AuthShell';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthStatus from '@/components/auth/AuthStatus';
import AuthLoading from '@/components/auth/AuthLoading';
import FormAlert from '@/components/auth/FormAlert';
import { authButtonClass, authSecondaryButtonClass } from '@/components/auth/authStyles';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

type PasswordErrors = { currentPassword?: string; newPassword?: string; confirmPassword?: string };

function validate(
  { currentPassword, newPassword, confirmPassword }: { currentPassword: string; newPassword: string; confirmPassword: string },
  isFirstLogin: boolean
): PasswordErrors {
  const errors: PasswordErrors = {};
  if (!isFirstLogin && !currentPassword) errors.currentPassword = 'Enter your current password.';
  if (!newPassword) errors.newPassword = 'Enter a new password.';
  else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters long.';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password.';
  else if (newPassword && newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const isFirstLogin = searchParams.get('firstLogin') === 'true';

  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = isFirstLogin ? 'Set Your Password - RukaPay Merchant' : 'Change Password - RukaPay Merchant';
  }, [isFirstLogin]);

  const clearError = (field: keyof PasswordErrors) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validate({ currentPassword, newPassword, confirmPassword }, isFirstLogin);
    setErrors(nextErrors);
    if (nextErrors.currentPassword) {
      currentRef.current?.focus();
      return;
    }
    if (nextErrors.newPassword) {
      newRef.current?.focus();
      return;
    }
    if (nextErrors.confirmPassword) {
      confirmRef.current?.focus();
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
      <AuthShell>
        <AuthStatus
          tone="success"
          title={`Password ${isFirstLogin ? 'set' : 'changed'}`}
          description={`Your password has been ${isFirstLogin ? 'set' : 'changed'} successfully. Redirecting to your dashboard…`}
        />
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell>
        <AuthStatus
          tone="error"
          title="Session expired"
          description="Please login again to continue."
          actions={
            <Button onClick={() => router.push('/auth/login?tab=team')} className={authButtonClass}>
              Go to login
            </Button>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeader
        title={isFirstLogin ? 'Set your password' : 'Change password'}
        description={
          isFirstLogin
            ? 'Welcome! Please set a secure password for your account.'
            : 'Update your password to keep your account secure.'
        }
      />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {isFirstLogin && (
          <FormAlert tone="info" title="First login required">
            You must set a password before accessing the dashboard.
          </FormAlert>
        )}

        {!isFirstLogin && (
          <TextField
            ref={currentRef}
            variant="floating"
            id="currentPassword"
            type="password"
            label="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              clearError('currentPassword');
            }}
            error={errors.currentPassword}
            required
          />
        )}

        <TextField
          ref={newRef}
          variant="floating"
          id="newPassword"
          type="password"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            clearError('newPassword');
          }}
          error={errors.newPassword}
          hint="At least 8 characters."
          required
        />

        <TextField
          ref={confirmRef}
          variant="floating"
          id="confirmPassword"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearError('confirmPassword');
          }}
          error={errors.confirmPassword}
          required
        />

        <div className="space-y-3 pt-1">
          <Button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {isFirstLogin ? 'Setting Password...' : 'Changing Password...'}
              </>
            ) : (
              isFirstLogin ? 'Set password' : 'Change password'
            )}
          </Button>

          {!isFirstLogin && (
            <Button type="button" variant="outline" onClick={() => router.push('/')} className={authSecondaryButtonClass}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ChangePasswordContent />
    </Suspense>
  );
}
