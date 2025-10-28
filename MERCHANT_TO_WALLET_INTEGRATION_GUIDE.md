# 💸 Merchant to Wallet Integration Guide

## ✅ Backend Setup (Already Complete!)

The backend is **100% ready** for MERCHANT_TO_WALLET transactions. No backend changes needed!

---

## 🎯 Frontend Integration Steps

### **Step 1: API Function Already Created** ✅

**File:** `lib/api/payment.api.ts`

```typescript
// ✅ Already added!
export const sendMoneyToWallet = async (data: any) => {
  const requestBody = {
    mode: 'MERCHANT_TO_WALLET',
    amount: Number(data.amount),
    currency: 'UGX',
    recipientPhoneNumber: data.phoneNumber,
    description: data.description || `Payment from merchant`
  };
  
  // Uses /transactions/process endpoint
  const response = await apiClient.post('/transactions/process', requestBody);
  return response.data;
};

export const useSendMoneyToWallet = () => {
  return useMutation({
    mutationKey: ["send-money-to-wallet"],
    mutationFn: sendMoneyToWallet,
  });
};
```

---

### **Step 2: Add "RukaPay User" Tab to Transfer Page**

**File:** `app/(dashboard)/transfer/page.tsx`

Update the `sendTabs` array to include RukaPay User option:

```typescript
const sendTabs = [
  { label: "Mobile Money", icon: Smartphone },
  { label: "Bank Account", icon: Landmark },
  { label: "RukaPay User", icon: User }, // ✅ Add this
];
```

---

### **Step 3: Add RukaPay User Form State**

Add a new form state for RukaPay user transfers:

```typescript
interface RukaPayUserForm {
  phone: string;
  amount: string;
  reason: string;
}

// Add to your state
const [rukaPayUserForm, setRukaPayUserForm] = useState<RukaPayUserForm>({
  phone: "",
  amount: "",
  reason: ""
});
```

---

### **Step 4: Add useSendMoneyToWallet Hook**

Import and initialize the hook in your component:

```typescript
import { useSendMoneyToWallet } from "@/lib/api/payment.api";

export default function TransferPage() {
  // ... existing code ...
  
  const sendMoneyToWallet = useSendMoneyToWallet();
  
  // ... rest of code ...
}
```

---

### **Step 5: Create Validation Function**

Add validation for RukaPay user phone number:

```typescript
const validateRukaPayUser = async () => {
  if (!rukaPayUserForm.phone || !rukaPayUserForm.amount) {
    toast.error("Please fill in all required fields");
    return;
  }

  const phoneNumber = rukaPayUserForm.phone.startsWith('256') 
    ? rukaPayUserForm.phone 
    : `256${rukaPayUserForm.phone.replace(/^0+/, '')}`;

  const amount = parseFloat(rukaPayUserForm.amount);
  
  if (amount < 500) {
    toast.error("Minimum amount is UGX 500");
    return;
  }

  setValidating(true);
  
  try {
    // Validate using the existing phone validation
    const result = await validatePhoneNumber.mutateAsync({
      phoneNumber: phoneNumber,
      amount: amount
    });

    if (result.status === 0) {
      toast.error(result.message || "Recipient not found");
      return;
    }

    // Show success popup with recipient details
    setValidationSuccess({
      accountName: result.data?.recipientName || phoneNumber,
      txnReference: result.data?.reference || `TXN${Date.now()}`,
      type: 'rukpay_user',
      formData: {
        phoneNumber: phoneNumber,
        amount: amount,
        description: rukaPayUserForm.reason || "Payment to RukaPay user"
      }
    });
    
    setShowSuccessPopup(true);
    
  } catch (error: any) {
    toast.error(error.message || "Failed to validate recipient");
  } finally {
    setValidating(false);
  }
};
```

---

### **Step 6: Update Confirmation Handler**

Add RukaPay user case to your `handleConfirmTransaction` function:

