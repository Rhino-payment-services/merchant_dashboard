"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { TextField } from '../../../components/ui/text-field';
import { FieldError, FieldHint } from '../../../components/ui/field-message';
import { PhoneNumberInput } from '../../../components/ui/phone-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import AuthShell from '@/components/auth/AuthShell';
import FormAlert from '@/components/auth/FormAlert';
import AuthLoading from '@/components/auth/AuthLoading';
import { authButtonClass, authLinkClass, EMAIL_PATTERN } from '@/components/auth/authStyles';
import { Phone, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'phone' | 'pin' | 'email' | 'password', string>>>({});

  const pinRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const clearFieldError = (field: keyof typeof fieldErrors) =>
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const showPhoneError = (inputId: string, message: string) => {
    setFieldErrors({ phone: message });
    document.getElementById(inputId)?.focus();
  };

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
      showPhoneError('phoneNumber', 'Enter your phone number.');
      return;
    }

    setIsLoading(true);
    
    try {
      const phoneNumber = normalizeMerchantPortalPhone(ownerData.phoneNumber);
      if (!phoneNumber) {
        showPhoneError('phoneNumber', 'Enter a valid phone number.');
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
      showPhoneError('phoneNumberPin', 'Enter a valid phone number.');
      return;
    }
    if (!loginOptions?.pinEnabled) {
      toast.error('PIN login is not enabled for this account');
      return;
    }
    if (!portalPin || portalPin.length < 4) {
      setFieldErrors({ pin: 'Enter your portal PIN (at least 4 digits).' });
      pinRef.current?.focus();
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
    
    const errors: typeof fieldErrors = {};
    if (!teamData.email) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(teamData.email.trim())) errors.email = 'Enter a valid email address.';
    if (!teamData.password) errors.password = 'Enter your password.';
    setFieldErrors(errors);

    if (errors.email) {
      emailRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
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

  const segmentTriggerClass =
    "h-full gap-2 rounded-md text-slate-500 transition-colors duration-150 hover:text-slate-800 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm";

  const phoneField = (inputId: string, hint?: string) => (
    <div>
      <PhoneNumberInput
        variant="auth"
        label="Phone number"
        inputId={inputId}
        invalid={!!fieldErrors.phone}
        describedBy={fieldErrors.phone ? 'phone-error' : hint ? `${inputId}-hint` : undefined}
        value={ownerData.phoneNumber}
        onChange={(value) => {
          setOwnerData({ ...ownerData, phoneNumber: value });
          clearFieldError('phone');
        }}
        placeholder="700 123 456"
        defaultCountry="ug"
      />
      <FieldError id="phone-error" message={fieldErrors.phone} />
      {!fieldErrors.phone && <FieldHint id={`${inputId}-hint`} message={hint} />}
    </div>
  );

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-[28px] sm:leading-9">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] text-slate-500">Sign in to your RukaPay merchant dashboard.</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8 w-full">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="owner" className={segmentTriggerClass}>
            <Phone className="size-4" aria-hidden />
            Phone
          </TabsTrigger>
          <TabsTrigger value="team" className={segmentTriggerClass}>
            <Mail className="size-4" aria-hidden />
            Email
          </TabsTrigger>
        </TabsList>

        {/* Business Owner Login (Phone + OTP or PIN) */}
        <TabsContent value="owner" className="mt-6">
          {loginOptions?.pinEnabled && (
            <div className="mb-5 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Sign in with</span>
              <Tabs value={ownerLoginMode} onValueChange={(v) => setOwnerLoginMode(v as 'otp' | 'pin')}>
                <TabsList className="grid h-9 w-44 grid-cols-2 rounded-md bg-slate-100 p-0.5">
                  <TabsTrigger value="otp" className={cn(segmentTriggerClass, "rounded-[5px] text-[13px]")}>
                    SMS code
                  </TabsTrigger>
                  <TabsTrigger value="pin" className={cn(segmentTriggerClass, "rounded-[5px] text-[13px]")}>
                    PIN
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {ownerLoginMode === 'pin' && loginOptions?.pinEnabled ? (
            <form onSubmit={handleOwnerPinLogin} noValidate className="space-y-5">
              {phoneField('phoneNumberPin')}

              <div>
                <TextField
                  ref={pinRef}
                  variant="floating"
                  id="portalPin"
                  type="password"
                  label="Portal PIN"
                  inputMode="numeric"
                  maxLength={6}
                  value={portalPin}
                  onChange={(e) => {
                    setPortalPin(e.target.value.replace(/\D/g, ''));
                    clearFieldError('pin');
                  }}
                  error={fieldErrors.pin}
                  aria-describedby={fieldErrors.pin ? undefined : 'portalPin-hint'}
                  required
                />
                <div className="mt-2 flex items-start justify-between gap-3">
                  <p id="portalPin-hint" className="text-[13px] text-slate-500">
                    {!fieldErrors.pin && 'Merchant dashboard PIN only.'}
                  </p>
                  <Link
                    href={
                      ownerData.phoneNumber
                        ? `/auth/forgot-portal-pin?phoneNumber=${encodeURIComponent(
                            normalizeMerchantPortalPhone(ownerData.phoneNumber) ||
                              ownerData.phoneNumber,
                          )}`
                        : '/auth/forgot-portal-pin'
                    }
                    className={cn(authLinkClass, "shrink-0 text-[13px]")}
                  >
                    Forgot PIN?
                  </Link>
                </div>
                {loginOptions?.pinSetupRequired && (
                  <FormAlert tone="warning" className="mt-3">
                    No portal PIN set yet. Sign in with OTP first, or use a temporary PIN from your admin.
                  </FormAlert>
                )}
              </div>

              <Button type="submit" className={authButtonClass} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  'Sign in with PIN'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOwnerLogin} noValidate className="space-y-5">
              {phoneField('phoneNumber', "We'll send a 6-digit verification code to this number by SMS.")}

              <Button type="submit" className={authButtonClass} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </form>
          )}
        </TabsContent>

        {/* Team Member Login (Email + Password only) */}
        <TabsContent value="team" className="mt-6">
          <form onSubmit={handleTeamLogin} noValidate className="space-y-5">
            <TextField
              ref={emailRef}
              variant="floating"
              id="email"
              type="email"
              label="Email address"
              autoComplete="email"
              placeholder="you@company.com"
              value={teamData.email}
              onChange={(e) => {
                setTeamData({ ...teamData, email: e.target.value });
                clearFieldError('email');
              }}
              error={fieldErrors.email}
              required
            />

            <div>
              <TextField
                ref={passwordRef}
                variant="floating"
                id="password"
                type="password"
                label="Password"
                autoComplete="current-password"
                value={teamData.password}
                onChange={(e) => {
                  setTeamData({ ...teamData, password: e.target.value });
                  clearFieldError('password');
                }}
                error={fieldErrors.password}
                required
              />
              <div className="mt-2 flex justify-end">
                <Link
                  href={
                    teamData.email
                      ? `/auth/forgot-password?email=${encodeURIComponent(teamData.email)}`
                      : '/auth/forgot-password'
                  }
                  className={cn(authLinkClass, "text-[13px]")}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className={authButtonClass} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <p className="text-center text-[13px] text-slate-500">
              Team member access is provided by your business owner.
            </p>
          </form>
        </TabsContent>
      </Tabs>

      <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className={authLinkClass}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function EnhancedLoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LoginContent />
    </Suspense>
  );
}
