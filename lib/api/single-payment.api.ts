import apiClient from './client'

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
  mode: 'WALLET_TO_MNO' | 'WALLET_TO_BANK' | 'WALLET_TO_WALLET' | 'UTILITIES' | 'WALLET_TO_MERCHANT' | 'WALLET_TO_INTERNAL_MERCHANT' | 'WALLET_TO_EXTERNAL_MERCHANT'
  amount: number
  currency: string
  description?: string
  reference?: string
  walletType?: 'PERSONAL' | 'BUSINESS'
  
  // MNO fields
  phoneNumber?: string
  mnoProvider?: string
  recipientName?: string
  
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
}

// Validation DTO that matches the backend ValidateTransactionDto
export interface ValidateTransactionRequestDto {
  transactionType: 'WALLET_TO_MNO' | 'WALLET_TO_BANK' | 'BILL_PAYMENT' | 'MNO_TO_WALLET' | 'WALLET_TOPUP_PULL' | 'WALLET_TO_WALLET' | 'WALLET_TO_MERCHANT'
  phoneNumber?: string
  network?: string // MNO provider
  accountNumber?: string
  bankCode?: string // Bank name
  geographicRegion?: string
  customerRef?: string
  billType?: string
  area?: string
  customerPhoneNumber?: string
  amount?: number
  merchantCode?: string
  userId?: string
  currency?: string
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
    // Transform SinglePaymentDto to match backend UnifiedTransactionDto
    const processData = {
      mode: paymentData.mode,
      amount: paymentData.amount,
      currency: paymentData.currency || 'UGX',
      description: paymentData.description,
      reference: paymentData.reference,
      walletType: paymentData.walletType || 'BUSINESS',
      userId: userId, // Sender's user ID
      
      // Map transaction-specific fields
      phoneNumber: paymentData.phoneNumber,
      mnoProvider: getValidMnoProvider(paymentData.mnoProvider),
      recipientName: paymentData.recipientName,
      
      // Bank fields
      accountNumber: paymentData.accountNumber,
      bankSortCode: paymentData.bankSortCode,
      bankName: paymentData.bankName,
      accountName: paymentData.accountName,
      swiftCode: paymentData.swiftCode,
      
      // Wallet fields
      recipientPhoneNumber: paymentData.recipientPhoneNumber,
      recipientUserId: paymentData.recipientUserId,
      
      // Utility fields
      utilityProvider: paymentData.utilityProvider,
      utilityAccountNumber: paymentData.utilityAccountNumber,
      customerRef: paymentData.customerRef,
      area: paymentData.area,
      
      // Merchant fields
      merchantCode: paymentData.merchantCode,
      merchantId: paymentData.merchantId,
      orderId: paymentData.orderId,
      invoiceNumber: paymentData.invoiceNumber,
      
      metadata: paymentData.metadata
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
    const validationData: ValidateTransactionRequestDto = {
      transactionType: paymentData.mode as any, // Map mode to transactionType
      amount: paymentData.amount,
      currency: paymentData.currency || 'UGX',
      geographicRegion: 'UG',
      userId: undefined, // Will be set by backend from JWT
    };

    // Map transaction-specific fields
    if (paymentData.mode === 'WALLET_TO_MNO') {
      validationData.phoneNumber = paymentData.phoneNumber;
      validationData.network = getValidMnoProvider(paymentData.mnoProvider); // Map mnoProvider to network
    } else if (paymentData.mode === 'WALLET_TO_BANK') {
      validationData.accountNumber = paymentData.accountNumber;
      validationData.bankCode = paymentData.bankName; // Map bankName to bankCode
    } else if (paymentData.mode === 'UTILITIES') {
      validationData.customerRef = paymentData.customerRef;
      validationData.billType = paymentData.utilityProvider;
      validationData.area = paymentData.area;
      validationData.customerPhoneNumber = paymentData.phoneNumber;
    } else if (paymentData.mode === 'WALLET_TO_MERCHANT') {
      validationData.merchantCode = paymentData.merchantCode;
    }

    console.log('API: Validating transaction:', validationData);
    const response = await apiClient.post('/transactions/validate', validationData);
    console.log('API: Validation response:', response.data);
    
    // Transform response to match expected format
    const validationResult = response.data.validationResult || {};
    const recipientName = validationResult.accountName || 
                          validationResult.data?.accountName || 
                          validationResult.data?.name || 
                          validationResult.data?.recipientName;

    return {
      isValid: response.data.success || false,
      errors: response.data.error ? [response.data.error] : [],
      warnings: [],
      recipientName: recipientName,
      partnerCode: response.data.partnerCode,
      partnerName: response.data.partnerName,
      validationResult: validationResult,
      feePreview: response.data.feeDetails ? {
        tariffId: '',
        tariffName: '',
        feeAmount: response.data.feeDetails.feeAmount,
        feePercentage: response.data.feeDetails.feePercentage || 0,
        totalFee: response.data.feeDetails.feeAmount,
        netAmount: response.data.feeDetails.totalAmount - response.data.feeDetails.feeAmount,
        currency: response.data.feeDetails.currency,
        rukapayFee: response.data.feeDetails.platformRevenue || 0,
        partnerFee: response.data.feeDetails.partnerRevenue || 0,
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
