"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Smartphone, Wallet, CheckCircle2, AlertCircle, Info, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useProcessTransaction } from "@/lib/api/payment.api";
import { getWalletBalance } from "@/lib/api/wallet.api";
import { toast } from 'sonner';

interface TopUpForm {
  phone: string;
  amount: string;
  narration: string;
}

export default function TopUpPage() {
  const { data: session } = useSession();
  const processTransaction = useProcessTransaction();

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [topUpForm, setTopUpForm] = useState<TopUpForm>({
    phone: "",
    amount: "",
    narration: ""
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);
        const data = await getWalletBalance();
        setWalletBalance(data.balance);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        toast.error('Failed to load wallet balance');
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
  }, [success]); // Refetch when a transaction succeeds

  const handleTopUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTopUpForm(prev => ({ ...prev, [name]: value }));
  };

  // Format phone number to include country code
  const formatPhoneNumber = (phone: string): string => {
    // Remove any existing country code or special characters
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // If it starts with 0, replace with 256
    if (cleaned.startsWith('0')) {
      cleaned = '256' + cleaned.substring(1);
    }
    // If it doesn't start with 256, add it
    else if (!cleaned.startsWith('256')) {
      cleaned = '256' + cleaned;
    }
    
    return cleaned;
  };

  // Detect MNO provider from phone number
  const detectMnoProvider = (phone: string): string => {
    const cleaned = phone.replace(/[^\d]/g, '');
    
    // MTN prefixes: 077, 078, 076
    if (cleaned.match(/^(256)?(77|78|76)/)) {
      return 'MTN';
    }
    // Airtel prefixes: 075, 070, 074
    if (cleaned.match(/^(256)?(75|70|74)/)) {
      return 'Airtel';
    }
    
    // Default to MTN if can't detect
    return 'MTN';
  };

  // Handle Top Up form submission
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const merchantId = (session?.user as any)?.id || (session?.user as any)?.user?.id;
      
      if (!merchantId) {
        throw new Error("Merchant ID not found. Please try logging in again.");
      }

      const formattedPhone = formatPhoneNumber(topUpForm.phone);
      const mnoProvider = detectMnoProvider(formattedPhone);
      
      // Prepare transaction data for rdbs_core API
      const transactionData = {
        mode: "MNO_TO_WALLET",
        userId: merchantId,
        amount: Number(topUpForm.amount),
        currency: "UGX",
        description: topUpForm.narration || "Mobile money collection",
        phoneNumber: formattedPhone,
        mnoProvider: mnoProvider,
        narration: topUpForm.narration || "Mobile money collection",
        userName: (session?.user as any)?.userData?.profile?.firstName || session?.user?.name || "Merchant"
      };
      
      console.log("Transaction Data (rdbs_core):", transactionData);
      const result = await processTransaction.mutateAsync(transactionData);
      console.log("Transaction result========>", result);
      
      // Handle response based on status
      if (result?.success && result?.data?.status === 'SUCCESS') {
        toast.success(`Top up completed successfully! Reference: ${result.data.reference}`);
        setSuccess("Top up completed successfully!");
        setTopUpForm({ phone: "", amount: "", narration: "" });
      } else if (result?.success && result?.data?.status === 'PROCESSING') {
        toast.success(result?.message || "Transaction is processing. Customer will receive a prompt to confirm.");
        setSuccess(result?.message || "Transaction is processing. Please wait for customer confirmation.");
        setTopUpForm({ phone: "", amount: "", narration: "" });
      } else if (result?.success) {
        toast.success(result?.message || "Transaction initiated successfully!");
        setSuccess(result?.message || "Transaction initiated successfully!");
        setTopUpForm({ phone: "", amount: "", narration: "" });
      } else {
        throw new Error(result?.message || "Top up failed. Please try again.");
      }
      
    } catch (error: any) {
      console.error("Top Up Error:", error);
      let errorMessage = "Failed to process top up. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Mobile Money Collection</h1>
              <p className="text-gray-600">Request payments from your customers via mobile money</p>
            </div>
          
          {/* Wallet Balance Card */}
          <Card className="md:w-80 bg-gradient-to-br from-green-600 to-green-700 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end justify-between">
                <div>
                  {balanceLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="text-lg">Loading...</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold">
                      {walletBalance.toLocaleString()} UGX
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Form Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Request Payment</CardTitle>
                <CardDescription>Send a payment request to your customer's mobile money account</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleTopUpSubmit} className="space-y-5">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Customer Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={topUpForm.phone}
                    onChange={handleTopUpChange}
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="0700123456"
                  />
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Supports MTN and Airtel Uganda numbers
                </p>
              </div>
              
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Amount (UGX) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">UGX</span>
                  <input
                    type="number"
                    name="amount"
                    value={topUpForm.amount}
                    onChange={handleTopUpChange}
                    required
                    min={1000}
                    step={100}
                    className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-lg font-medium"
                    placeholder="10,000"
                  />
                </div>
                <p className="text-xs text-gray-500">Minimum amount: 1,000 UGX</p>
              </div>
              
              {/* Narration Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Payment Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="narration"
                  value={topUpForm.narration}
                  onChange={handleTopUpChange}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  placeholder="e.g., Payment for invoice #123"
                />
                <p className="text-xs text-gray-500">{topUpForm.narration.length}/100 characters</p>
              </div>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all rounded-lg" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing Request...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ArrowDown className="w-5 h-5" />
                    <span>Send Payment Request</span>
                  </div>
                )}
              </Button>
              
              {/* Success/Error Messages */}
              {success && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Success!</p>
                    <p className="text-sm text-green-700 mt-1">{success}</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* How It Works Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg text-blue-900">How Payment Collection Works</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-blue-900">Enter Customer Details</p>
                  <p className="text-sm text-blue-700">Provide the customer's mobile number and payment amount</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-blue-900">Add Payment Description</p>
                  <p className="text-sm text-blue-700">Describe what the payment is for (invoice number, service, etc.)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-blue-900">Send Request</p>
                  <p className="text-sm text-blue-700">Customer receives a mobile money prompt to authorize payment</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">✓</div>
                <div>
                  <p className="font-medium text-green-900">Receive Payment</p>
                  <p className="text-sm text-green-700">Money is automatically added to your wallet once customer confirms</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">No Transaction Fees</p>
                  <p className="text-sm text-green-700 mt-1">Wallet top-ups are completely free for both you and your customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Instant Confirmation</p>
                  <p className="text-sm text-blue-700 mt-1">Payments are processed in real-time and reflected immediately in your wallet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
