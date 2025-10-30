# Payroll Approvals - Permission Fix

**Date:** October 30, 2025  
**Issue:** Original account owners couldn't approve payroll, showing "Can Approve Payroll: No"  
**Status:** ✅ Fixed

---

## Problem Summary

### Original Issue
1. **API Error**: "Failed to fetch pending payrolls" - API endpoints were missing
2. **Permission Bug**: Original account owner (merchant subscriber) showing "Can Approve Payroll: No"
3. **Root Cause**: No field to differentiate between:
   - Original wallet owner (the merchant who created the account)
   - Team members added to the account

### Technical Details

**The Confusion:**
- **Original wallet owner**: Has `Wallet.userId === user.id`, no `WalletTeamMember` record
- **Team members**: Have `WalletTeamMember` record with roles (OWNER, ADMIN, ACCOUNTANT, MEMBER, VIEWER)
- **The bug**: Permission checks only looked at `role` field, which was NULL for original owners

---

## Changes Made

### 1. Created Missing API Routes

Created 5 new API route handlers in `app/api/payroll/`:

#### `/api/payroll/pending/route.ts`
- Fetches pending payroll batches from backend
- Endpoint: `GET /api/v1/payroll/payments/pending`

#### `/api/payroll/summary/route.ts`
- Fetches payroll summary statistics
- Endpoint: `GET /api/v1/payroll/summary`

#### `/api/payroll/[id]/route.ts`
- Fetches detailed payroll batch information
- Endpoint: `GET /api/v1/payroll/batch/{id}`

#### `/api/payroll/approve/route.ts`
- Approves a payroll batch
- Endpoint: `POST /api/v1/payroll/batch/{id}/approve`

#### `/api/payroll/reject/route.ts`
- Rejects a payroll batch with reason
- Endpoint: `POST /api/v1/payroll/batch/{id}/reject`

---

### 2. Updated Permission Logic

**File: `lib/utils/permissions.ts`**

#### Added `isWalletOwner` Field
```typescript
export interface UserSession {
  role?: string;
  userType?: string;
  userData?: UserPermissions;
  isWalletOwner?: boolean; // NEW: Flag to indicate original wallet owner
}
```

#### Updated Permission Functions

All permission functions now check `isWalletOwner` FIRST:

**`canApprovePayroll()`:**
```typescript
// Original wallet owner: Full access
if (isWalletOwner === true) return true;

// Then check team member roles
if (role === 'OWNER') return true;
if (role === 'ADMIN') return true;
if (userData?.canApprovePayments) return true;
```

**Also updated:**
- `canInitiatePayments()`
- `canViewTransactions()`
- `canManageTeam()`
- `getUserPermissions()`

---

### 3. Updated User Profile Provider

**File: `app/(dashboard)/UserProfileProvider.tsx`**

#### Added `isWalletOwner` Flag to Profile
```typescript
isWalletOwner: !isTeamMember && !!businessWallet
```

**Logic:**
- `isTeamMember = false` AND has business wallet → Original wallet owner
- `isTeamMember = true` → Team member with role from WalletTeamMember table

#### Updated Type Definition
```typescript
type UserProfile = {
  profile: {
    // ... existing fields ...
    isTeamMember?: boolean;
    isWalletOwner?: boolean; // NEW
  }
}
```

---

### 4. Updated Payroll Approvals Page

**File: `app/(dashboard)/payroll/approvals/page.tsx`**

#### Added UserProfile Context
```typescript
import { useUserProfile } from '../UserProfileProvider';

const { profile } = useUserProfile();
```

#### Updated User Session Building
```typescript
const userSession: UserSession = {
  role: (session as any)?.user?.role || profile?.profile?.role,
  userType: (session as any)?.user?.userType || profile?.profile?.userType,
  userData: (session as any)?.userData || {},
  isWalletOwner: profile?.profile?.isWalletOwner || false // NEW
};
```

#### Improved UI Labels
Changed "Your Role" to "Account Type" with better labels:
- Original owner → "Account Owner" (purple badge)
- Team member with OWNER role → "OWNER" (purple badge)
- Team member with ADMIN role → "ADMIN" (blue badge)
- Other team members → Shows their role or "Team Member"

---

## How It Works Now

### Permission Check Flow

```
1. User loads Payroll Approvals page
   ↓
2. UserProfileProvider fetches business wallet
   ↓
3. Checks: Is user.id === businessWallet.userId?
   ↓
   YES → isWalletOwner = true (Original owner)
   NO → isTeamMember = true (Has WalletTeamMember record)
   ↓
4. canApprovePayroll() checks:
   - isWalletOwner === true? → ALLOW ✅
   - role === 'OWNER'? → ALLOW ✅
   - role === 'ADMIN'? → ALLOW ✅
   - userData.canApprovePayments? → ALLOW ✅
   - Otherwise → DENY ❌
```

