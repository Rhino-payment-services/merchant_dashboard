# Production Environment Variables Not Loading

## 🚨 Issue Identified

**Request URL shows:**
```
https://merchant.rukapay.co.ug/auth/undefined/auth/merchant/login
                              ^^^^^^^^^^^
```

**API_URL is `undefined`** because production environment variables aren't loaded.

---

## 🎯 Root Cause

**The `.env` file is NOT used in production deployments!**

- `.env` file is for **local development only**
- Production platforms (Vercel, Netlify, etc.) need environment variables set in their **dashboard**
- `NEXT_PUBLIC_*` variables must be set in the deployment platform

---

## ✅ Solution: Set Environment Variables on Deployment Platform

### **If Using Vercel:**

1. **Go to Vercel Dashboard:**
   - Open: https://vercel.com/dashboard
   - Select your project: `merchant_dashboard`

2. **Go to Settings → Environment Variables:**
   - Click "Add New"
   - Add these variables:

```
Name: NEXT_PUBLIC_APP_ENV
Value: production

Name: NEXT_PUBLIC_PRODUCTION_API_URL
Value: https://api.rukapay.net

Name: NEXT_PUBLIC_API_URL
Value: https://api.rukapay.net

Name: NEXTAUTH_SECRET
Value: [your-secret-key]

Name: NEXTAUTH_URL
Value: https://merchant.rukapay.co.ug
```

3. **Redeploy:**
   - Go to Deployments
   - Click "..." → Redeploy
   - OR push a new commit to trigger deployment

---

### **If Using Netlify:**

1. **Go to Netlify Dashboard**
2. **Site settings → Environment variables**
3. **Add the same variables as above**
4. **Trigger new deployment**

---

### **If Using PM2/Custom Server:**

Create `.env.production` file:
```bash
# File: .env.production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_PRODUCTION_API_URL=https://api.rukapay.net
NEXT_PUBLIC_API_URL=https://api.rukapay.net
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://merchant.rukapay.co.ug
```

Then build with production env:
```bash
# Build for production
npm run build

# Start in production mode
npm run start
```

---

## 🔍 Verify Environment Variables

### **After deployment, check browser console:**

You should see:
```javascript
🌍 App Environment: production
🔗 API URL: https://api.rukapay.net
```

If you see:
```javascript
⚠️ API_URL is undefined! Check your environment variables.
Environment variables: {
  NEXT_PUBLIC_APP_ENV: undefined,  ← Variables not loaded!
  NEXT_PUBLIC_PRODUCTION_API_URL: undefined,
  ...
}
```

Then the platform isn't loading the variables.

---

## 🚀 Quick Fix Checklist

### For Vercel/Netlify Deployment:
- [ ] Login to deployment platform dashboard
- [ ] Go to project settings
- [ ] Add environment variables (list above)
- [ ] **Make sure to select "Production" environment**
- [ ] Redeploy the application
- [ ] Check browser console for correct API URL
- [ ] Test login again

### For Custom Server:
- [ ] Create `.env.production` file
- [ ] Add all `NEXT_PUBLIC_*` variables
- [ ] Rebuild: `npm run build`
- [ ] Restart: `npm run start`
- [ ] Check browser console
- [ ] Test login

---

## 📝 Required Environment Variables

**Minimum for production:**
```bash
# App Environment
NEXT_PUBLIC_APP_ENV=production

# API URLs
NEXT_PUBLIC_PRODUCTION_API_URL=https://api.rukapay.net
NEXT_PUBLIC_API_URL=https://api.rukapay.net

# NextAuth
NEXTAUTH_SECRET=your-secret-key-minimum-32-characters
NEXTAUTH_URL=https://merchant.rukapay.co.ug
```

**Optional but recommended:**
```bash
NEXT_PUBLIC_STAGING_API_URL=https://dev-api.rukapay.net
NEXT_PUBLIC_DEV_API_URL=http://localhost:8000
```

---

## 🎯 After Fixing

The URL should become:
```
✅ https://api.rukapay.net/auth/merchant/login
```

Instead of:
```
❌ https://merchant.rukapay.co.ug/auth/undefined/auth/merchant/login
```

---

## 💡 Why This Happens

Next.js **replaces** `process.env.NEXT_PUBLIC_*` at **build time**.

**Local development:**
- Reads from `.env` file ✅
- Variables available at runtime

**Production (Vercel/Netlify):**
- `.env` file NOT deployed (in .gitignore)
- Must set variables in platform dashboard
- Embedded during build process

**That's why it shows `undefined` - the production build didn't have access to the variables!**

---

## 🚀 Next Steps

1. **Set environment variables** in your deployment platform
2. **Redeploy** the application
3. **Check browser console** - should show production API URL
4. **Test merchant login** - should now reach backend

**The code fix is already in place** - just need the environment variables configured! 🎉

