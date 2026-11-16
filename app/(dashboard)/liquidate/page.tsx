"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, Landmark, AlertCircle, RefreshCw, Wallet, Phone } from "lucide-react";
import Link from "next/link";
import { getWalletBalance } from "@/lib/api/wallet.api";
import { sweepToDisbursement } from "@/lib/api/wallet.api";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useUserProfile } from "../UserProfileProvider";
import { AccessDenied } from "@/app/components/AccessDenied";
import { useTeamPermissionSession } from "@/lib/hooks/useTeamPermissionSession";
import { canLiquidate } from "@/lib/utils/permissions";
import {
  useProcessTransaction,
  useValidateBankAccount,
  useValidatePhoneNumber,
  useValidateRukapayWalletRecipient,
} from "@/lib/api/payment.api";
import { UGANDAN_BANKS } from "@/app/lib/bankList";
import {
  BANK_TRANSFER_PROCESSING_MESSAGE,
  isBankTransferStillProcessing,
  mapBankTransferUserMessage,
} from "@/lib/utils/bank-transfer-status";

const fmt = (n: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export default function LiquidatePage() {
  const { profile } = useUserProfile();
  const teamSession = useTeamPermissionSession();
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
  const [payoutBankPhone, setPayoutBankPhone] = useState("");
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
    recipientName?: string;
  }>({ status: "idle" });

  const [walletValidation, setWalletValidation] = useState<{
    status: "idle" | "validated";
    validatedAt?: string;
    phoneNumber?: string;
    recipientName?: string;
  }>({ status: "idle" });

  const merchantCode = (session?.user as any)?.merchantCode as string | undefined;
  const merchants = (session?.user as any)?.merchants || [];
  const sessionMerchant =
    merchants.find((m: any) => m?.merchantCode === merchantCode) || merchants[0];
  const liveMerchant =
    (profile as any)?.merchantData ||
    (profile as any)?.businessWallet?.merchant ||
    sessionMerchant;
  const liquidationOnlyMode =
    (liveMerchant?.liquidationOnlyMode ?? sessionMerchant?.liquidationOnlyMode) === true;
  const lockedDestination =
    liveMerchant?.liquidationDestination || sessionMerchant?.liquidationDestination || null;
  const lockedDestType =
    lockedDestination?.type === 'BANK'
      ? 'BANK'
      : lockedDestination?.type === 'MOBILE_MONEY'
        ? 'MOMO'
        : null;

  const gross = parseFloat(sweepAmount) || 0;
  const canSweep =
    !liquidationOnlyMode &&
    gross > 0 &&
    collectionBalance !== null &&
    gross <= collectionBalance;

  useEffect(() => {
    if (!liquidationOnlyMode || !lockedDestination) return;
    if (lockedDestType === 'BANK') {
      setPayoutType('BANK');
      const bankFromList = UGANDAN_BANKS.find(
        (b: any) =>
          b.bankSortCode === lockedDestination.bankCode ||
          b.bankName === lockedDestination.bankName,
      );
      setPayoutBankName(bankFromList?.bankName || lockedDestination.bankName || '');
      setPayoutAccount(lockedDestination.bankAccountNumber || '');
      setPayoutAccountName(lockedDestination.bankAccountName || '');
    } else if (lockedDestType === 'MOMO') {
      setPayoutType('MOMO');
      setPayoutPhone(lockedDestination.momoPhone || '');
      const provider = String(lockedDestination.momoProvider || 'MTN').toUpperCase();
      setPayoutNetwork(provider === 'AIRTEL' ? 'Airtel' : 'MTN');
      if (lockedDestination.momoAccountName) {
        setPayoutAccountName(lockedDestination.momoAccountName);
      }
    }
  }, [liquidationOnlyMode, lockedDestType, lockedDestination]);

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
      const credited = result?.netToDisbursement ?? gross;
      toast.success(
        `Transferred ${fmt(credited)} from collection to disbursement (no transfer fee)`,
      );

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

  const canPayout = useMemo(() => {
    if (!hasSplitWallets) return false;
    // Self payout must explicitly debit BUSINESS_COLLECTION.
    if (!collectionWalletId) return false;
    if (collectionBalance === null || collectionBalance <= 0) return false;
    if (payoutAmountNum <= 0) return false;
    if (payoutAmountNum > collectionBalance) return false;

    if (liquidationOnlyMode) {
      if (lockedDestType === 'BANK') {
        return (
          !!payoutAccount.trim() &&
          !!payoutBankName &&
          /^\+?\d{9,15}$/.test(payoutBankPhone.trim())
        );
      }
      if (lockedDestType === 'MOMO') {
        return !!payoutPhone.trim() && Boolean(payoutNetwork);
      }
      return false;
    }

    if (payoutType === "BANK") {
      const accountNumberClean = payoutAccount.trim();
      const isValidAccountNumber = /^\d{8,20}$/.test(accountNumberClean);
      return (
        isValidAccountNumber &&
        payoutAccountName.trim().length >= 2 &&
        payoutAccountName.trim().length <= 100 &&
        !!payoutBankName &&
        /^\+?\d{9,15}$/.test(payoutBankPhone.trim())
      );
    }
    if (payoutType === "MOMO") {
      const phone = payoutPhone.trim();
      const isValidPhone = /^\+?\d{9,15}$/.test(phone);
      return isValidPhone && Boolean(payoutNetwork);
    }
    const phone = payoutPhone.trim();
    const isValidPhone = /^\+?\d{9,15}$/.test(phone);
    return isValidPhone;
  }, [
    hasSplitWallets,
    collectionBalance,
    payoutAmountNum,
    payoutType,
    payoutAccount,
    payoutAccountName,
    payoutBankName,
    payoutBankPhone,
    payoutPhone,
    collectionWalletId,
    liquidationOnlyMode,
    lockedDestType,
    payoutNetwork,
  ]);

  const payoutDisabledReason = useMemo(() => {
    if (!hasSplitWallets) return "Disbursement wallet is not available for this business.";
    if (!collectionWalletId) return "Collection wallet is not available. Refresh and try again.";
    if (collectionBalance === null) return "Loading your collection balance…";
    if (collectionBalance <= 0) return "Your collection balance is 0.";
    if (payoutAmountNum <= 0) return "Enter an amount.";
    if (payoutAmountNum > collectionBalance) return "Amount exceeds your collection balance.";

    if (payoutType === "BANK") {
      if (!payoutBankName) return "Choose a bank.";
      if (!/^\d{8,20}$/.test(payoutAccount.trim())) return "Account number must be 8–20 digits.";
      if (payoutAccountName.trim().length < 2) return "Enter the account name.";
      if (payoutAccountName.trim().length > 100) return "Account name must be 100 characters or less.";
      if (!/^\+?\d{9,15}$/.test(payoutBankPhone.trim())) return "Enter a valid phone number.";
      return null;
    }

    if (payoutType === "MOMO") {
      if (!/^[+]?\d{9,15}$/.test(payoutPhone.trim())) return "Enter a valid mobile number.";
      if (!payoutNetwork) return "Choose a mobile money network.";
      return null;
    }

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
    payoutBankPhone,
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
    setPayoutReason("");
    setBankValidation({ status: "idle" });
    setMomoValidation({ status: "idle" });
    setWalletValidation({ status: "idle" });
    if (liquidationOnlyMode && lockedDestination) {
      if (lockedDestType === 'BANK') {
        setPayoutType('BANK');
        const bankFromList = UGANDAN_BANKS.find(
          (b: any) =>
            b.bankSortCode === lockedDestination.bankCode ||
            b.bankName === lockedDestination.bankName,
        );
        setPayoutBankName(bankFromList?.bankName || lockedDestination.bankName || '');
        setPayoutAccount(lockedDestination.bankAccountNumber || '');
        setPayoutAccountName(lockedDestination.bankAccountName || '');
        setPayoutBankPhone('');
        setPayoutPhone('');
      } else if (lockedDestType === 'MOMO') {
        setPayoutType('MOMO');
        setPayoutPhone(lockedDestination.momoPhone || '');
        const provider = String(lockedDestination.momoProvider || 'MTN').toUpperCase();
        setPayoutNetwork(provider === 'AIRTEL' ? 'Airtel' : 'MTN');
        setPayoutAccount('');
        setPayoutAccountName(lockedDestination.momoAccountName || '');
        setPayoutBankName('');
      }
    } else {
      setPayoutPhone("");
      setPayoutBankPhone("");
      setPayoutAccount("");
      setPayoutAccountName("");
      setPayoutBankName("");
      setPayoutNetwork("MTN");
    }
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
        bankSortCode: bankValidation.bankSortCode || lockedDestination?.bankCode,
        bankCode: bankValidation.bankSortCode || lockedDestination?.bankCode,
        bankName: payoutBankName,
        phoneNumber: payoutBankPhone.trim(),
        description: payoutReason || "Merchant liquidation payout (bank)",
        metadata: {
          channel: "MERCHANT_PORTAL",
          merchantCode,
          payoutType: "BANK",
          isMerchantLiquidation: true,
          walletId: collectionWalletId,
          walletType: "BUSINESS_COLLECTION",
          isExplicitWalletSelection: true,
          validatedBankAccount: true,
          validatedAccountName: bankValidation.accountName,
          validatedAt: bankValidation.validatedAt,
        },
      });
      const payload = res?.data ?? res
      if (
        isBankTransferStillProcessing({
          status: payload?.status ?? res?.status,
          message: payload?.message ?? res?.message,
          pending: payload?.pending ?? res?.pending,
        })
      ) {
        toast.success(
          payload?.message ||
            res?.message ||
            BANK_TRANSFER_PROCESSING_MESSAGE,
        )
      } else {
        toast.success(res?.message || "Bank payout initiated")
      }
      await resetPayoutForm();
    } catch (err: any) {
      toast.error(
        mapBankTransferUserMessage(err?.message || "Failed to initiate payout"),
      );
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
      const name =
        res?.validationResult?.data?.name ||
        res?.validationResult?.data?.accountName ||
        null;

      setMomoValidation({
        status: "validated",
        validatedAt: new Date().toISOString(),
        phoneNumber: payoutPhone.trim(),
        network: typeof network === "string" ? network : undefined,
        recipientName: typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined,
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
          isMerchantLiquidation: true,
          walletId: collectionWalletId,
          walletType: "BUSINESS_COLLECTION",
          isExplicitWalletSelection: true,
          validatedRecipient: true,
          validatedAt: momoValidation.validatedAt,
          validatedNetwork: momoValidation.network || payoutNetwork,
          validatedRecipientName: momoValidation.recipientName,
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

  if (!canLiquidate(teamSession)) {
    return (
      <AccessDenied description="You do not have permission to liquidate." />
    );
  }

  const fieldLabel = "mb-1.5 block text-[12px] font-medium text-gray-600";
  const fieldInput = "h-10 w-full rounded-lg border border-gray-200 px-3 text-[13px]";
  const payoutTypeBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
      active
        ? "border-gray-900 bg-gray-900 text-white"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
    }`;

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Liquidate</h1>
        <p className="mt-0.5 text-[12px] text-gray-400">
          {liquidationOnlyMode
            ? 'Liquidation-Only Mode is enabled. You can only liquidate to your locked destination. Contact an administrator to change it.'
            : 'Move funds from collection to disbursement, then send money to your bank account. Only the account owner can liquidate.'}
        </p>
      </div>

      {/* Liquidate: Collection → Disbursement */}
      {!liquidationOnlyMode && (
      <Card className="rounded-2xl border-gray-100 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <ArrowRightLeft className="h-4 w-4 text-gray-400" />
            Liquidate to disbursement
          </CardTitle>
          <CardDescription className="text-[12px]">
            Move collected funds into your disbursement wallet at no transfer fee. RukaPay collection fees are already deducted when customers pay you. Bank and mobile money payouts below use Merchant Portal tariffs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-[12px] text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading balances…
            </div>
          ) : !hasSplitWallets ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[12px] text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                Your business does not have separate collection and disbursement wallets. Contact support or check your account settings if you expect this feature.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-medium text-gray-400">Collection balance</p>
                  <p className="mt-1 text-[16px] font-semibold tabular-nums text-gray-900">{fmt(collectionBalance ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-medium text-gray-400">Disbursement balance</p>
                  <p className="mt-1 text-[16px] font-semibold tabular-nums text-gray-900">{fmt(disbursementBalance ?? 0)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  <Label htmlFor="sweep-amount" className={fieldLabel}>Amount (UGX)</Label>
                  <Input
                    id="sweep-amount"
                    type="number"
                    min={1}
                    max={collectionBalance ?? 0}
                    placeholder="Enter amount"
                    value={sweepAmount}
                    onChange={(e) => setSweepAmount(e.target.value)}
                    className={fieldInput}
                  />
                </div>
                <Button
                  onClick={handleSweep}
                  disabled={!canSweep || sweepLoading}
                  className="h-8 rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
                >
                  {sweepLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Liquidate
                    </>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={fetchBalances} disabled={loading} className="h-8 w-8 rounded-full border-gray-200">
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {gross > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3 text-[12px] text-gray-700">
                  <div className="flex justify-between font-semibold">
                    <span>Amount to disbursement</span>
                    <span className="tabular-nums">{fmt(gross)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">No fee for collection → disbursement transfer.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Payout from collection */}
      <Card className="rounded-2xl border-gray-100 py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Landmark className="h-4 w-4 text-gray-400" />
            Self liquidate (payout)
          </CardTitle>
          <CardDescription className="text-[12px]">
            {liquidationOnlyMode
              ? 'Funds are paid out only to your locked destination. You cannot change these details here — contact an administrator if you need an update. Bank and mobile money fees use Merchant Portal tariffs.'
              : 'Send from your collection wallet to bank, mobile money, or another RukaPay user. Bank and MoMo fees come from Merchant Portal tariffs (not a separate liquidation fee). RukaPay wallet payouts have no payout tariff fee.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          {liquidationOnlyMode && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[12px] text-gray-700">
              <div className="font-semibold text-gray-900">Locked liquidation destination</div>
              {lockedDestType === 'BANK' ? (
                <div className="mt-1 space-y-0.5">
                  <div>Bank: {lockedDestination?.bankName || payoutBankName}</div>
                  <div>Account: {lockedDestination?.bankAccountNumberMasked || payoutAccount}</div>
                  <div>Name: {lockedDestination?.bankAccountName || payoutAccountName}</div>
                </div>
              ) : lockedDestType === 'MOMO' ? (
                <div className="mt-1 space-y-0.5">
                  <div>Provider: {lockedDestination?.momoProvider || payoutNetwork}</div>
                  <div>Phone: {lockedDestination?.momoPhoneMasked || payoutPhone}</div>
                  {lockedDestination?.momoAccountName ? (
                    <div>Name: {lockedDestination.momoAccountName}</div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-1">No destination configured. Set one in Settings, or contact an administrator.</div>
              )}
            </div>
          )}
          {!hasSplitWallets ? (
            <p className="text-[12px] text-gray-500">
              Disbursement wallet is not available for this business.
            </p>
          ) : (
            <>
              {!liquidationOnlyMode && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={payoutTypeBtn(payoutType === "BANK")}
                  onClick={() => setPayoutType("BANK")}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  Bank
                </button>
                <button
                  type="button"
                  className={payoutTypeBtn(payoutType === "MOMO")}
                  onClick={() => setPayoutType("MOMO")}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Mobile money
                </button>
                <button
                  type="button"
                  className={payoutTypeBtn(payoutType === "RUKAPAY")}
                  onClick={() => setPayoutType("RUKAPAY")}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  RukaPay wallet
                </button>
              </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className={fieldLabel}>Amount (UGX)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount"
                    className={fieldInput}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Available in collection: {fmt(collectionBalance ?? 0)}. You can pay out any amount up to your balance.
                  </p>
                </div>

                {payoutType === "BANK" ? (
                  <>
                    <div>
                      <Label className={fieldLabel}>Bank</Label>
                      <select
                        value={payoutBankName}
                        onChange={(e) => setPayoutBankName(e.target.value)}
                        className={fieldInput}
                        disabled={liquidationOnlyMode}
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
                      <Label className={fieldLabel}>Account number</Label>
                      <Input
                        value={payoutAccount}
                        onChange={(e) => setPayoutAccount(e.target.value)}
                        placeholder="Enter account number"
                        disabled={liquidationOnlyMode}
                        readOnly={liquidationOnlyMode}
                        className={fieldInput}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className={fieldLabel}>Account name</Label>
                      <Input
                        value={payoutAccountName}
                        onChange={(e) => setPayoutAccountName(e.target.value)}
                        placeholder="Enter account name"
                        disabled={liquidationOnlyMode}
                        readOnly={liquidationOnlyMode}
                        className={fieldInput}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className={fieldLabel}>Phone number</Label>
                      <Input
                        value={payoutBankPhone}
                        onChange={(e) => setPayoutBankPhone(e.target.value)}
                        placeholder="e.g. 2567XXXXXXXX or 07XXXXXXXX"
                        className={fieldInput}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className={fieldLabel}>{payoutType === "MOMO" ? "Mobile number" : "Recipient phone (RukaPay)"}</Label>
                      <Input
                        value={payoutPhone}
                        onChange={(e) => setPayoutPhone(e.target.value)}
                        placeholder="e.g. 2567XXXXXXXX or 07XXXXXXXX"
                        disabled={liquidationOnlyMode}
                        readOnly={liquidationOnlyMode}
                        className={fieldInput}
                      />
                    </div>
                    {payoutType === "MOMO" ? (
                      <div>
                        <Label className={fieldLabel}>Network</Label>
                        <select
                          value={payoutNetwork}
                          onChange={(e) => setPayoutNetwork(e.target.value)}
                          className={fieldInput}
                          disabled={liquidationOnlyMode}
                        >
                          <option value="MTN">MTN</option>
                          <option value="Airtel">Airtel</option>
                        </select>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="md:col-span-2">
                  <Label className={fieldLabel}>Reason</Label>
                  <Input
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                    placeholder="Optional narration"
                    className={fieldInput}
                  />
                </div>
              </div>

              {payoutAmountNum > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[12px] text-gray-700">
                  Payout amount: <span className="font-semibold tabular-nums">{fmt(payoutAmountNum)}</span>.
                  {payoutType === "RUKAPAY"
                    ? " RukaPay wallet liquidation has no payout tariff fee."
                    : " Fees are calculated from Merchant Portal bank / mobile money tariffs when you confirm."}
                </div>
              )}

              {payoutType === "BANK" && bankValidation.status === "validated" ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[12px]">
                  <div className="font-semibold text-gray-900">Validated account details</div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-gray-800 md:grid-cols-2">
                    <div className="flex justify-between md:block">
                      <span className="text-gray-400">Bank</span>
                      <div className="font-medium">{bankValidation.bankName || payoutBankName}</div>
                    </div>
                    <div className="flex justify-between md:block">
                      <span className="text-gray-400">Account number</span>
                      <div className="font-medium">{bankValidation.accountNumber || payoutAccount}</div>
                    </div>
                    <div className="flex justify-between md:block md:col-span-2">
                      <span className="text-gray-400">Account name</span>
                      <div className="font-medium">{bankValidation.accountName || payoutAccountName}</div>
                    </div>
                    <div className="flex justify-between md:block md:col-span-2">
                      <span className="text-gray-400">Phone number</span>
                      <div className="font-medium">{payoutBankPhone}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={handleConfirmBank}
                      disabled={!canPayout || processTx.isPending}
                      className="h-8 w-full rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
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
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[12px]">
                  <div className="font-semibold text-gray-900">Validated mobile money details</div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-gray-800 md:grid-cols-2">
                    <div className="flex justify-between md:block">
                      <span className="text-gray-400">Phone</span>
                      <div className="font-medium">{momoValidation.phoneNumber || payoutPhone}</div>
                    </div>
                    {momoValidation.network ? (
                      <div className="flex justify-between md:block">
                        <span className="text-gray-400">Network</span>
                        <div className="font-medium">{momoValidation.network}</div>
                      </div>
                    ) : null}
                    {momoValidation.recipientName ? (
                      <div className="flex justify-between md:block">
                        <span className="text-gray-400">Name</span>
                        <div className="font-medium">{momoValidation.recipientName}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={handleConfirmMomo}
                      disabled={!canPayout || processTx.isPending}
                      className="h-8 w-full rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
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
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[12px]">
                  <div className="font-semibold text-gray-900">Validated wallet recipient</div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-gray-800 md:grid-cols-2">
                    <div className="flex justify-between md:block">
                      <span className="text-gray-400">Phone</span>
                      <div className="font-medium">{walletValidation.phoneNumber || payoutPhone}</div>
                    </div>
                    {walletValidation.recipientName ? (
                      <div className="flex justify-between md:block">
                        <span className="text-gray-400">Name</span>
                        <div className="font-medium">{walletValidation.recipientName}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Button
                      onClick={handleConfirmRukapay}
                      disabled={!canPayout || processTx.isPending}
                      className="h-8 w-full rounded-full bg-gray-900 px-3 text-[12px] hover:bg-gray-800"
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
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[12px] text-amber-900">
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
                className="h-8 rounded-full bg-gray-900 px-4 text-[12px] hover:bg-gray-800"
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
                <p className="text-[11px] text-amber-700">{payoutDisabledReason}</p>
              ) : null}

              {!hasBankAccount && payoutType === "BANK" ? (
                <p className="text-[11px] text-amber-700">
                  Note: Your business bank details are missing in profile; bank payout uses the details entered above.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
