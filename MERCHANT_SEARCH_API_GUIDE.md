# 🔍 Merchant Search API - Usage Guide

## 📋 **Overview**

The Merchant Search API allows you to search for merchants by their merchant code and retrieve comprehensive details including wallet information and transaction counts.

---

## 🚀 **Quick Start**

### **1. Import the Hook**

```typescript
import { useSearchMerchantByCode } from '@/lib/hooks/useMerchant'
```

### **2. Use in Component**

```typescript
const MerchantSearch = () => {
  const [merchantCode, setMerchantCode] = useState('MERCH-12345')
  
  const { data: merchant, isLoading, error } = useSearchMerchantByCode(merchantCode)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <h2>{merchant.merchant.businessTradeName}</h2>
      <p>Merchant Code: {merchant.merchant.merchantCode}</p>
      <p>Phone: {merchant.merchant.phone}</p>
      <p>Is Verified: {merchant.merchant.isVerified ? '✅' : '❌'}</p>
      
      <h3>Wallets</h3>
      {merchant.wallets.map(wallet => (
        <div key={wallet.id}>
          <p>{wallet.walletType}: {wallet.balance} {wallet.currency}</p>
          <p>Transactions: {wallet.transactionCount}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## 📚 **Available APIs**

### **1. Search Merchant by Code**

#### **Raw API Function:**
```typescript
import { searchMerchantByCode } from '@/lib/api/merchant.api'

const merchant = await searchMerchantByCode('MERCH-12345')
```

#### **React Query Hook:**
```typescript
import { useSearchMerchantByCode } from '@/lib/hooks/useMerchant'

const { data: merchant, isLoading, error } = useSearchMerchantByCode('MERCH-12345')
```

#### **Response Structure:**
```typescript
{
  merchant: {
    id: string
    userId: string
    merchantCode: string
    businessTradeName: string
    businessType: string
    ownerName: string
    phone: string
    email: string
    isVerified: boolean
    isActive: boolean
    canTransact: boolean
    onboardedAt: string
    createdAt: string
  }
  user: {
    id: string
    phone: string
    email: string
    subscriberType: string
    userType: string
    kycStatus: string
    verificationLevel: string
    isVerified: boolean
    status: string
  }
  wallets: [
    {
      id: string
      walletType: 'PERSONAL' | 'BUSINESS'
      balance: number
      currency: string
      isActive: boolean
      isSuspended: boolean
      merchantId: string | null
      transactionCount: number
      recentTransactions: [
        {
          id: string
          type: string
          amount: number
          currency: string
          description: string
          createdAt: string
        }
      ]
      createdAt: string
      updatedAt: string
    }
  ]
  profile: {
    firstName: string
    lastName: string
    middleName?: string
  } | null
}
```

---

### **2. Get My Merchant Details**

Get the current logged-in merchant's details automatically.

#### **Raw API Function:**
```typescript
import { getMyMerchantDetails } from '@/lib/api/merchant.api'

const myMerchant = await getMyMerchantDetails()
```

#### **React Query Hook:**
```typescript
import { useMyMerchantDetails } from '@/lib/hooks/useMerchant'

const { data: myMerchant, isLoading, error } = useMyMerchantDetails()
```

---

### **3. Verify Wallet Separation**

Check if a merchant has properly separated personal and business wallets.

#### **Raw API Function:**
```typescript
import { verifyWalletSeparation } from '@/lib/api/merchant.api'

const verification = await verifyWalletSeparation('MERCH-12345')

console.log(verification)
// {
//   hasPersonalWallet: true,
//   hasBusinessWallet: true,
//   personalWalletId: "uuid-1",
//   businessWalletId: "uuid-2",
//   personalTransactionCount: 5,
//   businessTransactionCount: 10,
//   areWalletsSeparate: true,
//   message: "✅ Wallets are properly separated"
// }
```

#### **React Query Hook:**
```typescript
import { useVerifyWalletSeparation } from '@/lib/hooks/useMerchant'

