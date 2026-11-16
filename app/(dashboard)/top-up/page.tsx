"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, Smartphone, Wallet, CheckCircle2, AlertCircle, Info, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useProcessTransaction, useValidatePhoneNumber } from "@/lib/api/payment.api";
import { getWalletBalance, WalletBalance } from "@/lib/api/wallet.api";
import { toast } from 'sonner';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canCollectPayments } from '@/lib/utils/permissions';

interface TopUpForm {
  phone: string;
  amount: string;
  narration: string;
}

export default function TopUpPage() {
  const { data: session } = useSession();
  const teamSession = useTeamPermissionSession();
  const processTransaction = useProcessTransaction();
  const validatePhoneNumber = useValidatePhoneNumber();

  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
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
    if (!canCollectPayments(teamSession)) return;
    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);
        const data = await getWalletBalance();
        setWalletData(data);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        toast.error('Failed to load wallet balance');
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
  }, [success, teamSession]); // Refetch when a transaction succeeds

  if (!canCollectPayments(teamSession)) {
    return (
      <AccessDenied description="You do not have permission to collect payments." />
    );
  }

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
    // Airtel prefixes: 075, 070, 074, 020
    if (cleaned.match(/^(256)?(75|70|74|20)/)) {
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
      const merchantCode = (session?.user as any)?.merchantCode;
      
      if (!merchantId) {
        throw new Error("Merchant ID not found. Please try logging in again.");
      }

      const formattedPhone = formatPhoneNumber(topUpForm.phone);
      const mnoProvider = detectMnoProvider(formattedPhone);

      let customerName: string | undefined;
      try {
        const validation = await validatePhoneNumber.mutateAsync({
          phoneNumber: formattedPhone,
          amount: Number(topUpForm.amount),
        });
        if (validation?.status === 1 && validation?.data?.name) {
          customerName = String(validation.data.name).trim();
        }
      } catch (validationError) {
        console.warn("Customer name validation skipped:", validationError);
      }

      const transactionData = {
        mode: "MNO_TO_WALLET",
        userId: merchantId,
        amount: Number(topUpForm.amount),
        currency: "UGX",
        description: topUpForm.narration || "Mobile money collection",
        phoneNumber: formattedPhone,
        mnoProvider: mnoProvider,
        narration: topUpForm.narration || "Mobile money collection",
        walletType: "BUSINESS",
        channel: "MERCHANT_PORTAL",
        ...(customerName && { customerName, recipientName: customerName }),
        ...(merchantCode && { merchantCode }),
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
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Request payment</h1>
            <p className="mt-0.5 text-[12px] text-gray-400">
              Send a mobile money prompt to your customer
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:min-w-[220px]">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="text-[11px] font-medium">Collection balance</span>
            </div>
            {balanceLoading ? (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Loading
              </div>
            ) : (
              <>
                <div className="mt-1.5 text-[18px] font-semibold tabular-nums text-gray-900">
                  <span className="mr-1 text-[11px] font-medium text-gray-400">UGX</span>
                  {((walletData as any)?.collectionBalance ?? walletData?.balance ?? 0).toLocaleString()}
                </div>
                {(walletData as any)?.disbursementBalance !== undefined && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    Payout{' '}
                    <span className="tabular-nums text-gray-600">
                      UGX {(walletData as any).disbursementBalance.toLocaleString()}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
            <div>
              <p className="text-[14px] font-semibold text-gray-900">Customer details</p>
              <p className="text-[11px] text-gray-400">MTN and Airtel Uganda numbers</p>
            </div>
          </div>

          <form onSubmit={handleTopUpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-gray-600">
                Mobile number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={topUpForm.phone}
                  onChange={handleTopUpChange}
                  required
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-[13px] outline-none transition-colors focus:border-gray-400"
                  placeholder="0700123456"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-gray-600">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-gray-400">
                  UGX
                </span>
                <input
                  type="number"
                  name="amount"
                  value={topUpForm.amount}
                  onChange={handleTopUpChange}
                  required
                  min={1000}
                  step={100}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-3 text-[13px] tabular-nums outline-none transition-colors focus:border-gray-400"
                  placeholder="10,000"
                />
              </div>
              <p className="text-[11px] text-gray-400">Minimum 1,000 UGX</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-gray-600">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="narration"
                value={topUpForm.narration}
                onChange={handleTopUpChange}
                required
                maxLength={100}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px] outline-none transition-colors focus:border-gray-400"
                placeholder="e.g. Payment for invoice #123"
              />
              <p className="text-[11px] text-gray-400">{topUpForm.narration.length}/100</p>
            </div>

            <Button
              type="submit"
              className="h-10 w-full rounded-full bg-gray-900 text-[13px] font-medium text-white hover:bg-gray-800"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending request…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <ArrowDown className="h-4 w-4" />
                  Send payment request
                </span>
              )}
            </Button>

            {success && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-[12px] text-emerald-800">{success}</p>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-[12px] text-red-700">{error}</p>
              </div>
            )}
          </form>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="mb-3 text-[12px] font-medium text-gray-500">How it works</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { n: '1', title: 'Enter number and amount', body: 'Use an MTN or Airtel number' },
              { n: '2', title: 'Add a description', body: 'Invoice, order, or service name' },
              { n: '3', title: 'Send the request', body: 'Customer gets a mobile money prompt' },
              { n: '4', title: 'Money comes in', body: 'Confirmed payments land in Collection' },
            ].map((step) => (
              <div key={step.n} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600">
                  {step.n}
                </span>
                <div>
                  <p className="text-[12px] font-medium text-gray-800">{step.title}</p>
                  <p className="text-[11px] text-gray-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-[12px] text-gray-400 sm:flex-row sm:gap-6">
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
            No collection fees on this request
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-gray-400" />
            Confirmed payments show in your wallet immediately
          </p>
        </div>
      </div>
    </div>
  );
}
