"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import AuthShell from '@/components/auth/AuthShell';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthStatus from '@/components/auth/AuthStatus';
import AuthLoading from '@/components/auth/AuthLoading';
import { authButtonClass } from '@/components/auth/authStyles';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { acceptTeamInvitation } from '@/lib/api/team.api';

type PasswordErrors = { password?: string; confirmPassword?: string };

function validate(password: string, confirmPassword: string): PasswordErrors {
  const errors: PasswordErrors = {};
  if (!password) errors.password = 'Enter a password.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters long.';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (password && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Set Password - RukaPay Merchant';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validate(password, confirmPassword);
    setErrors(nextErrors);
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }
    if (nextErrors.confirmPassword) {
      confirmRef.current?.focus();
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
      <AuthShell>
        <AuthStatus
          tone="success"
          title="Welcome to the team"
          description="Your password has been set successfully. You can now access the merchant dashboard."
          actions={
            <Button onClick={handleSignIn} className={authButtonClass}>
              Sign in now
            </Button>
          }
        >
          {email && (
            <p className="text-[13px] text-slate-500">
              Signed up as <span className="font-medium text-slate-800">{email}</span>
            </p>
          )}
        </AuthStatus>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell>
        <AuthStatus
          tone="error"
          title="This invitation link is not valid"
          description="The link is invalid or has expired. Please contact your business owner to send a new invitation."
          actions={
            <Button onClick={() => router.push('/auth/login')} className={authButtonClass}>
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
        title="Set your password"
        description="Welcome to the team! Create a secure password for your account."
      />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {email && (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
            <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate font-medium">{email}</span>
          </div>
        )}

        <TextField
          ref={passwordRef}
          variant="floating"
          id="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
          hint="At least 8 characters."
          required
        />

        <TextField
          ref={confirmRef}
          variant="floating"
          id="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
          required
        />

        <Button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Setting Password...
            </>
          ) : (
            'Set password & sign in'
          )}
        </Button>

        <p className="text-center text-[13px] text-slate-500">
          By setting your password, you agree to our terms of service.
        </p>
      </form>
    </AuthShell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SetPasswordContent />
    </Suspense>
  );
}
