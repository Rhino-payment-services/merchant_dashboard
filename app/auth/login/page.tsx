"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { PhoneNumberInput } from '../../../components/ui/phone-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Phone, Mail, Lock, Building2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';

function LoginContent() {
  useEffect(() => {
    document.title = 'Login - RukaPay Merchant';
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam === 'team' ? "team" : "owner");

  // Owner login (Phone + OTP)
  const [ownerData, setOwnerData] = useState({
    phoneNumber: '',
  });

  // Team member login (Email + Password or Email + OTP)
  const [teamData, setTeamData] = useState({
    email: '',
    password: '',
    loginMethod: 'password' as 'password' | 'otp' // New: login method selector
  });

  // Handle Owner Login - Request OTP
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ownerData.phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    
    try {
      // Request OTP from backend
      console.log('🔗 Calling API:', `${API_URL}/auth/merchant/login`);
      const response = await fetch(`${API_URL}/auth/merchant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: ownerData.phoneNumber })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('OTP sent to your phone!');
        // Redirect to OTP page with phoneNumber param (not phone)
        router.push(`/auth/otp?phoneNumber=${encodeURIComponent(ownerData.phoneNumber)}&expiresIn=${data.expiresIn || 300}`);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Team Member Login - Request OTP (using same admin API)
  const handleTeamOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamData.email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    
    try {
      // Request OTP using admin login API (same as admin users)
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teamData.email })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('OTP sent to your email!');
        // Redirect to OTP page with email param
        router.push(`/auth/otp?email=${encodeURIComponent(teamData.email)}&type=team&expiresIn=${data.expiresIn || 300}`);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('OTP request error:', error);
      toast.error('Failed to send OTP. Please try again.');
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

    // If OTP method selected, request OTP instead
    if (teamData.loginMethod === 'otp') {
      await handleTeamOTPRequest(e);
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
        // Check if user needs to change password (first login)
        const session = await fetch('/api/auth/session').then(res => res.json());
        const userData = (session?.user as any)?.userData;
        
        if (userData?.mustChangePassword || userData?.isFirstLogin) {
          toast.info('Please set your password');
          router.push('/auth/change-password?firstLogin=true');
          return;
        }

        toast.success('Login successful!');
        router.push('/');
        router.refresh();
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

          {/* Business Owner Login (Phone + OTP) */}
          <TabsContent value="owner">
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
          </TabsContent>

          {/* Team Member Login (Email + Password or OTP) */}
          <TabsContent value="team">
            <form onSubmit={handleTeamLogin} className="space-y-4">
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

              {/* Login Method Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Login Method</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTeamData({ ...teamData, loginMethod: 'password', password: '' })}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      teamData.loginMethod === 'password'
                        ? 'bg-main-50 border-main-500 text-main-700 font-medium'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamData({ ...teamData, loginMethod: 'otp', password: '' })}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      teamData.loginMethod === 'otp'
                        ? 'bg-main-50 border-main-500 text-main-700 font-medium'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Phone className="w-4 h-4 inline mr-2" />
                    OTP
                  </button>
                </div>
              </div>

              {/* Password Input (only show if password method selected) */}
              {teamData.loginMethod === 'password' && (
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
              )}

              <Button
                type="submit"
                className="w-full py-3 bg-main-600 hover:bg-main-700 text-white font-medium rounded-lg transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading 
                  ? (teamData.loginMethod === 'otp' ? 'Sending OTP...' : 'Signing in...') 
                  : (teamData.loginMethod === 'otp' ? 'Send OTP' : 'Sign In')
                }
              </Button>

              <p className="text-xs text-center text-gray-500">
                {teamData.loginMethod === 'otp' 
                  ? "You'll receive a 6-digit OTP via email"
                  : "Team member access provided by business owner"
                }
              </p>
            </form>
          </TabsContent>
          </Tabs>
        </Card>
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
