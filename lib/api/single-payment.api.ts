import apiClient from './client'
import { resolveAirtimeMnoProvider } from '@/lib/utils'

// Helper function to validate MNO provider
const getValidMnoProvider = (provider: string | undefined): string => {
  const validProviders = ['MTN', 'Airtel'];
  if (provider) {
    const normalizedProvider = provider.trim();
    // Check exact match first
    if (validProviders.includes(normalizedProvider)) {
      return normalizedProvider;
    }
    // Check case-insensitive match and return correct capitalization
    const upperProvider = normalizedProvider.toUpperCase();
    if (upperProvider === 'MTN') return 'MTN';
    if (upperProvider === 'AIRTEL') return 'Airtel';
  }
  return 'MTN'; // Default to MTN if invalid or empty
};

// Single Payment DTO
export interface SinglePaymentDto {
  mode: 'WALLET_TO_MNO' | 'WALLET_TO_BANK' | 'UTILITIES' | 'WALLET_TO_MERCHANT' | 'WALLET_TO_INTERNAL_MERCHANT' | 'WALLET_TO_EXTERNAL_MERCHANT' | 'MERCHANT_TO_WALLET'
  amount: number
  currency: string
  description?: string
  reference?: string
  walletType?: 'PERSONAL' | 'BUSINESS'
  
  // MNO fields
  phoneNumber?: string
  mnoProvider?: string
  recipientName?: string
  /** Bill customer name from validation (UMEME, NWSC, etc.) */
  customerName?: string
  
  // Bank fields
  accountNumber?: string
  bankSortCode?: string
  bankName?: string
  accountName?: string
  swiftCode?: string
  
  // Wallet fields
  recipientPhoneNumber?: string
  recipientUserId?: string
  
  // Utility fields
  utilityProvider?: string
  utilityAccountNumber?: string
  customerRef?: string
  area?: string
  
  // Merchant fields
  merchantCode?: string
  merchantId?: string
  orderId?: string
  invoiceNumber?: string
  
  metadata?: Record<string, any>

  /** Optional: for /transactions/validate fee preview */
  userId?: string
}

// Validation DTO that matches the backend ValidateTransactionDto
export interface ValidateTransactionRequestDto {
  transactionType?: 'WALLET_TO_MNO' | 'WALLET_TO_BANK' | 'BILL_PAYMENT' | 'MNO_TO_WALLET' | 'WALLET_TO_MERCHANT' | 'MERCHANT_TO_WALLET'
  transactionModeCode?: string // Use mode code for custom modes like MERCHANT_TO_WALLET
  phoneNumber?: string
  network?: string // MNO provider
  accountNumber?: string
  bankCode?: string // Bank name
  accountName?: string // Account holder name (for fallback)
  geographicRegion?: string
  customerRef?: string
  billType?: string
  area?: string
  customerPhoneNumber?: string
  amount?: number
  merchantCode?: string
  userId?: string
  currency?: string
  channel?: string
  walletType?: string
}

