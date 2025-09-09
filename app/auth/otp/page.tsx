"use client"

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import Image from 'next/image';
import { verifyOtpApi } from '@/app/lib/mockBackend';
import { toast } from 'sonner';
import { useVerifyOtp } from '@/lib/api/auth.api';
import { signIn } from 'next-auth/react';

function OTPContent() {
  const router = useRouter();
  const searchParams:any = useSearchParams();
  const phoneNumber = searchParams.get('phoneNumber') || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const verifyOtp = useVerifyOtp()

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
      // Use NextAuth signIn with credentials provider
      const res = await signIn("credentials", {
        redirect: false,
        phoneNumber: phoneNumber,
        otp: otp.join(''),
      });
      if (res?.ok) {
        toast.success("Login successfully");
        router.push("/");
        setIsLoading(false);
      } else {
        setIsLoading(false);
        toast.error("Something went wrong, please try again later");
      }
    } catch (err: any) {
      setIsLoading(false);
      toast.error(err.message || 'Invalid OTP');
    }
  };

  const handleResendOTP = () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '','']);
    // Focus on first input
    otpRefs.current[0]?.focus();
    
    // Simulate resend API call
    console.log('Resending OTP to:', phoneNumber);
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-main-600 rounded-xl flex items-center justify-center mr-3">
              <Image src="/images/logo.jpg" alt="RukaPay" width={48} height={48} className='rounded-xl' />
            </div>
            <span className="text-3xl font-bold text-gray-900">RukaPay</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h1>
          <p className="text-gray-600">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-main-600">{phoneNumber}</span>
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
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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