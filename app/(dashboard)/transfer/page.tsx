"use client";

import React, { useState } from "react";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  QrCode,
  Send,
  Banknote,
  ArrowRightLeft,
  Smartphone,
  Landmark,
  FileSpreadsheet,
  CheckCircle,
  User,
} from "lucide-react";
import * as XLSX from "xlsx";
import { UGANDAN_BANKS } from "@/app/lib/bankList";
import { useUserProfile } from "../UserProfileProvider";
import {
  useValidateBankAccount,
  useValidatePhoneNumber,
  useBankCashDeposit,
  useSendFormMobileMoney,
} from "@/lib/api/payment.api";
import { toast } from 'sonner';
import { useSession } from "next-auth/react";

const mainTabs = [
  { label: "Send Money", icon: Send },
  { label: "Pay with RukaPay", icon: QrCode },
  { label: "Withdraw", icon: Banknote },
  { label: "Pay Salary", icon: FileSpreadsheet },
];

const sendTabs = [
  { label: "Mobile Money", icon: Smartphone },
  { label: "Bank Account", icon: Landmark },
];

interface MobileMoneyForm {
  phone: string;
  amount: string;
  reason: string;
}

interface BankAccountForm {
  account: string;
  bank: string;
  amount: string;
  reason: string;
  customerPhone: string;
}

interface PayForm {
  merchantCode: string;
  amount: string;
}

interface WithdrawForm {
  account: string;
  amount: string;
}

interface ValidationSuccess {
  accountName: string;
  txnReference: string;
  type: 'bank' | 'mobile_money';
  formData: any;
}

