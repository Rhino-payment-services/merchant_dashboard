import { useMutation } from "@tanstack/react-query"
import axios from "axios"

const validatePhoneNumber = async(data: any)=>{
    try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_SANDBOX_URL}/abc/secure/mobile-money/validate-phone-number`, data)
        console.log("Response data validate phone number========>", response.data)
        
        // Check if the response indicates an error (status: 0)
        if (response.data.status === 0) {
            throw new Error(response.data.message || "Phone number validation failed");
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
        const response = await axios.post(`${process.env.NEXT_PUBLIC_SANDBOX_URL}/abc/secure/bank/validate-account`, data)
        console.log("Response data validate bank account========>", response.data)
        
        // Check if the response indicates an error (status: 0)
        if (response.data.status === 0) {
            throw new Error(response.data.message || "Bank account validation failed");
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

const validateRukaPayAccount = async(data: any)=>{
    try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_RUKAPAY_URL}/subscriber/verify-customer-phone`, data)
        console.log("Response data validate ruka pay account========>", response.data)
        
        // Check if the response indicates an error (res: 0 or no customerDetails)
        if (response.data.res === 0 || !response.data.customerDetails) {
            throw new Error(response.data.message || "RukaPay account validation failed");
        }
        
        return response.data
        
    } catch (error: any) {
        console.log("error validate ruka pay==>", error)
        // Extract error message from response
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        } else if (error.message) {
            throw new Error(error.message);
        } else {
            throw new Error("Failed to validate RukaPay account");
        }
    }
}

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

export const useValidateRukaPayAccount = ()=>{
    return useMutation({
        mutationKey: ['validate-rukapay-account'],
        mutationFn: validateRukaPayAccount
    })
} 


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

  export const transferMoney = async (data: any) => {
    try {
      const endpoint = process.env.NEXT_PUBLIC_RUKAPAY_URL || 'https://sandbox.rukapay.net';
      const fullUrl = `${endpoint}/hapi/secure/customer-sending-money`;
      
      console.log("=== RUKAPAY TRANSFER DEBUG ===");
      console.log("Endpoint:", endpoint);
      console.log("Full URL:", fullUrl);
      console.log("Request Data:", data);
      
      const response = await axios.post(fullUrl, data);
      console.log("RukaPay Transfer Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("RukaPay Transfer Error:", error);
      throw error;
    }
  };

  export const useTransferMoney = () => {
    return useMutation({
      mutationKey: ["transfer-money"],
      mutationFn: transferMoney,
    });
  };