// Transaction Response DTO
export interface TransactionResponseDto {
  transactionId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'SUCCESS'
  amount: number
  currency: string
  fee: number
  netAmount: number
  reference: string
  description?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

// Fee Preview Response DTO
export interface FeePreviewResponseDto {
  tariffId: string
  tariffName: string
  feeAmount: number
  feePercentage: number
  totalFee: number
  netAmount: number
  currency: string
  rukapayFee: number
  partnerFee: number
  governmentTax: number
  telecomBankCharge: number
  calculationDetails: Record<string, any>
}

/**
 * Process a single payment transaction
 */
export const processSinglePayment = async (paymentData: SinglePaymentDto, userId?: string): Promise<TransactionResponseDto> => {
  try {
    const resolvedCustomerName =
      paymentData.customerName?.trim() ||
      paymentData.recipientName?.trim() ||
      undefined;

    // Transform SinglePaymentDto to match backend UnifiedTransactionDto
    const processData = {
      mode: paymentData.mode,
      amount: paymentData.amount,
      currency: paymentData.currency || 'UGX',
      description: paymentData.description,
      reference: paymentData.reference,
      walletType: paymentData.walletType || 'BUSINESS',
      userId: userId, // Sender's user ID
      channel: 'MERCHANT_PORTAL', // ✅ Set channel for metrics tracking
      
      // Map transaction-specific fields
      phoneNumber: paymentData.phoneNumber,
      mnoProvider:
        paymentData.mode === 'UTILITIES'
          ? paymentData.mnoProvider && String(paymentData.mnoProvider).trim()
            ? getValidMnoProvider(paymentData.mnoProvider)
            : undefined
          : getValidMnoProvider(paymentData.mnoProvider),
      recipientName: paymentData.recipientName || resolvedCustomerName,
      customerName: resolvedCustomerName,
      
      // Bank fields
      accountNumber: paymentData.accountNumber,
      bankSortCode: paymentData.bankSortCode,
      bankName: paymentData.bankName,
      accountName: paymentData.accountName,
      swiftCode: paymentData.swiftCode,
      
      // Wallet fields
      recipientPhoneNumber: paymentData.recipientPhoneNumber,
      recipientUserId: paymentData.recipientUserId,
      
      // Utility fields (airtime / data: account ref is the MSISDN)
      utilityProvider: paymentData.utilityProvider,
      utilityAccountNumber:
        paymentData.mode === 'UTILITIES'
          ? paymentData.utilityAccountNumber ||
            paymentData.customerRef ||
            paymentData.phoneNumber
          : paymentData.utilityAccountNumber,
      area: paymentData.area,
      
      // Merchant fields
      merchantCode: paymentData.merchantCode,
      merchantId: paymentData.merchantId,
      orderId: paymentData.orderId,
      invoiceNumber: paymentData.invoiceNumber,
      
      metadata: (() => {
        const m = paymentData.metadata ? { ...paymentData.metadata } : {};
        if (
          paymentData.mode === 'UTILITIES' &&
          paymentData.utilityProvider === 'DATA_BUNDLES'
        ) {
          const q = Number(m.dataQuantity);
          if (!Number.isNaN(q)) m.dataQuantity = q;
        }
        if (resolvedCustomerName && paymentData.mode === 'UTILITIES') {
          m.customerName = resolvedCustomerName;
        }
        return Object.keys(m).length > 0 ? m : undefined;
      })(),
    };

    console.log('API: Processing single payment:', processData);
    console.log('API: Original payment data:', paymentData);
    console.log('API: MNO Provider from frontend:', paymentData.mnoProvider);
    const response = await apiClient.post('/transactions/process', processData);
    console.log('API: Single payment response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('API: Error processing single payment:', error);
    console.error('API: Error response:', error.response?.data);
    console.error('API: Error status:', error.response?.status);
    throw new Error(error.response?.data?.message || 'Failed to process single payment');
  }
}

/**
 * Validate transaction data before processing
 */
export const validateTransaction = async (paymentData: SinglePaymentDto): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
  recipientName?: string
  partnerCode?: string
  partnerName?: string
  validationResult?: any
  feePreview?: FeePreviewResponseDto
}> => {
  try {
    // Transform SinglePaymentDto to ValidateTransactionRequestDto
    // For MERCHANT_TO_WALLET, use transactionModeCode to ensure correct routing
    const validationData: ValidateTransactionRequestDto = {
      ...(paymentData.mode === 'MERCHANT_TO_WALLET'
        ? { transactionModeCode: paymentData.mode } // Use mode code for MERCHANT_TO_WALLET
        : paymentData.mode === 'UTILITIES'
          ? { transactionType: 'BILL_PAYMENT' } // Send BILL_PAYMENT for bill transactions
          : { transactionType: paymentData.mode as any } // Map mode to transactionType for others
      ),
      amount: paymentData.amount,
      currency: paymentData.currency || 'UGX',
      geographicRegion: 'UG',
      userId: paymentData.userId,
      channel: 'MERCHANT_PORTAL',
      walletType: paymentData.walletType || 'BUSINESS',
    };

  // Map transaction-specific fields
  if (paymentData.mode === 'WALLET_TO_MNO') {
    validationData.phoneNumber = paymentData.phoneNumber;
    validationData.network = getValidMnoProvider(paymentData.mnoProvider); // Map mnoProvider to network
  } else if (paymentData.mode === 'WALLET_TO_BANK') {
    validationData.accountNumber = paymentData.accountNumber;
    // CRITICAL: Use bankSortCode, not bankName! ABC needs the sort code like "040147"
    validationData.bankCode = paymentData.bankSortCode || paymentData.bankName; // Map bankSortCode to bankCode
    validationData.accountName = paymentData.accountName; // Send account holder name for fallback
    
    console.log('🔍 BANK VALIDATION DATA CHECK:');
    console.log('  bankName:', paymentData.bankName);
    console.log('  bankSortCode:', paymentData.bankSortCode);
    console.log('  accountNumber:', paymentData.accountNumber);
    console.log('  accountName:', paymentData.accountName);
    console.log('  Sending bankCode:', validationData.bankCode);
  } else if (paymentData.mode === 'UTILITIES') {
    validationData.customerRef =
      paymentData.customerRef ||
      paymentData.utilityAccountNumber ||
      paymentData.phoneNumber;
    validationData.billType = paymentData.utilityProvider;
    validationData.area = paymentData.area;
    validationData.customerPhoneNumber = paymentData.phoneNumber;
    const isAirtime =
      paymentData.utilityProvider === 'AIRTIME' ||
      paymentData.utilityProvider === 'DATA_BUNDLES';
    if (isAirtime) {
      const network = resolveAirtimeMnoProvider(
        paymentData.mnoProvider,
        paymentData.phoneNumber,
      );
      if (network) {
        validationData.network = network;
      }
    } else if (paymentData.mnoProvider) {
      validationData.network = getValidMnoProvider(paymentData.mnoProvider);
    }
  } else if (paymentData.mode === 'WALLET_TO_MERCHANT') {
    validationData.merchantCode = paymentData.merchantCode;
  } else if (paymentData.mode === 'MERCHANT_TO_WALLET') {
    // For MERCHANT_TO_WALLET, we need the recipient phone number
    validationData.phoneNumber = paymentData.recipientPhoneNumber || paymentData.phoneNumber;
  }

  console.log('API: Validating transaction:', validationData);
    const response = await apiClient.post('/transactions/validate', validationData);
    console.log('API: Validation response:', response.data);

    const data = response.data;
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Invalid validation response'],
        warnings: [],
        recipientName: undefined,
        partnerCode: undefined,
        partnerName: undefined,
        validationResult: {},
        feePreview: undefined,
      };
    }

