"use client"

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import AuthShell from '@/components/auth/AuthShell';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthLoading from '@/components/auth/AuthLoading';
import { authButtonClass } from '@/components/auth/authStyles';
import { FieldError } from '@/components/ui/field-message';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';
import {
  clearMerchantOtpPhone,
  readMerchantOtpPhone,
  rememberMerchantOtpPhone,
} from '@/lib/auth/merchantOtpPhone';
import { extractApiErrorMessage } from '@/lib/auth/merchantOtpUser';
import { resolveMerchantOwnerPostLoginPath } from '@/lib/auth/merchantPortalAuth';

function OTPContent() {
  const router = useRouter();
  const searchParams:any = useSearchParams();
  const phoneNumber = readMerchantOtpPhone(searchParams.get('phoneNumber'));
  const loginType = searchParams.get('type') || 'merchant'; // 'merchant' or 'team'
  const expiresIn = parseInt(searchParams.get('expiresIn') || '300'); // Default 5 minutes
  // For team members, phoneNumber param contains the phone number
  
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP
  const [countdown, setCountdown] = useState(60); // Start countdown with 60 seconds
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState<string>();

  // Refs for OTP input boxes
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit && value.length > 0) return;
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    
    setOtp(newOtp);
    setOtpError(undefined);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate OTP is complete
    const firstEmpty = otp.findIndex(digit => digit === '');
    if (firstEmpty !== -1) {
      setOtpError('Enter the complete 6-digit code.');
      otpRefs.current[firstEmpty]?.focus();
      return;
    }
    
    if (!phoneNumber) {
      toast.error('Phone number missing. Please request a new OTP.');
      router.push('/auth/login');
      return;
    }

    setIsLoading(true);
    
    const otpCode = otp.join('').replace(/\D/g, '');
    if (otpCode.length !== 6) {
      setOtpError('Enter the complete 6-digit code.');
      setIsLoading(false);
      return;
    }
    
    try {
      // Use NextAuth directly — provider verifies OTP server-side and handles session/cookie
      const result = await signIn('merchant-otp', {
        phoneNumber,
        otp: otpCode,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || 'Invalid OTP. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!result?.ok) {
        toast.error('Authentication failed. Please try again.');
        setIsLoading(false);
        return;
      }

      toast.success('OTP verified successfully!');
      clearMerchantOtpPhone();

      const session = await fetch('/api/auth/session').then(r => r.json());
      window.location.assign(resolveMerchantOwnerPostLoginPath(session));
    } catch (error: unknown) {
      console.error('❌ Sign in error:', error);
      toast.error(extractApiErrorMessage(error, 'Invalid OTP, please try again'));
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '','']);
    setOtpError(undefined);
    // Focus on first input
    otpRefs.current[0]?.focus();
    
    try {
      // Resend OTP - team members use same merchant login API (phone + OTP)
      const response = await fetch(`${API_URL}/auth/merchant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const resData = await response.json().catch(() => ({})) as { success?: boolean; message?: string };

      if (resData.success) {
        rememberMerchantOtpPhone(phoneNumber);
        toast.success('OTP resent successfully!');
      } else {
        toast.error(resData.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error('Failed to resend OTP. Please try again.');
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <AuthShell>
      <AuthHeader
        onBack={handleBackToLogin}
        title="Verify your phone"
        description={
          <>
            Enter the 6-digit code sent to{' '}
            <span className="font-medium text-slate-800">{phoneNumber ? `+${phoneNumber.replace(/^\+/, '')}` : 'your phone'}</span>
          </>
        }
      />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
        <fieldset aria-describedby={otpError ? 'otp-error' : undefined}>
          <legend className={cn("block text-sm font-medium", otpError ? "text-error" : "text-slate-700")}>
            Verification code
          </legend>
          <div className="mt-2 flex justify-between gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                aria-label={`Digit ${index + 1}`}
                aria-invalid={otpError && !digit ? true : undefined}
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className={cn(
                  "h-12 w-full min-w-0 rounded-lg border bg-white text-center text-lg font-semibold text-primary transition-[border-color,box-shadow] duration-150 outline-none hover:border-slate-300 focus:border-primary focus:ring-[3px] focus:ring-primary/10 sm:h-14 sm:text-xl",
                  digit ? "border-primary/40" : otpError ? "border-error focus:border-error focus:ring-error/15" : "border-slate-200"
                )}
                placeholder=""
              />
            ))}
          </div>
          <FieldError id="otp-error" message={otpError} />
        </fieldset>

        <Button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Verifying...
            </>
          ) : (
            <>
              Verify & Continue
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Didn&apos;t receive the code?{' '}
          {canResend ? (
            <button
              type="button"
              onClick={handleResendOTP}
              className="cursor-pointer font-medium text-primary underline-offset-4 transition-colors hover:underline"
            >
              Resend code
            </button>
          ) : (
            <span className="tabular-nums text-slate-400">Resend in {countdown}s</span>
          )}
        </p>
      </form>
    </AuthShell>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <OTPContent />
    </Suspense>
  );
} 