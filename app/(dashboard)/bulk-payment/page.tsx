"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Upload, Download, Plus, Trash2, Users, CheckCircle2, 
  XCircle, Clock, Send, AlertCircle, Info, Loader2,
  Wallet, Phone, Building2, Zap, Edit, RefreshCw, AlertTriangle,
  CircleHelp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "../UserProfileProvider";
import { toast } from 'sonner';
import { AccessDenied } from '@/app/components/AccessDenied';
import { useTeamPermissionSession } from '@/lib/hooks/useTeamPermissionSession';
import { canInitiatePayments } from '@/lib/utils/permissions';
import { readSheetFromBinaryString, writeWorkbookToFile } from "@/lib/excel-utils";
import { processBulkTransactionAsync, validateBulkRecipients, getBulkTransactionStatus, BulkTransactionItem, BulkTransactionItemResult } from "@/lib/api/bulk-payment.api";
import { SinglePaymentDto, FeePreviewResponseDto, processSinglePayment, validateTransaction } from "@/lib/api/single-payment.api";
import {
  inferMnoProviderFromUganda,
  normalizePhoneToUganda,
  resolveAirtimeMnoProvider,
} from "@/lib/utils";
import {
  getAreaFieldConfig,
  validateBillArea,
  validateUtilityCustomerPhone,
  isUmemeUtility,
  utilityRequiresCustomerPhone,
  NWSC_AREAS,
} from "@/lib/utils/bill-area-field";