    // Transform response to match expected format
    const validationResult = data.validationResult || {};
    const recipientName = validationResult.accountName ||
                          validationResult.customerName ||
                          validationResult.data?.accountName ||
                          validationResult.data?.name ||
                          validationResult.data?.customerName ||
                          validationResult.data?.recipientName;

    return {
      isValid: data.success || false,
      errors: data.error ? [data.error] : [],
      warnings: data.warnings || [],
      recipientName: recipientName,
      partnerCode: data.partnerCode,
      partnerName: data.partnerName,
      validationResult: validationResult,
      feePreview: data.feeDetails ? {
        tariffId: '',
        tariffName: '',
        feeAmount: data.feeDetails.feeAmount,
        feePercentage: data.feeDetails.feePercentage || 0,
        totalFee: data.feeDetails.feeAmount,
        netAmount: (data.feeDetails.totalAmount ?? 0) - (data.feeDetails.feeAmount ?? 0),
        currency: data.feeDetails.currency,
        rukapayFee: data.feeDetails.platformRevenue || 0,
        partnerFee: data.feeDetails.partnerRevenue || 0,
        governmentTax: 0,
        telecomBankCharge: 0,
        calculationDetails: {}
      } : undefined
    };
  } catch (error: any) {
    console.error('API: Error validating transaction:', error);
    console.error('API: Error response:', error.response?.data);
    console.error('API: Error status:', error.response?.status);
    throw new Error(error.response?.data?.message || 'Failed to validate transaction');
  }
}