export default function TransferPage() {
  const { profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState(0);
  const [activeSendTab, setActiveSendTab] = useState(0);
  const  {data: session} = useSession()

  console.log("session========>", session)
  
  const [mobileMoneyForm, setMobileMoneyForm] = useState<MobileMoneyForm>({
    phone: "",
    amount: "",
    reason: ""
  });
  
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountForm>({
    account: "",
    bank: "",
    amount: "",
    reason: "",
    customerPhone: ""
  });

  const [payForm, setPayForm] = useState<PayForm>({ 
    merchantCode: "", 
    amount: "" 
  });
  
  const [withdrawForm, setWithdrawForm] = useState<WithdrawForm>({ 
    account: "", 
    amount: "" 
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState<ValidationSuccess | null>(null);
  const [confirming, setConfirming] = useState(false);

  const validateBankAccount = useValidateBankAccount();
  const validatePhoneNumber = useValidatePhoneNumber();
  const bankCashDeposit = useBankCashDeposit();
  const sendFormMobileMoney = useSendFormMobileMoney();

  // Salary payment state
  const [salaryRows, setSalaryRows] = useState<any[]>([]);
  const [salaryFileName, setSalaryFileName] = useState("");
  const [salaryProcessing, setSalaryProcessing] = useState(false);
  const [salarySuccess, setSalarySuccess] = useState("");

  const handleSendTab = (idx: number) => {
    setActiveSendTab(idx);
    setSuccess("");
    setError("");
  };

  const handleMobileMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMobileMoneyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBankAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBankAccountForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPayForm(prev => ({ ...prev, [name]: value }));
  };

  const handleWithdrawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWithdrawForm(prev => ({ ...prev, [name]: value }));
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

  // Validate bank account
  const validateBankAccountDetails = async (accountNumber: string, amount: string, bankSortCode: string) => {
    try {
      const bankValidationData = {
        accountNumber: accountNumber,
        amount: Number(amount),
        bankSortCode: bankSortCode
      };
      
      const result = await validateBankAccount.mutateAsync(bankValidationData);
      
      // Check if validation was successful
      if (result?.status === 1 && result?.accountName) {
        setValidationSuccess({
          accountName: result.accountName,
          txnReference: result.txnReference || '',
          type: 'bank',
          formData: {
            ...bankValidationData,
            bank: bankAccountForm.bank,
            reason: bankAccountForm.reason,
            customerPhone: bankAccountForm.customerPhone,
            merchantId: session?.user?.merchantId
          }
        });
        setShowSuccessPopup(true);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error("Bank validation error:", error);
      throw error;
    }
  };

  // Validate mobile money
  const validateMobileMoneyDetails = async (phoneNumber: string, amount: string) => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const validationData = {
        phoneNumber: formattedPhone,
        amount: Number(amount)
      };
      
      const result = await validatePhoneNumber.mutateAsync(validationData);
      
      // Check if validation was successful
      if (result?.status === 1 && result?.data?.name) {
        setValidationSuccess({
          accountName: result.data.name,
          txnReference: result.txnReference || '',
          type: 'mobile_money',
          formData: {
            ...validationData,
            reason: mobileMoneyForm.reason,
            merchantId: profile?.profile?.merchantId
          }
        });
        setShowSuccessPopup(true);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error("Mobile money validation error:", error);
      throw error;
    }
  };

  // Handle confirmation from success popup
  const handleConfirmTransaction = async () => {
    if (!validationSuccess) return;
    
    setConfirming(true);
    try {
      const merchantId = session?.user?.merchantId;
      
      if (!merchantId) {
        throw new Error("Merchant ID not found. Please try logging in again.");
      }

      console.log("validationSuccess========>", validationSuccess);
      
      if (validationSuccess.type === 'bank') {
        // Validate required fields for bank payment
        if (!validationSuccess.formData.accountNumber || !validationSuccess.formData.amount || !validationSuccess.formData.bankSortCode || !validationSuccess.formData.customerPhone) {
          throw new Error("Missing required bank payment data");
        }
        
        const bankPaymentData = {
          accountNumber: validationSuccess.formData.accountNumber,
          amount: validationSuccess.formData.amount,
          bankSortCode: validationSuccess.formData.bankSortCode,
          purposeOfTransaction: "", // Default empty
          gender: "male", // Default as male
          sourceOfFunds: "", // Default empty
          customerPhoneNumber: validationSuccess.formData.customerPhone, // Customer phone number without country code
          narration: validationSuccess.formData.reason, // Send reason as narration
          merchantId: merchantId,
          merchantName: profile?.profile?.merchant_names
        };
        
        console.log("Bank Payment Data:", bankPaymentData);
        const result = await bankCashDeposit.mutateAsync(bankPaymentData);
        console.log("bankCashDeposit result========>", result);
        
        if (result?.status === 1) {
          toast.success(`Transaction completed successfully! Reference: ${result.txnReference || validationSuccess.txnReference}`);
          setSuccess("Transaction completed successfully!");
          setBankAccountForm({ account: "", bank: "", amount: "", reason: "", customerPhone: "" });
          setShowSuccessPopup(false);
          setValidationSuccess(null);
        } else {
          throw new Error(result?.message || "Payment failed. Please try again.");
        }
        
      } else if (validationSuccess.type === 'mobile_money') {
        // Validate required fields for mobile money payment
        if (!validationSuccess.formData.phoneNumber || !validationSuccess.formData.amount) {
          throw new Error("Missing required mobile money payment data");
        }
        
        const mobileMoneyPaymentData = {
          phoneNumber: validationSuccess.formData.phoneNumber,
          amount: validationSuccess.formData.amount,
          narration: validationSuccess.formData.reason || "Payment",
          merchantId: merchantId,
          merchantName: profile?.profile?.merchant_names
        };
        
        console.log("Mobile Money Payment Data:", mobileMoneyPaymentData);
        const result = await sendFormMobileMoney.mutateAsync(mobileMoneyPaymentData);
        console.log("sendFormMobileMoney result========>", result);
        
        if (result?.status === 1) {
          toast.success(`Transaction completed successfully! Reference: ${result.txnReference || validationSuccess.txnReference}`);
          setSuccess("Transaction completed successfully!");
          setMobileMoneyForm({ phone: "", amount: "", reason: "" });
          setShowSuccessPopup(false);
          setValidationSuccess(null);
        } else {
          throw new Error(result?.message || "Payment failed. Please try again.");
        }
      } else {
        throw new Error("Unsupported transaction type");
      }
      
    } catch (error: any) {
      console.error("Payment Error:", error);
      const errorMessage = error.message || "Failed to complete transaction. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  // Handle Mobile Money form submission
  const handleMobileMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Validate mobile money details first
      await validateMobileMoneyDetails(mobileMoneyForm.phone, mobileMoneyForm.amount);
      
      // If validation was successful, the popup will be shown
      // The actual transaction will be handled by the confirmation button
      setLoading(false);
      return;
      
    } catch (error: any) {
      // Handle the specific error response structure
      let errorMessage = "Failed to send money. Please verify the phone number and try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle Bank Account form submission
  const handleBankAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Validate customer phone number
      if (!bankAccountForm.customerPhone || !/^0?7\d{8}$/.test(bankAccountForm.customerPhone)) {
        throw new Error("Please enter a valid customer phone number (e.g., 0748123456)");
      }
      
      // Find selected bank details
      const selectedBank = UGANDAN_BANKS.find(bank => bank.bankName === bankAccountForm.bank);
      
      if (!selectedBank) {
        throw new Error("Please select a valid bank");
      }
      
      // Validate bank account details first
      await validateBankAccountDetails(
        bankAccountForm.account, 
        bankAccountForm.amount, 
        selectedBank.bankSortCode
      );
      
      // If validation was successful, the popup will be shown
      // The actual transaction will be handled by the confirmation button
      setLoading(false);
      return;
      
    } catch (error: any) {
      // Handle the specific error response structure
      let errorMessage = "Failed to send money. Please verify the account details and try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission based on active tab
  const handleSendSubmit = (e: React.FormEvent) => {
    switch (activeSendTab) {
      case 0:
        return handleMobileMoneySubmit(e);
      case 1:
        return handleBankAccountSubmit(e);
      default:
        e.preventDefault();
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    setTimeout(() => {
      setLoading(false);
      setSuccess("Payment completed!");
      setPayForm({ merchantCode: "", amount: "" });
    }, 1500);
  };

  // Send Money Forms
  const sendFormsContent = [
    // Mobile Money
    <form key="mobile" onSubmit={handleSendSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Recipient Mobile Number
        </label>
        <input
          type="tel"
          name="phone"
          value={mobileMoneyForm.phone}
          onChange={handleMobileMoneyChange}
          required
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter mobile number (e.g., 0700123456)"
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
          value={mobileMoneyForm.amount}
          onChange={handleMobileMoneyChange}
          required
          min={1}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter amount"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Reason</label>
        <input
          type="text"
          name="reason"
          value={mobileMoneyForm.reason}
          onChange={handleMobileMoneyChange}
          required
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter Reason"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Initiating..." : "Initiate Withdrawal"}
      </Button>
    </form>,
    
    // Bank Account
    <form key="bank" onSubmit={handleSendSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Bank Account Number
        </label>
        <input
          type="text"
          name="account"
          value={bankAccountForm.account}
          onChange={handleBankAccountChange}
          required
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter bank account number"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Select Bank</label>
        <select 
          name="bank"
          value={bankAccountForm.bank}
          onChange={handleBankAccountChange}
          required
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
        >
          <option value="">Choose bank</option>
          {UGANDAN_BANKS.map((bank: any, index: number) => (
            <option value={bank.bankName} key={index}>
              {bank.bankName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Customer Phone Number</label>
        <input
          type="tel"
          name="customerPhone"
          value={bankAccountForm.customerPhone}
          onChange={handleBankAccountChange}
          required
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter customer phone number (e.g., 0748123456)"
        />
        <small className="text-gray-500">
          Enter phone number without country code (e.g., 0748123456)
        </small>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input
          type="number"
          name="amount"
          value={bankAccountForm.amount}
          onChange={handleBankAccountChange}
          required
          min={1}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter amount"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Reason</label>
        <input
          type="text"
          name="reason"
          value={bankAccountForm.reason}
          onChange={handleBankAccountChange}
          required
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
          placeholder="Enter Reason"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Initiating..." : "Initiate Transfer"}
      </Button>
    </form>,
  ];

  return (
    <>
      <Head>
        <title>Transfer & Withdrawal - RukaPay Merchant</title>
        <meta name="description" content="Send money to mobile money, bank accounts, or other merchants with RukaPay" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen">
      <div className="w-full  py-8 px-4">
        {/* Wallet Balance */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4 bg-white rounded-xl shadow px-6 py-4">
            <div>
              <div className="text-xs text-gray-500 font-medium">
                Wallet Balance
              </div>
              <div className="text-2xl font-bold text-gray-900">
                UGX {profile?.profile?.merchant_balance ? Number(profile.profile.merchant_balance).toLocaleString() : '0'}
              </div>
            </div>
          </div>
        </div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#08163d] mb-2">Transfer & Withdrawal</h1>
          <p className="text-gray-600">Send money to mobile money, bank accounts, or other merchants</p>
        </div>
        
        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          {mainTabs.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 border-b-2 ${
                  activeTab === idx
                    ? "border-main-600 text-main-600 bg-main-50"
                    : "border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Content Area */}
          <div className="flex-1">
            {/* Send Money Section */}
            {activeTab === 0 && (
              <div>
                <div className="flex gap-2 mb-6">
                  {sendTabs.map((tab, idx) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.label}
                        onClick={() => handleSendTab(idx)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 border-b-2 ${
                          activeSendTab === idx
                            ? "border-main-600 text-main-600 bg-main-50"
                            : "border-transparent text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  {sendFormsContent[activeSendTab]}
                  
                  {/* Success/Error Messages */}
                  {success && (
                    <div className="text-green-600 text-center font-medium mt-4 p-3 bg-green-50 rounded-lg">
                      {success}
                    </div>
                  )}
                  {error && (
                    <div className="text-red-600 text-center font-medium mt-4 p-3 bg-red-50 rounded-lg">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pay with RukaPay */}
            {activeTab === 1 && (
              <div className="bg-white rounded-xl shadow p-6">
                <form onSubmit={handlePaySubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Merchant Code
                    </label>
                    <input
                      type="text"
                      name="merchantCode"
                      value={payForm.merchantCode}
                      onChange={handlePayChange}
                      required
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
                      placeholder="Enter Rukapay Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={payForm.amount}
                      onChange={handlePayChange}
                      required
                      min={1}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-main-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Processing..." : "Pay with RukaPay"}
                  </Button>
                  {success && (
                    <div className="text-green-600 text-center font-medium mt-2">
                      {success}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Success Popup */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Account Validation Successful
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg mb-4">
              <User className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Account Holder</p>
                <p className="font-semibold text-gray-900">{validationSuccess?.accountName}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Transaction Type:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {validationSuccess?.type === 'bank' ? 'Bank Transfer' : 
                   validationSuccess?.type === 'mobile_money' ? 'Mobile Money' : 'Transfer'}
                </span>
              </div>
              
              {validationSuccess?.type === 'bank' && validationSuccess?.formData?.bank && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bank:</span>
                  <span className="font-medium text-gray-900">{validationSuccess.formData.bank}</span>
                </div>
              )}
              
              {validationSuccess?.type === 'mobile_money' && validationSuccess?.formData?.phoneNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Phone Number:</span>
                  <span className="font-medium text-gray-900">{validationSuccess.formData.phoneNumber}</span>
                </div>
              )}
              
              {validationSuccess?.formData?.reason && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reason:</span>
                  <span className="font-medium text-gray-900">{validationSuccess.formData.reason}</span>
                </div>
              )}
              
              {validationSuccess?.txnReference && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reference:</span>
                  <span className="font-mono text-sm text-gray-900">{validationSuccess.txnReference}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-sm font-medium text-gray-600">Amount:</span>
                <span className="font-bold text-lg text-gray-900">
                  UGX {validationSuccess?.formData?.amount?.toLocaleString() || validationSuccess?.formData?.amount}
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessPopup(false);
                setValidationSuccess(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={()=>handleConfirmTransaction()}
              disabled={confirming}
              className="w-full sm:w-auto bg-main-600 hover:bg-main-700 text-white"
            >
              {confirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
