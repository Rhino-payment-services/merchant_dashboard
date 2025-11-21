# Transaction Display and Pagination Fixes

## Summary of Changes
Fixed three critical issues in the merchant dashboard transaction display:
1. Pagination not working properly
2. Merchant name showing as "Merchant" instead of actual business name
3. Missing receiver/sender contact details (phone numbers, account numbers)

## Issues Fixed

### 1. Pagination Issues
**Problem**: Pagination buttons were not properly navigating between pages.

**Solution**:
- Added boundary checks to prevent going below page 1 or above total pages
- Used `Math.max()` and `Math.min()` to ensure page numbers stay within valid range
- Disabled pagination buttons during loading to prevent duplicate requests
- Fixed the total pages calculation to use API pagination info, not filtered results

**Code Changes** (`app/(dashboard)/transactions/page.tsx`):
```typescript
// Previous - buttons allowed invalid page numbers
<Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>

// Fixed - ensures page stays within bounds
<Button onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage <= 1 || isLoading}>
```

### 2. Merchant Name Display
**Problem**: When a merchant made a payment, it showed "Merchant" instead of their actual business name.

**Solution**:
- Created `getMerchantName()` helper function to fetch actual business name from profile
- Checks multiple possible fields: `merchantBusinessTradeName`, `businessTradeName`, `merchant_names`, `owner_name`
- Falls back to "Merchant Business" only if no name is found

**Code Changes**:
```typescript
const getMerchantName = () => {
  return profile?.merchantBusinessTradeName || 
         profile?.businessTradeName || 
         profile?.merchant_names || 
         profile?.owner_name || 
         'Merchant Business';
};
```

### 3. Sender/Receiver Details with Contact Information
**Problem**: Transactions only showed names, missing phone numbers or account numbers for recipients.

**Solution**:
- Created `getSenderInfo()` and `getReceiverInfo()` helper functions
- Both return objects with `{ name, contact }` structure
- Contact shows:
  - Phone number for mobile money/wallet transactions
  - Account number for bank transfers
  - Empty string if no contact available
- Differentiates between DEBIT (merchant sending) and CREDIT (merchant receiving)

**Code Changes**:
```typescript
const getSenderInfo = (txn: any) => {
  if (txn.direction === 'DEBIT') {
    // Merchant is sending
    return {
      name: getMerchantName(),
      contact: profile?.merchant_phone || profile?.ownerPhone || ''
    };
  } else {
    // Someone else is sending to merchant
    const senderName = txn.metadata?.counterpartyInfo?.name || 
                      txn.metadata?.senderName || ...;
    const senderContact = txn.metadata?.counterpartyInfo?.phone || ...;
    return { name: senderName, contact: senderContact };
  }
};

const getReceiverInfo = (txn: any) => {
  if (txn.direction === 'CREDIT') {
    // Merchant is receiving
    return {
      name: getMerchantName(),
      contact: profile?.merchant_phone || profile?.ownerPhone || ''
    };
  } else {
    // Merchant is sending to someone
    const receiverName = txn.metadata?.counterpartyInfo?.name || ...;
    
    // Get contact (phone or account number)
    let receiverContact = '';
    if (txn.type?.includes('BANK') || txn.type?.includes('WALLET_TO_BANK')) {
      // Bank transfer - show account number
      receiverContact = txn.metadata?.accountNumber || ...;
    } else {
      // Mobile money or wallet - show phone number
      receiverContact = txn.metadata?.counterpartyInfo?.phone || ...;
    }
    
    return { name: receiverName, contact: receiverContact };
  }
};
```

**UI Updates**:
- Changed from single-line display to two-line display
- Name on first line (bold)
- Contact (phone/account) on second line (smaller, gray text)

```tsx
<TableCell className="text-sm">
  <div className="flex flex-col">
    <div className="font-medium truncate max-w-[150px]" title={senderInfo.name}>
      {senderInfo.name}
    </div>
    {senderInfo.contact && (
      <div className="text-xs text-gray-500 truncate max-w-[150px]" title={senderInfo.contact}>
        {senderInfo.contact}
      </div>
    )}
  </div>
</TableCell>
```

## Files Modified

### 1. `/app/(dashboard)/transactions/page.tsx`
- Added `getMerchantName()`, `getSenderInfo()`, `getReceiverInfo()` helper functions
- Updated transaction table cells to show name + contact
- Fixed pagination button logic
- Imported and used `profile` from `useUserProfile()`

### 2. `/app/components/RecentTransactions.tsx`
- Added same helper functions for consistency
- Updated transaction display to match main transactions page
- Added `merchantName` as optional prop (falls back to profile)
- Changed to two-line display format

### 3. `/components/TransactionReceipt.tsx`
- Updated `getSenderInfo()` and `getReceiverInfo()` to return objects with contact
- Modified receipt template to show contact details for both sender and receiver
- Ensures printable receipts have complete information

## Testing Checklist

- [x] Pagination works correctly
  - [x] Can navigate to next page
  - [x] Can navigate to previous page
  - [x] Can jump to first page
  - [x] Can jump to last page
  - [x] Buttons disabled at boundaries
  - [x] Buttons disabled during loading

- [x] Merchant name displays correctly
  - [x] Shows actual business name for DEBIT transactions
  - [x] Shows actual business name for CREDIT transactions
  - [x] No "Merchant" placeholder shown

- [x] Contact details display properly
  - [x] Phone numbers show for mobile money transactions
  - [x] Account numbers show for bank transfers
  - [x] Customer phone numbers show when paying to merchant
  - [x] Merchant phone shows when merchant is sender

- [x] Consistent across all pages
  - [x] Main transactions page
  - [x] Recent transactions component (home page)
  - [x] Printable receipts

## User Experience Improvements

### Before:
- Pagination didn't work properly
- Showed "Merchant" instead of business name
- No way to see recipient phone number or account number
- Limited information for record-keeping

### After:
- ✅ Pagination works smoothly
- ✅ Shows actual merchant business name
- ✅ Displays phone numbers for mobile transactions
- ✅ Displays account numbers for bank transfers
- ✅ Complete information for both parties
- ✅ Better for accounting and customer service
- ✅ Consistent display across all pages

## Data Flow

```
Transaction API Response
  ↓
Extract metadata
  ↓
Check transaction direction (DEBIT/CREDIT)
  ↓
Determine sender/receiver
  ↓
Get merchant name from profile
  ↓
Get contact from metadata (phone or account)
  ↓
Display as two-line format:
  Line 1: Name (bold)
  Line 2: Contact (gray, smaller)
```

## Future Enhancements (Optional)

1. **Icons**: Add phone/bank icons next to contact info
2. **Copy Button**: Allow copying phone/account numbers
3. **Click to Call**: Make phone numbers clickable (tel: link)
4. **Hover Details**: Show full transaction details on hover
5. **Export**: Include contact details in CSV/PDF exports

---

**Implementation Date**: November 21, 2024
**Status**: ✅ Completed and Tested
**Impact**: High - Affects all transaction displays in merchant dashboard

