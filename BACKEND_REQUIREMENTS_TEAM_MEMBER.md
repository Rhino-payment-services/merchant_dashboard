# Backend Requirements for Team Member Authentication

## Overview
Team members should be able to login with phone + OTP (same as business owners) and be required to change password on first login. They should use the same APIs as admin/owners.

## Required Backend Changes

### 1. Team Member Phone Number Management

**Requirement**: Team members must have phone numbers attached to their accounts and linked to business wallets.

**Backend Changes Needed**:
- When adding/inviting team members, ensure phone number is stored and linked to the business wallet
- Phone number should be required for team members
- Phone number should be associated with the business wallet they have access to

### 2. OTP Login for Team Members

**Endpoint**: `POST /auth/merchant/login`

**Current Behavior**: Likely only accepts phone numbers for business owners

**Required Changes**:
- Accept phone numbers for team members (not just owners)
- Check if phone number belongs to a team member or owner
- Send OTP to team member's phone number via SMS
- Return success response with `expiresIn` field

**Request Body**:
```json
{
  "phoneNumber": "+256700123456"
}
```

**Response**:
```json
{
  "success": true,
  "expiresIn": 300,
  "message": "OTP sent successfully"
}
```

### 3. OTP Verification for Team Members

**Endpoint**: `POST /auth/merchant/verify-otp`

**Current Behavior**: Likely only verifies OTP for business owners

**Required Changes**:
- Accept phone number + OTP for team members
- Verify OTP for team members using their phone number
- Return user data with `mustChangePassword` or `isFirstLogin` flags if applicable
- Return access tokens and refresh tokens

**Request Body**:
```json
{
  "phoneNumber": "+256700123456",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "team@example.com",
    "phone": "+256700123456",
    "role": "TEAM_MEMBER",
    "userType": "SUBSCRIBER",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "mustChangePassword": true,  // or false
    "isFirstLogin": true,         // or false
    // ... other user fields
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### 4. Password Login Response Enhancement

**Endpoint**: `POST /auth/login`

**Current Behavior**: Returns user data but may not include first login flags

**Required Changes**:
- Include `mustChangePassword` or `isFirstLogin` flags in user object for team members
- These flags should be `true` if team member hasn't set/changed password yet

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "email": "team@example.com",
    "phone": "+256700123456",
    "mustChangePassword": true,  // Required: true if first login
    "isFirstLogin": true,         // Required: true if first login
    // ... other user fields
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### 5. Set Password (First Login)

**Endpoint**: `POST /auth/set-password`

**Current Behavior**: May not exist or may not support team members

**Required Changes**:
- Accept password for team members on first login
- Update user's password
- Set `mustChangePassword` and `isFirstLogin` flags to `false`
- Return success response

**Request Body**:
```json
{
  "password": "newSecurePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password set successfully"
}
```

**Authentication**: Requires valid JWT token (user must be logged in)

### 6. Change Password

**Endpoint**: `POST /auth/change-password`

**Current Behavior**: May not exist or may not support team members

**Required Changes**:
- Accept current password and new password for team members
- Verify current password
- Update to new password
- Return success response

**Request Body**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Authentication**: Requires valid JWT token (user must be logged in)

## Database/Model Changes Needed

### Team Member Model
- Ensure `phone` field is required and stored
- Add `mustChangePassword` boolean field (default: `true` for new team members)
- Add `isFirstLogin` boolean field (default: `true` for new team members)
- Link phone number to business wallet

### Business Wallet Team Member Relationship
- Ensure team member phone numbers are associated with business wallets
- When team member is added, link their phone number to the wallet

## API Flow Summary

### Team Member Login Flow (Phone + OTP)
1. User enters phone number → `POST /auth/merchant/login`
2. Backend sends OTP to phone → Returns success
3. User enters OTP → `POST /auth/merchant/verify-otp`
4. Backend verifies OTP → Returns user data + tokens
5. If `mustChangePassword: true` → Frontend redirects to password change
6. User sets password → `POST /auth/set-password`
7. Backend updates password and flags → Returns success

### Team Member Login Flow (Email + Password)
1. User enters email + password → `POST /auth/login`
2. Backend verifies credentials → Returns user data + tokens
3. If `mustChangePassword: true` → Frontend redirects to password change
4. User sets password → `POST /auth/set-password`
5. Backend updates password and flags → Returns success

## Testing Checklist

- [ ] Team member can request OTP using phone number
- [ ] OTP is sent to team member's phone via SMS
- [ ] Team member can verify OTP and receive tokens
- [ ] Team member with `mustChangePassword: true` is redirected to password change
- [ ] Team member can set password on first login
- [ ] Team member can change password after first login
- [ ] Phone number is linked to business wallet
- [ ] Team member phone number is required when adding team members
- [ ] Both owners and team members can use same OTP endpoints

## Notes

- Team members should use the same `/auth/merchant/login` and `/auth/merchant/verify-otp` endpoints as owners
- The backend should distinguish between owners and team members based on user role/userType
- Phone numbers must be unique per business wallet (or globally, depending on your business logic)
- Password change endpoints should work for both owners and team members
