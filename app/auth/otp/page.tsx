"use client"

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Head from 'next/head';
import { signIn } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';

function OTPContent() {
  const router = useRouter();
  const searchParams:any = useSearchParams();
  const phoneNumber = searchParams.get('phoneNumber') || '';
  const loginType = searchParams.get('type') || 'merchant'; // 'merchant' or 'team'
  const expiresIn = parseInt(searchParams.get('expiresIn') || '300'); // Default 5 minutes
  // For team members, phoneNumber param contains the phone number
  
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP
  const [countdown, setCountdown] = useState(60); // Start countdown with 60 seconds
  const [canResend, setCanResend] = useState(false);

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
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
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
    if (otp.some(digit => digit === '')) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const otpCode = otp.join('');
      
      console.log('🔐 Signing in with NextAuth...', { phoneNumber, loginType, otp: otpCode });
      
      // Use NextAuth signIn - team members use same merchant-otp provider (phone + OTP)
      const result = await signIn('merchant-otp', {
        phoneNumber: phoneNumber, // Both owner and team use phoneNumber
        otp: otpCode,
        redirect: false,
      });
      
      console.log('📥 NextAuth Result:', result);
      
      if (result?.error) {
        console.error('❌ Sign in failed:', result.error);
        toast.error(result.error || 'Invalid OTP. Please try again.');
        setIsLoading(false);
        return;
      }
      
      if (result?.ok) {
        console.log('✅ Sign in successful!');
        toast.success('OTP verified successfully!');
        
        // Small delay before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if user needs to change password (first login - applies to both owners and team members)
        const session = await fetch('/api/auth/session').then(res => res.json());
        const userData = (session?.user as any)?.userData;
        
        if (userData?.mustChangePassword || userData?.isFirstLogin) {
          toast.info('Please set your password');
          router.push('/auth/change-password?firstLogin=true');
          return;
        }
        
        // Redirect to dashboard
        console.log('🔄 Redirecting to dashboard...');
        router.push('/');
        router.refresh(); // Refresh to load session
      } else {
        console.error('❌ Unexpected sign in result:', result);
        toast.error('Authentication failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      toast.error(error?.message || 'Invalid OTP, please try again');
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '','']);
    // Focus on first input
    otpRefs.current[0]?.focus();
    
    try {
      // Resend OTP - team members use same merchant login API (phone + OTP)
      const response = await fetch(`${API_URL}/auth/merchant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('OTP resent successfully!');
      } else {
        toast.error(data.message || 'Failed to resend OTP');
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
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Verify OTP</h1>
          <p className="text-gray-600 text-lg">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-[#08163d]">{phoneNumber}</span>
          </p>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700 text-center block">
                Enter 6-digit OTP
              </label>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-main-500 focus:border-transparent transition-all duration-200 text-lg font-semibold"
                    placeholder=""
                  />
                ))}
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-main-600 hover:text-main-700 font-medium"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span className="text-gray-500">
                    Resend in {countdown}s
                  </span>
                )}
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OTPContent />
    </Suspense>
  );
} 