const TRANSACTION_TYPES = [
  { value: 'WALLET_TO_MNO', label: 'Mobile Money', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'WALLET_TO_BANK', label: 'Bank Transfer', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'MERCHANT_TO_WALLET', label: 'Merchant to Wallet', icon: Wallet, color: 'text-green-600', bg: 'bg-green-50' },
  // Bill payment (single + bulk)
  { value: 'UTILITIES', label: 'Bill Payment', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
];

type BillPaymentSubTab = 'utilities' | 'airtime_data';

/** Backend `billType` / `utilityProvider` for Uganda Revenue Authority; change if API uses a different code. */
const URA_UTILITY_PROVIDER = 'URA';
/** Radix Select cannot use empty string as `SelectItem` value; maps to cleared `utilityProvider`. */
const BILLER_SELECT_NONE = '__none__';
const URA_PRN_MIN_LENGTH = 8;

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer shrink-0 rounded-sm text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label="More information"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

const isAirtimeOrDataUtility = (provider: string | undefined) =>
  provider === 'AIRTIME' || provider === 'DATA_BUNDLES';

const normalizeUtilityProvider = (raw: unknown): string => {
  const up = String(raw ?? '').trim().toUpperCase();
  if (!up) return '';
  if (up === 'AIRTIME') return 'AIRTIME';
  if (up === 'DATA_BUNDLES' || up === 'MOBILE_DATA' || up === 'MOBILE DATA') return 'DATA_BUNDLES';
  return up;
};

const isUraUtility = (provider: string | undefined) =>
  provider === URA_UTILITY_PROVIDER;

/** Normalize customer phone for utility bills when provided. */
const normalizeUtilityBillPhone = (
  provider: string | undefined,
  phone: string | undefined,
): string | undefined => {
  const raw = phone?.trim();
  if (!raw) return undefined;
  if (isAirtimeOrDataUtility(provider) || isUmemeUtility(provider)) {
    return normalizePhoneToUganda(raw);
  }
  return raw;
};

/** Client-side PRN check for URA; final amount/PRN match is enforced by the backend. */
const validateUraPrn = (raw: string | undefined): string | null => {
  const s = (raw ?? '').trim();
  if (!s) return 'PRN (Payment Reference Number) is required for URA';
  if (s.length < URA_PRN_MIN_LENGTH) {
    return `PRN must be at least ${URA_PRN_MIN_LENGTH} characters`;
  }
  return null;
};

const UGANDAN_BANKS = [
  { bankName: "Barclays (now Absa)", bankSortCode: "013847" },
  { bankName: "Bank of Baroda", bankSortCode: "020147" },
  { bankName: "Stanbic Bank Ltd", bankSortCode: "040147" },
  { bankName: "DFCU Bank", bankSortCode: "050147" },
  { bankName: "Exim Bank", bankSortCode: "320147" },
  { bankName: "I & M Bank", bankSortCode: "110147" },
  { bankName: "Tropical Africa Bank", bankSortCode: "060147" },
  { bankName: "Standard Chartered Bank", bankSortCode: "080147" },
  { bankName: "Orient Bank", bankSortCode: "110147" },
  { bankName: "Bank of Africa", bankSortCode: "130447" },
  { bankName: "Centenary Bank", bankSortCode: "163747" },
  { bankName: "Crane Bank", bankSortCode: "170147" },
  { bankName: "Cairo International Bank", bankSortCode: "180147" },
  { bankName: "Diamond Trust Bank", bankSortCode: "190147" },
  { bankName: "Citi Bank", bankSortCode: "220147" },
  { bankName: "Housing Finance Bank", bankSortCode: "230147" },
  { bankName: "Global Trust Bank", bankSortCode: "240147" },
  { bankName: "Kenya Commercial Bank (KCB)", bankSortCode: "252947" },
  { bankName: "United Bank for Africa (UBA)", bankSortCode: "260147" },
  { bankName: "FINA Bank", bankSortCode: "271147" },
  { bankName: "Bank of Uganda", bankSortCode: "990147" },
  { bankName: "Ecobank", bankSortCode: "290147" },
  { bankName: "Equity Bank", bankSortCode: "300147" },
  { bankName: "ABC Bank", bankSortCode: "310147" },
  { bankName: "Imperial Bank Uganda", bankSortCode: "320147" },
  { bankName: "NC Bank", bankSortCode: "350147" },
  { bankName: "Post Bank Uganda", bankSortCode: "560147" }
];


interface PaymentItem extends Partial<BulkTransactionItem> {
  id: string;
  status?: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
  validated?: boolean;
  /** Estimated fee for this item (from fee preview), used to show queued total including charges */
  estimatedFee?: number;
  /** Estimated net amount the recipient will receive (from fee preview) */
  estimatedNetAmount?: number;
}

export default function BulkPaymentPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const teamSession = useTeamPermissionSession();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkReference, setBulkReference] = useState('');
  
  // Safe session-derived values (never throw)
  const merchants = (session?.user as any)?.merchants ?? [];
  const currentMerchantCode = (session?.user as any)?.merchantCode ?? undefined;
  const currentMerchant = useMemo(() => {
    if (!currentMerchantCode || !Array.isArray(merchants)) return undefined;
    return merchants.find((m: any) => m?.merchantCode === currentMerchantCode);
  }, [currentMerchantCode, merchants]);

  const { profile } = useUserProfile();
  const liveMerchantData = profile?.merchantData || (profile as any)?.businessWallet?.merchant;
  const liquidationOnlyMode =
    (liveMerchantData?.liquidationOnlyMode ??
      (currentMerchant as any)?.liquidationOnlyMode) === true;
  const featureBulkPayments =
    (liveMerchantData?.featureBulkPayments ?? currentMerchant?.featureBulkPayments) === true;
  const featureLiquidation =
    (liveMerchantData?.featureLiquidation ?? (currentMerchant as any)?.featureLiquidation) === true;
  const canLiquidate = featureLiquidation || featureBulkPayments;
  const disbursementBalance =
    (profile as any)?.businessWallet?.disbursementBalance ??
    (profile as any)?.businessWallet?.balance ??
    0;

  // Normalized merchant code for API calls (used for wallet routing on the backend)
  const merchantCodeForRequest = currentMerchantCode
    ? String(currentMerchantCode).trim()
    : undefined;

  // Redirect when unauthenticated (must run before early returns so it runs in all cases)
  useEffect(() => {
    if (sessionStatus === 'unauthenticated' || session === null) {
      router.replace('/');
    }
  }, [sessionStatus, session, router]);

  // Single Payment State (must be before any early return to satisfy Rules of Hooks)
  const [singlePayment, setSinglePayment] = useState<SinglePaymentDto>({
    mode: 'WALLET_TO_MNO',
    amount: 0,
    currency: 'UGX',
    walletType: 'BUSINESS'
  });
  const [singlePaymentLoading, setSinglePaymentLoading] = useState(false);
  const [validatingTransaction, setValidatingTransaction] = useState(false);
  const [feePreview, setFeePreview] = useState<FeePreviewResponseDto | null>(null);
  const [validationInfo, setValidationInfo] = useState<{
    recipientName?: string;
    partnerCode?: string;
    partnerName?: string;
    isValid?: boolean;
  } | null>(null);
  const [singleBillSubTab, setSingleBillSubTab] = useState<BillPaymentSubTab>('utilities');
  const [bulkBillSubTab, setBulkBillSubTab] = useState<BillPaymentSubTab>('utilities');

  useEffect(() => {
    if (singlePayment.mode !== 'UTILITIES') setSingleBillSubTab('utilities');
  }, [singlePayment.mode]);

  // Bulk payment state (must be before any early return to satisfy Rules of Hooks)
  const [bulkTransactionId, setBulkTransactionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressStats, setProgressStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    percentage: 0
  });
  const [validating, setValidating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentItem>>({
    mode: 'WALLET_TO_MNO',
    currency: 'UGX',
    walletType: 'BUSINESS', // ✅ Hardcoded to BUSINESS wallet for merchant dashboard
    mnoProvider: 'MTN', // default network so user doesn't have to touch the select
  });

  useEffect(() => {
    if (formData.mode !== 'UTILITIES') setBulkBillSubTab('utilities');
  }, [formData.mode]);

  const singleAreaConfig = useMemo(
    () => getAreaFieldConfig(singlePayment.utilityProvider),
    [singlePayment.utilityProvider],
  );
  const bulkAreaConfig = useMemo(
    () => getAreaFieldConfig(formData.utilityProvider),
    [formData.utilityProvider],
  );

  // Session loading: show neutral loading so we don't run logic that assumes session
  if (sessionStatus === 'loading' || session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unauthenticated: show loading and redirect via useEffect (avoid side effect in render)
  if (sessionStatus === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canInitiatePayments(teamSession)) {
    return (
      <AccessDenied description="You do not have permission to initiate payments." />
    );
  }

  // Single Payment Functions
  const handleSinglePaymentChange = (field: keyof SinglePaymentDto, value: any) => {
    setSinglePayment((prev) => {
      if (field === 'utilityProvider') {
        const nextConfig = getAreaFieldConfig(value);
        const keepArea =
          nextConfig.visible &&
          (nextConfig.mode !== 'select' ||
            (prev.area && nextConfig.options?.includes(prev.area)));
        return {
          ...prev,
          utilityProvider: value,
          area: keepArea ? prev.area : undefined,
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleSinglePaymentModeChange = (mode: SinglePaymentDto['mode']) => {
    setSinglePayment((prev) => ({
      ...prev,
      mode,
      ...(mode === 'UTILITIES' ? { mnoProvider: undefined } : {}),
    }));
    setValidationInfo(null);
    setFeePreview(null);
  };

  const handleSingleAirtimePhoneChange = (raw: string) => {
    const inferred = inferMnoProviderFromUganda(raw);
    setSinglePayment((prev) => ({
      ...prev,
      phoneNumber: raw,
      mnoProvider: inferred ?? prev.mnoProvider,
    }));
  };

  const handleBulkAirtimePhoneChange = (raw: string) => {
    const inferred = inferMnoProviderFromUganda(raw);
    setFormData((prev) => ({
      ...prev,
      phoneNumber: raw,
      mnoProvider: inferred ?? prev.mnoProvider,
    }));
  };

  const previewSinglePaymentFees = async () => {
    if (!singlePayment.amount || singlePayment.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (singlePayment.mode === 'UTILITIES') {
      const up = singlePayment.utilityProvider;
      if (!up) {
        toast.error('Select a bill provider');
        return;
      }
      if (isAirtimeOrDataUtility(up)) {
        if (!singlePayment.phoneNumber?.trim()) {
          toast.error('Phone number is required for airtime');
          return;
        }
        if (!resolveAirtimeMnoProvider(singlePayment.mnoProvider, singlePayment.phoneNumber)) {
          toast.error('Select the recipient mobile network (MTN or Airtel)');
          return;
        }
      } else if (!singlePayment.customerRef?.trim()) {
        toast.error('Customer / account reference is required for this biller');
        return;
      }
      if (isUraUtility(up)) {
        const prnErr = validateUraPrn(singlePayment.customerRef);
        if (prnErr) {
          toast.error(prnErr);
          return;
        }
      }
      const areaErr = validateBillArea(up, singlePayment.area);
      if (areaErr) {
        toast.error(areaErr);
        return;
      }
      const phoneErr = validateUtilityCustomerPhone(up, singlePayment.phoneNumber);
      if (phoneErr) {
        toast.error(phoneErr);
        return;
      }
    }

    setValidatingTransaction(true);
    try {
      const airtimeNetwork =
        singlePayment.mode === 'UTILITIES' &&
        isAirtimeOrDataUtility(singlePayment.utilityProvider)
          ? resolveAirtimeMnoProvider(singlePayment.mnoProvider, singlePayment.phoneNumber)
          : undefined;

      const payload: SinglePaymentDto = {
        ...singlePayment,
        ...(airtimeNetwork ? { mnoProvider: airtimeNetwork } : {}),
        userId: (session?.user as any)?.id,
        phoneNumber:
          singlePayment.mode === 'WALLET_TO_MNO' && singlePayment.phoneNumber
            ? normalizePhoneToUganda(singlePayment.phoneNumber)
            : singlePayment.mode === 'UTILITIES' && singlePayment.phoneNumber
              ? normalizeUtilityBillPhone(
                  singlePayment.utilityProvider,
                  singlePayment.phoneNumber,
                )
              : singlePayment.phoneNumber,
        recipientPhoneNumber: singlePayment.mode === 'MERCHANT_TO_WALLET' && singlePayment.recipientPhoneNumber
          ? normalizePhoneToUganda(singlePayment.recipientPhoneNumber)
          : singlePayment.recipientPhoneNumber,
      };
      const validation = await validateTransaction(payload);
      console.log('Validation result:', validation);
      
      // Store validation info - PRESERVE user-entered name if validation doesn't return one (SAME AS BULK)
      const recipientName = validation.recipientName || singlePayment.accountName || singlePayment.recipientName;
      
      setValidationInfo({
        recipientName: recipientName,
        partnerCode: validation.partnerCode,
        partnerName: validation.partnerName,
        isValid: validation.isValid
      });
      
      // Pre-fill the account holder name field with validated name
      if (recipientName && singlePayment.mode === 'WALLET_TO_BANK') {
        setSinglePayment(prev => ({
          ...prev,
          accountName: recipientName
        }));
      }
      // Same for mobile money: validated KYC name must live on singlePayment so the process
      // payload includes recipientName (bulk rows always carry it; single-pay only had it in validationInfo).
      if (recipientName && singlePayment.mode === 'WALLET_TO_MNO') {
        setSinglePayment(prev => ({
          ...prev,
          recipientName: recipientName,
        }));
      }
      if (recipientName && singlePayment.mode === 'UTILITIES') {
        setSinglePayment((prev) => ({
          ...prev,
          recipientName,
          customerName: recipientName,
        }));
      }

      if (validation.feePreview) {
        setFeePreview(validation.feePreview);
        toast.success('Fee preview updated');
      } else {
        toast.info('Validation completed - no fee preview available');
      }
      
      if (recipientName) {
        toast.success(`Recipient validated: ${recipientName}`);
      }
      
      if (validation.errors && validation.errors.length > 0) {
        toast.error(`Validation errors: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings && validation.warnings.length > 0) {
        toast.warning(`Validation warnings: ${validation.warnings.join(', ')}`);
      }
    } catch (error: any) {
      console.error('Error validating transaction:', error);
      toast.error('Failed to validate transaction');
      setValidationInfo(null);
    } finally {
      setValidatingTransaction(false);
    }
  };

  const processSinglePaymentTransaction = async () => {
    if (!singlePayment.amount || singlePayment.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!session?.user) {
      toast.error('Please log in to process payments');
      return;
    }

    if (singlePayment.mode === 'UTILITIES') {
      const up = singlePayment.utilityProvider;
      if (!up) {
        toast.error('Select a bill provider');
        return;
      }
      if (isAirtimeOrDataUtility(up)) {
        if (!singlePayment.phoneNumber?.trim()) {
          toast.error('Phone number is required for airtime and mobile data');
          return;
        }
        if (!resolveAirtimeMnoProvider(singlePayment.mnoProvider, singlePayment.phoneNumber)) {
          toast.error('Select the recipient mobile network (MTN or Airtel)');
          return;
        }
        if (up === 'DATA_BUNDLES') {
          const q = Number(singlePayment.metadata?.dataQuantity);
          if (!q || Number.isNaN(q)) {
            toast.error('Bundle quantity is required for mobile data (e.g. MB/GB amount)');
            return;
          }
        }
      } else if (!singlePayment.customerRef?.trim()) {
        toast.error('Customer / account reference is required for this biller');
        return;
      }
      if (isUraUtility(up)) {
        const prnErr = validateUraPrn(singlePayment.customerRef);
        if (prnErr) {
          toast.error(prnErr);
          return;
        }
      }
      const areaErr = validateBillArea(up, singlePayment.area);
      if (areaErr) {
        toast.error(areaErr);
        return;
      }
      const phoneErr = validateUtilityCustomerPhone(up, singlePayment.phoneNumber);
      if (phoneErr) {
        toast.error(phoneErr);
        return;
      }
      if (isUmemeUtility(up)) {
        const billName =
          validationInfo?.recipientName ||
          singlePayment.customerName ||
          singlePayment.recipientName;
        if (!billName?.trim()) {
          toast.error('Validate the UMEME meter first to load the customer name');
          return;
        }
      }
    }

    setSinglePaymentLoading(true);
    try {
      const normalizedUtilPhone =
        singlePayment.mode === 'UTILITIES' && singlePayment.phoneNumber
          ? normalizeUtilityBillPhone(
              singlePayment.utilityProvider,
              singlePayment.phoneNumber,
            )
          : singlePayment.phoneNumber;

      const resolvedMnoRecipientName =
        singlePayment.mode === 'WALLET_TO_MNO'
          ? validationInfo?.recipientName || singlePayment.recipientName
          : singlePayment.recipientName;

      const resolvedBillCustomerName =
        singlePayment.mode === 'UTILITIES' &&
        !isAirtimeOrDataUtility(singlePayment.utilityProvider)
          ? validationInfo?.recipientName ||
            singlePayment.customerName ||
            singlePayment.recipientName
          : undefined;

      const airtimeNetwork =
        singlePayment.mode === 'UTILITIES' &&
        isAirtimeOrDataUtility(singlePayment.utilityProvider)
          ? resolveAirtimeMnoProvider(singlePayment.mnoProvider, singlePayment.phoneNumber)
          : undefined;

      const payload: SinglePaymentDto = {
        ...singlePayment,
        ...(airtimeNetwork ? { mnoProvider: airtimeNetwork } : {}),
        phoneNumber:
          singlePayment.mode === 'WALLET_TO_MNO' && singlePayment.phoneNumber
            ? normalizePhoneToUganda(singlePayment.phoneNumber)
            : singlePayment.mode === 'UTILITIES' && normalizedUtilPhone
              ? normalizedUtilPhone
              : singlePayment.phoneNumber,
        customerRef:
          singlePayment.mode === 'UTILITIES'
            ? isAirtimeOrDataUtility(singlePayment.utilityProvider) && normalizedUtilPhone
              ? normalizedUtilPhone
              : singlePayment.customerRef || singlePayment.utilityAccountNumber
            : singlePayment.customerRef,
        utilityAccountNumber:
          singlePayment.mode === 'UTILITIES'
            ? isAirtimeOrDataUtility(singlePayment.utilityProvider) && normalizedUtilPhone
              ? normalizedUtilPhone
              : singlePayment.utilityAccountNumber || singlePayment.customerRef
            : singlePayment.utilityAccountNumber,
        metadata: singlePayment.metadata,
        recipientPhoneNumber: singlePayment.mode === 'MERCHANT_TO_WALLET' && singlePayment.recipientPhoneNumber
          ? normalizePhoneToUganda(singlePayment.recipientPhoneNumber)
          : singlePayment.recipientPhoneNumber,
        ...(singlePayment.mode === 'WALLET_TO_MNO' && resolvedMnoRecipientName
          ? { recipientName: resolvedMnoRecipientName }
          : {}),
        ...(resolvedBillCustomerName
          ? {
              recipientName: resolvedBillCustomerName,
              customerName: resolvedBillCustomerName,
            }
          : {}),
      };
      const result = await processSinglePayment(payload, (session?.user as any)?.id);
      toast.success('Payment processed successfully!');
      console.log('Single payment result:', result);
      
      // Navigate to transactions page after successful payment
      router.push('/transactions');
      
      // Reset form and validation
      setSinglePayment({
        mode: 'WALLET_TO_MNO',
        amount: 0,
        currency: 'UGX',
        walletType: 'BUSINESS'
      });
      setSingleBillSubTab('utilities');
      setFeePreview(null);
      setValidationInfo(null);
    } catch (error: any) {
      console.error('Error processing single payment:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setSinglePaymentLoading(false);
    }
  };

  const handleAddPayment = () => {
    // ✅ Description is now optional - only validate amount
    if (!formData.amount) {
      toast.error('Amount is required');
      return;
    }

  // Validate based on mode
  if (formData.mode === 'WALLET_TO_MNO' && !formData.phoneNumber) {
    toast.error('Phone number is required for mobile money');
    return;
  }

  if (formData.mode === 'WALLET_TO_BANK' && (!formData.accountNumber || !formData.bankSortCode || !formData.accountName)) {
    toast.error('Account number, bank, and account name are required for bank transfer');
    return;
  }

  if (formData.mode === 'MERCHANT_TO_WALLET' && !formData.recipientPhoneNumber) {
    toast.error('Recipient phone number is required for merchant to wallet transfer');
    return;
  }

  if (formData.mode === 'UTILITIES') {
    const up = normalizeUtilityProvider(formData.utilityProvider);
    if (!up) {
      toast.error('Select a bill provider');
      return;
    }
    if (up === 'DATA_BUNDLES') {
      toast.error('Mobile data bundles are currently hidden on merchant dashboard. Use Airtime.');
      return;
    }
    if (isAirtimeOrDataUtility(up)) {
      if (!formData.phoneNumber?.trim()) {
        toast.error('Phone number is required for airtime');
        return;
      }
      if (!resolveAirtimeMnoProvider(formData.mnoProvider, formData.phoneNumber)) {
        toast.error('Select the recipient mobile network (MTN or Airtel)');
        return;
      }
    } else if (!formData.customerRef?.trim()) {
      toast.error('Customer / account reference is required for this biller');
      return;
    } else if (isUraUtility(up)) {
      const prnErr = validateUraPrn(formData.customerRef);
      if (prnErr) {
        toast.error(prnErr);
        return;
      }
    }
    const areaErr = validateBillArea(up, formData.area);
    if (areaErr) {
      toast.error(areaErr);
      return;
    }
    const phoneErr = validateUtilityCustomerPhone(up, formData.phoneNumber);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
  }

    if (editingId) {
      const utilProvNorm = normalizeUtilityProvider(formData.utilityProvider);
      const utilPhoneEdit = normalizeUtilityBillPhone(utilProvNorm, formData.phoneNumber);
      const airtimeMnoEdit =
        formData.mode === 'UTILITIES' &&
        isAirtimeOrDataUtility(formData.utilityProvider)
          ? resolveAirtimeMnoProvider(formData.mnoProvider, formData.phoneNumber)
          : undefined;
      setPayments(prev =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...(formData as PaymentItem),
                ...(formData.mode === 'UTILITIES'
                  ? { utilityProvider: normalizeUtilityProvider(formData.utilityProvider) }
                  : {}),
                ...(airtimeMnoEdit ? { mnoProvider: airtimeMnoEdit } : {}),
                id: p.id,
                itemId: p.itemId,
                status: 'pending',
                validated: false,
                walletType: 'BUSINESS',
                ...(utilPhoneEdit && isAirtimeOrDataUtility(utilProvNorm)
                  ? {
                      phoneNumber: utilPhoneEdit,
                      customerRef: utilPhoneEdit,
                      utilityAccountNumber: utilPhoneEdit,
                    }
                  : utilPhoneEdit
                    ? { phoneNumber: utilPhoneEdit }
                    : {}),
              }
            : p,
        ),
      );
      setEditingId(null);
      toast.success('Payment updated');
    } else {
      // Add new payment (always use BUSINESS wallet)
      // For MERCHANT_TO_WALLET, ensure recipientPhoneNumber is set correctly
      const paymentData = { ...formData };
      if (paymentData.mode === 'MERCHANT_TO_WALLET' && paymentData.recipientPhoneNumber) {
        // Copy recipientPhoneNumber to both fields for backend compatibility
        (paymentData as any).recipientPhone = paymentData.recipientPhoneNumber;
      }
      
      const utilProvNorm = normalizeUtilityProvider(paymentData.utilityProvider);
      const utilPhone = normalizeUtilityBillPhone(utilProvNorm, paymentData.phoneNumber);
      const airtimeMno =
        paymentData.mode === 'UTILITIES' &&
        isAirtimeOrDataUtility(paymentData.utilityProvider)
          ? resolveAirtimeMnoProvider(paymentData.mnoProvider, paymentData.phoneNumber)
          : undefined;

      const newPayment: PaymentItem = {
        ...paymentData as BulkTransactionItem,
        ...(paymentData.mode === 'UTILITIES'
          ? { utilityProvider: utilProvNorm }
          : {}),
        ...(airtimeMno ? { mnoProvider: airtimeMno } : {}),
        id: `item-${Date.now()}`,
        itemId: `ITEM-${Date.now()}`,
        status: 'pending',
        walletType: 'BUSINESS', // ✅ Hardcoded to BUSINESS wallet
        ...(utilPhone && isAirtimeOrDataUtility(utilProvNorm)
          ? {
              phoneNumber: utilPhone,
              customerRef: utilPhone,
              utilityAccountNumber: utilPhone,
            }
          : utilPhone
            ? { phoneNumber: utilPhone }
            : {}),
      };
      setPayments(prev => [...prev, newPayment]);
      toast.success('Payment added to list');
    }

    setFormData({ mode: 'WALLET_TO_MNO', currency: 'UGX', walletType: 'BUSINESS', mnoProvider: 'MTN' });
    setShowAddForm(false);
  };

  const handleEditPayment = (payment: PaymentItem) => {
    setFormData(payment);
    setEditingId(payment.id);
    if (payment.mode === 'UTILITIES' && isAirtimeOrDataUtility(payment.utilityProvider)) {
      setBulkBillSubTab('airtime_data');
    } else if (payment.mode === 'UTILITIES') {
      setBulkBillSubTab('utilities');
    }
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData({ mode: 'WALLET_TO_MNO', currency: 'UGX', walletType: 'BUSINESS', mnoProvider: 'MTN' });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleValidateAll = async () => {
    if (payments.length === 0) {
      toast.error('No payments to validate');
      return;
    }

    const areaInvalid = payments.filter(
      (p) =>
        p.mode === 'UTILITIES' &&
        validateBillArea(normalizeUtilityProvider(p.utilityProvider), p.area),
    );
    if (areaInvalid.length > 0) {
      setPayments((prev) =>
        prev.map((p) => {
          const err =
            p.mode === 'UTILITIES'
              ? validateBillArea(normalizeUtilityProvider(p.utilityProvider), p.area)
              : null;
          if (!err) return p;
          return {
            ...p,
            status: 'failed' as const,
            error: err,
            validated: true,
          };
        }),
      );
      toast.error(
        `${areaInvalid.length} NWSC payment(s) need a valid Area (e.g. Kampala). Fix them before validating.`,
      );
      return;
    }

    const umemePhoneInvalid = payments.filter(
      (p) =>
        p.mode === 'UTILITIES' &&
        validateUtilityCustomerPhone(
          normalizeUtilityProvider(p.utilityProvider),
          p.phoneNumber,
        ),
    );
    if (umemePhoneInvalid.length > 0) {
      setPayments((prev) =>
        prev.map((p) => {
          const err =
            p.mode === 'UTILITIES'
              ? validateUtilityCustomerPhone(
                  normalizeUtilityProvider(p.utilityProvider),
                  p.phoneNumber,
                )
              : null;
          if (!err) return p;
          return {
            ...p,
            status: 'failed' as const,
            error: err,
            validated: true,
          };
        }),
      );
      toast.error(
        `${umemePhoneInvalid.length} UMEME payment(s) need a valid customer phone before validating.`,
      );
      return;
    }

    setValidating(true);

    try {
      // Don't send walletType to validation endpoint - it's only needed for processing
      const items: BulkTransactionItem[] = payments.map(p => {
        const utilProvNorm = normalizeUtilityProvider(p.utilityProvider);
        const isAirtimeUtil =
          p.mode === 'UTILITIES' && isAirtimeOrDataUtility(utilProvNorm);
        const resolvedMno =
          p.mode === 'WALLET_TO_MNO'
            ? p.mnoProvider || 'MTN'
            : isAirtimeUtil
              ? resolveAirtimeMnoProvider(p.mnoProvider, p.phoneNumber)
              : p.mnoProvider;

        const base: BulkTransactionItem = {
          itemId: p.itemId!,
          mode: p.mode!,
          amount: p.amount!,
          currency: p.currency!,
          description: p.description,
          phoneNumber:
            p.mode === 'WALLET_TO_MNO' && p.phoneNumber
              ? normalizePhoneToUganda(p.phoneNumber)
              : p.mode === 'UTILITIES' && p.phoneNumber
                ? normalizeUtilityBillPhone(
                    normalizeUtilityProvider(p.utilityProvider),
                    p.phoneNumber,
                  )
                : p.phoneNumber,
          ...(resolvedMno ? { mnoProvider: resolvedMno } : {}),
          recipientName: p.recipientName,
          customerName: p.customerName || p.recipientName,
          accountNumber: p.accountNumber,
          bankSortCode: p.bankSortCode,
          accountName: p.accountName,
          bankName: p.bankName,
          recipientPhone: p.recipientPhone
            ? normalizePhoneToUganda(p.recipientPhone)
            : p.recipientPhone,
          recipientPhoneNumber: p.recipientPhoneNumber
            ? normalizePhoneToUganda(p.recipientPhoneNumber)
            : p.recipientPhoneNumber,
        };

        // Include bill payment fields so backend can validate as BILL_PAYMENT
        if (p.mode === 'UTILITIES') {
          base.utilityProvider = normalizeUtilityProvider(p.utilityProvider);
          const utilPhone =
            p.phoneNumber
              ? normalizeUtilityBillPhone(
                  normalizeUtilityProvider(p.utilityProvider),
                  p.phoneNumber,
                )
              : p.phoneNumber;
          base.customerRef = p.customerRef || p.utilityAccountNumber || utilPhone;
          base.utilityAccountNumber = p.utilityAccountNumber || p.customerRef || utilPhone;
          base.area = p.area;
          base.phoneNumber = utilPhone;
          base.metadata = p.metadata;
        }

        return base;
      });

      console.log('🔍 Validating recipients:', items);
      
      const result = await validateBulkRecipients(items);
      
      console.log('✅ Validation result:', result);

      // Update payment statuses based on validation results
      const validationResults = result.results || [];
      
      const updatedPayments = payments.map(payment => {
        const itemResult = validationResults.find((r: any) => r.itemId === payment.itemId);
        if (itemResult) {
          return {
            ...payment,
            status: itemResult.isValid ? 'pending' as const : 'failed' as const,
            error: itemResult.error,
            validated: true,
            // Update with validated name if available
            recipientName: itemResult.accountName || payment.recipientName,
            customerName: itemResult.accountName || payment.customerName,
            accountName: itemResult.accountName || payment.accountName,
          };
        }
        return payment;
      });

      setPayments(updatedPayments);

      // After validation, estimate fees for all valid items so that
      // the \"Total queued amount\" reflects amount + charges.
      const feeResults = await Promise.allSettled(
        updatedPayments
          .filter(p => p.validated && p.status === 'pending' && p.amount && p.mode)
          .map(async (p) => {
            const utilPh =
              p.mode === 'UTILITIES' && isAirtimeOrDataUtility(normalizeUtilityProvider(p.utilityProvider)) && p.phoneNumber
                ? normalizePhoneToUganda(p.phoneNumber)
                : p.phoneNumber;
            const feeAirtimeMno =
              p.mode === 'UTILITIES' &&
              isAirtimeOrDataUtility(normalizeUtilityProvider(p.utilityProvider))
                ? resolveAirtimeMnoProvider(p.mnoProvider, p.phoneNumber)
                : p.mode === 'WALLET_TO_MNO'
                  ? p.mnoProvider || 'MTN'
                  : p.mnoProvider;

            const single: SinglePaymentDto = {
              mode: p.mode as SinglePaymentDto['mode'],
              amount: p.amount as number,
              currency: p.currency || 'UGX',
              walletType: 'BUSINESS',
              userId: (session?.user as any)?.id,
              phoneNumber: utilPh,
              ...(feeAirtimeMno ? { mnoProvider: feeAirtimeMno } : {}),
              recipientName: p.recipientName,
              accountNumber: p.accountNumber,
              bankSortCode: p.bankSortCode,
              bankName: p.bankName,
              accountName: p.accountName,
              recipientPhoneNumber: p.recipientPhoneNumber,
              recipientUserId: p.recipientUserId,
              utilityProvider: normalizeUtilityProvider(p.utilityProvider),
              utilityAccountNumber: p.utilityAccountNumber || p.customerRef || utilPh,
              customerRef: p.customerRef || p.utilityAccountNumber || utilPh,
              area: p.area,
              metadata: p.metadata,
            };

            const validation = await validateTransaction(single);
            return {
              paymentId: p.id,
              itemId: p.itemId,
              feePreview: validation.feePreview,
            };
          })
      );

      const feesById = new Map<string, { fee?: number; netAmount?: number }>();
      for (const r of feeResults) {
        if (r.status === 'fulfilled' && r.value.feePreview) {
          feesById.set(r.value.paymentId, {
            fee: r.value.feePreview.totalFee,
            netAmount: r.value.feePreview.netAmount,
          });
        }
      }

      if (feesById.size > 0) {
        setPayments(prev =>
          prev.map(p => {
            const feeInfo = feesById.get(p.id);
            if (!feeInfo) return p;
            return {
              ...p,
              estimatedFee: feeInfo.fee,
              estimatedNetAmount: feeInfo.netAmount,
            };
          }),
        );
      }

      // Show summary toast
      if (result.validItems === result.totalItems) {
        toast.success(`✅ All ${result.validItems} recipients validated successfully!`);
      } else if (result.validItems > 0) {
        toast.warning(`⚠️ ${result.validItems} valid, ${result.invalidItems} invalid`);
      } else {
        toast.error(`❌ All ${result.invalidItems} recipients failed validation`);
      }

    } catch (error: any) {
      console.error('❌ Bulk validation error:', error);
      toast.error(error.message || 'Failed to validate recipients');
    } finally {
      setValidating(false);
    }
  };

  // Enhanced polling mechanism for bulk transaction status
  const pollBulkTransactionStatus = async (bulkTransactionId: string) => {
    const maxAttempts = 120; // 10 minutes max (increased from 5 minutes)
    const pollInterval = 3000; // Poll every 3 seconds (reduced from 5 seconds)
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    const poll = async () => {
      try {
        attempts++;
        console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} for bulk transaction ${bulkTransactionId}`);
        
        const status = await getBulkTransactionStatus(bulkTransactionId);
        consecutiveErrors = 0; // Reset error counter on successful poll

        console.log('📊 Bulk transaction status:', {
          status: status.status,
          total: status.totalTransactions || status.totalItems || 0,
          successful: status.successfulTransactions || status.successfulItems || 0,
          failed: status.failedTransactions || status.failedItems || 0,
          pending: status.pendingTransactions || status.pendingItems || 0,
        });

        // Update progress stats
        const successCount = status.successfulTransactions || status.successfulItems || 0;
        const failCount = status.failedTransactions || status.failedItems || 0;
        const pendingCount = status.pendingTransactions || status.pendingItems || 0;
        const totalCount = status.totalTransactions || status.totalItems || payments.length;
        const processed = successCount + failCount;
        
        setProgressStats({
          total: totalCount,
          successful: successCount,
          failed: failCount,
          pending: pendingCount,
          percentage: Math.round((processed / totalCount) * 100)
        });
        
        // Update individual payment statuses
        const transactionResults = status.transactionResults || status.results || [];
        const updatedPayments = payments.map(payment => {
          const itemResult = transactionResults.find((r: any) => r.itemId === payment.itemId);
          if (itemResult) {
            return {
              ...payment,
              status: itemResult.status?.toLowerCase() || 'pending' as any,
              error: itemResult.errorMessage || itemResult.error,
            };
          }
          return payment;
        });
        setPayments(updatedPayments);

        // Check for completion
        if (status.status === 'SUCCESS' || status.status === 'FAILED' || status.status === 'PARTIAL_SUCCESS' || status.status === 'COMPLETED') {
          setBulkTransactionId(null);
          setProcessing(false);
          
          // Show final summary toast
          if (successCount === totalCount) {
            toast.success(`🎉 All ${successCount} payments completed successfully!`);
          } else if (successCount > 0) {
            toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed`);
          } else {
            toast.error(`❌ All ${failCount} payments failed`);
          }
          
          console.log('✅ Bulk transaction completed:', {
            status: status.status,
            successful: successCount,
            failed: failCount,
            total: totalCount
          });
          return;
        }

        // Continue polling if not completed and under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          setBulkTransactionId(null);
          setProcessing(false);
          toast.error('⏰ Bulk payment polling timeout - please check status manually');
          console.warn('⚠️ Bulk transaction polling timeout after', maxAttempts, 'attempts');
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ Error polling bulk transaction status (attempt ${attempts}, consecutive errors: ${consecutiveErrors}):`, error);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setBulkTransactionId(null);
          setProcessing(false);
          toast.error('❌ Too many polling errors - please check status manually');
          console.error('❌ Stopping polling due to consecutive errors:', consecutiveErrors);
          return;
        }
        
        if (attempts < maxAttempts) {
          // Exponential backoff for errors
          const backoffDelay = Math.min(pollInterval * Math.pow(2, consecutiveErrors - 1), 30000);
          setTimeout(poll, backoffDelay);
        } else {
          setBulkTransactionId(null);
          setProcessing(false);
          toast.error('❌ Failed to get bulk transaction status');
        }
      }
    };

    // Start polling after 2 seconds
    setTimeout(poll, 2000);
  };

  // Backend-accepted transaction modes (must match exactly, no spaces)
  const VALID_MODES = [
    'WALLET_TO_MNO', 'WALLET_TOPUP_PULL', 'MNO_TO_WALLET',
    'WALLET_TO_BANK', 'WALLET_TO_INTERNATIONAL_BANK', 'UTILITIES',
    'WALLET_TO_MERCHANT', 'WALLET_TO_INTERNAL_MERCHANT', 'WALLET_TO_EXTERNAL_MERCHANT',
    'MERCHANT_WITHDRAWAL', 'MERCHANT_TO_WALLET',
  ] as const;

  const normalizeMode = (raw: unknown): (typeof VALID_MODES)[number] | null => {
    const s = (raw != null && raw !== '') ? String(raw).trim() : '';
    if (!s) return null;
    const upper = s.toUpperCase();
    return VALID_MODES.includes(upper as any) ? (upper as (typeof VALID_MODES)[number]) : null;
  };

  /** Normalize Excel row keys (trim) so "Transaction Mode " matches "Transaction Mode" */
  const normalizeRowKeys = (row: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(row)) {
      const trimmed = k.trim();
      if (trimmed) out[trimmed] = row[k];
    }
    return out;
  };

  const getValidMnoProvider = (provider: string | undefined): string => {
    const validProviders = ['MTN', 'Airtel'];
    if (provider) {
      const normalizedProvider = String(provider).trim();
      if (validProviders.includes(normalizedProvider)) return normalizedProvider;
      const upper = normalizedProvider.toUpperCase();
      if (upper === 'MTN') return 'MTN';
      if (upper === 'AIRTEL') return 'Airtel';
    }
    return 'MTN';
  };

  const handleProcessBulk = async () => {
    if (payments.length === 0) {
      toast.error('No payments to process');
      return;
    }

    const userId = (session?.user as any)?.id;
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setProcessing(true);

    console.log('📋 Payments array before processing:', payments);
    console.log('📋 MERCHANT_TO_WALLET payments:', payments.filter(p => p.mode === 'MERCHANT_TO_WALLET'));

    try {
      // Prepare bulk transaction request
      const bulkRequest = {
        userId,
        channel: 'MERCHANT_PORTAL', // ✅ Set channel for metrics tracking (matches single payment)
        transactions: payments.map(p => {
          // Build transaction object based on mode
          const transaction: any = {
            itemId: p.itemId!,
            mode: p.mode!,
            amount: p.amount!,
            currency: p.currency!,
            description: p.description,
            reference: p.reference,
            walletType: 'BUSINESS' as 'BUSINESS', // ✅ Always use BUSINESS (backend routes to correct flavour)
            // Surface merchantCode both at top-level and inside metadata so backend
            // bulk processors can consistently route to the correct disbursement wallet.
            merchantCode: merchantCodeForRequest,
            metadata: {
              ...(p.metadata || {}),
              merchantCode: merchantCodeForRequest,
            },
          };

          // Add fields based on mode
          if (p.mode === 'WALLET_TO_MNO') {
            transaction.phoneNumber = normalizePhoneToUganda(p.phoneNumber || '');
            transaction.mnoProvider = p.mnoProvider || 'MTN';
            transaction.recipientName = p.recipientName;
          } else if (p.mode === 'WALLET_TO_BANK') {
            transaction.accountNumber = p.accountNumber;
            transaction.bankSortCode = p.bankSortCode;
            transaction.bankName = p.bankName;
            transaction.accountName = p.accountName;
            transaction.swiftCode = p.swiftCode;
          } else if (p.mode === 'MERCHANT_TO_WALLET') {
            // For MERCHANT_TO_WALLET, only send recipientPhoneNumber, not recipientPhone
            const rawPhone = p.recipientPhoneNumber || p.recipientPhone;
            transaction.recipientPhoneNumber = normalizePhoneToUganda(rawPhone || '');
            transaction.recipientUserId = p.recipientUserId;
          } else if (p.mode === 'UTILITIES') {
            // Bulk bill payment fields
            transaction.utilityProvider = normalizeUtilityProvider(p.utilityProvider);
            const pnorm = p.phoneNumber
              ? normalizeUtilityBillPhone(
                  normalizeUtilityProvider(p.utilityProvider),
                  p.phoneNumber,
                )
              : p.phoneNumber;
            transaction.customerRef = p.customerRef || p.utilityAccountNumber || pnorm;
            transaction.utilityAccountNumber = p.utilityAccountNumber || p.customerRef || pnorm;
            const areaRaw = p.area;
            if (areaRaw !== undefined && areaRaw !== null && String(areaRaw).trim() !== '') {
              transaction.area = String(areaRaw).trim();
            }
            transaction.phoneNumber = pnorm;
            const billName = String(
              p.recipientName || p.customerName || p.accountName || '',
            ).trim();
            if (billName) {
              transaction.recipientName = billName;
              transaction.customerName = billName;
              transaction.metadata = {
                ...(transaction.metadata || {}),
                customerName: billName,
              };
            }
            if (isAirtimeOrDataUtility(normalizeUtilityProvider(p.utilityProvider))) {
              const network = resolveAirtimeMnoProvider(p.mnoProvider, p.phoneNumber);
              if (network) transaction.mnoProvider = network;
            }
          } else {
            // Other modes
            transaction.phoneNumber = p.phoneNumber ? normalizePhoneToUganda(p.phoneNumber) : p.phoneNumber;
            transaction.mnoProvider = p.mnoProvider || 'MTN';
            transaction.recipientName = p.recipientName;
            transaction.accountNumber = p.accountNumber;
            transaction.bankSortCode = p.bankSortCode;
            transaction.bankName = p.bankName;
            transaction.accountName = p.accountName;
            transaction.swiftCode = p.swiftCode;
            if (p.recipientPhoneNumber) {
              transaction.recipientPhoneNumber = normalizePhoneToUganda(p.recipientPhoneNumber);
            }
            if (p.recipientUserId) {
              transaction.recipientUserId = p.recipientUserId;
            }
          }

          console.log('📦 Built transaction object:', transaction);
          return transaction;
        }),
        description: bulkDescription || 'Bulk payment',
        reference: bulkReference || `BULK-${Date.now()}`,
        processInParallel: true,
        stopOnFirstFailure: false,
      };

      console.log('🚀 Processing bulk transaction async:', bulkRequest);
      console.log('🚀 Transaction items:', JSON.stringify(bulkRequest.transactions, null, 2));
      
      const result = await processBulkTransactionAsync(bulkRequest);
      
      console.log('✅ Bulk transaction queued:', result);

      setBulkTransactionId(result.bulkTransactionId);
      setProgressStats({
        total: payments.length,
        successful: 0,
        failed: 0,
        pending: payments.length,
        percentage: 0
      });
      
      toast.success(`🚀 Bulk payment queued! Processing ${payments.length} transactions in background.`);
      await pollBulkTransactionStatus(result.bulkTransactionId);

      // Update payment statuses based on results
      // Backend returns transactionResults, not results
      const transactionResults = result.transactionResults || result.results || [];
      
      const updatedPayments = payments.map(payment => {
        const itemResult = transactionResults.find((r: any) => r.itemId === payment.itemId);
        if (itemResult) {
          return {
            ...payment,
            status: itemResult.status?.toLowerCase() || 'pending' as any,
            error: itemResult.errorMessage || itemResult.error,
          };
        }
        return payment;
      });

      setPayments(updatedPayments);

      // Show summary toast (only if there are actual results)
      const successCount = result.successfulTransactions || result.successfulItems || 0;
      const failCount = result.failedTransactions || result.failedItems || 0;
      const totalCount = result.totalTransactions || result.totalItems || payments.length;
      
      if (successCount === totalCount && successCount > 0) {
        toast.success(`🎉 All ${successCount} payments completed successfully!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`⚠️ ${successCount} succeeded, ${failCount} failed`);
      } else if (failCount > 0) {
        toast.error(`❌ All ${failCount} payments failed`);
      }
      // Don't show toast if both counts are 0 (initial state)

      // Navigate to transactions page after bulk processing finishes
      router.push('/transactions');

    } catch (error: any) {
      console.error('❌ Bulk payment error:', error);
      toast.error(error.message || 'Failed to process bulk payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    console.log('📁 Uploading file:', file.name, 'Extension:', fileExtension);

    if (fileExtension === 'csv') {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const csvContent = evt.target?.result as string;
          if (!csvContent) {
            toast.error('Failed to read CSV file');
            return;
          }

          console.log('📄 CSV Content length:', csvContent.length);

          // Parse CSV - handle both \n and \r\n line endings
          const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
          console.log('📋 Total lines:', lines.length);

          if (lines.length < 2) {
            toast.error('CSV file is empty or has no data rows');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          console.log('📊 Headers:', headers);
          
          const data = lines.slice(1).map((line, lineIndex) => {
            // Simple CSV parser - split by comma but handle quotes
            const values: string[] = [];
            let currentValue = '';
            let insideQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue.trim().replace(/^"|"$/g, ''));

            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            console.log(`Row ${lineIndex + 1}:`, row);
            return row;
          });

          const phoneOrAccount = (r: any) =>
            r['Phone Number / Account Number'] || r['Phone Number'] || r['phoneNumber'] || r['phone'] || '';
          const mapCsvRow = (row: any) => {
            const rawMode = row['Transaction Mode'] || row['mode'] || row['Mode'];
            const mode = normalizeMode(rawMode);
            const utilProv = normalizeUtilityProvider(
              row['Utility Provider'] || row['utilityProvider'] || row['Biller'] || ''
            );
            return {
              mode,
              amount: row['Amount'] || row['Amount (UGX)'] || row['amount'],
              description: row['Description'] || row['description'] || row['Desc'],
              phoneNumber: phoneOrAccount(row),
              recipientName: row['Name'] || row['Recipient Name'] || row['recipientName'] || row['name'] || '',
              mnoProvider: row['Network'] || row['MNO Provider'] || row['mnoProvider'] || row['network'] || '',
              bankName: row['Bank Name'] || row['bankName'] || '',
              bankSortCode: row['Bank Sort Code'] || row['Bank Sort'] || row['bankSortCode'] || '',
              accountNumber: row['Account Number'] || row['accountNumber'] || phoneOrAccount(row),
              accountName: row['Account Name'] || row['accountName'] || row['Name'] || row['name'] || '',
              currency: row['Currency'] || row['currency'] || 'UGX',
              recipientPhone: row['Recipient Phone'] || row['recipientPhone'] || row['recipientPhoneNumber'] || '',
              utilityProvider: utilProv || undefined,
              customerRef: String(row['Customer Ref'] || row['customerRef'] || row['Account Ref'] || '').trim(),
              area: String(row['Area'] || row['area'] || '').trim(),
              dataQuantity: row['Data Quantity'] || row['dataQuantity'],
              dataUnit: row['Data Unit'] || row['dataUnit'],
              dataValidity: row['Data Validity'] || row['dataValidity'],
              dataProductName: row['Product Name'] || row['dataProductName'] || '',
            };
          };

          const mapped = data.map((row, i) => ({ ...mapCsvRow(row), _sourceIndex: i + 2 }));
          const unsupportedDataBundlesCount = mapped.filter(
            (r) => r.mode === 'UTILITIES' && r.utilityProvider === 'DATA_BUNDLES'
          ).length;
          const umemeMissingPhoneCount = mapped.filter(
            (r) =>
              r.mode === 'UTILITIES' &&
              isUmemeUtility(r.utilityProvider) &&
              validateUtilityCustomerPhone(r.utilityProvider, r.phoneNumber),
          ).length;
          const valid = mapped.filter(
            (r) =>
              r.amount &&
              Number(r.amount) > 0 &&
              r.mode != null &&
              !(r.mode === 'UTILITIES' && r.utilityProvider === 'DATA_BUNDLES') &&
              !(
                r.mode === 'UTILITIES' &&
                isUmemeUtility(r.utilityProvider) &&
                validateUtilityCustomerPhone(r.utilityProvider, r.phoneNumber)
              )
          );
          const skippedCount = mapped.length - valid.length;
          if (skippedCount > 0) {
            toast.warning(
              `Skipped ${skippedCount} row(s): missing amount or invalid Transaction Mode. Use exact values (e.g. WALLET_TO_MNO, WALLET_TO_BANK).`
            );
          }
          if (unsupportedDataBundlesCount > 0) {
            toast.warning(
              `Skipped ${unsupportedDataBundlesCount} data bundle row(s): merchant dashboard currently supports Airtime only for utility uploads.`
            );
          }
          if (umemeMissingPhoneCount > 0) {
            toast.warning(
              `Skipped ${umemeMissingPhoneCount} UMEME row(s): customer phone is required in the Phone Number column.`
            );
          }

          const newPayments: PaymentItem[] = valid.map((row, index) => {
            const mode = row.mode as any;
            const ph = row.phoneNumber ? String(row.phoneNumber).trim() : '';
            const airData =
              mode === 'UTILITIES' &&
              row.utilityProvider === 'AIRTIME';
            const normPh =
              airData && ph
                ? normalizePhoneToUganda(ph)
                : isUmemeUtility(row.utilityProvider) && ph
                  ? normalizePhoneToUganda(ph)
                  : ph;
            const mno =
              mode === 'UTILITIES' && airData
                ? resolveAirtimeMnoProvider(row.mnoProvider, normPh || ph)
                : getValidMnoProvider(row.mnoProvider);
            return {
              id: `upload-${Date.now()}-${index}`,
              itemId: `ITEM-${Date.now()}-${index}`,
              mode,
              amount: Number(row.amount),
              currency: row.currency || 'UGX',
              description: row.description || `Payment ${index + 1}`,
              phoneNumber: normPh || ph,
              ...(mno ? { mnoProvider: mno } : {}),
              recipientName: row.recipientName || '',
              accountNumber: row.accountNumber || '',
              bankSortCode: row.bankSortCode || '',
              bankName: row.bankName || '',
              accountName: row.accountName || '',
              recipientPhone: row.recipientPhone || '',
              recipientPhoneNumber: row.recipientPhone || row.phoneNumber || '',
              ...(mode === 'UTILITIES'
                ? {
                    utilityProvider: row.utilityProvider,
                    customerRef: airData ? normPh : row.customerRef || undefined,
                    utilityAccountNumber: airData ? normPh : row.customerRef || undefined,
                    area: row.area || undefined,
                  }
                : {}),
              status: 'pending' as const,
            };
          });

          console.log('✅ Parsed CSV payments:', newPayments);

          if (newPayments.length === 0) {
            toast.error(
              'No valid payment rows found in CSV. Use exact Transaction Mode values (e.g. WALLET_TO_MNO, WALLET_TO_BANK) and ensure Amount is present.'
            );
            return;
          }

          setPayments(prev => [...prev, ...newPayments]);
          toast.success(`✅ Uploaded ${newPayments.length} payments from CSV`);
        } catch (error: any) {
          console.error('❌ CSV parse error:', error);
          toast.error(`Failed to parse CSV: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read CSV file');
      };
      
      reader.readAsText(file);
    } else {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          if (!bstr) {
            toast.error('Failed to read Excel file');
            return;
          }

          const rawData = await readSheetFromBinaryString(bstr as string);
          const data = rawData.map(row => normalizeRowKeys(row));

          console.log('📊 Parsed Excel data:', data);
          console.log('📋 First row sample:', data[0]);

          const phoneOrAccount = (r: Record<string, unknown>) =>
            String(r['Phone Number / Account Number'] ?? r['Phone Number'] ?? r['phoneNumber'] ?? r['phone'] ?? '').trim();
          const mapRow = (row: Record<string, unknown>, _index: number) => {
            const rawMode = row['Transaction Mode'] ?? row['mode'] ?? row['Mode'];
            const mode = normalizeMode(rawMode);
            const utilProv = normalizeUtilityProvider(
              row['Utility Provider'] ?? row['utilityProvider'] ?? row['Biller'] ?? ''
            );
            return {
              mode,
              amount: row['Amount'] ?? row['Amount (UGX)'] ?? row['amount'],
              description: row['Description'] ?? row['description'] ?? row['Desc'],
              phoneNumber: phoneOrAccount(row),
              recipientName: String(row['Name'] ?? row['Recipient Name'] ?? row['recipientName'] ?? row['name'] ?? '').trim(),
              mnoProvider: String(row['Network'] ?? row['MNO Provider'] ?? row['mnoProvider'] ?? row['network'] ?? '').trim(),
              bankName: String(row['Bank Name'] ?? row['bankName'] ?? '').trim(),
              bankSortCode: String(row['Bank Sort Code'] ?? row['Bank Sort'] ?? row['bankSortCode'] ?? '').trim(),
              accountNumber: String(row['Account Number'] ?? row['accountNumber'] ?? '').trim() || phoneOrAccount(row),
              accountName: String(row['Account Name'] ?? row['accountName'] ?? row['Name'] ?? row['name'] ?? '').trim(),
              currency: String(row['Currency'] ?? row['currency'] ?? 'UGX').trim(),
              recipientPhone: String(row['Recipient Phone'] ?? row['recipientPhone'] ?? row['recipientPhoneNumber'] ?? '').trim(),
              utilityProvider: utilProv || undefined,
              customerRef: String(row['Customer Ref'] ?? row['customerRef'] ?? row['Account Ref'] ?? '').trim(),
              area: String(row['Area'] ?? row['area'] ?? '').trim(),
              dataQuantity: row['Data Quantity'] ?? row['dataQuantity'],
              dataUnit: row['Data Unit'] ?? row['dataUnit'],
              dataValidity: row['Data Validity'] ?? row['dataValidity'],
              dataProductName: row['Product Name'] ?? row['dataProductName'] ?? '',
            };
          };

          const mapped = data.map((row, i) => ({ ...mapRow(row, i), _sourceIndex: i + 2 }));
          const unsupportedDataBundlesCount = mapped.filter(
            (r) => r.mode === 'UTILITIES' && r.utilityProvider === 'DATA_BUNDLES'
          ).length;
          const umemeMissingPhoneCount = mapped.filter(
            (r) =>
              r.mode === 'UTILITIES' &&
              isUmemeUtility(r.utilityProvider) &&
              validateUtilityCustomerPhone(r.utilityProvider, r.phoneNumber),
          ).length;
          const valid = mapped.filter(r => {
            const amt = r.amount != null && r.amount !== '' ? Number(r.amount) : NaN;
            return (
              !Number.isNaN(amt) &&
              amt > 0 &&
              r.mode != null &&
              !(r.mode === 'UTILITIES' && r.utilityProvider === 'DATA_BUNDLES') &&
              !(
                r.mode === 'UTILITIES' &&
                isUmemeUtility(r.utilityProvider) &&
                validateUtilityCustomerPhone(r.utilityProvider, r.phoneNumber)
              )
            );
          });
          const skippedCount = mapped.length - valid.length;
          if (skippedCount > 0) {
            toast.warning(
              `Skipped ${skippedCount} row(s): missing amount or invalid Transaction Mode. Use exact values (e.g. WALLET_TO_MNO, WALLET_TO_BANK).`
            );
          }
          if (unsupportedDataBundlesCount > 0) {
            toast.warning(
              `Skipped ${unsupportedDataBundlesCount} data bundle row(s): merchant dashboard currently supports Airtime only for utility uploads.`
            );
          }
          if (umemeMissingPhoneCount > 0) {
            toast.warning(
              `Skipped ${umemeMissingPhoneCount} UMEME row(s): customer phone is required in the Phone Number column.`
            );
          }

          const newPayments: PaymentItem[] = valid.map((row, index) => {
            const desc = (row.description != null && row.description !== '')
              ? String(row.description).trim()
              : '';
            const mode = row.mode as any;
            const ph = row.phoneNumber ? String(row.phoneNumber).trim() : '';
            const airData =
              mode === 'UTILITIES' &&
              row.utilityProvider === 'AIRTIME';
            const normPh =
              airData && ph
                ? normalizePhoneToUganda(ph)
                : isUmemeUtility(row.utilityProvider) && ph
                  ? normalizePhoneToUganda(ph)
                  : ph;
            const mno =
              mode === 'UTILITIES' && airData
                ? resolveAirtimeMnoProvider(row.mnoProvider, normPh || ph)
                : getValidMnoProvider(row.mnoProvider);
            return {
              id: `upload-${Date.now()}-${index}`,
              itemId: `ITEM-${Date.now()}-${index}`,
              mode,
              amount: Number(row.amount),
              currency: row.currency || 'UGX',
              description: desc || `Payment ${index + 1}`,
              phoneNumber: normPh || ph,
              ...(mno ? { mnoProvider: mno } : {}),
              recipientName: row.recipientName || '',
              accountNumber: row.accountNumber || '',
              bankSortCode: row.bankSortCode || '',
              bankName: row.bankName || '',
              accountName: row.accountName || '',
              recipientPhone: row.recipientPhone || '',
              recipientPhoneNumber: row.recipientPhone || row.phoneNumber || '',
              ...(mode === 'UTILITIES'
                ? {
                    utilityProvider: row.utilityProvider,
                    customerRef: airData ? normPh : row.customerRef || undefined,
                    utilityAccountNumber: airData ? normPh : row.customerRef || undefined,
                    area: row.area || undefined,
                  }
                : {}),
              status: 'pending' as const,
            };
          });

          console.log('✅ Parsed Excel payments:', newPayments);

          if (newPayments.length === 0) {
            toast.error(
              'No valid payment rows found in Excel. Use exact Transaction Mode values (e.g. WALLET_TO_MNO, WALLET_TO_BANK) and ensure Amount is present.'
            );
            return;
          }

          setPayments(prev => [...prev, ...newPayments]);
          toast.success(`✅ Uploaded ${newPayments.length} payments from Excel`);
        } catch (error: any) {
          console.error('❌ Excel parse error:', error);
          toast.error(`Failed to parse Excel: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read Excel file');
      };
      
      reader.readAsBinaryString(file);
    }

    // Reset file input
    e.target.value = '';
  };

  const downloadTemplate = async (format: 'excel' | 'csv' = 'csv') => {
    const billColumns = {
      'Customer Ref': '',
      'Area': '',
    } as const;
    const templateData = [
      {
        'Transaction Mode': 'WALLET_TO_MNO',
        'Phone Number / Account Number': '256700111111',
        'Name': 'John Doe',
        'Amount': 50000,
        'Network': 'MTN',
        'Bank Name': '',
        'Bank Sort Code': '',
        'Utility Provider': '',
        'Description': 'Mobile money payment',
        'Currency': 'UGX',
        ...billColumns,
      },
      {
        'Transaction Mode': 'WALLET_TO_BANK',
        'Phone Number / Account Number': '1234567890',
        'Name': 'Jane Smith',
        'Amount': 100000,
        'Network': '',
        'Bank Name': 'Stanbic Bank',
        'Bank Sort Code': '040102',
        'Utility Provider': '',
        'Description': 'Bank transfer payment',
        'Currency': 'UGX',
        ...billColumns,
      },
      {
        'Transaction Mode': 'MERCHANT_TO_WALLET',
        'Phone Number / Account Number': '256700444444',
        'Name': 'Bob Wilson',
        'Amount': 25000,
        'Network': '',
        'Bank Name': '',
        'Bank Sort Code': '',
        'Utility Provider': '',
        'Description': 'Commission payment',
        'Currency': 'UGX',
        ...billColumns,
      },
      {
        'Transaction Mode': 'UTILITIES',
        'Phone Number / Account Number': '',
        'Name': '',
        'Amount': 100000,
        'Network': '',
        'Bank Name': '',
        'Bank Sort Code': '',
        'Description': 'URA bill payment (replace PRN and amount)',
        'Currency': 'UGX',
        'Utility Provider': URA_UTILITY_PROVIDER,
        'Customer Ref': 'REPLACE_WITH_VALID_PRN',
        'Area': '',
      },
      {
        'Transaction Mode': 'UTILITIES',
        'Phone Number / Account Number': '',
        'Name': '',
        'Amount': 25000,
        'Network': '',
        'Bank Name': '',
        'Bank Sort Code': '',
        'Description': 'NWSC water bill — Area must be exact (e.g. Kampala)',
        'Currency': 'UGX',
        'Utility Provider': 'NWSC',
        'Customer Ref': 'REPLACE_WITH_NWSC_ACCOUNT',
        'Area': 'Kampala',
      },
      {
        'Transaction Mode': 'UTILITIES',
        'Phone Number / Account Number': '256701234567',
        'Name': 'Airtime Recipient',
        'Amount': 15000,
        'Network': '',
        'Bank Name': '',
        'Bank Sort Code': '',
        'Utility Provider': 'AIRTIME',
        'Description': 'Airtime top up',
        'Currency': 'UGX',
      },
    ];

    if (format === 'csv') {
      // Generate CSV content
      const headers = ['Transaction Mode', 'Phone Number / Account Number', 'Name', 'Amount', 'Network', 'Bank Name', 'Bank Sort Code', 'Utility Provider', 'Description', 'Currency', 'Customer Ref', 'Area'];
      const csvContent = [
        headers.join(','),
        ...templateData.map(row => 
          headers.map(header => {
            const value = (row as any)[header] || '';
            // Escape commas and quotes in values
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        )
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'rukapay-bulk-payment-template.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('CSV template downloaded successfully');
    } else {
      // Generate Excel file (templateData is defined above)
      await writeWorkbookToFile('BulkPaymentTemplate', templateData, 'rukapay-bulk-payment-template.xlsx');
      toast.success('Excel template downloaded successfully');
    }
  };

  // Total queued debit from disbursement wallet (amount + estimated fees per item)
  const totalAmount = payments.reduce((sum, p) => {
    const base = p.amount || 0;
    const fee = p.estimatedFee || 0;
    return sum + base + fee;
  }, 0);
  const successCount = payments.filter(p => p.status === 'success').length;
  const failedCount = payments.filter(p => p.status === 'failed').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <TooltipProvider delayDuration={300}>
    <div key={currentMerchantCode ?? 'default'} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {liquidationOnlyMode ? (
          <div
            className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="font-medium">Liquidation-Only Mode is enabled</p>
              <p className="mt-1">
                Payments, bills, airtime, and bulk transfers are disabled. Use{' '}
                <a href="/liquidate" className="underline font-medium">
                  Liquidate
                </a>{' '}
                to send funds to your administrator-configured destination.
              </p>
            </div>
          </div>
        ) : session && currentMerchant && !canLiquidate ? (
          <div
            className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <p>
              Bulk disbursement features are not enabled for this merchant. You can still use this page for
              single payments and bill payment; queued bulk runs may be blocked until an administrator enables
              <span className="font-medium"> Bulk payments</span> or <span className="font-medium">Liquidation</span> in dashboard features.
            </p>
          </div>
        ) : null}
        {!liquidationOnlyMode && (
        <>
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#08163d] mb-2">Payments</h1>
              <p className="text-gray-600">Process single or multiple payments with various payment methods</p>
            </div>
            
            <Card className="md:w-80 bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-100">Disbursement balance</p>
                    <p className="text-2xl font-bold">
                      {disbursementBalance.toLocaleString()} UGX
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-200" />
                </div>
                <div className="pt-4 border-t border-purple-500/30 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[11px] text-purple-100 uppercase tracking-wide">
                      Total queued amount
                    </p>
                    <p className="text-sm font-semibold">
                      {totalAmount.toLocaleString()} UGX
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{payments.length} payments</p>
                    <p className="text-purple-100/90">{pendingCount} pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Progress Indicator Card */}
        {bulkTransactionId && processing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                Processing Bulk Payment
              </CardTitle>
              <CardDescription>
                Transaction ID: {bulkTransactionId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Progress</span>
                  <span className="font-bold text-blue-600">{progressStats.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressStats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Polling Status Indicator */}
              {bulkTransactionId && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Live monitoring active - Updates every 3 seconds</span>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                  <div className="text-2xl font-bold text-gray-800">{progressStats.total}</div>
                  <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{progressStats.successful}</div>
                  <div className="text-xs text-green-700 mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Success
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{progressStats.failed}</div>
                  <div className="text-xs text-red-700 mt-1 flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{progressStats.pending}</div>
                  <div className="text-xs text-yellow-700 mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </div>
                </div>
              </div>

              {/* Processing Info */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Processing in background</p>
                    <p className="text-xs text-gray-600">
                      Transactions are being processed asynchronously. You can leave this page and check back later.
                      The individual transaction statuses will update automatically every 5 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="bulk" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Payment</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Payment</TabsTrigger>
          </TabsList>

          {/* Single Payment Tab */}
          <TabsContent value="single" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Single Payment</CardTitle>
                <CardDescription>
                  Process a single payment transaction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Transaction Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Choose Transaction Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TRANSACTION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => handleSinglePaymentModeChange(type.value as SinglePaymentDto['mode'])}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            singlePayment.mode === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 ${type.color}`} />
                            <span className="font-medium text-gray-900">{type.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount (UGX)
                  </label>
                  <Input
                    type="number"
                    value={singlePayment.amount || ''}
                    onChange={(e) => handleSinglePaymentChange('amount', Number(e.target.value))}
                    placeholder="Enter amount"
                    className="w-full"
                  />
                </div>

                {/* Transaction Type Specific Fields */}
                {singlePayment.mode === 'WALLET_TO_MNO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <Input
                        value={singlePayment.phoneNumber || ''}
                        onChange={(e) => handleSinglePaymentChange('phoneNumber', e.target.value)}
                        placeholder="e.g., 0700000000 or 256700000000"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        MNO Provider
                      </label>
                      <select
                        value={singlePayment.mnoProvider || ''}
                        onChange={(e) => handleSinglePaymentChange('mnoProvider', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Provider</option>
                        <option value="MTN">MTN</option>
                        <option value="Airtel">Airtel</option>
                      </select>
                      {/* Helper text removed – network info is clear from the select */}
                    </div>
                  </div>
                )}

                {singlePayment.mode === 'WALLET_TO_BANK' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bank Name
                        </label>
                        <select
                          value={singlePayment.bankName || ''}
                          onChange={(e) => {
                            const selectedBank = UGANDAN_BANKS.find(b => b.bankName === e.target.value);
                            handleSinglePaymentChange('bankName', e.target.value);
                            // CRITICAL: Also store bankSortCode when bank is selected
                            if (selectedBank) {
                              handleSinglePaymentChange('bankSortCode', selectedBank.bankSortCode);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select Bank</option>
                          {UGANDAN_BANKS.map((bank) => (
                            <option key={bank.bankSortCode} value={bank.bankName}>
                              {bank.bankName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Account Number
                        </label>
                        <Input
                          value={singlePayment.accountNumber || ''}
                          onChange={(e) => handleSinglePaymentChange('accountNumber', e.target.value)}
                          placeholder="Enter account number"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Account Holder Name
                      </label>
                      <Input
                        value={singlePayment.accountName || ''}
                        onChange={(e) => handleSinglePaymentChange('accountName', e.target.value)}
                        placeholder="Enter account holder name"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {singlePayment.mode === 'MERCHANT_TO_WALLET' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recipient Phone Number
                    </label>
                    <Input
                      value={singlePayment.recipientPhoneNumber || ''}
                      onChange={(e) => handleSinglePaymentChange('recipientPhoneNumber', e.target.value)}
                      placeholder="e.g., +256700000000"
                      className="w-full"
                    />
                  </div>
                )}

                {/* Single Bill Payment — utilities vs airtime / mobile data (Africa&apos;s Talking) */}
                {singlePayment.mode === 'UTILITIES' && (
                  <div className="space-y-4">
                    <Tabs
                      value={singleBillSubTab}
                      onValueChange={(v) => {
                        const t = v as BillPaymentSubTab;
                        setSingleBillSubTab(t);
                        if (t === 'utilities') {
                          handleSinglePaymentChange('utilityProvider', '');
                          handleSinglePaymentChange('phoneNumber', '');
                          handleSinglePaymentChange('metadata', undefined);
                          handleSinglePaymentChange('area', undefined);
                        } else {
                          setSinglePayment((prev) => ({
                            ...prev,
                            utilityProvider: 'AIRTIME',
                            customerRef: '',
                            metadata: undefined,
                            mnoProvider: undefined,
                            area: undefined,
                          }));
                        }
                      }}
                    >
                      <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="utilities">Utilities</TabsTrigger>
                        <TabsTrigger value="airtime_data">Airtime</TabsTrigger>
                      </TabsList>
                      <TabsContent value="utilities" className="space-y-4 pt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Biller / Provider
                            </label>
                            <Select
                              value={singlePayment.utilityProvider || undefined}
                              onValueChange={(v) =>
                                handleSinglePaymentChange(
                                  'utilityProvider',
                                  v === BILLER_SELECT_NONE ? '' : v
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select biller" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={BILLER_SELECT_NONE}>Select biller</SelectItem>
                                <SelectItem value="NWSC">NWSC (Water)</SelectItem>
                                <SelectItem value="UMEME">UMEME (Electricity)</SelectItem>
                                <SelectItem value="DSTV">DStv</SelectItem>
                                <SelectItem value="GOTV">GOtv</SelectItem>
                                <SelectItem value="YAKALAST">Yaka Last</SelectItem>
                                <SelectItem value="SCHOOL-FEES">School Fees</SelectItem>
                                <SelectItem value={URA_UTILITY_PROVIDER}>URA (Tax / e-services)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {isUraUtility(singlePayment.utilityProvider)
                                ? 'PRN (Payment Reference Number)'
                                : 'Customer / Account Reference'}
                            </label>
                            <Input
                              value={singlePayment.customerRef || ''}
                              onChange={(e) => handleSinglePaymentChange('customerRef', e.target.value)}
                              placeholder={
                                isUraUtility(singlePayment.utilityProvider)
                                  ? 'URA-issued PRN'
                                  : 'Meter / account / student number'
                              }
                              className="w-full"
                            />
                            {isUraUtility(singlePayment.utilityProvider) && (
                              <p className="text-xs text-gray-600 mt-1">
                                Enter the PRN from URA. The payment amount should match the PRN; the backend will reject mismatches.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {singleAreaConfig.visible && (
                            <div>
                              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                                {singleAreaConfig.label}
                                {singleAreaConfig.required ? (
                                  <span className="text-red-500">*</span>
                                ) : (
                                  <span className="font-normal text-gray-500">(optional)</span>
                                )}
                                <FieldHint>{singleAreaConfig.helpText}</FieldHint>
                              </label>
                              {singleAreaConfig.mode === 'select' ? (
                                <Select
                                  value={singlePayment.area || undefined}
                                  onValueChange={(v) => handleSinglePaymentChange('area', v)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={singleAreaConfig.placeholder} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(singleAreaConfig.options ?? NWSC_AREAS).map((area) => (
                                      <SelectItem key={area} value={area}>
                                        {area}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={singlePayment.area || ''}
                                  onChange={(e) => handleSinglePaymentChange('area', e.target.value)}
                                  placeholder={singleAreaConfig.placeholder}
                                  className="w-full"
                                />
                              )}
                              {singleAreaConfig.helperLine && (
                                <p className="text-xs text-gray-600 mt-1">{singleAreaConfig.helperLine}</p>
                              )}
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {utilityRequiresCustomerPhone(singlePayment.utilityProvider)
                                ? 'Customer Phone'
                                : 'Customer Phone (Optional)'}
                              {utilityRequiresCustomerPhone(singlePayment.utilityProvider) && (
                                <span className="text-red-500"> *</span>
                              )}
                            </label>
                            <Input
                              value={singlePayment.phoneNumber || ''}
                              onChange={(e) => handleSinglePaymentChange('phoneNumber', e.target.value)}
                              placeholder="e.g., 0700123456"
                              className="w-full"
                            />
                            {utilityRequiresCustomerPhone(singlePayment.utilityProvider) && (
                              <p className="text-xs text-gray-600 mt-1">
                                Required for UMEME meter validation and customer name lookup.
                              </p>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="airtime_data" className="space-y-4 pt-3">
                        <p className="text-xs text-gray-600">
                          Sent via Africa&apos;s Talking (airtime). Amount is the wallet debit amount.
                        </p>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                          <select
                            value={singlePayment.utilityProvider || 'AIRTIME'}
                            onChange={(e) => handleSinglePaymentChange('utilityProvider', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="AIRTIME">Airtime</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Recipient phone <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={singlePayment.phoneNumber || ''}
                              onChange={(e) => handleSingleAirtimePhoneChange(e.target.value)}
                              placeholder="+256… or 07…"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Mobile network <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={singlePayment.mnoProvider || ''}
                              onChange={(e) => handleSinglePaymentChange('mnoProvider', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="">Select network</option>
                              <option value="MTN">MTN</option>
                              <option value="Airtel">Airtel</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Auto-filled from phone prefix when possible; confirm before paying.
                            </p>
                          </div>
                        </div>
                        {false && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bundle quantity <span className="text-red-500">*</span>
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={singlePayment.metadata?.dataQuantity ?? ''}
                                onChange={(e) =>
                                  setSinglePayment((prev) => ({
                                    ...prev,
                                    metadata: {
                                      ...prev.metadata,
                                      dataQuantity: e.target.value === '' ? undefined : Number(e.target.value),
                                    },
                                  }))
                                }
                                placeholder="e.g. 50"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                              <select
                                value={singlePayment.metadata?.dataUnit || 'MB'}
                                onChange={(e) =>
                                  setSinglePayment((prev) => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, dataUnit: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="MB">MB</option>
                                <option value="GB">GB</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Validity</label>
                              <select
                                value={singlePayment.metadata?.dataValidity || 'Week'}
                                onChange={(e) =>
                                  setSinglePayment((prev) => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, dataValidity: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="Day">Day</option>
                                <option value="Week">Week</option>
                                <option value="BiWeek">BiWeek</option>
                                <option value="Month">Month</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Product name (AT)
                              </label>
                              <Input
                                value={singlePayment.metadata?.dataProductName || ''}
                                onChange={(e) =>
                                  setSinglePayment((prev) => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, dataProductName: e.target.value },
                                  }))
                                }
                                placeholder="Mobile Data"
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <Input
                    value={singlePayment.description || ''}
                    onChange={(e) => handleSinglePaymentChange('description', e.target.value)}
                    placeholder="Enter transaction description"
                    className="w-full"
                  />
                </div>

          {/* Validation Info */}
          {validationInfo && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-green-900 mb-2">Validation Result</h4>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {validationInfo.recipientName && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Recipient:</span>
                      <span className="font-medium text-green-800">{validationInfo.recipientName}</span>
                    </div>
                  )}
                  {validationInfo.partnerName && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Partner:</span>
                      <span className="font-medium text-green-800">{validationInfo.partnerName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${validationInfo.isValid ? 'text-green-800' : 'text-red-600'}`}>
                      {validationInfo.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee Preview */}
          {feePreview && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-blue-900 mb-2">Fee Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium ml-2">UGX {singlePayment.amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-medium ml-2">UGX {feePreview.totalFee.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Amount:</span>
                    <span className="font-medium ml-2">UGX {feePreview.netAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tariff:</span>
                    <span className="font-medium ml-2">{feePreview.tariffName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={previewSinglePaymentFees}
                    variant="outline"
                    disabled={!singlePayment.amount || singlePayment.amount <= 0 || singlePaymentLoading || validatingTransaction}
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                  >
                    {validatingTransaction ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Validate Transaction
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={processSinglePaymentTransaction}
                    disabled={!validationInfo?.isValid || singlePaymentLoading || !singlePayment.amount || singlePayment.amount <= 0}
                    className={`flex items-center gap-2 ${!validationInfo?.isValid ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {singlePaymentLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : !validationInfo?.isValid ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        Validate First
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Process Payment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Payment Tab */}
          <TabsContent value="bulk" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bulk Description
                </label>
                <Input
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                  placeholder="e.g., January 2025 Payroll"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference (Optional)
                </label>
                <Input
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  placeholder="e.g., PAYROLL-JAN-2025"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
          
          <Button
            variant="outline"
            onClick={() => downloadTemplate('csv')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => downloadTemplate('excel')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          <div className="ml-auto flex gap-2">
            <Button
              onClick={handleValidateAll}
              disabled={payments.length === 0 || validating || processing}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validate All
                </>
              )}
            </Button>

            {/* Manual Status Check Button */}
            {bulkTransactionId && (
              <Button
                onClick={async () => {
                  try {
                    const status = await getBulkTransactionStatus(bulkTransactionId);
                    console.log('📊 Manual status check:', status);
                    
                    // Update progress stats
                    const successCount = status.successfulTransactions || status.successfulItems || 0;
                    const failCount = status.failedTransactions || status.failedItems || 0;
                    const pendingCount = status.pendingTransactions || status.pendingItems || 0;
                    const totalCount = status.totalTransactions || status.totalItems || payments.length;
                    const processed = successCount + failCount;
                    
                    setProgressStats({
                      total: totalCount,
                      successful: successCount,
                      failed: failCount,
                      pending: pendingCount,
                      percentage: Math.round((processed / totalCount) * 100)
                    });
                    
                    // Update individual payment statuses
                    const transactionResults = status.transactionResults || status.results || [];
                    const updatedPayments = payments.map(payment => {
                      const itemResult = transactionResults.find((r: any) => r.itemId === payment.itemId);
                      if (itemResult) {
                        return {
                          ...payment,
                          status: itemResult.status?.toLowerCase() || 'pending' as any,
                          error: itemResult.errorMessage || itemResult.error,
                        };
                      }
                      return payment;
                    });
                    setPayments(updatedPayments);
                    
                    toast.success('✅ Status updated successfully');
                  } catch (error) {
                    console.error('❌ Error checking status:', error);
                    toast.error('❌ Failed to check status');
                  }
                }}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            )}

            <Button
              onClick={handleProcessBulk}
              disabled={
                payments.length === 0 || 
                processing || 
                validating || 
                !payments.every(p => p.validated) // ✅ Disable until all are validated
              }
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing {payments.length} Payments...
                </>
              ) : !payments.every(p => p.validated) && payments.length > 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Validate First ({payments.filter(p => !p.validated).length} unvalidated)
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Process All ({payments.length})
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-600 flex items-start gap-1.5 max-w-3xl">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" aria-hidden />
          <span>
            For NWSC (water) rows in CSV/Excel, fill the <span className="font-medium">Area</span> column with one of:{' '}
            {NWSC_AREAS.join(', ')}. Spelling and capitalisation must match exactly. Leave Area blank for URA and most other billers.
          </span>
        </p>
        </div>

        {/* Add Payment Form */}
        {showAddForm && (
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? 'Edit Payment' : 'Add New Payment'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Update the payment details' : 'Fill in the details for a single payment'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Transaction Type */}
                <div className="col-span-full">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {TRANSACTION_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              mode: type.value as any,
                              ...(type.value === 'UTILITIES'
                                ? { mnoProvider: undefined }
                                : type.value === 'WALLET_TO_MNO' && !prev.mnoProvider
                                  ? { mnoProvider: 'MTN' }
                                  : {}),
                            }))
                          }
                          className={`p-4 border-2 rounded-lg transition-all ${
                            formData.mode === type.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mx-auto mb-2 ${
                            formData.mode === type.value ? type.color : 'text-gray-400'
                          }`} />
                          <p className="text-xs font-medium text-center">{type.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Money Fields */}
                {formData.mode === 'WALLET_TO_MNO' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.phoneNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="e.g., 0700123456 or 256700123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Network <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.mnoProvider || 'MTN'}
                        onChange={(e) => setFormData(prev => ({ ...prev, mnoProvider: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="MTN">MTN</option>
                        <option value="Airtel">Airtel</option>
                      </select>
                      {/* Helper text removed – network info is clear from the select */}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Recipient Name
                      </label>
                      <Input
                        value={formData.recipientName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                  </>
                )}

                {/* Bank Transfer Fields */}
                {formData.mode === 'WALLET_TO_BANK' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.accountNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bank <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.bankSortCode || ''}
                        onChange={(e) => {
                          const bank = UGANDAN_BANKS.find(b => b.bankSortCode === e.target.value);
                          setFormData(prev => ({ ...prev, bankSortCode: e.target.value, bankName: bank?.bankName }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Bank</option>
                        {UGANDAN_BANKS.map(bank => (
                          <option key={bank.bankSortCode} value={bank.bankSortCode}>{bank.bankName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.accountName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                        placeholder="Jane Smith"
                      />
                    </div>
                  </>
                )}

                {/* Wallet Transfer Fields */}
                {formData.mode === 'MERCHANT_TO_WALLET' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Recipient Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.recipientPhoneNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipientPhoneNumber: e.target.value }))}
                        placeholder="e.g., 0700123456 or 256700123456"
                      />
                      <p className="text-xs text-green-600 mt-1">
                        💰 FREE! No fees for merchants sending to individuals
                      </p>
                    </div>
                  </>
                )}

                {/* Bill Payment Fields — queue / bulk form */}
                {formData.mode === 'UTILITIES' && (
                  <div className="col-span-full space-y-4">
                    <Tabs
                      value={bulkBillSubTab}
                      onValueChange={(v) => {
                        const t = v as BillPaymentSubTab;
                        setBulkBillSubTab(t);
                        if (t === 'utilities') {
                          setFormData((prev) => ({
                            ...prev,
                            utilityProvider: '',
                            phoneNumber: '',
                            metadata: undefined,
                            area: undefined,
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            utilityProvider: 'AIRTIME',
                            customerRef: '',
                            utilityAccountNumber: '',
                            metadata: undefined,
                            mnoProvider: undefined,
                            area: undefined,
                          }));
                        }
                      }}
                    >
                      <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="utilities">Utilities</TabsTrigger>
                        <TabsTrigger value="airtime_data">Airtime</TabsTrigger>
                      </TabsList>
                      <TabsContent value="utilities" className="space-y-4 pt-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Biller / Provider <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={formData.utilityProvider || undefined}
                            onValueChange={(v) => {
                              const nextProvider = v === BILLER_SELECT_NONE ? '' : v;
                              const nextConfig = getAreaFieldConfig(nextProvider);
                              setFormData((prev) => {
                                const keepArea =
                                  nextConfig.visible &&
                                  (nextConfig.mode !== 'select' ||
                                    (prev.area && nextConfig.options?.includes(prev.area)));
                                return {
                                  ...prev,
                                  utilityProvider: nextProvider,
                                  area: keepArea ? prev.area : undefined,
                                };
                              });
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select biller" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={BILLER_SELECT_NONE}>Select biller</SelectItem>
                              <SelectItem value="NWSC">NWSC (Water)</SelectItem>
                              <SelectItem value="UMEME">UMEME (Electricity)</SelectItem>
                              <SelectItem value="DSTV">DStv</SelectItem>
                              <SelectItem value="GOTV">GOtv</SelectItem>
                              <SelectItem value="YAKALAST">Yaka Last</SelectItem>
                              <SelectItem value="SCHOOL-FEES">School Fees</SelectItem>
                              <SelectItem value={URA_UTILITY_PROVIDER}>URA (Tax / e-services)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isUraUtility(formData.utilityProvider)
                              ? 'PRN (Payment Reference Number)'
                              : 'Customer / Account Reference'}{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={formData.customerRef || formData.utilityAccountNumber || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                customerRef: e.target.value,
                                utilityAccountNumber: e.target.value,
                              }))
                            }
                            placeholder={
                              isUraUtility(formData.utilityProvider)
                                ? 'URA-issued PRN'
                                : 'Meter / account / student number'
                            }
                          />
                          {isUraUtility(formData.utilityProvider) && (
                            <p className="text-xs text-gray-600 mt-1">
                              Amount should match the PRN; the backend will reject mismatches.
                            </p>
                          )}
                        </div>
                        {bulkAreaConfig.visible && (
                          <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                              {bulkAreaConfig.label}
                              {bulkAreaConfig.required ? (
                                <span className="text-red-500">*</span>
                              ) : (
                                <span className="font-normal text-gray-500">(optional)</span>
                              )}
                              <FieldHint>{bulkAreaConfig.helpText}</FieldHint>
                            </label>
                            {bulkAreaConfig.mode === 'select' ? (
                              <Select
                                value={formData.area || undefined}
                                onValueChange={(v) =>
                                  setFormData((prev) => ({ ...prev, area: v }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={bulkAreaConfig.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(bulkAreaConfig.options ?? NWSC_AREAS).map((area) => (
                                    <SelectItem key={area} value={area}>
                                      {area}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={formData.area || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, area: e.target.value }))
                                }
                                placeholder={bulkAreaConfig.placeholder}
                              />
                            )}
                            {bulkAreaConfig.helperLine && (
                              <p className="text-xs text-gray-600 mt-1">{bulkAreaConfig.helperLine}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {utilityRequiresCustomerPhone(formData.utilityProvider)
                              ? 'Customer Phone'
                              : 'Customer Phone (Optional)'}
                            {utilityRequiresCustomerPhone(formData.utilityProvider) && (
                              <span className="text-red-500"> *</span>
                            )}
                          </label>
                          <Input
                            value={formData.phoneNumber || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                            placeholder="e.g., 0700123456"
                          />
                          {utilityRequiresCustomerPhone(formData.utilityProvider) && (
                            <p className="text-xs text-gray-600 mt-1">
                              Required for UMEME meter validation and customer name lookup.
                            </p>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="airtime_data" className="space-y-4 pt-3">
                        <p className="text-xs text-gray-600">
                          Africa&apos;s Talking — for Excel/CSV use Transaction Mode <span className="font-mono">UTILITIES</span>,
                          Utility Provider <span className="font-mono">AIRTIME</span>, and recipient phone.
                        </p>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                          <select
                            value={formData.utilityProvider || 'AIRTIME'}
                            onChange={(e) => setFormData((prev) => ({ ...prev, utilityProvider: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="AIRTIME">Airtime</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Recipient phone <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={formData.phoneNumber || ''}
                            onChange={(e) => handleBulkAirtimePhoneChange(e.target.value)}
                            placeholder="+256… or 07…"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Mobile network <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.mnoProvider || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, mnoProvider: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select network</option>
                            <option value="MTN">MTN</option>
                            <option value="Airtel">Airtel</option>
                          </select>
                        </div>
                        {false && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bundle quantity <span className="text-red-500">*</span>
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={formData.metadata?.dataQuantity ?? ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    metadata: {
                                      ...prev.metadata,
                                      dataQuantity:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    },
                                  }))
                                }
                                placeholder="e.g. 50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                              <select
                                value={formData.metadata?.dataUnit || 'MB'}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, dataUnit: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="MB">MB</option>
                                <option value="GB">GB</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Validity</label>
                              <select
                                value={formData.metadata?.dataValidity || 'Week'}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, dataValidity: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                <option value="Day">Day</option>
                                <option value="Week">Week</option>
                                <option value="BiWeek">BiWeek</option>
                                <option value="Month">Month</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Product name (AT)
                              </label>
                              <Input
                                value={formData.metadata?.dataProductName || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    metadata: { ...prev.metadata, dataProductName: e.target.value },
                                  }))
                                }
                                placeholder="Mobile Data"
                              />
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}


                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount (UGX) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    placeholder="10000"
                    min={1000}
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-400">(Optional)</span>
                  </label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., January 2025 salary (auto-generated if empty)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💼 Payments will be deducted from your <span className="font-semibold">Disbursement wallet</span>
                  </p>
                </div>

                <div className="col-span-full flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddPayment}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingId ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Update Payment
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to List
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments List */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Queue</CardTitle>
                <CardDescription>
                  {payments.length === 0 
                    ? 'No payments added yet' 
                    : `${payments.length} payment${payments.length !== 1 ? 's' : ''} ready to process`
                  }
                </CardDescription>
              </div>
              
              {payments.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{successCount}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full">
                    <XCircle className="w-3 h-3" />
                    <span>{failedCount}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-700 rounded-full">
                    <Clock className="w-3 h-3" />
                    <span>{pendingCount}</span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No payments in queue</p>
                <p className="text-sm text-gray-400">Add payments manually or upload an Excel file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const typeInfo = TRANSACTION_TYPES.find(t => t.value === payment.mode);
                  const Icon = typeInfo?.icon || Phone;
                  
                  return (
                    <div
                      key={payment.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                        payment.status === 'processing' 
                          ? 'border-blue-300 bg-blue-50 animate-pulse' 
                          : payment.status === 'success'
                          ? 'border-green-200 bg-green-50'
                          : payment.status === 'failed'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-3 rounded-lg ${
                        payment.status === 'processing'
                          ? 'bg-blue-100'
                          : payment.status === 'success'
                          ? 'bg-green-100'
                          : payment.status === 'failed'
                          ? 'bg-red-100'
                          : typeInfo?.bg || 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          payment.status === 'processing'
                            ? 'text-blue-600'
                            : payment.status === 'success'
                            ? 'text-green-600'
                            : payment.status === 'failed'
                            ? 'text-red-600'
                            : typeInfo?.color || 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-medium">{typeInfo?.label}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Details</p>
                          <p className="text-sm font-medium">
                            {payment.mode === 'WALLET_TO_MNO' && payment.phoneNumber}
                            {payment.mode === 'WALLET_TO_BANK' && payment.accountNumber}
                            {payment.mode === 'MERCHANT_TO_WALLET' && (payment.recipientPhoneNumber || payment.recipientPhone)}
                            {payment.mode === 'UTILITIES' &&
                              (isAirtimeOrDataUtility(payment.utilityProvider)
                                ? payment.phoneNumber || payment.customerRef
                                : payment.customerRef)}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">
                              {payment.mode === 'UTILITIES'
                                ? `${payment.utilityProvider || ''}${payment.recipientName || payment.accountName || (isAirtimeOrDataUtility(payment.utilityProvider) && payment.phoneNumber) ? ' • ' : ''}${payment.recipientName || payment.accountName || (isAirtimeOrDataUtility(payment.utilityProvider) ? payment.phoneNumber : '') || ''}`
                                : (payment.recipientName || payment.accountName)}
                            </p>
                            {payment.validated && payment.status === 'pending' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                ✓ Validated
                              </span>
                            )}
                          </div>
                          {payment.mode === 'WALLET_TO_MNO' && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              {payment.mnoProvider === 'Airtel'
                                ? 'Airtel user'
                                : 'MTN user'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm font-bold">{payment.amount?.toLocaleString()} UGX</p>
                          <p className="text-xs text-gray-500">{typeInfo?.label || payment.mode}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <div className="flex items-center gap-1 mt-1">
                              {payment.status === 'success' && (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-600">Success</span>
                                </>
                              )}
                              {payment.status === 'failed' && (
                                <>
                                  <XCircle className="w-4 h-4 text-red-600" />
                                  <span className="text-xs font-medium text-red-600">Failed</span>
                                </>
                              )}
                              {payment.status === 'processing' && (
                                <>
                                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                  <span className="text-xs font-medium text-blue-600">Processing</span>
                                </>
                              )}
                              {payment.status === 'pending' && (
                                <>
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="text-xs font-medium text-gray-600">Pending</span>
                                </>
                              )}
                            </div>
                            {payment.error && (
                              <p className="text-xs text-red-600 mt-1">{payment.error}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(payment)}
                              disabled={payment.status === 'processing'}
                              title="Edit payment"
                            >
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePayment(payment.id)}
                              disabled={payment.status === 'processing'}
                              title="Remove payment"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">High Performance</p>
                  <p className="text-sm text-blue-700 mt-1">Process up to 1000 payments in seconds with parallel processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Mixed Payment Types</p>
                  <p className="text-sm text-green-700 mt-1">Combine mobile money, bank transfers, and more in one batch</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-900">Three Payment Types</p>
                  <p className="text-sm text-purple-700 mt-1">Mobile Money, Bank Transfer, and Wallet Transfer in one bulk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          </TabsContent>
        </Tabs>
        </>
        )}

      </div>
    </div>
    </TooltipProvider>
  );
}