const { data: verification } = useVerifyWalletSeparation('MERCH-12345')

if (verification?.areWalletsSeparate) {
  console.log('✅ Wallets are properly separated')
  console.log(`Personal: ${verification.personalTransactionCount} transactions`)
  console.log(`Business: ${verification.businessTransactionCount} transactions`)
}
```

---

## 💡 **Usage Examples**

### **Example 1: Merchant Search Page**

```typescript
'use client'

import { useState } from 'react'
import { useSearchMerchantByCode } from '@/lib/hooks/useMerchant'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function MerchantSearchPage() {
  const [searchCode, setSearchCode] = useState('')
  const [activeCode, setActiveCode] = useState('')
  
  const { data: merchant, isLoading, error } = useSearchMerchantByCode(
    activeCode,
    !!activeCode // Only fetch if activeCode is set
  )
  
  const handleSearch = () => {
    setActiveCode(searchCode)
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Search Merchant</h1>
      
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Enter merchant code (e.g., MERCH-12345)"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>
      
      {isLoading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-600">{error.message}</p>
        </div>
      )}
      
      {merchant && (
        <div className="space-y-6">
          {/* Merchant Details */}
          <div className="bg-white border rounded p-4">
            <h2 className="text-xl font-semibold mb-4">
              {merchant.merchant.businessTradeName}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Merchant Code</p>
                <p className="font-medium">{merchant.merchant.merchantCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Owner</p>
                <p className="font-medium">{merchant.merchant.ownerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{merchant.merchant.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  {merchant.merchant.isVerified ? '✅ Verified' : '⏳ Pending'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Wallets */}
          <div className="bg-white border rounded p-4">
            <h3 className="text-lg font-semibold mb-4">Wallets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {merchant.wallets.map(wallet => (
                <div 
                  key={wallet.id}
                  className="border rounded p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{wallet.walletType}</span>
                    <span className={wallet.isActive ? 'text-green-600' : 'text-red-600'}>
                      {wallet.isActive ? '●' : '○'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {wallet.balance.toLocaleString()} {wallet.currency}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {wallet.transactionCount} transactions
                  </p>
                  
                  {/* Recent Transactions */}
                  {wallet.recentTransactions.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Recent Transactions</p>
                      {wallet.recentTransactions.map(tx => (
                        <div key={tx.id} className="text-sm py-1">
                          <span className="text-gray-600">{tx.type}</span>
                          <span className="float-right font-medium">
                            {tx.amount.toLocaleString()} {tx.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### **Example 2: Wallet Separation Checker**

```typescript
'use client'

import { useState } from 'react'
import { useVerifyWalletSeparation } from '@/lib/hooks/useMerchant'

export default function WalletSeparationChecker() {
  const [merchantCode, setMerchantCode] = useState('')
  const [checking, setChecking] = useState(false)
  
  const { data: verification, isLoading } = useVerifyWalletSeparation(
    merchantCode,
    checking
  )
  
  const handleCheck = () => {
    setChecking(true)
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Wallet Separation Checker</h1>
      
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Merchant Code"
          value={merchantCode}
          onChange={(e) => setMerchantCode(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
        <button 
          onClick={handleCheck}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Check
        </button>
      </div>
      
      {isLoading && <p>Checking...</p>}
      
      {verification && (
        <div className={`border rounded p-4 ${
          verification.areWalletsSeparate ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h2 className="text-xl font-semibold mb-4">
            {verification.message}
          </h2>
          
          <div className="space-y-2">
            <p>
              <strong>Personal Wallet:</strong>{' '}
              {verification.hasPersonalWallet ? '✅ Exists' : '❌ Missing'}
            </p>
            {verification.personalWalletId && (
              <p className="text-sm text-gray-600">
                ID: {verification.personalWalletId}
              </p>
            )}
            <p className="text-sm">
              Transactions: {verification.personalTransactionCount}
            </p>
            
            <p className="mt-4">
              <strong>Business Wallet:</strong>{' '}
              {verification.hasBusinessWallet ? '✅ Exists' : '❌ Missing'}
            </p>
            {verification.businessWalletId && (
              <p className="text-sm text-gray-600">
                ID: {verification.businessWalletId}
              </p>
            )}
            <p className="text-sm">
              Transactions: {verification.businessTransactionCount}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### **Example 3: My Merchant Dashboard Widget**

```typescript
'use client'

import { useMyMerchantDetails } from '@/lib/hooks/useMerchant'

export default function MyMerchantWidget() {
  const { data: merchant, isLoading, error } = useMyMerchantDetails()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading merchant details</div>
  if (!merchant) return null
  
  const businessWallet = merchant.wallets.find(w => w.walletType === 'BUSINESS')
  
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">My Business</h2>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Business Name</p>
          <p className="font-medium">{merchant.merchant.businessTradeName}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Merchant Code</p>
          <p className="font-mono text-sm">{merchant.merchant.merchantCode}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Business Wallet Balance</p>
          <p className="text-2xl font-bold">
            {businessWallet?.balance.toLocaleString() || '0'} UGX
          </p>
          <p className="text-xs text-gray-500">
            {businessWallet?.transactionCount || 0} transactions
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <div className="flex gap-2">
            {merchant.merchant.isVerified && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                ✅ Verified
              </span>
            )}
            {merchant.merchant.canTransact && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Can Transact
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🔧 **API Endpoints**

### **Backend Endpoint:**
```
GET /merchant-kyc/search-by-code/{merchantCode}
```

### **Base URL:**
- **Development:** `http://localhost:8000`
- **Production:** Your production API URL

### **Authentication:**
Requires JWT Bearer token in Authorization header.

### **Example cURL:**
```bash
curl -X GET 'http://localhost:8000/merchant-kyc/search-by-code/MERCH-12345' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 🎯 **Use Cases**

1. **Merchant Search** - Find merchant by code
2. **Wallet Verification** - Verify wallet separation is working
3. **Transaction Debugging** - Check transaction counts per wallet
4. **Merchant Profile** - Display comprehensive merchant information
5. **Admin Dashboard** - View merchant details for support
6. **Audit Trail** - Verify merchant wallet setup

---

## ✅ **Type Safety**

All APIs are fully typed with TypeScript:

```typescript
import type { MerchantDetails } from '@/lib/hooks/useMerchant'

const merchant: MerchantDetails = await searchMerchantByCode('MERCH-12345')
```

---

## 🚨 **Error Handling**

### **404 - Merchant Not Found:**
```typescript
try {
  const merchant = await searchMerchantByCode('INVALID-CODE')
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Merchant does not exist')
  }
}
```

### **401 - Unauthorized:**
```typescript
// Make sure JWT token is valid and not expired
```

---

## 📊 **Performance**

- **Caching:** Responses are cached for 5 minutes
- **Retry:** Automatically retries once on failure
- **Stale Time:** 5 minutes stale time for React Query

---

## 🎉 **Summary**

**Available APIs:**
- ✅ `searchMerchantByCode()` - Search by merchant code
- ✅ `getMyMerchantDetails()` - Get current merchant's details
- ✅ `verifyWalletSeparation()` - Verify wallet isolation

**Available Hooks:**
- ✅ `useSearchMerchantByCode()` - React Query hook for search
- ✅ `useMyMerchantDetails()` - React Query hook for current merchant
- ✅ `useVerifyWalletSeparation()` - React Query hook for verification

**Key Features:**
- ✅ Full TypeScript support
- ✅ React Query integration
- ✅ Error handling
- ✅ Comprehensive merchant data
- ✅ Wallet separation verification
- ✅ Transaction counts per wallet

---

**Created:** October 22, 2025  
**Status:** ✅ READY TO USE

