"use client"

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Phone, Lock, Building2, ArrowRight, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useMerchantLogin } from '@/lib/api/auth.api';

// Country codes data
const countryCodes = [
  { code: '+256', country: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: '+254', country: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: '+250', country: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: '+257', country: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: '+1', country: 'US', name: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'CN', name: 'China', flag: '🇨🇳' },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]); // Uganda default
  const [formData, setFormData] = useState({
    phoneNumber: '',
    pin: ['', '', '', '', '', ''], // 6-digit PIN
    rememberMe: false
  });
 const merchantLogin = useMerchantLogin()


  // Refs for PIN input boxes
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

 

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove leading 0 if present
    if (value.startsWith('0')) {
      value = value.substring(1);
    }
    
    // Only allow numbers
    value = value.replace(/[^0-9]/g, '');
    
    setFormData(prev => ({
      ...prev,
      phoneNumber: value
    }));
  };

  const handleCountrySelect = (country: typeof countryCodes[0]) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
  };

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newPin = [...formData.pin];
    newPin[index] = value;
    
    setFormData(prev => ({
      ...prev,
      pin: newPin
    }));

    // Auto-advance to next input
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !formData.pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      rememberMe: e.target.checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phoneNumber || formData.phoneNumber.length < 8) {
      toast.error('Please enter a valid phone number');
      return;
    } 
    // Remove '+' from country code and concatenate with phone number
    const countryCode = selectedCountry.code.replace('+', '');
    const phoneNumber = countryCode + formData.phoneNumber;

    const data = {
      phoneNumber
    };

    try {
      const response = await merchantLogin.mutateAsync(data);
      if (response.success) {
        toast.success(response.message || 'OTP sent successfully to your phone number');
        router.push(`/auth/otp?phoneNumber=${phoneNumber}&expiresIn=${response.expiresIn}`);
      } else {
        toast.error(response?.message || 'Something went wrong please try again later');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong please try again later');
    }
  };

  // Check if form is valid for button enable/disable

  return (
    <>
      <Head>
        <title>Merchant Login - RukaPay</title>
        <meta name="description" content="Sign in to your RukaPay merchant account to access your dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
          <h1 className="text-3xl font-bold text-[#08163d] mb-3">Merchant Login</h1>
          <p className="text-gray-600 text-lg">Sign in to access your merchant dashboard</p>
        </div>

        <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* Country Code Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center gap-2 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main-500 focus:border-transparent transition-all duration-200 bg-white min-w-[100px]"
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm font-medium">{selectedCountry.code}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {countryCodes.map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => handleCountrySelect(country)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 justify-between"
                        >
                          <span className="text-lg">{country.flag}</span>
                          <span className="text-sm">{country.name}</span>
                          <span className="text-sm font-medium text-gray-600">{country.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone Number Input */}
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    maxLength={9}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-main-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number (e.g. 712345678)"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Enter number without leading 0. Example: 712345678</p>
            </div>

            {/* <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                PIN (5 digits)
              </label>
              <div className="flex gap-2 w-full grid grid-cols-6 justify-center">
                {formData.pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      pinRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className="w-12 h-12 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-main-500 focus:border-transparent transition-all duration-200 text-lg font-semibold"
                    placeholder=""
                  />
                ))}
              </div>
            </div> */}

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleCheckboxChange}
                  className="w-4 h-4 text-main-600 border-gray-300 rounded focus:ring-main-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-main-600 hover:text-main-700 font-medium"
              >
                Forgot PIN?
              </button>
            </div>

            <Button
              type="submit"
              disabled={merchantLogin.isPending || !formData.phoneNumber || formData.phoneNumber.length < 8}
              className={` cursor-pointer w-full py-3 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                (merchantLogin.isPending || !formData.phoneNumber || formData.phoneNumber.length < 8)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-main-600 hover:bg-main-700 text-white'
              }`}
            >
              {merchantLogin.isPending ? (
                <>
                  <div className="w-5 h-5  border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending OTP...
                </>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
    </>
  );
}
