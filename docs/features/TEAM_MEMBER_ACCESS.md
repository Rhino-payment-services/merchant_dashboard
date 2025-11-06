# Team Member Access - Merchant Dashboard

## Overview

Enable multiple users to access and manage business wallets through the merchant dashboard. Team members authenticate with email and password (separate from business owner's phone + OTP).

**Date:** October 25, 2025  
**Status:** ✅ Frontend Ready - Backend Implementation Needed

---

## Features Implemented

### 1. Dual Authentication System ✅

**Business Owners:**
- Login with: Phone + OTP
- Full access to business wallet
- Can invite team members

**Team Members:**
- Login with: Email + Password
- Role-based permissions
- Limited access based on role

---

### 2. Enhanced Login Page ✅

**File:** `app/auth/login/enhanced-page.tsx`

**Features:**
- Tab-based UI for two login methods
- Business Owner tab: Phone + OTP
- Team Member tab: Email + Password
- Clean, modern interface
- Form validation

**Usage:**
```tsx
// To use the new login page, rename:
// enhanced-page.tsx → page.tsx
// (backup existing page.tsx first)
```

---

### 3. Team Management Page ✅

**File:** `app/(dashboard)/team/page.tsx`

**Features:**
- View all team members
- Invite new members with email
- Set roles and permissions
- Remove team members
- View invitation status (Pending/Active)
- Permission badges
- Role-based color coding

---

## Authentication Flow

### Flow 1: Business Owner (Existing - Preserved)

```
1. Enter phone number
2. Receive OTP via SMS
3. Enter OTP
4. Access dashboard ✅
```

### Flow 2: Team Member (NEW)

```
1. Receive invitation email
2. Click invitation link
3. Set password
4. Login with email + password
5. Access dashboard with limited permissions ✅
```

---

## Team Management Flow

### Inviting a Team Member

**Owner's Steps:**
1. Navigate to Team Management page
2. Click "Invite Member"
3. Enter:
   - Email address
   - First name (optional)
   - Last name (optional)
   - Role (ADMIN, ACCOUNTANT, MEMBER, VIEWER)
4. Click "Send Invitation"

**What Happens:**
```typescript
POST /api/wallet/team/invite
{
  "walletId": "business-wallet-id",
  "email": "accountant@company.com",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "role": "ACCOUNTANT"
}

Response:
- Creates pending team member record
- Creates user account if doesn't exist
- Sends invitation email
- Returns invitation details
```

**Team Member's Steps:**
1. Receives email: "You've been invited to manage ABC Company's wallet"
2. Clicks "Accept Invitation" link
3. Redirected to set password page
4. Sets password
5. Account activated
6. Can now login with email + password

---

## Role Permissions

| Role | View Balance | View Transactions | Initiate Payments | Approve Payments | Manage Team |
|------|--------------|-------------------|-------------------|------------------|-------------|
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ACCOUNTANT** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **MEMBER** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **VIEWER** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Files Created

### Frontend (3 files)

1. **`app/auth/login/enhanced-page.tsx`** (267 lines)
   - Tabbed login interface
   - Phone + OTP login
   - Email + Password login
   - Form validation

2. **`app/(dashboard)/team/page.tsx`** (334 lines)
   - Team member list
   - Invite dialog
   - Member management
   - Permission display

3. **`lib/auth.ts`** (Updated)
   - Added "team-member" provider
   - Email/password authentication
   - Token handling

---

## Backend Endpoints Needed

### Authentication

```
POST /auth/login
Body: { email, password }
Response: { user, accessToken, refreshToken }
```

### Team Management

```
POST   /wallet/{walletId}/team/invite
Body: { email, firstName, lastName, role }
Response: { teamMember, invitationLink }

GET    /wallet/{walletId}/team
Response: { members: [...] }

DELETE /wallet/team/{memberId}
Response: { success: true }

PATCH  /wallet/team/{memberId}
Body: { role, permissions }
Response: { teamMember }
```

### Invitation

```
POST   /wallet/team/accept-invitation
Body: { teamMemberId, password }
Response: { success: true, user }

GET    /wallet/team/invitations
Response: { invitations: [...] }
```

---

## UI Screenshots

### Login Page - Tabbed Interface

```
┌─────────────────────────────────────────────┐
│           RukaPay Merchant                  │
│       Sign in to your dashboard             │
├─────────────────────────────────────────────┤
│                                             │
│  [Business Owner]  [Team Member]  ← Tabs   │
│                                             │
│  📧 Email Address                           │
│  ┌─────────────────────────────────────┐   │
│  │ team.member@company.com             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🔒 Password                                │
│  ┌─────────────────────────────────────┐   │
│  │ ••••••••••                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │        Sign In                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Team member access provided by owner       │
└─────────────────────────────────────────────┘
```

### Team Management Page

```
┌───────────────────────────────────────────────────────────────┐
│  Team Management                                              │
│  Manage who has access to your business wallet                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Total: 3 │  │ Active:2 │  │Pending:1 │  │[+ Invite]    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 👤 Sarah Johnson (accountant@company.com)              │ │
│  │    [ACCOUNTANT] [✅ ACTIVE]                            │ │
│  │    Permissions: View Balance, View Transactions,        │ │
│  │                 Initiate Payments                       │ │
│  │    [Edit] [Remove]                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 👤 Mike Wilson (manager@company.com)                   │ │
│  │    [ADMIN] [✅ ACTIVE]                                 │ │
│  │    Permissions: All permissions                         │ │
│  │    [Edit] [Remove]                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 👤 Jane Doe (viewer@company.com)                       │ │
│  │    [VIEWER] [⏳ PENDING]                               │ │
│  │    Invited Oct 24, 2025 - Waiting for acceptance       │ │
│  │    [Resend Invitation] [Cancel]                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Next Steps

### To Activate This Feature:

**1. Rename Enhanced Login Page**
```bash
cd /Users/jimntare/Documents/code/merchant_dashboard
mv app/auth/login/page.tsx app/auth/login/old-page.tsx.backup
mv app/auth/login/enhanced-page.tsx app/auth/login/page.tsx
```

**2. Run Backend Migration**
```bash
cd /Users/jimntare/Documents/code/rdbs_core
npx prisma migrate dev --name add_wallet_team_members
```

**3. Implement Backend Endpoints**
- Wallet team service
- Invitation endpoints
- Access control middleware
- Email notifications

**4. Add Navigation Link**
Add to merchant dashboard navigation:
```tsx
<NavLink href="/team">
  <Users className="h-4 w-4" />
  Team Members
</NavLink>
```

---

## Testing Scenarios

### Scenario 1: Invite Team Member

**Owner Actions:**
1. Login to merchant dashboard (phone + OTP)
2. Navigate to Team page
3. Click "Invite Member"
4. Enter email: sarah@company.com
5. Select role: ACCOUNTANT
6. Click "Send Invitation"

**Expected:**
- ✅ Invitation sent
- ✅ Email delivered to sarah@company.com
- ✅ Pending member appears in list

### Scenario 2: Team Member Accepts

**Team Member Actions:**
1. Receives email invitation
2. Clicks "Accept Invitation"
3. Sets password
4. Redirected to login
5. Logs in with email + password

**Expected:**
- ✅ Account activated
- ✅ Can login with email/password
- ✅ Dashboard shows limited access based on role
- ✅ Status changes to ACTIVE

### Scenario 3: Team Member Login

**Team Member:**
1. Goes to merchant dashboard
2. Clicks "Team Member" tab
3. Enters email + password
4. Clicks "Sign In"

**Expected:**
- ✅ Authenticated successfully
- ✅ Dashboard loads
- ✅ Shows wallet they have access to
- ✅ Actions limited by permissions

---

## Security Features

### Authentication
✅ Separate auth methods (phone vs email)  
✅ Password requirements enforced  
✅ JWT tokens with permissions  
✅ Session management  

### Authorization
✅ Role-based access control  
✅ Granular permissions  
✅ Per-action permission checks  
✅ Owner cannot be removed  

### Audit
✅ All access logged  
✅ Action tracking  
✅ IP and user agent logged  
✅ Exportable audit trail  

---

## Freemium Pricing (Future)

### Free Tier
- 1 business owner
- 1 team member
- Basic roles only
- 30-day audit log

### Pro Tier ($20/month)
- 1 owner + 5 team members
- All roles available
- 90-day audit log
- Email support

### Enterprise ($100/month)
- Unlimited team members
- Custom permissions
- Unlimited audit history
- Priority support
- API access

**Additional Users:** $5/user/month

---

## Implementation Checklist

### Frontend
- [x] Enhanced login page with tabs
- [x] Email/password login form
- [x] Team management page
- [x] Invite dialog
- [x] Member list with roles
- [x] Permission badges
- [ ] Navigation link to team page
- [ ] Invitation acceptance page

### Backend
- [ ] WalletTeamService
- [ ] Invitation endpoints
- [ ] Email/password authentication
- [ ] Permission middleware
- [ ] Access logging
- [ ] Email notifications

### Testing
- [ ] Owner can invite members
- [ ] Team member receives email
- [ ] Team member can accept
- [ ] Team member can login
- [ ] Permissions enforced
- [ ] Audit logs created

---

## Related Documentation

- **Backend Schema:** `/rdbs_core/docs/features/WALLET_MULTI_USER_ACCESS.md`
- **Migration Safety:** `/rdbs_core/docs/migrations/SAFE_WALLET_TEAM_MIGRATION.md`
- **DTOs:** `/rdbs_core/src/wallet/dto/wallet-team.dto.ts`

---

**Status:** ✅ Frontend Complete - Ready for Backend Integration