```typescript
const handleConfirmTransaction = async () => {
  if (!validationSuccess) return;
  
  setConfirming(true);
  
  try {
    // ... existing bank and mobile_money cases ...
    
    // ✅ Add this case
    else if (validationSuccess.type === 'rukpay_user') {
      const rukaPayData = {
        phoneNumber: validationSuccess.formData.phoneNumber,
        amount: validationSuccess.formData.amount,
        description: validationSuccess.formData.description
      };
      
      console.log("RukaPay User Payment Data:", rukaPayData);
      const result = await sendMoneyToWallet.mutateAsync(rukaPayData);
      console.log("sendMoneyToWallet result========>", result);
      
      if (result?.success) {
        toast.success(`Money sent successfully! Reference: ${result.reference}`);
        setSuccess("Money sent successfully to RukaPay user!");
        setRukaPayUserForm({ phone: "", amount: "", reason: "" });
        setShowSuccessPopup(false);
        setValidationSuccess(null);
      } else {
        throw new Error(result?.message || "Payment failed. Please try again.");
      }
    }
    
  } catch (error: any) {
    console.error("Payment Error:", error);
    toast.error(error.message || "Failed to complete payment");
    setError(error.message || "Failed to complete payment");
  } finally {
    setConfirming(false);
  }
};
```

---

### **Step 7: Add RukaPay User Form UI**

Add the form UI for the third tab (RukaPay User):

```tsx
{/* Inside the "Send Money" tab content */}
{activeSendTab === 2 && ( // ✅ Third tab (index 2)
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h4 className="font-semibold text-blue-900 mb-2">💰 Send to RukaPay User</h4>
      <p className="text-sm text-blue-800">
        Send money directly to another RukaPay user's wallet instantly.
        Funds will be credited to their PERSONAL wallet.
      </p>
    </div>

    {/* Phone Number Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Recipient Phone Number *
      </label>
      <input
        type="tel"
        placeholder="0700123456 or 256700123456"
        value={rukaPayUserForm.phone}
        onChange={(e) =>
          setRukaPayUserForm({ ...rukaPayUserForm, phone: e.target.value })
        }
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">
        Enter recipient's registered RukaPay phone number
      </p>
    </div>

    {/* Amount Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Amount (UGX) *
      </label>
      <input
        type="number"
        placeholder="10000"
        min="500"
        step="100"
        value={rukaPayUserForm.amount}
        onChange={(e) =>
          setRukaPayUserForm({ ...rukaPayUserForm, amount: e.target.value })
        }
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">
        Minimum: UGX 500
      </p>
    </div>

    {/* Reason/Description Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Reason for Payment
      </label>
      <input
        type="text"
        placeholder="Refund, Commission, Salary, etc."
        value={rukaPayUserForm.reason}
        onChange={(e) =>
          setRukaPayUserForm({ ...rukaPayUserForm, reason: e.target.value })
        }
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    {/* Fee Preview */}
    {rukaPayUserForm.amount && parseFloat(rukaPayUserForm.amount) >= 500 && (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Amount:</span>
          <span className="font-semibold">
            UGX {parseFloat(rukaPayUserForm.amount).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Transaction Fee:</span>
          <span className="font-semibold text-green-600">
            UGX 0 (FREE! 🎉)
          </span>
        </div>
        <div className="border-t border-green-300 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-bold text-gray-900">Total Debit:</span>
            <span className="font-bold text-lg text-green-700">
              UGX {parseFloat(rukaPayUserForm.amount).toLocaleString()}
            </span>
          </div>
        </div>
        <p className="text-xs text-green-700 font-medium mt-2">
          ✨ No fees! From: BUSINESS Wallet | To: Recipient's PERSONAL Wallet
        </p>
      </div>
    )}

    {/* Validate Button */}
    <Button
      onClick={validateRukaPayUser}
      disabled={validating || !rukaPayUserForm.phone || !rukaPayUserForm.amount}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
    >
      {validating ? "Validating..." : "Continue"}
    </Button>
  </div>
)}
```

---

### **Step 8: Update Validation Success Type**

Update the `ValidationSuccess` interface to include the new type:

```typescript
interface ValidationSuccess {
  accountName: string;
  txnReference: string;
  type: 'bank' | 'mobile_money' | 'rukpay_user'; // ✅ Add 'rukpay_user'
  formData: any;
}
```

---

## 🧪 **Testing the Integration**

