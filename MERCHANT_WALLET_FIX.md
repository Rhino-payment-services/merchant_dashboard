# ✅ Fixed Merchant Dashboard Wallet Endpoint

## Problem
Merchant dashboard was using `/wallet/me` which returns the primary wallet, but merchants should explicitly use their business wallet.

## Solution
Updated merchant dashboard to use `/wallet/me/business` endpoint to explicitly fetch the business wallet balance.

## Changes Made
**File:** `lib/api/wallet.api.ts`
- Changed `getWalletBalance()` to use `/wallet/me/business` instead of `/wallet/me`
- Added comment explaining the explicit business wallet usage

## Expected Result
- Merchant dashboard now explicitly fetches business wallet balance
- Ensures merchants see their business wallet balance, not personal wallet
- More explicit and clear about which wallet is being accessed

## Backend Endpoints Available
- `/wallet/me` - Primary wallet (BUSINESS for merchants, PERSONAL for others)
- `/wallet/me/business` - Explicitly business wallet (merchants only)
- `/wallet/me/personal` - Explicitly personal wallet
- `/wallet/me/all` - All wallets for the user

## Test Steps
1. Login to merchant dashboard
2. Check wallet balance display
3. Should show business wallet balance (1000 UGX for test merchant)
4. Verify transactions are also from business wallet

The merchant dashboard now correctly uses the business wallet! 🎉
