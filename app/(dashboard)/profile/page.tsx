"use client";

import React from 'react';
import { useUserProfile } from '../UserProfileProvider';
import { useSession } from 'next-auth/react';
import { User, Mail, Phone, Building2, MapPin, Calendar, CreditCard, Wallet } from 'lucide-react';

export default function ProfilePage() {
  const { profile, loading, error } = useUserProfile();
  const { data: session } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-main-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8">
            <div className="text-center text-red-600">
              <p>Error loading profile: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const merchantData = profile?.profile;
  const merchantName = merchantData?.merchant_names || 'N/A';
  const merchantPhone = merchantData?.merchant_phone || session?.user?.phoneNumber || 'N/A';
  const merchantBalance = merchantData?.merchant_balance || 0;
  const merchantStatus = merchantData?.merchant_status || 'N/A';
  const merchantCard = merchantData?.merchant_card || 'N/A';
  const merchantCardExp = merchantData?.merchant_card_exp || 'N/A';
  const merchantCardNumber = merchantData?.merchant_card_number || 'N/A';

  // Get initials from merchant name
  const getInitials = (name: string) => {
    if (!name || name === 'N/A') return 'NA';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'N/A') return 'N/A';
    // If it starts with 256, format it as +256
    if (phone.startsWith('256')) {
      return `+${phone}`;
    }
    return phone;
  };

  // Format card number (show last 4 digits)
  const formatCardNumber = (cardNumber: string) => {
    if (!cardNumber || cardNumber === 'N/A') return 'N/A';
    if (cardNumber.length <= 4) return cardNumber;
    return `**** **** **** ${cardNumber.slice(-4)}`;
  };

  // Format balance
  const formatBalance = (balance: any) => {
    if (!balance) return '0';
    return Number(balance).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-main-50 flex items-center justify-center border-4 border-main-100">
              <span className="text-4xl text-main-600 font-bold">
                {getInitials(merchantName)}
              </span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{merchantName}</h1>
              <div className="text-lg text-gray-600 mb-4">Merchant Account</div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  merchantStatus 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {merchantStatus ? '✓ Active' : '⚠ Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-main-600" />
            Account Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-900">
                  {formatPhoneNumber(merchantPhone)}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business Name
                </label>
                <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-900">
                  {merchantName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Account Status
                </label>
                <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-900 capitalize">
                  {merchantStatus}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-main-600" />
            Financial Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="ext-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Wallet Balance
              </label>
              <div className="px-4 py-3 rounded-lg bg-green-50 text-green-900 font-semibold text-lg">
                UGX {formatBalance(merchantBalance)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Card Type
              </label>
              <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-900">
                {merchantCard}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Card Number
              </label>
              <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-900 font-mono">
                {formatCardNumber(merchantCardNumber)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Card Expiry
              </label>
              <div className="px-4 py-3 rounded-lg bg-gray-50 text-gray-900">
                {merchantCardExp}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        {merchantData?.merchant_transactions && merchantData.merchant_transactions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-main-600" />
              Transaction Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {merchantData.merchant_transactions.length}
                </div>
                <div className="text-sm text-blue-800">Total Transactions</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {merchantData.merchant_transactions.filter((tx: any) => tx.rdbs_status === 'successful').length}
                </div>
                <div className="text-sm text-green-800">Successful</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {merchantData.merchant_transactions.filter((tx: any) => tx.rdbs_status === 'pending').length}
                </div>
                <div className="text-sm text-orange-800">Pending</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
