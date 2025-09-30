"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, Smartphone } from "lucide-react";
import { useUserProfile } from "../UserProfileProvider";
import { useMobileMoneyCollection } from "@/lib/api/payment.api";
import { toast } from 'sonner';
import { useSession } from "next-auth/react";

interface TopUpForm {
  phone: string;
  amount: string;
  narration: string;
}

export default function TopUpPage() {
  const { profile } = useUserProfile();
  const { data: session } = useSession();
  const mobileMoneyCollection = useMobileMoneyCollection();

  const [topUpForm, setTopUpForm] = useState<TopUpForm>({
    phone: "",
    amount: "",
    narration: ""
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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

  // Handle Top Up form submission
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const merchantId = session?.user?.merchantId;
      
      if (!merchantId) {
        throw new Error("Merchant ID not found. Please try logging in again.");
      }

      const formattedPhone = formatPhoneNumber(topUpForm.phone);
      
      const topUpData = {
        phoneNumber: formattedPhone,
        amount: Number(topUpForm.amount),
        narration: topUpForm.narration || "Top Up",
        merchantId: merchantId,
        merchantName: profile?.profile?.merchant_names
      };
      
      console.log("Top Up Data:", topUpData);
      const result = await mobileMoneyCollection.mutateAsync(topUpData);
      console.log("Top Up result========>", result);
      
      if (result?.status === 1) {
        toast.success(`Top up completed successfully! Reference: ${result.txnReference}`);
        setSuccess("Top up completed successfully!");
        setTopUpForm({ phone: "", amount: "", narration: "" });
      } else if(result?.status === 2){
        toast.success(result?.message || "Transaction is being processed please confirm the transaction by put pin")
        setSuccess(result?.message)
        setTopUpForm({ phone: "", amount: "", narration: "" });
      }else {
        throw new Error(result?.message || "Top up failed. Please try again.");
      }
      
    } catch (error: any) {
      console.error("Top Up Error:", error);
      let errorMessage = "Failed to process top up. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-0">
      <div className="w-full py-8 px-4">
        {/* Wallet Balance */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4 bg-white rounded-xl shadow px-6 py-4">
            <div>
              <div className="text-xs text-gray-500 font-medium">
                Wallet Balance
              </div>
              <div className="text-2xl font-bold text-gray-900">
                UGX {Number(profile?.profile?.merchant_balance).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowDown className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Request mobile money</h1>
              <p className="text-gray-600">Receive money from customers via mobile money</p>
            </div>
          </div>
        </div>

        {/* Top Up Form */}
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Request Top Up</h2>
            </div>
            <p className="text-gray-600">Enter customer details to request a mobile money payment</p>
          </div>
          
          <form onSubmit={handleTopUpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer Mobile Number
              </label>
              <input
                type="tel"
                name="phone"
                value={topUpForm.phone}
                onChange={handleTopUpChange}
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter customer mobile number (e.g., 0700123456)"
              />
              <small className="text-gray-500">
                Number will be formatted with country code (+256)
              </small>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                name="amount"
                value={topUpForm.amount}
                onChange={handleTopUpChange}
                required
                min={1}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Narration</label>
              <input
                type="text"
                name="narration"
                value={topUpForm.narration}
                onChange={handleTopUpChange}
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter narration (e.g., Payment for services)"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[#032a3b] hover:bg-[#032a3b] text-white py-3 text-lg font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDown className="w-5 h-5 mr-2" />
                  Request Mobile Money
                </>
              )}
            </Button>
            
            {/* Success/Error Messages */}
            {success && (
              <div className="text-[#032a3b] text-center font-medium mt-4 p-3 bg-green-50 rounded-lg">
                {success}
              </div>
            )}
            {error && (
              <div className="text-red-600 text-center font-medium mt-4 p-3 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Information Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How it works</h3>
          <div className="space-y-2 text-blue-800">
            <p>1. Enter the customer's mobile number and amount</p>
            <p>2. Add a description for the transaction</p>
            <p>3. Click "Request Top Up" to initiate the collection</p>
            <p>4. The customer will receive a mobile money prompt</p>
            <p>5. Once paid, the amount will be added to your wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
