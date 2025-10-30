# Merchant Dashboard Top-Up Integration with rdbs_core

## Overview
This document describes the integration of the merchant dashboard's top-up page with the new `rdbs_core` unified transaction API using the `MNO_TO_WALLET` transaction mode.

## Changes Made

### 1. Updated Payment API (`lib/api/payment.api.ts`)

#### Added New Functions:
- **`processTransaction(data)`**: Core function to call the rdbs_core `/transactions/process` endpoint
- **`useProcessTransaction()`**: React Query hook for processing transactions

#### Key Features:
- Uses the authenticated `apiClient` with JWT token
- Comprehensive error handling
- Debug logging for troubleshooting
- Type-safe error extraction

```typescript
export const processTransaction = async (data: any) => {
  const response = await apiClient.post('/transactions/process', data);
  return response.data;
};

export const useProcessTransaction = () => {
  return useMutation({
    mutationKey: ["process-transaction"],
    mutationFn: processTransaction,
  });
};
```

### 2. Updated Top-Up Page (`app/(dashboard)/top-up/page.tsx`)

#### Changes:
1. **Replaced Hook**: Changed from `useMobileMoneyCollection()` to `useProcessTransaction()`
2. **Added MNO Detection**: Automatically detects MTN or Airtel from phone number
3. **Updated Payload Structure**: Matches rdbs_core `UnifiedTransactionDto` format
4. **Enhanced Status Handling**: Handles SUCCESS, PROCESSING, and error states

#### MNO Provider Detection:
```typescript
const detectMnoProvider = (phone: string): string => {
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // MTN prefixes: 077, 078, 076
  if (cleaned.match(/^(256)?(77|78|76)/)) {
    return 'MTN';
  }
  // Airtel prefixes: 075, 070, 074
  if (cleaned.match(/^(256)?(75|70|74)/)) {
    return 'Airtel';
  }
  
  return 'MTN'; // Default
};
```

#### Transaction Payload:
```typescript
const transactionData = {
  mode: "MNO_TO_WALLET",
  userId: merchantId,
  amount: Number(topUpForm.amount),
  currency: "UGX",
  description: topUpForm.narration || "Mobile money collection",
  phoneNumber: formattedPhone,
  mnoProvider: mnoProvider,
  narration: topUpForm.narration || "Mobile money collection",
  userName: profile?.profile?.merchant_names || "Merchant"
};
```

## API Flow

### Request Flow:
```
Merchant Dashboard (Frontend)
    ↓
useProcessTransaction Hook
    ↓
apiClient.post('/transactions/process')
    ↓
rdbs_core API (Backend)
    ↓
External Partner Service (ABC/Pegasus)
    ↓
Mobile Money Provider (MTN/Airtel)
```

### Response Handling:

#### 1. Immediate Success (Status 1):
```json
{
  "success": true,
  "data": {
    "status": "SUCCESS",
    "reference": "TXN123456",
    "amount": 10000,
    "currency": "UGX"
  },
  "message": "Transaction completed successfully"
}
```
- Wallet is credited immediately
- Success toast shown
- Form is reset

#### 2. Processing (Status 2):
```json
{
  "success": true,
  "data": {
    "status": "PROCESSING",
    "transactionId": "TXN815226508",
    "reference": "REF123456"
  },
  "message": "Transaction is pending. Awaiting customer action."
}
```
- Customer receives mobile money prompt
- Background polling starts (every 2 seconds for up to 9 minutes)
- Wallet credited automatically when customer confirms
- Success toast shown
- Form is reset

#### 3. Failed (Status 0):
```json
{
  "success": false,
  "message": "Transaction failed",
  "error": "Insufficient balance"
}
```
- Error toast shown
- Form not reset (user can retry)

## Polling Mechanism

When a transaction returns `PROCESSING` status:

1. **Polling Starts**: Backend automatically starts polling every 2 seconds
2. **Status Check**: Calls ABC's `mobile-money/check-transaction-status` endpoint
3. **Status Mapping**:
   - **Status 1**: SUCCESS → Stop polling, credit wallet
   - **Status 2**: PENDING → Continue polling
   - **Status 0**: FAILED → Stop polling
4. **Timeout**: After 9 minutes (270 attempts), stop polling and mark as failed
5. **Wallet Credit**: Automatically credited when status becomes 1

## Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.rukapay.net
# or for development:
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Authentication

The integration uses JWT authentication:
- Access token stored in `localStorage`
- Automatically added to request headers via `apiClient` interceptor
- Token refresh handled automatically on 401 errors

## Testing Checklist

- [ ] Test with MTN number (077, 078, 076)
- [ ] Test with Airtel number (075, 070, 074)
- [ ] Test with immediate success response
- [ ] Test with processing response (customer confirms)
- [ ] Test with processing response (customer cancels)
- [ ] Test with timeout scenario
- [ ] Test with invalid phone number
- [ ] Test with insufficient amount
- [ ] Test error handling
- [ ] Verify wallet balance updates correctly
- [ ] Verify transaction records are created

## Benefits of New Integration

### 1. **Unified API**:
   - Single endpoint for all transaction types
   - Consistent request/response format
   - Easier to maintain and extend

### 2. **Automatic Polling**:
   - No manual status checking required
   - Wallet credited automatically
   - Better user experience

### 3. **Better Error Handling**:
   - Comprehensive error messages
   - Proper status mapping
   - Timeout handling

### 4. **Partner Abstraction**:
   - System automatically routes to ABC or Pegasus
   - No need to specify partner in frontend
   - Easy to add new partners

### 5. **Fee Calculation**:
   - Automatic fee calculation based on tariffs
   - Transparent fee structure
   - Revenue tracking

## Troubleshooting

### Issue: "Unauthorized" error
**Solution**: Check if access token is valid in localStorage

### Issue: Transaction stuck in PROCESSING
**Solution**: Backend polling will handle it automatically (up to 9 minutes)

### Issue: Wrong MNO provider detected
**Solution**: Update the `detectMnoProvider` function with correct prefixes

### Issue: CORS errors
**Solution**: Ensure `NEXT_PUBLIC_API_URL` is correctly set and backend allows the origin

## Next Steps

1. **Test thoroughly** with real transactions
2. **Monitor logs** for any issues
3. **Update UI** to show polling status in real-time (optional)
4. **Add transaction history** page to show pending transactions
5. **Implement webhooks** for real-time status updates (future enhancement)

## Related Files

- `/lib/api/payment.api.ts` - Payment API functions
- `/lib/api/client.ts` - Axios client with auth interceptors
- `/app/(dashboard)/top-up/page.tsx` - Top-up page component
- Backend: `/src/transaction/controllers/transaction.controller.ts`
- Backend: `/src/transaction/services/core/transaction.service.ts`
- Backend: `/src/transaction/services/partners/core/external-partner.service.ts`

## Support

For issues or questions, contact the backend team or refer to:
- Backend API documentation: `PROCESS_TRANSACTION_IMPLEMENTATION.md`
- Transaction polling logic: `external-partner.service.ts`
- ABC integration: `integrations/abc/services/abc-mno-collection.service.ts`
