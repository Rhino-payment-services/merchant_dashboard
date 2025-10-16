"use client";
import React, { useState } from "react";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { useValidateBankAccount, useValidatePhoneNumber, useBankCashDeposit, useSendFormMobileMoney } from "@/lib/api/payment.api";
import * as XLSX from 'xlsx';
import { useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const UGANDAN_BANKS = [
  { bankName: "Barclays (now Absa)", bankSortCode: "013847" },
  { bankName: "Bank of Baroda", bankSortCode: "020147" },
  { bankName: "Stanbic Bank Ltd", bankSortCode: "040147" },
  { bankName: "DFCU Bank", bankSortCode: "050147" },
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

const countryCodes = [
  { code: "+256", country: "UG", name: "Uganda" },
  { code: "+254", country: "KE", name: "Kenya" },
  { code: "+255", country: "TZ", name: "Tanzania" },
  { code: "+250", country: "RW", name: "Rwanda" },
];

const paymentTypes = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank", label: "Bank" },
];

function emptyReceiver() {
  return {
    name: "",
    type: "mobile_money",
    countryCode: countryCodes[0].code,
    phone: "",
    amount: "",
    account: "",
    bank: UGANDAN_BANKS[0].bankSortCode,
    status: "Not validated",
    nameValidated: false,
  };
}

export default function BulkPaymentPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState(emptyReceiver());
  const [receivers, setReceivers] = useState([] as ReturnType<typeof emptyReceiver>[]);
  const [validating, setValidating] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [paying, setPaying] = useState(false);
  const [addingReceiver, setAddingReceiver] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Payment hooks
  const validatePhoneNumber = useValidatePhoneNumber();
  const validateBankAccount = useValidateBankAccount();
  const bankCashDeposit = useBankCashDeposit();
  const sendFormMobileMoney = useSendFormMobileMoney();

  // Helper function to format phone number
  const formatPhoneNumber = (phone: string, countryCode: string): string => {
    // Remove any existing country code or special characters
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Add country code
    const code = countryCode.replace('+', '');
    return code + cleaned;
  };

  // Custom validation for the receiver form
  const validateForm = () => {
    const errors: any = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errors.amount = "Amount must be a positive number";
    if (form.type === "bank") {
      if (!form.account.trim()) errors.account = "Account number is required";
      if (!form.bank) errors.bank = "Bank is required";
    } else if (form.type === "mobile_money") {
      if (!form.phone.trim()) errors.phone = "Phone number is required";
      if (!form.countryCode) errors.countryCode = "Country code is required";
      // Simple phone validation
      if (form.phone && !/^0?7\d{8}$/.test(form.phone)) errors.phone = "Phone must be a valid Ugandan number (e.g. 07XXXXXXXX)";
    }
    return errors;
  };

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };
  const handleFormTypeChange = (value: string) => {
    setForm({ ...emptyReceiver(), type: value });
  };
  const handleAddReceiver = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    setAddingReceiver(true);
    // Simulate a small delay for better UX
    setTimeout(() => {
      setReceivers(prev => [...prev, form]);
      setForm(emptyReceiver());
      setAddingReceiver(false);
    }, 500);
  };
  const removeReceiver = (idx: number) => setReceivers(prev => prev.filter((_, i) => i !== idx));
  const handlePayAll = async () => {
    if (!session?.user?.merchantId) {
      toast.error("Merchant ID not found. Please try logging in again.");
      return;
    }

    if (receivers.length === 0) {
      toast.error("No receivers to pay.");
      return;
    }

    setPaying(true);
    let successCount = 0;
    let failureCount = 0;
    let updated = [...receivers];

    try {
      for (let i = 0; i < updated.length; i++) {
        updated[i].status = 'Processing payment...';
        setReceivers([...updated]);

        try {
          if (updated[i].type === 'mobile_money') {
            // Mobile money payment
            const phoneNumber = formatPhoneNumber(updated[i].phone, updated[i].countryCode);

            const mobileMoneyPaymentData = {
              phoneNumber: phoneNumber,
              amount: Number(updated[i].amount),
              narration: `Bulk payment to ${updated[i].name}`,
              merchantId: session.user.merchantId
            };

            console.log('Mobile Money Payment Data:', mobileMoneyPaymentData);
            const result = await sendFormMobileMoney.mutateAsync(mobileMoneyPaymentData);
            console.log('Mobile Money Payment Result:', result);

            if (result?.status === 1) {
              updated[i].status = 'Payment successful ✅';
              successCount++;
              toast.success(`Payment to ${updated[i].name} completed successfully!`);
            } else {
              updated[i].status = `Payment failed ❌ - ${result?.message || 'Payment failed'}`;
              failureCount++;
              toast.error(`Payment to ${updated[i].name} failed: ${result?.message || 'Payment failed'}`);
            }

          } else if (updated[i].type === 'bank') {
            // Bank payment
            const selectedBank = UGANDAN_BANKS.find(bank => bank.bankSortCode === updated[i].bank);
            if (!selectedBank) {
              updated[i].status = 'Payment failed ❌ - Invalid bank';
              failureCount++;
              continue;
            }

            const bankPaymentData = {
              accountNumber: updated[i].account,
              amount: Number(updated[i].amount),
              bankSortCode: updated[i].bank,
              purposeOfTransaction: "", // Default empty
              gender: "male", // Default as male
              sourceOfFunds: "", // Default empty
              customerPhoneNumber: "", // Not required for bulk payment
              narration: `Bulk payment to ${updated[i].name}`,
              merchantId: session.user.merchantId
            };

            console.log('Bank Payment Data:', bankPaymentData);
            const result = await bankCashDeposit.mutateAsync(bankPaymentData);
            console.log('Bank Payment Result:', result);

            if (result?.status === 1) {
              updated[i].status = 'Payment successful ✅';
              successCount++;
              toast.success(`Payment to ${updated[i].name} completed successfully!`);
            } else {
              updated[i].status = `Payment failed ❌ - ${result?.message || 'Payment failed'}`;
              failureCount++;
              toast.error(`Payment to ${updated[i].name} failed: ${result?.message || 'Payment failed'}`);
            }
          }
        } catch (error: any) {
          console.error('Payment error:', error);
          const errorMessage = error.message || 'Payment failed';
          updated[i].status = `Payment failed ❌ - ${errorMessage}`;
          failureCount++;
          toast.error(`Payment to ${updated[i].name} failed: ${errorMessage}`);
        }

        setReceivers([...updated]);
      }

      // Final summary
      if (successCount > 0) {
        toast.success(`Bulk payment completed! ${successCount} successful, ${failureCount} failed.`);
      } else {
        toast.error(`Bulk payment failed! ${failureCount} payments failed.`);
      }

    } catch (error: any) {
      console.error('Bulk payment error:', error);
      toast.error('Bulk payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const validateReceivers = async () => {
    setValidating(true);
    let updated = [...receivers];
    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'Pending...';
      setReceivers([...updated]);
      try {
        if (updated[i].type === 'mobile_money') {
          const phoneNumber = formatPhoneNumber(updated[i].phone, updated[i].countryCode);
          const payload = { phoneNumber: phoneNumber, amount: updated[i].amount };
          console.log('Validating phone:', payload);
          const res = await validatePhoneNumber.mutateAsync(payload);
          console.log('Phone validation response:', res);
          if (res?.status === 1) {
            updated[i].status = 'Done ✅';
            if (res.data?.name && res.data.name !== updated[i].name) {
              updated[i].name = res.data.name;
              updated[i].nameValidated = true;
            }
          } else {
            updated[i].status = `Failed ❌ - ${res?.message || 'Validation failed'}`;
          }
        } else if (updated[i].type === 'bank') {
          const payload = { accountNumber: updated[i].account, bankSortCode: updated[i].bank, amount: updated[i].amount };
          console.log('Validating bank:', payload);
          const res = await validateBankAccount.mutateAsync(payload);
          console.log('Bank validation response:', res);
          if (res?.status === 1) {
            updated[i].status = 'Done ✅';
            if (res.accountName && res.accountName !== updated[i].name) {
              updated[i].name = res.accountName;
              updated[i].nameValidated = true;
            }
          } else {
            updated[i].status = `Failed ❌ - ${res?.message || 'Validation failed'}`;
          }
        }
      } catch (e: any) {
        console.error('Validation error:', e);
        const errorMessage = e.message || 'Validation failed';
        updated[i].status = `Failed ❌ - ${errorMessage}`;
      }
      setReceivers([...updated]);
    }
    setValidating(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        name: 'Jane Smith',
        type: 'mobile_money',
        countryCode: '+256',
        phone: '0711111111',
        account: '',
        bank: '',
        amount: 20000,
      },
      {
        name: 'Mike Johnson',
        type: 'bank',
        countryCode: '',
        phone: '',
        account: '1234567890',
        bank: UGANDAN_BANKS[0].bankSortCode,
        amount: 30000,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BulkPaymentTemplate');
    XLSX.writeFile(wb, 'bulk-payment-template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) {
        setUploadingFile(false);
        return;
      }
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Only add rows with at least name and amount
      const validRows = (data as any[]).filter(row => row.name && row.amount);
      setReceivers(prev => [
        ...prev,
        ...validRows.map(row => ({
          name: row.name || '',
          type: row.type === 'mobile_money' || row.type === 'bank' ? row.type : 'mobile_money',
          countryCode: row.countryCode || countryCodes[0].code,
          phone: row.phone || '',
          account: row.account || '',
          bank: row.bank || UGANDAN_BANKS[0].bankSortCode,
          amount: row.amount || '',
          status: "Not validated",
          nameValidated: false,
        }))
      ]);
      setUploadingFile(false);
      toast.success(`Successfully uploaded ${validRows.length} receivers from file.`);
    };
    reader.onerror = () => {
      setUploadingFile(false);
      toast.error('Error reading file. Please try again.');
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Bulk Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Single Receiver Form */}
          <Card className="p-8 h-fit md:h-[520px] flex flex-col justify-center">
            <form onSubmit={handleAddReceiver} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => handleFormTypeChange(e.target.value)}
                    className="text-xs border rounded px-2 py-2 bg-white w-full"
                  >
                    {paymentTypes.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
                {(form.type === "mobile_money") && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Country Code</label>
                    <select
                      value={form.countryCode}
                      onChange={e => handleFormChange("countryCode", e.target.value)}
                      className="text-xs border rounded px-2 py-2 bg-white w-full"
                    >
                      {countryCodes.map(cc => (
                        <option key={cc.code} value={cc.code}>{cc.code} ({cc.name})</option>
                      ))}
                    </select>
                  </div>
                )}
                {(form.type === "mobile_money") && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Phone Number</label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={e => handleFormChange("phone", e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full"
                    />
                    {formErrors.phone && <div className="text-xs text-red-600 mt-1 font-medium">{formErrors.phone}</div>}
                  </div>
                )}
                {form.type === "bank" && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Account Number</label>
                    <Input
                      type="text"
                      value={form.account}
                      onChange={e => handleFormChange("account", e.target.value)}
                      placeholder="Enter account number"
                      className="w-full"
                    />
                    {formErrors.account && <div className="text-xs text-red-600 mt-1 font-medium">{formErrors.account}</div>}
                  </div>
                )}
                {form.type === "bank" && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Bank</label>
                    <select
                      value={form.bank}
                      onChange={e => handleFormChange("bank", e.target.value)}
                      className="text-xs border rounded px-2 py-2 bg-white w-full"
                    >
                      {UGANDAN_BANKS.map(b => (
                        <option key={b.bankSortCode} value={b.bankSortCode}>{b.bankName}</option>
                      ))}
                    </select>
                    {formErrors.bank && <div className="text-xs text-red-600 mt-1 font-medium">{formErrors.bank}</div>}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">Name</label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={e => handleFormChange("name", e.target.value)}
                    placeholder="Enter receiver name"
                    className="w-full"
                  />
                  {formErrors.name && <div className="text-xs text-red-600 mt-1 font-medium">{formErrors.name}</div>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Amount</label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={e => handleFormChange("amount", e.target.value)}
                    placeholder="Enter amount"
                    className="w-full"
                  />
                  {formErrors.amount && <div className="text-xs text-red-600 mt-1 font-medium">{formErrors.amount}</div>}
                </div>
                <div className="flex justify-end">
                  <Button className="w-[200px] h-[50px] cursor-pointer" type="submit"  size="sm" disabled={addingReceiver}>
                    {addingReceiver ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add To List'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
          {/* Right: List of Receivers */}
          <Card className="p-8 max-h-[520px] flex flex-col">
            <div className="flex justify-between mb-4 gap-2">
              <Button type="button" variant="outline" onClick={validateReceivers} disabled={receivers.length === 0 || validating || paying} className="cursor-pointer">
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate'
                )}
              </Button>
              <Button className="cursor-pointer" type="button" size="lg" onClick={handlePayAll} disabled={receivers.length === 0 || validating || paying}>
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payments...
                  </>
                ) : (
                  'Pay All'
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Receivers List</h3>
              {receivers.length === 0 ? (
                <div className="text-gray-400 text-center">No receivers added yet.</div>
              ) : (
                <div className="space-y-4">
                  {receivers.map((r, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="text-xs font-medium">{paymentTypes.find(pt => pt.value === r.type)?.label}</div>
                        <div className="text-xs text-gray-600">Name: {r.name} {r.nameValidated && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold">Validated</span>}</div>
                        <div className="text-xs text-gray-600">
                          {r.type === 'bank'
                            ? `Account: ${r.account}, Bank: ${UGANDAN_BANKS.find(b => b.bankSortCode === r.bank)?.bankName}`
                            : `Phone: ${r.countryCode} ${r.phone}`}
                        </div>
                        <div className="text-xs text-gray-600">Amount: UGX {r.amount}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          Status: {r.status || 'Not validated'}
                          {(r.status === 'Pending...' || r.status === 'Processing payment...') && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeReceiver(idx)} className="mt-2 md:mt-0" disabled={r.status === 'Pending...' || r.status === 'Processing payment...'}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={downloadTemplate} className="w-[200px] cursor-pointer">
                Download Template
              </Button>
              <label className={`w-[200px] cursor-pointer flex items-center gap-2 border border-gray-300 rounded px-4 py-2 bg-white text-xs font-medium ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingFile ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload File'
                )}
                <input 
                  type="file" 
                  accept=".xlsx,.csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  disabled={uploadingFile}
                />
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 