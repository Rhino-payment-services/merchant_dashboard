"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { PinInput } from '../../../components/ui/pin-input';
import { PhoneNumberInput } from '../../../components/ui/phone-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Phone, Mail, Lock, Building2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';
import { rememberMerchantOtpPhone, normalizeMerchantPortalPhone } from '@/lib/auth/merchantOtpPhone';
import {
  fetchMerchantLoginOptions,
  resolveMerchantOwnerPostLoginPath,
  type MerchantLoginOptions,
} from '@/lib/auth/merchantPortalAuth';
import Link from 'next/link';

function LoginContent() {
  useEffect(() => {
    document.title = 'Login - RukaPay Merchant';
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam === 'team' ? "team" : "owner");
  const [ownerLoginMode, setOwnerLoginMode] = useState<'otp' | 'pin'>('otp');
  const [loginOptions, setLoginOptions] = useState<MerchantLoginOptions | null>(null);
  const [portalPin, setPortalPin] = useState('');

  // Owner login (Phone + OTP)
  const [ownerData, setOwnerData] = useState({
    phoneNumber: '',
  });

  // Team member login (Email + Password only)
  const [teamData, setTeamData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    const phone = normalizeMerchantPortalPhone(ownerData.phoneNumber);
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      setLoginOptions(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const options = await fetchMerchantLoginOptions(phone);
      if (cancelled) return;
      setLoginOptions(options);
      if (!options?.pinEnabled && ownerLoginMode === 'pin') {
        setOwnerLoginMode('otp');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ownerData.phoneNumber, ownerLoginMode]);

  // Handle Owner Login - Request OTP
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ownerData.phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    
    try {
      const phoneNumber = normalizeMerchantPortalPhone(ownerData.phoneNumber);
      if (!phoneNumber) {
        toast.error('Please enter a valid phone number');
        setIsLoading(false);
        return;
      }

      // Request OTP from backend
      const url = `${API_URL}/auth/merchant/login`;
      console.log('🔗 Calling API:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      let data: { success?: boolean; message?: string; expiresIn?: number };
      try {
        data = await response.json();
      } catch {
        throw new Error(response.ok ? 'Invalid response from server' : `Server error ${response.status}`);
      }

      if (data.success) {
        toast.success('OTP sent to your phone!');
        rememberMerchantOtpPhone(phoneNumber);
        router.push(`/auth/otp?phoneNumber=${encodeURIComponent(phoneNumber)}&expiresIn=${data.expiresIn || 300}`);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('fetch') || message === 'Failed to fetch') {
        toast.error(`Cannot reach the API at ${API_URL}. Is the backend running?`);
      } else {
        toast.error(message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerPinLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneNumber = normalizeMerchantPortalPhone(ownerData.phoneNumber);
    if (!phoneNumber) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!loginOptions?.pinEnabled) {
      toast.error('PIN login is not enabled for this account');
      return;
    }
    if (!portalPin || portalPin.length < 4) {
      toast.error('Please enter your portal PIN');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn('merchant-pin', {
        phoneNumber,
        pin: portalPin,
        redirect: false,
      });

      if (result?.error) {
        const message =
          result.error === 'CredentialsSignin'
            ? 'Invalid phone number or PIN.'
            : result.error
        toast.error(message)
        return
      }

      if (!result?.ok) {
        toast.error('Authentication failed. Please try again.');
        return;
      }

      toast.success('Signed in successfully');
      rememberMerchantOtpPhone(phoneNumber);

      const session = await fetch('/api/auth/session').then((r) => r.json());
      window.location.assign(resolveMerchantOwnerPostLoginPath(session));
    } catch (error: unknown) {
      console.error('PIN login error:', error);
      toast.error(error instanceof Error ? error.message : 'PIN login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Team Member Login - Email + Password
  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamData.email) {
      toast.error('Please enter your email address');
      return;
    }

    if (!teamData.password) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use NextAuth to sign in
      const result = await signIn('team-member', {
        email: teamData.email,
        password: teamData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        toast.success('Login successful!');
        // Wait for session to be fully updated
        await new Promise(resolve => setTimeout(resolve, 500));
        const session = await fetch('/api/auth/session').then(res => res.json());
        console.log('📊 Email login - Session data:', session);
        const userData = (session?.user as any)?.userData || (session?.user as any)?.user;
        const merchants = (session?.user as any)?.merchants || [];
        const hasPendingMerchant = (session?.user as any)?.hasPendingMerchant === true;

        console.log('📊 Email login - Merchants check:', {
          merchantsLength: merchants.length,
          merchants,
          hasPendingMerchant,
          shouldRedirectToSelect: merchants.length > 1 || (hasPendingMerchant && merchants.length === 0)
        });

        if (userData?.mustChangePassword || userData?.isFirstLogin) {
          toast.info('Please set your password');
          router.push('/auth/change-password?firstLogin=true');
          return;
        }

        // Always redirect to merchant selection if user has multiple merchants
        if (merchants.length > 1) {
          console.log('📊 Redirecting to merchant selection - multiple merchants:', merchants.length);
          router.push('/auth/select-merchant');
          router.refresh();
          return;
        } else if (hasPendingMerchant && merchants.length === 0) {
          console.log('📊 Redirecting to merchant selection - pending merchant');
          router.push('/auth/select-merchant');
          router.refresh();
          return;
        } else {
          console.log('📊 Redirecting to dashboard - single/no merchant');
          router.push('/');
          router.refresh();
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-main-50 via-white to-main-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Page Header - matches OTP page exactly */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mr-3 bg-white shadow-md">
              <Image src="/images/logo.jpg" alt="RukaPay" width={56} height={56} className='rounded-lg' />
            </div>
            <span className="text-4xl font-bold text-[#08163d]">RukaPay</span>
          </div>
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Sign In</h1>
          <p className="text-gray-600 text-lg">Access your merchant dashboard</p>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="owner" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Login
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Login
            </TabsTrigger>
          </TabsList>

          {/* Business Owner Login (Phone + OTP or PIN) */}
          <TabsContent value="owner">
            {loginOptions?.pinEnabled && (
              <Tabs value={ownerLoginMode} onValueChange={(v) => setOwnerLoginMode(v as 'otp' | 'pin')} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="otp">OTP</TabsTrigger>
                  <TabsTrigger value="pin">PIN</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {ownerLoginMode === 'pin' && loginOptions?.pinEnabled ? (
              <form onSubmit={handleOwnerPinLogin} className="space-y-4">
                <div>
                  <label htmlFor="phoneNumberPin" className="text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="mt-2">
                    <PhoneNumberInput
                      value={ownerData.phoneNumber}
                      onChange={(value) => setOwnerData({ ...ownerData, phoneNumber: value })}
                      placeholder="700 123 456"
                      defaultCountry="ug"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="portalPin" className="text-sm font-medium text-gray-700">Portal PIN</label>
                  <div className="mt-2">
                    <PinInput
                      id="portalPin"
                      placeholder="Enter your portal PIN"
                      value={portalPin}
                      onChange={setPortalPin}
                      leftIcon={<Lock className="h-4 w-4" />}
                      required
                    />
                  </div>
                  {loginOptions?.pinSetupRequired && (
                    <p className="text-xs text-amber-600 mt-2">
                      No portal PIN set yet. Sign in with OTP first, or use a temporary PIN from your admin.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in…' : 'Sign in with PIN'}
                </Button>
                <p className="text-xs text-center text-gray-500">
                  Merchant dashboard PIN only ·{' '}
                  <Link
                    href={
                      ownerData.phoneNumber
                        ? `/auth/forgot-portal-pin?phoneNumber=${encodeURIComponent(
                            normalizeMerchantPortalPhone(ownerData.phoneNumber) ||
                              ownerData.phoneNumber,
                          )}`
                        : '/auth/forgot-portal-pin'
                    }
                    className="text-main-600 hover:underline"
                  >
                    Forgot portal PIN?
                  </Link>
                </p>
              </form>
            ) : (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-2">
                  <PhoneNumberInput
                    value={ownerData.phoneNumber}
                    onChange={(value) => setOwnerData({ ...ownerData, phoneNumber: value })}
                    placeholder="700 123 456"
                    defaultCountry="ug"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter your registered phone number
                </p>
              </div>

              <Button
                type="submit"
                className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <p className="text-xs text-center text-gray-500">
                You'll receive a 6-digit OTP via SMS
              </p>
            </form>
            )}
          </TabsContent>

          {/* Team Member Login (Email + Password only) */}
          <TabsContent value="team">
            <form onSubmit={handleTeamLogin} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@company.com"
                    value={teamData.email}
                    onChange={(e) => setTeamData({ ...teamData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={teamData.password}
                    onChange={(e) => setTeamData({ ...teamData, password: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Team member access provided by business owner
              </p>
            </form>
          </TabsContent>
          </Tabs>
        </Card>

        {/* Sign Up Link */}
        <p className="text-center mt-4 text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-main-600 font-medium hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function EnhancedLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