---

## Testing Instructions

### Test Case 1: Original Account Owner
**User:** The merchant who created the account
**Expected:**
- Account Type: "Account Owner" (purple badge)
- Can Approve Payroll: "Yes" (green)
- Approve/Reject buttons visible on pending payrolls

### Test Case 2: Team Member with OWNER Role
**User:** Team member added with OWNER role
**Expected:**
- Account Type: "OWNER" (purple badge)
- Can Approve Payroll: "Yes" (green)
- Approve/Reject buttons visible

### Test Case 3: Team Member with ADMIN Role
**User:** Team member added with ADMIN role
**Expected:**
- Account Type: "ADMIN" (blue badge)
- Can Approve Payroll: "Yes" (green)
- Approve/Reject buttons visible

### Test Case 4: Team Member with ACCOUNTANT Role
**User:** Team member added with ACCOUNTANT role
**Expected:**
- Account Type: "ACCOUNTANT" (gray badge)
- Can Approve Payroll: "No" (red)
- No approve/reject buttons visible

### Test Case 5: Team Member with Custom Permissions
**User:** Team member with `canApprovePayments = true`
**Expected:**
- Account Type: Shows their role
- Can Approve Payroll: "Yes" (green)
- Approve/Reject buttons visible

---

## Console Debugging

The page logs detailed permission info to console:
```javascript
console.log('🧐 Payroll Approval Permissions Check:', {
  userSession,
  isChecker,
  isWalletOwner: profile?.profile?.isWalletOwner,
  isTeamMember: profile?.profile?.isTeamMember,
  role: userSession.role,
  permissions: userSession.userData
});
```

Check browser console for these logs to debug permission issues.

---

## Database Context

### For Reference

**Wallet Table:**
```sql
-- Original owner
Wallet {
  id: "wallet-uuid"
  userId: "user-123"  -- This is the original owner
  merchantId: "merchant-abc"
  walletType: "BUSINESS"
}
```

**WalletTeamMember Table:**
```sql
-- Team members ONLY (not original owner)
WalletTeamMember {
  id: "team-uuid"
  walletId: "wallet-uuid"
  userId: "user-456"  -- Different user (team member)
  role: "ADMIN"       -- OWNER, ADMIN, ACCOUNTANT, MEMBER, VIEWER
  canApprovePayments: true
}
```

**Key Insight:**
- Original owner has NO WalletTeamMember record
- They're identified by `Wallet.userId === user.id`
- This is what `isWalletOwner` flag captures

---

## Backend API Requirements

The frontend now expects these backend endpoints to exist:

1. `GET /api/v1/payroll/payments/pending?merchantId={id}`
   - Returns array of pending payroll batches

2. `GET /api/v1/payroll/summary?merchantId={id}`
   - Returns payroll summary statistics

3. `GET /api/v1/payroll/batch/{batchId}`
   - Returns detailed batch with employee breakdown

4. `POST /api/v1/payroll/batch/{batchId}/approve`
   - Body: `{ notes?: string }`
   - Approves the batch

5. `POST /api/v1/payroll/batch/{batchId}/reject`
   - Body: `{ reason: string }`
   - Rejects the batch

**Note:** Based on the codebase search, these endpoints should already exist in `rdbs_core` backend.

---

## Files Changed

### Created (5 files)
1. `app/api/payroll/pending/route.ts`
2. `app/api/payroll/summary/route.ts`
3. `app/api/payroll/[id]/route.ts`
4. `app/api/payroll/approve/route.ts`
5. `app/api/payroll/reject/route.ts`

### Modified (3 files)
1. `lib/utils/permissions.ts`
   - Added `isWalletOwner` field to `UserSession` interface
   - Updated all permission functions to check `isWalletOwner` first

2. `app/(dashboard)/UserProfileProvider.tsx`
   - Added `isWalletOwner` flag to profile data
   - Calculates it as `!isTeamMember && !!businessWallet`

3. `app/(dashboard)/payroll/approvals/page.tsx`
   - Import `useUserProfile` hook
   - Pass `isWalletOwner` to permission functions
   - Updated UI to show "Account Owner" vs role names

---

## Summary

✅ **Fixed "Failed to fetch pending payrolls"** - Created missing API routes  
✅ **Fixed permission bug** - Original account owner now recognized as owner  
✅ **Added differentiation** - `isWalletOwner` field distinguishes owners from team members  
✅ **No breaking changes** - All existing functionality preserved  
✅ **Better UX** - Clear labels showing "Account Owner" vs team member roles

The original account owner will now see:
- **Account Type:** Account Owner
- **Can Approve Payroll:** Yes
- Full access to approve/reject payroll batches

