# Merchant Creation Error Handling - Toast Notifications

## Overview

Improved error handling for merchant creation to ensure all errors are displayed as toast notifications to users.

## Changes Made

### 1. Enhanced Signup Page Error Handling

**File**: `app/auth/signup/page.tsx`

**Improvements**:
- ✅ Comprehensive error message extraction from various response formats
- ✅ Handles validation errors (array format)
- ✅ Handles error objects with `message` property
- ✅ Handles error objects with `error` property
- ✅ Handles `data.message` format
- ✅ Handles `statusCode` with `message` format
- ✅ Handles network errors
- ✅ Shows toast error for **ALL** error cases

**Error Formats Handled**:
```typescript
// Format 1: Array of messages
{ message: ["error1", "error2"] }

// Format 2: Single message
{ message: "error message" }

// Format 3: Error property
{ error: "error message" }

// Format 4: Nested data.message
{ data: { message: "error message" } }

// Format 5: Status code with message
{ statusCode: 400, message: "error message" }

// Format 6: Network errors
Error: "Network error"
```

### 2. Added Reusable Merchant Creation API Function

**File**: `lib/api/merchant.api.ts`

**New Function**: `createMerchant()`

- ✅ Centralized merchant creation with error handling
- ✅ Automatically shows toast errors
- ✅ Handles all error response formats
- ✅ Can be reused across the application

**Usage**:
```typescript
import { createMerchant } from '@/lib/api/merchant.api'

try {
  const merchant = await createMerchant(merchantData)
  // Success - toast is shown automatically
} catch (error) {
  // Error - toast is shown automatically
  // Handle additional logic if needed
}
```

## Error Handling Flow

### Signup Page (`/auth/signup`)

1. **Request Sent**: User submits merchant registration form
2. **Response Received**: 
   - If success → Show success toast, proceed to next step
   - If error → Extract error message from various formats
3. **Error Display**:
   - Show toast error with extracted message
   - Set form errors for specific fields (phone, email, national ID, business name)
   - Navigate to appropriate step if field-specific error

### API Function (`createMerchant`)

1. **Request Sent**: API call to `/merchant-kyc/create`
2. **Response Received**:
   - If success → Show success toast, return data
   - If error → Extract error message, show toast error, throw error
3. **Error Display**:
   - Toast error shown automatically
   - Error thrown for caller to handle additional logic if needed

## Error Message Extraction Logic

The error handling now supports multiple response formats:

```typescript
// Priority order for error extraction:
1. Array of messages: errorData.message (if array) → join with ', '
2. Single message: errorData.message (if string)
3. Error property: errorData.error (if string) or errorData.error.message
4. Nested message: errorData.data.message (if array, join; if string, use as-is)
5. Status code message: errorData.message (if statusCode exists)
6. Network error: error.message
7. Default: 'Registration failed' or 'Failed to create merchant account'
```

## Examples

### Example 1: Validation Error (Array)
```json
{
  "statusCode": 400,
  "message": [
    "existingUserId: property existingUserId should not exist",
    "firstName: firstName is required"
  ]
}
```
**Toast Shows**: "existingUserId: property existingUserId should not exist, firstName: firstName is required"

### Example 2: Single Error Message
```json
{
  "statusCode": 400,
  "message": "User already has a merchant account"
}
```
**Toast Shows**: "User already has a merchant account"

### Example 3: Error Object
```json
{
  "error": "Validation Failed",
  "message": "Invalid input data"
}
```
**Toast Shows**: "Invalid input data"

### Example 4: Network Error
```
Error: Network Error
```
**Toast Shows**: "Network Error"

## Benefits

1. **User-Friendly**: All errors are now visible to users via toast notifications
2. **Comprehensive**: Handles all error response formats from the backend
3. **Consistent**: Same error handling logic across the application
4. **Reusable**: `createMerchant()` function can be used anywhere
5. **Maintainable**: Centralized error extraction logic

## Testing

To test error handling:

1. **Validation Errors**: Submit form with invalid data
2. **Duplicate Errors**: Try to create merchant with existing phone/email
3. **Network Errors**: Disconnect network and submit form
4. **Server Errors**: Trigger 500 errors from backend
5. **All should show toast errors** ✅

## Files Modified

- `app/auth/signup/page.tsx` - Enhanced error handling in `handleSubmit()`
- `lib/api/merchant.api.ts` - Added `createMerchant()` function with error handling

## Future Improvements

- Consider adding error logging service
- Add retry logic for network errors
- Add error analytics tracking
- Create centralized error handler utility
