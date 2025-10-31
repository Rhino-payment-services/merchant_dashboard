# Production Login Issue - Failed to Send OTP

## Issue
Merchant login showing "Failed to send OTP - not reaching backend"

## Root Cause Analysis

### Frontend Call (merchant_dashboard)
```typescript
// File: app/auth/login/page.tsx line 49
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/merchant/login`, {
  method: 'POST',
  body: JSON.stringify({ phoneNumber })
});
```

### Production URL Configuration (.env)
```bash
NEXT_PUBLIC_PRODUCTION_API_URL=https://api.rukapay.net
```

### Actual API Call in Production
```
POST https://api.rukapay.net/auth/merchant/login
```

### Backend Endpoint (rdbs_core)
```typescript
// Controller: src/auth/controllers/merchant-auth.controller.ts
@Controller('auth/merchant')  // Route: /auth/merchant
@Post('login')                 // Route: /auth/merchant/login
```

---

## Debugging Steps

### Step 1: Check Frontend Environment
**In production, check browser console:**
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
// Should print the API URL being used
```

**Check .env.production or .env file:**
```bash
# Should have:
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_PRODUCTION_API_URL=https://api.rukapay.net

# OR if using single API_URL:
NEXT_PUBLIC_API_URL=https://api.rukapay.net
```

### Step 2: Check Network Request
**Open DevTools → Network tab:**
1. Try to login
2. Look for the request to `auth/merchant/login`
3. Check:
   - **Request URL:** Should be `https://api.rukapay.net/auth/merchant/login`
   - **Status:** What status code? (pending, 404, 500, CORS error?)
   - **Response:** What's in the response body?

**Common Issues:**
- **Status: (failed)** → Network issue or CORS
- **Status: 404** → Backend not deployed or wrong URL
- **Status: 502/503** → Backend crashed or not running
- **Status: 0** → CORS blocking request

### Step 3: Check Backend is Running
```bash
# Check if production backend is accessible
curl https://api.rukapay.net/health

# Should return: 200 OK with health status
```

### Step 4: Test the Endpoint Directly
```bash
# Test merchant login endpoint
curl -X POST https://api.rukapay.net/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+256773778897"}'

# Should return:
# {"success": true, "message": "OTP sent...", "expiresIn": 5}
```

---

## Possible Issues & Fixes

### Issue 1: Wrong API URL
**Symptom:** Network tab shows wrong URL being called

**Check:**
```javascript
// In browser console on production site:
console.log(process.env.NEXT_PUBLIC_APP_ENV)
console.log(process.env.NEXT_PUBLIC_API_URL)
```

**Fix:** Update production .env file:
```bash
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_PRODUCTION_API_URL=https://api.rukapay.net
```

### Issue 2: CORS Blocking Request
**Symptom:** Console shows CORS error
```
Access to fetch at 'https://api.rukapay.net/...' from origin 'https://merchant.rukapay.net' 
has been blocked by CORS policy
```

**Fix:** Add frontend domain to backend CORS allowlist

**Backend .env needs:**
```bash
ALLOWED_ORIGINS=https://merchant.rukapay.net,https://dashboard.rukapay.net
PRODUCTION_ORIGINS=https://merchant.rukapay.net
```

### Issue 3: Backend Not Deployed
**Symptom:** Request times out or returns 502/503

**Check:**
```bash
# Test if backend is running
curl https://api.rukapay.net/health

# If it fails, backend isn't deployed/running
```

**Fix:** Deploy and start rdbs_core backend

### Issue 4: SMS Service Not Configured
**Symptom:** Request succeeds but no OTP sent

**Check backend logs for:**
```
❌ SMS provider not configured
❌ Failed to send SMS
```

**Fix:** Configure SMS provider in backend .env:
```bash
SMS_PROVIDER=egosms
EGOSMS_API_KEY=your-key
EGOSMS_SENDER_ID=RukaPay
```

### Issue 5: Reverse Proxy Issue
**Symptom:** Request reaches server but gets 404

**Possible cause:** nginx/proxy strips path

**Check nginx config:**
```nginx
location / {
    proxy_pass http://localhost:8000;  # Should pass full path
    # NOT: proxy_pass http://localhost:8000/;  # This strips path
}
```

---

## Quick Diagnostic

**Run this in browser console on production:**
```javascript
// Check configuration
console.log('Environment:', process.env.NEXT_PUBLIC_APP_ENV)
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)

// Test API call
fetch('https://api.rukapay.net/health')
  .then(r => r.json())
  .then(d => console.log('Backend health:', d))
  .catch(e => console.error('Backend unreachable:', e))

// Test merchant login
fetch('https://api.rukapay.net/auth/merchant/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+256773778897' })
})
  .then(r => r.json())
  .then(d => console.log('Login response:', d))
  .catch(e => console.error('Login failed:', e))
```

---

## Expected Behavior

### Successful OTP Send:
```json
{
  "success": true,
  "message": "OTP sent successfully to your phone number",
  "expiresIn": 5
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Merchant not found"
}
```
OR
```json
{
  "statusCode": 404,
  "message": "Merchant not found",
  "error": "Not Found"
}
```

---

## Immediate Action

**Run these commands in browser console (on production site):**

```javascript
// 1. Check API URL
console.log('🔗 API URL:', process.env.NEXT_PUBLIC_API_URL)

// 2. Test health endpoint
fetch('https://api.rukapay.net/health')
  .then(r => r.text())
  .then(t => console.log('✅ Backend is running:', t))
  .catch(e => console.error('❌ Backend unreachable:', e))

// 3. Test merchant login endpoint
fetch('https://api.rukapay.net/auth/merchant/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+256773778897' })  // Use a real merchant phone
})
  .then(r => r.json())
  .then(d => console.log('📱 Login response:', d))
  .catch(e => console.error('❌ Login failed:', e))
```

**Share the console output with me and I can provide exact fix!** 🎯

