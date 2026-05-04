"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, Droplets, Landmark, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getWalletBalance } from "@/lib/api/wallet.api";
import { sweepToDisbursement } from "@/lib/api/wallet.api";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useUserProfile } from "../UserProfileProvider";
import {
  useProcessTransaction,
  useValidateBankAccount,
  useValidatePhoneNumber,
  useValidateRukapayWalletRecipient,
} from "@/lib/api/payment.api";
import { UGANDAN_BANKS } from "@/app/lib/bankList";

const SWEEP_FEE_PERCENT = 2.5;
const LIQUIDATE_FEE_PERCENT = 2.5;
const MIN_BANK = 200000;
const MIN_MOMO = 50000;
const MIN_RUKAPAY = 20000;
const fmt = (n: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export default function LiquidatePage() {
  const { profile } = useUserProfile();
  const { data: session } = useSession();
  const [collectionBalance, setCollectionBalance] = useState<number | null>(null);
  const [disbursementBalance, setDisbursementBalance] = useState<number | null>(null);
  // Internal wallet UUID for BUSINESS_COLLECTION (resolved from /wallet/me/business primary wallet).
  const [collectionWalletId, setCollectionWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweepAmount, setSweepAmount] = useState("");
  const [sweepLoading, setSweepLoading] = useState(false);
  const processTx = useProcessTransaction();
  const validateBank = useValidateBankAccount();
  const validateMomo = useValidatePhoneNumber();
  const validateWalletRecipient = useValidateRukapayWalletRecipient();

  const [payoutType, setPayoutType] = useState<"BANK" | "MOMO" | "RUKAPAY">("BANK");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutNetwork, setPayoutNetwork] = useState<string>("MTN");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutBankName, setPayoutBankName] = useState("");
  const [payoutReason, setPayoutReason] = useState("");

  const [bankValidation, setBankValidation] = useState<{
    status: "idle" | "validated" | "unverified";
    validatedAt?: string;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    bankSortCode?: string;
    amount?: number;
    validationStatus?: string;
  }>({ status: "idle" });

  const [momoValidation, setMomoValidation] = useState<{
    status: "idle" | "validated";
    validatedAt?: string;
    phoneNumber?: string;
    network?: string;
  }>({ status: "idle" });

  const [walletValidation, setWalletValidation] = useState<{
    status: "idle" | "validated";
    validatedAt?: string;
    phoneNumber?: string;
    recipientName?: string;
  }>({ status: "idle" });

  const merchantCode = (session?.user as any)?.merchantCode as string | undefined;
  const gross = parseFloat(sweepAmount) || 0;
  const fee = useMemo(() => Number((gross * SWEEP_FEE_PERCENT / 100).toFixed(0)), [gross]);
  const net = gross - fee;
  const canSweep =
    gross > 0 &&
    net > 0 &&
    collectionBalance !== null &&
    gross <= collectionBalance;

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const data = (await getWalletBalance()) as any;
      setCollectionBalance(data.collectionBalance ?? null);
      setDisbursementBalance(data.disbursementBalance ?? null);
      setCollectionWalletId(typeof data?.id === "string" && data.id.trim() ? data.id : null);
    } catch (err) {
      console.error("Error fetching wallet:", err);
      toast.error("Failed to load wallet balances");
      setCollectionBalance(null);
      setDisbursementBalance(null);
      setCollectionWalletId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const handleSweep = async () => {
    if (!canSweep) return;
    setSweepLoading(true);
    try {
      const result = await sweepToDisbursement(gross, merchantCode);
      const effectiveFee = result?.sweepFeeAmount ?? fee;
      const effectiveNet = result?.netToDisbursement ?? net;
      const effectivePercent = result?.sweepFeePercent ?? SWEEP_FEE_PERCENT;

      if (effectiveFee > 0) {
        toast.success(
          `Liquidated ${fmt(gross)} gross → ${fmt(effectiveNet)} credited to disbursement (RukaPay fee ${effectivePercent}%)`
        );
      } else {
        toast.success(
          `Liquidated ${fmt(gross)} → ${fmt(effectiveNet)} credited to disbursement (no additional RukaPay sweep fee)`
        );
      }

      setSweepAmount("");
      await fetchBalances();
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer to disbursement");
    } finally {
      setSweepLoading(false);
    }
  };

  const hasSplitWallets =
    collectionBalance !== null && disbursementBalance !== null;
  const merchantBankName = (profile as any)?.businessWallet?.merchant?.bankName
    || (profile as any)?.merchantData?.bankName;
  const hasBankAccount = !!(merchantBankName || (profile as any)?.businessWallet?.merchant?.bankAccountNumber);

  const payoutAmountNum = useMemo(() => Number(payoutAmount) || 0, [payoutAmount]);
  const payoutFee = useMemo(() => {
    if (payoutAmountNum <= 0) return 0;
    return Number((payoutAmountNum * (LIQUIDATE_FEE_PERCENT / 100)).toFixed(0));
  }, [payoutAmountNum, payoutType]);
  const payoutNet = useMemo(() => Math.max(0, payoutAmountNum - payoutFee), [payoutAmountNum, payoutFee]);

  const canPayout = useMemo(() => {
    if (!hasSplitWallets) return false;
    // Self payout must explicitly debit BUSINESS_COLLECTION.
    if (!collectionWalletId) return false;
    if (collectionBalance === null || collectionBalance <= 0) return false;
    if (payoutAmountNum <= 0) return false;
    if (payoutAmountNum > collectionBalance) return false;

    if (payoutType === "BANK") {
      const accountNumberClean = payoutAccount.trim();
      const isValidAccountNumber = /^\d{8,20}$/.test(accountNumberClean);
      return (
        payoutAmountNum >= MIN_BANK &&
        isValidAccountNumber &&
        payoutAccountName.trim().length >= 2 &&
        payoutAccountName.trim().length <= 100 &&
        !!payoutBankName
      );
    }
    if (payoutType === "MOMO") {
      const phone = payoutPhone.trim();
      const isValidPhone = /^\+?\d{9,15}$/.test(phone);
      return payoutAmountNum >= MIN_MOMO && isValidPhone && Boolean(payoutNetwork);
    }
    const phone = payoutPhone.trim();
    const isValidPhone = /^\+?\d{9,15}$/.test(phone);
    return payoutAmountNum >= MIN_RUKAPAY && isValidPhone;
  }, [
    hasSplitWallets,
    collectionBalance,
    payoutAmountNum,
    payoutType,
    payoutAccount,
    payoutAccountName,
    payoutBankName,
    payoutPhone,
    collectionWalletId,
  ]);

  const payoutDisabledReason = useMemo(() => {
    if (!hasSplitWallets) return "Disbursement wallet is not available for this business.";
    if (!collectionWalletId) return "Collection wallet is not available. Refresh and try again.";
    if (collectionBalance === null) return "Loading your collection balance…";
    if (collectionBalance <= 0) return "Your collection balance is 0.";
    if (payoutAmountNum <= 0) return "Enter an amount.";
    if (payoutAmountNum > collectionBalance) return "Amount exceeds your collection balance.";

    if (payoutType === "BANK") {
      if (payoutAmountNum < MIN_BANK) return `Minimum bank payout is ${fmt(MIN_BANK)}.`;
      if (!payoutBankName) return "Choose a bank.";
      if (!/^\d{8,20}$/.test(payoutAccount.trim())) return "Account number must be 8–20 digits.";
      if (payoutAccountName.trim().length < 2) return "Enter the account name.";
      if (payoutAccountName.trim().length > 100) return "Account name must be 100 characters or less.";
      return null;
    }

    if (payoutType === "MOMO") {
      if (payoutAmountNum < MIN_MOMO) return `Minimum mobile money payout is ${fmt(MIN_MOMO)}.`;
      if (!/^[+]?\d{9,15}$/.test(payoutPhone.trim())) return "Enter a valid mobile number.";
      if (!payoutNetwork) return "Choose a mobile money network.";
      return null;
    }

    if (payoutAmountNum < MIN_RUKAPAY) return `Minimum RukaPay wallet payout is ${fmt(MIN_RUKAPAY)}.`;
    if (!/^\+?\d{9,15}$/.test(payoutPhone.trim())) return "Enter a valid recipient phone.";
    return null;
  }, [
    hasSplitWallets,
    collectionBalance,
    payoutAmountNum,
    payoutType,
    payoutBankName,
    payoutAccount,
    payoutAccountName,
    payoutPhone,
    collectionWalletId,
  ]);

  // Reset bank validation when any key input changes
  useEffect(() => {
    if (bankValidation.status === "idle") return;
    setBankValidation({ status: "idle" });
  }, [payoutType, payoutAmountNum, payoutAccount, payoutBankName]);

  // Reset momo validation on changes
  useEffect(() => {
    if (momoValidation.status === "idle") return;
    setMomoValidation({ status: "idle" });
  }, [payoutType, payoutAmountNum, payoutPhone, payoutNetwork]);

  // Reset wallet recipient validation on changes
  useEffect(() => {
    if (walletValidation.status === "idle") return;
    setWalletValidation({ status: "idle" });
  }, [payoutType, payoutAmountNum, payoutPhone]);

  const resetPayoutForm = async () => {
    setPayoutAmount("");
    setPayoutPhone("");
    setPayoutAccount("");
    setPayoutAccountName("");
    setPayoutBankName("");
    setPayoutReason("");
    setPayoutNetwork("MTN");
    setBankValidation({ status: "idle" });
    setMomoValidation({ status: "idle" });
    setWalletValidation({ status: "idle" });
    await fetchBalances();
  };

  const handleProcessBank = async () => {
    if (!canPayout) {
      toast.error(payoutDisabledReason || "Please complete all required fields");
      return;
    }
    const selectedBank = UGANDAN_BANKS.find((b: any) => b.bankName === payoutBankName);
    if (!selectedBank) {
      toast.error("Please select a bank");
      return;
    }

    try {
      const validationRes: any = await validateBank.mutateAsync({
        accountNumber: payoutAccount.trim(),
        bankSortCode: selectedBank.bankSortCode,
        accountName: payoutAccountName.trim() || undefined,
        amount: payoutAmountNum,
      });

      // Hard fail: if partner says invalid/inactive, do NOT show details as "validated"
      const success = validationRes?.success !== false;
      const partnerStatusRaw =
        validationRes?.data?.status ||
        validationRes?.status ||
        null;
      const partnerStatus = String(partnerStatusRaw || "").toUpperCase();
      if (!success || partnerStatus === "INACTIVE") {
        setBankValidation({ status: "idle" });
        toast.error("Account validation failed. Please check account number and bank code.");
        return;
      }

      const maybeName =
        validationRes?.accountName ||
        validationRes?.data?.accountName ||
        validationRes?.data?.name ||
        null;

      // If partner validation is unavailable, backend may return success=true but status=PENDING_VALIDATION.
      // Treat that as "unverified" so UI doesn't mislead users.
      const isVerified = partnerStatus !== "PENDING_VALIDATION";

      const resolvedName =
        typeof maybeName === "string" && maybeName.trim().length >= 2
          ? maybeName.trim()
          : payoutAccountName.trim();

      if (resolvedName && resolvedName.length <= 100 && resolvedName !== payoutAccountName.trim()) {
        setPayoutAccountName(resolvedName);
      }

      setBankValidation({
        status: isVerified ? "validated" : "unverified",
        validatedAt: new Date().toISOString(),
        accountName: resolvedName,
        accountNumber: payoutAccount.trim(),
        bankName: payoutBankName,
        bankSortCode: selectedBank.bankSortCode,
        amount: payoutAmountNum,
        validationStatus: partnerStatusRaw ? String(partnerStatusRaw) : undefined,
      });

      if (isVerified) {
        toast.success(`Validated account${resolvedName ? `: ${resolvedName}` : ""}`);
      } else {
        toast.warning("Bank validation service unavailable — details are not verified. Please double-check.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Bank account validation failed");
    }
  };

  const handleConfirmBank = async () => {
    if (bankValidation.status !== "validated") {
      toast.error("Please validate the bank account first (verified).");
      return;
    }
    try {
      const res = await processTx.mutateAsync({
        userId: (session?.user as any)?.id,
        mode: "WALLET_TO_BANK",
        amount: payoutAmountNum,
        currency: "UGX",
        channel: "MERCHANT_PORTAL",
        walletType: "BUSINESS",
        accountNumber: payoutAccount.trim(),
        accountName: (bankValidation.accountName || payoutAccountName).trim(),
        bankSortCode: bankValidation.bankSortCode,
        bankName: payoutBankName,
        description: payoutReason || "Merchant liquidation payout (bank)",
        metadata: {
          channel: "MERCHANT_PORTAL",
          merchantCode,
          payoutType: "BANK",
          walletId: collectionWalletId,
          walletType: "BUSINESS_COLLECTION",
          isExplicitWalletSelection: true,
          validatedBankAccount: true,
          validatedAccountName: bankValidation.accountName,
          validatedAt: bankValidation.validatedAt,
        },
      });
      toast.success(res?.message || "Bank payout initiated");
      await resetPayoutForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate payout");
    }
  };

  const handleProcessMomo = async () => {
    if (!canPayout) {
      toast.error(payoutDisabledReason || "Please complete all required fields");
      return;
    }
    try {
      const res: any = await validateMomo.mutateAsync({
        phoneNumber: payoutPhone.trim(),
        amount: payoutAmountNum,
        userId: (session?.user as any)?.id,
        mnoProvider: payoutNetwork,
      });

      // Some responses include inferred network in validationResult/network fields
      const network =
        res?.validationResult?.network ||
        res?.validationResult?.data?.network ||
        res?.network ||
        null;

      setMomoValidation({
        status: "validated",
        validatedAt: new Date().toISOString(),
        phoneNumber: payoutPhone.trim(),
        network: typeof network === "string" ? network : undefined,
      });
      toast.success("Mobile money recipient validated");
    } catch (e: any) {
      setMomoValidation({ status: "idle" });
      toast.error(e?.message || "Mobile money validation failed");
    }
  };

  const handleConfirmMomo = async () => {
    if (momoValidation.status !== "validated") {
      toast.error("Please validate the mobile money recipient first.");
      return;
    }
    try {
      const res = await processTx.mutateAsync({
        userId: (session?.user as any)?.id,
        mode: "WALLET_TO_MNO",
        amount: payoutAmountNum,
        currency: "UGX",
        channel: "MERCHANT_PORTAL",
        walletType: "BUSINESS",
        phoneNumber: payoutPhone.trim(),
        mnoProvider: payoutNetwork,
        description: payoutReason || "Merchant liquidation payout (mobile money)",
        metadata: {
          channel: "MERCHANT_PORTAL",
          merchantCode,
          payoutType: "MOMO",
          walletId: collectionWalletId,
          walletType: "BUSINESS_COLLECTION",
          isExplicitWalletSelection: true,
          validatedRecipient: true,
          validatedAt: momoValidation.validatedAt,
          validatedNetwork: momoValidation.network || payoutNetwork,
        },
      });
      toast.success(res?.message || "Mobile money payout initiated");
      await resetPayoutForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate payout");
    }
  };

  const handleProcessRukapay = async () => {
    if (!canPayout) {
      toast.error(payoutDisabledReason || "Please complete all required fields");
      return;
    }
    try {
      const res: any = await validateWalletRecipient.mutateAsync({
        phoneNumber: payoutPhone.trim(),
        amount: payoutAmountNum,
        userId: (session?.user as any)?.id,
      });

      const name =
        res?.validationResult?.data?.name ||
        res?.validationResult?.data?.accountName ||
        null;

      setWalletValidation({
        status: "validated",
        validatedAt: new Date().toISOString(),
        phoneNumber: payoutPhone.trim(),
        recipientName: typeof name === "string" ? name : undefined,
      });
      toast.success(`Recipient validated${typeof name === "string" ? `: ${name}` : ""}`);
    } catch (e: any) {
      setWalletValidation({ status: "idle" });
      toast.error(e?.message || "Recipient validation failed");
    }
  };

  const handleConfirmRukapay = async () => {
    if (walletValidation.status !== "validated") {
      toast.error("Please validate the recipient first.");
      return;
    }
    try {
      const res = await processTx.mutateAsync({
        userId: (session?.user as any)?.id,
        mode: "MERCHANT_TO_WALLET",
        amount: payoutAmountNum,
        currency: "UGX",
        channel: "MERCHANT_PORTAL",
        walletType: "BUSINESS",
        recipientPhoneNumber: payoutPhone.trim(),
        description: payoutReason || "Merchant liquidation payout (RukaPay wallet)",
        metadata: {
          channel: "MERCHANT_PORTAL",
          merchantCode,
          payoutType: "RUKAPAY",
          walletId: collectionWalletId,
          walletType: "BUSINESS_COLLECTION",
          isExplicitWalletSelection: true,
          validatedRecipient: true,
          validatedAt: walletValidation.validatedAt,
          validatedRecipientName: walletValidation.recipientName,
        },
      });
      toast.success(res?.message || "RukaPay wallet transfer initiated");
      await resetPayoutForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate payout");
    }
  };

  const handlePayout = async () => {
    if (!canPayout) return;
    try {
      if (payoutType === "MOMO") {
        await handleProcessMomo();
      } else if (payoutType === "RUKAPAY") {
        await handleProcessRukapay();
      } else {
        // BANK now uses a 2-step flow: Process (validate) then Confirm
        await handleProcessBank();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate payout");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Droplets className="h-7 w-7 text-main-600" />
          Liquidate
        </h1>
        <p className="text-gray-600 mt-1">
          Move funds from collection to disbursement, then send money to your bank account. Only the account owner can liquidate.
        </p>
      </div>

      {/* Liquidate: Collection → Disbursement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Liquidate to disbursement
          </CardTitle>
          <CardDescription>
            Transfer collected payments into your disbursement wallet. A {SWEEP_FEE_PERCENT}% fee applies; the net amount is credited to disbursement for payments and withdrawals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading balances…
            </div>
          ) : !hasSplitWallets ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Your business does not have separate collection and disbursement wallets. Contact support or check your account settings if you expect this feature.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Collection balance</p>
                  <p className="font-semibold text-green-600">{fmt(collectionBalance ?? 0)}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Disbursement balance</p>
                  <p className="font-semibold text-blue-600">{fmt(disbursementBalance ?? 0)}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="sweep-amount">Amount (UGX)</Label>
                  <Input
                    id="sweep-amount"
                    type="number"
                    min={1}
                    max={collectionBalance ?? 0}
                    placeholder="Enter amount"
                    value={sweepAmount}
                    onChange={(e) => setSweepAmount(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button
                  onClick={handleSweep}
                  disabled={!canSweep || sweepLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sweepLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Liquidate
                    </>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={fetchBalances} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {gross > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Gross</span>
                    <span className="font-medium">{fmt(gross)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Fee ({SWEEP_FEE_PERCENT}%)</span>
                    <span>− {fmt(fee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700 border-t border-blue-100 pt-1.5 mt-0.5">
                    <span>Net to disbursement</span>
                    <span>{fmt(net)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payout from disbursement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-main-600" />
            Self liquidate (payout)
          </CardTitle>
          <CardDescription>
            Liquidate funds from your collection balance to any destination: Bank, Mobile Money, or a RukaPay wallet. Fees and minimums apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasSplitWallets ? (
            <p className="text-sm text-gray-600">
              Disbursement wallet is not available for this business.
            </p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={payoutType === "BANK" ? "default" : "outline"}
                  onClick={() => setPayoutType("BANK")}
                >
                  Bank
                </Button>
                <Button
                  type="button"
                  variant={payoutType === "MOMO" ? "default" : "outline"}
                  onClick={() => setPayoutType("MOMO")}
                >
                  Mobile money
                </Button>
                <Button
                  type="button"
                  variant={payoutType === "RUKAPAY" ? "default" : "outline"}
                  onClick={() => setPayoutType("RUKAPAY")}
                >
                  RukaPay wallet
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum:{" "}
                    {payoutType === "BANK"
                      ? fmt(MIN_BANK)
                      : payoutType === "MOMO"
                        ? fmt(MIN_MOMO)
                        : fmt(MIN_RUKAPAY)}
                  </p>
                </div>

                {payoutType === "BANK" ? (
                  <>
                    <div>
                      <Label>Bank</Label>
                      <select
                        value={payoutBankName}
                        onChange={(e) => setPayoutBankName(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 border rounded-md"
                      >
                        <option value="">Choose bank</option>
                        {UGANDAN_BANKS.map((b: any, i: number) => (
                          <option key={i} value={b.bankName}>
                            {b.bankName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Account number</Label>
                      <Input
                        value={payoutAccount}
                        onChange={(e) => setPayoutAccount(e.target.value)}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Account name</Label>
                      <Input
                        value={payoutAccountName}
                        onChange={(e) => setPayoutAccountName(e.target.value)}
                        placeholder="Enter account name"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>{payoutType === "MOMO" ? "Mobile number" : "Recipient phone (RukaPay)"}</Label>
                      <Input
                        value={payoutPhone}
                        onChange={(e) => setPayoutPhone(e.target.value)}
                        placeholder="e.g. 2567XXXXXXXX or 07XXXXXXXX"
                      />
                    </div>
                    {payoutType === "MOMO" ? (
                      <div>
                        <Label>Network</Label>
                        <select
                          value={payoutNetwork}
                          onChange={(e) => setPayoutNetwork(e.target.value)}
                          className="w-full mt-1.5 px-3 py-2 border rounded-md"
                        >
                          <option value="MTN">MTN</option>
                          <option value="Airtel">Airtel</option>
                        </select>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="md:col-span-2">
                  <Label>Reason</Label>
                  <Input
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                    placeholder="Optional narration"
                  />
                </div>
              </div>

              {payoutAmountNum > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Gross</span>
                    <span className="font-medium">{fmt(payoutAmountNum)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>
                      Fee{" "}
                      ({LIQUIDATE_FEE_PERCENT}%)
                    </span>
                    <span>− {fmt(payoutFee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700 border-t border-blue-100 pt-1.5 mt-0.5">
                    <span>Net</span>
                    <span>{fmt(payoutNet)}</span>
                  </div>
                </div>
              )}

              {payoutType === "BANK" && bankValidation.status === "validated" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-emerald-900">Validated account details</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-emerald-900">
                    <div className="flex justify-between md:block">
                      <span className="text-emerald-700">Bank</span>
                      <div className="font-medium">{bankValidation.bankName || payoutBankName}</div>
                    </div>
                    <div className="flex justify-between md:block">
                      <span className="text-emerald-700">Account number</span>
                      <div className="font-medium">{bankValidation.accountNumber || payoutAccount}</div>
                    </div>
                    <div className="flex justify-between md:block md:col-span-2">
                      <span className="text-emerald-700">Account name</span>
                      <div className="font-medium">{bankValidation.accountName || payoutAccountName}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={handleConfirmBank}
                      disabled={!canPayout || processTx.isPending}
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                    >
                      {processTx.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm payout"
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}

              {payoutType === "MOMO" && momoValidation.status === "validated" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-emerald-900">Validated mobile money details</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-emerald-900">
                    <div className="flex justify-between md:block">
                      <span className="text-emerald-700">Phone</span>
                      <div className="font-medium">{momoValidation.phoneNumber || payoutPhone}</div>
                    </div>
                    {momoValidation.network ? (
                      <div className="flex justify-between md:block">
                        <span className="text-emerald-700">Network</span>
                        <div className="font-medium">{momoValidation.network}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={handleConfirmMomo}
                      disabled={!canPayout || processTx.isPending}
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                    >
                      {processTx.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm payout"
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}

              {payoutType === "RUKAPAY" && walletValidation.status === "validated" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-emerald-900">Validated wallet recipient</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-emerald-900">
                    <div className="flex justify-between md:block">
                      <span className="text-emerald-700">Phone</span>
                      <div className="font-medium">{walletValidation.phoneNumber || payoutPhone}</div>
                    </div>
                    {walletValidation.recipientName ? (
                      <div className="flex justify-between md:block">
                        <span className="text-emerald-700">Name</span>
                        <div className="font-medium">{walletValidation.recipientName}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={handleConfirmRukapay}
                      disabled={!canPayout || processTx.isPending}
                      className="w-full bg-emerald-700 hover:bg-emerald-800"
                    >
                      {processTx.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm transfer"
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}

              {payoutType === "BANK" && bankValidation.status === "unverified" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="font-semibold">Account details not verified</div>
                  <p className="mt-1 text-amber-800">
                    Validation provider is unavailable ({bankValidation.validationStatus || "PENDING_VALIDATION"}). Please
                    double-check the details and try again later.
                  </p>
                </div>
              ) : null}

              <Button
                onClick={handlePayout}
                disabled={
                  !canPayout ||
                  processTx.isPending ||
                  (payoutType === "BANK" && validateBank.isPending) ||
                  (payoutType === "MOMO" && validateMomo.isPending) ||
                  (payoutType === "RUKAPAY" && validateWalletRecipient.isPending)
                }
                className="bg-main-600 hover:bg-main-700"
              >
                {payoutType === "BANK" && validateBank.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : payoutType === "MOMO" && validateMomo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : payoutType === "RUKAPAY" && validateWalletRecipient.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : processTx.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  payoutType === "BANK"
                    ? bankValidation.status === "validated"
                      ? "Re-process"
                      : "Process"
                    : payoutType === "MOMO"
                      ? momoValidation.status === "validated"
                        ? "Re-process"
                        : "Process"
                      : walletValidation.status === "validated"
                        ? "Re-process"
                        : "Process"
                )}
              </Button>

              {!canPayout && payoutDisabledReason ? (
                <p className="text-xs text-amber-700">{payoutDisabledReason}</p>
              ) : null}

              {!hasBankAccount && payoutType === "BANK" ? (
                <p className="text-xs text-amber-700">
                  Note: Your business bank details are missing in profile; bank payout uses the details entered above.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