### **Test Case 1: Send Money to RukaPay User**

1. ✅ Login as merchant
2. ✅ Navigate to Transfer page
3. ✅ Click "Send Money" tab
4. ✅ Click "RukaPay User" sub-tab
5. ✅ Enter recipient phone: `0700123456`
6. ✅ Enter amount: `10000`
7. ✅ Enter reason: `Commission payment`
8. ✅ Click "Continue"
9. ✅ Verify recipient name shows in popup
10. ✅ Click "Confirm Payment"
11. ✅ Verify success message
12. ✅ Check BUSINESS wallet balance decreased
13. ✅ Verify recipient PERSONAL wallet increased

---

## 📊 **What Happens Behind the Scenes**

```
Frontend Request:
POST /transactions/process
{
  "mode": "MERCHANT_TO_WALLET",
  "amount": 10000,
  "currency": "UGX",
  "recipientPhoneNumber": "256700123456",
  "description": "Commission payment"
}

Backend Processing:
1. ✅ Validates merchant has BUSINESS wallet
2. ✅ Checks balance (must have amount + fee)
3. ✅ Finds recipient by phone number
4. ✅ Verifies recipient has PERSONAL wallet
5. ✅ Creates DEBIT transaction (merchant)
6. ✅ Creates CREDIT transaction (recipient)
7. ✅ Debits merchant BUSINESS wallet
8. ✅ Credits recipient PERSONAL wallet
9. ✅ Sends SMS to both parties
10. ✅ Returns success response

Response:
{
  "success": true,
  "transactionId": "uuid",
  "reference": "TXN123456789",
  "amount": 10000,
  "fee": 0,
  "netAmount": 10000,
  "status": "SUCCESS",
  "message": "Transaction completed successfully",
  "recipientName": "John Doe"
}
```

---

## 📱 **SMS Notifications**

### **Merchant (Sender):**
```
You sent UGX 10,000 to John Doe (256700123456) 
on Oct 27, 2025, 3:45 PM. 
Ref: TXN123456789. 
Debited from your BUSINESS wallet. 
Thank you for using RukaPay!
```

### **Recipient (Customer):**
```
Payment from JIM LIMITED for UGX 10,000 
on Oct 27, 2025, 3:45 PM. 
Ref: TXN123456789. 
Funds added to your PERSONAL wallet. 
Thank you for using RukaPay!
```

---

## ✅ **Complete Implementation Checklist**

### **Backend (Already Done):**
- [x] MERCHANT_TO_WALLET mode defined
- [x] Processing logic implemented
- [x] Wallet validation (BUSINESS → PERSONAL)
- [x] Balance checking
- [x] Fee calculation
- [x] SMS notifications
- [x] Transaction records creation

### **Frontend (To Do):**
- [x] API function added to `payment.api.ts` ✅
- [ ] Add "RukaPay User" tab to transfer page
- [ ] Add form state for RukaPay user
- [ ] Import and use `useSendMoneyToWallet` hook
- [ ] Add validation function
- [ ] Update confirmation handler
- [ ] Add form UI
- [ ] Update ValidationSuccess type
- [ ] Test end-to-end

---

## 🎯 **Use Cases**

1. **Customer Refunds** - Refund customers for returned products
2. **Cashback/Rewards** - Send loyalty rewards to customers
3. **Commission Payments** - Pay agents or sales reps
4. **Salary Payments** - Pay employees directly to wallet
5. **Vendor Payments** - Pay suppliers who use RukaPay

---

## 🚀 **Quick Summary**

**What you need to do:**
1. ✅ API function already added to `lib/api/payment.api.ts`
2. Add "RukaPay User" tab to `app/(dashboard)/transfer/page.tsx`
3. Add form UI and validation
4. Test the flow

**Endpoint:** 
```
POST /transactions/process
```

**Mode:**
```
MERCHANT_TO_WALLET
```

**Required Fields:**
```typescript
{
  mode: 'MERCHANT_TO_WALLET',
  amount: number,
  currency: 'UGX',
  recipientPhoneNumber: string,
  description: string (optional)
}
```

---

**That's it! The backend is ready, just build the UI! 🎉**

