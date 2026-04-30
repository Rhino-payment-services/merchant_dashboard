import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import apiClient from './client'

const validatePhoneNumber = async(data: any)=>{
    try {
        // Use rdbs_core validation endpoint with transaction type
        const validationData = {
            transactionType: 'WALLET_TO_MNO', // Specify this is for withdrawal/disbursement
            phoneNumber: data.phoneNumber,
            // optional for partner fee preview
            userId: data.userId,
            amount: data.amount
        };
        
        const response = await apiClient.post('/transactions/validate', validationData)
        console.log("Response data validate phone number========>", response.data)
        
        // Treat validation failures as errors
        if (response.data?.status === 0 || response.data?.success === false || response.data?.validationResult?.success === false) {
            throw new Error(response.data?.error || response.data?.message || response.data?.validationResult?.error || "Phone number validation failed");
        }
        
        return response.data
        
    } catch (error: any) {
        console.log("error validate phone==>", error)
        // Extract error message from response
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        } else if (error.message) {
            throw new Error(error.message);
        } else {
            throw new Error("Failed to validate phone number");
        }
    }
}

const validateBankAccount = async(data: any)=>{
    try {
        // Use rdbs_core validation endpoint with transaction type
        const validationData = {
            transactionType: 'WALLET_TO_BANK', // Specify this is for bank transfer
            accountNumber: data.accountNumber,
            // Backend expects `bankCode` for validation (we pass bankSortCode value here)
            bankCode: data.bankSortCode,
            // Provide fallback accountName when partner validation is unavailable
            accountName: data.accountName,
            amount: data.amount
        };
        
        const response = await apiClient.post('/transactions/validate', validationData)
        console.log("Response data validate bank account========>", response.data)
        
        // Treat validation failures as errors (backend uses { success: false, error })
        if (response.data?.status === 0 || response.data?.success === false) {
            throw new Error(response.data?.error || response.data?.message || "Bank account validation failed");
        }
        
        return response.data
        
    } catch (error: any) {
        console.log("error validate bank==>", error)
        // Extract error message from response
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        } else if (error.message) {
            throw new Error(error.message);
        } else {
            throw new Error("Failed to validate bank account");
        }
    }
}

const validateRukapayWalletRecipient = async (data: any) => {
  try {
    const validationData = {
      transactionType: "MERCHANT_TO_WALLET",
      phoneNumber: data.phoneNumber,
      userId: data.userId,
      amount: data.amount,
    };

    const response = await apiClient.post("/transactions/validate", validationData);
    console.log("Response data validate RukaPay wallet recipient========>", response.data);

    if (response.data?.status === 0 || response.data?.success === false) {
      throw new Error(response.data?.error || response.data?.message || "Recipient validation failed");
    }

    // For MERCHANT_TO_WALLET backend returns success:true even when recipient not found.
    const name =
      response.data?.validationResult?.data?.name ||
      response.data?.validationResult?.data?.accountName ||
      null;
    if (typeof name === "string") {
      const up = name.toUpperCase();
      if (up.includes("RECIPIENT NOT FOUND") || up.includes("NO WALLET")) {
        throw new Error("Recipient not found or has no wallet");
      }
    }

    return response.data;
  } catch (error: any) {
    console.log("error validate rukapay wallet==>", error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to validate recipient");
    }
  }
};

export const useValidatePhoneNumber = ()=>{
    return useMutation({
        mutationKey: ['validate-phone-number'],
        mutationFn: validatePhoneNumber
    })
}

export const useValidateBankAccount = ()=>{
    return useMutation({
        mutationKey: ['validate-bank-account'],
        mutationFn: validateBankAccount
    })
}

export const useValidateRukapayWalletRecipient = () => {
  return useMutation({
    mutationKey: ["validate-rukapay-wallet-recipient"],
    mutationFn: validateRukapayWalletRecipient,
  });
};

export const SendToMobileMoney = async (data: any) => {
    try {
        console.log("data========>", data)
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'https://sandbox.rukapay.net';
      const fullUrl = `${endpoint}/abc/secure/merchant/mobile-money/post-disbursement-transaction`;
      
      console.log("=== MOBILE MONEY PAYMENT DEBUG ===");
      console.log("Endpoint:", endpoint);
      console.log("Full URL:", fullUrl);
      console.log("Request Data:", data);
      
      const response = await axios.post(fullUrl, data);
      console.log("Mobile Money Payment Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Mobile Money Payment Error:", error);
      throw error;
    }
  };

export const useSendFormMobileMoney = () => {
    return useMutation({
      mutationKey: ["send-form-mobile-money"],
      mutationFn: SendToMobileMoney,
    });
  };

export const bankCashDeposit = async (data: any) => {
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'https://sandbox.rukapay.net';
      const fullUrl = `${endpoint}/abc/secure/merchant/bank/cash-deposit`;
      
      console.log("=== BANK PAYMENT DEBUG ===");
      console.log("Endpoint:", endpoint);
      console.log("Full URL:", fullUrl);
      console.log("Request Data:", data);
      
      const response = await axios.post(fullUrl, data);
      console.log("Bank Payment Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Bank Payment Error:", error);
      throw error;
    }
  };

export const useBankCashDeposit = () => {
    return useMutation({
      mutationKey: ["bank-cash-deposit"],
      mutationFn: bankCashDeposit,
    });
  };

export const mobileMoneyCollection = async (data: any) => {
    try {
      const endpoint = process.env.NEXT_PUBLIC_SANDBOX_URL || 'https://sandbox.rukapay.net';
      const fullUrl = `${endpoint}/abc/secure/merchant/mobile-money/post-collection-transaction`;
      
      console.log("=== MOBILE MONEY COLLECTION DEBUG ===");
      console.log("Endpoint:", endpoint);
      console.log("Full URL:", fullUrl);
      console.log("Request Data:", data);
      
      const response = await axios.post(fullUrl, data);
      console.log("Mobile Money Collection Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Mobile Money Collection Error:", error);
      throw error;
    }
  };

export const useMobileMoneyCollection = () => {
    return useMutation({
      mutationKey: ["mobile-money-collection"],
      mutationFn: mobileMoneyCollection,
    });
  };

// ===== NEW RDBS_CORE API INTEGRATION =====

/**
 * Process transaction using rdbs_core unified API
 * @param data Transaction data with mode, amount, userId, etc.
 */
export const processTransaction = async (data: any) => {
  try {
    console.log("=== PROCESS TRANSACTION (RDBS_CORE) DEBUG ===");
    console.log("Request Data:", data);
    
    const response = await apiClient.post('/transactions/process', data);
    console.log("Process Transaction Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Process Transaction Error:", error);
    
    // Extract error message from response
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to process transaction");
    }
  }
};

/**
 * React Query hook for processing transactions
 */
export const useProcessTransaction = () => {
  return useMutation({
    mutationKey: ["process-transaction"],
    mutationFn: processTransaction,
  });
};
