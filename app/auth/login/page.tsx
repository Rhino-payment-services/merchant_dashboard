"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { PhoneNumberInput } from '../../../components/ui/phone-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Phone, Mail, Lock, Building2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

export default function EnhancedLoginPage() {
  useEffect(() => {
    document.title = 'Login - RukaPay Merchant';
  }, []);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("owner");

  // Owner login (Phone + OTP)
  const [ownerData, setOwnerData] = useState({
    phoneNumber: '',
  });

  // Team member login (Email + Password)
  const [teamData, setTeamData] = useState({
    email: '',
    password: ''
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/merchant/login`, {
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

  // Handle Team Member Login - Email + Password
  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamData.email || !teamData.password) {
      toast.error('Please enter email and password');
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

          {/* Team Member Login (Email + Password) */}
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
      </div>
    </div>
  );
}
