# 🚀 Local Development Setup - Merchant Dashboard

## ⚠️ Issue You Were Facing

You were getting this error:
```
❌ items.0.walletType: property walletType should not exist
```

**Root Cause:** Your merchant dashboard was pointing to the **production server** (`dev-api.rukapay.net`) which doesn't have the updated code yet, instead of your **local backend** (`localhost:8000`).

---

## ✅ Solution: Point to Local Backend

### **Step 1: Stop Current Frontend**

If merchant dashboard is running, stop it:
```bash
# Find the process
ps aux | grep "next dev" | grep merchant_dashboard

# Kill it (replace PID with actual process ID)
kill <PID>
```

### **Step 2: Verify .env File**

Check your `/merchant_dashboard/.env` file has:
```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEV_API_URL=http://localhost:8000
```

### **Step 3: Start Merchant Dashboard**

```bash
cd /Users/jimntare/Documents/code/merchant_dashboard
yarn dev
```

### **Step 4: Verify API URL in Browser Console**

Open browser console and you should see:
```
🌍 App Environment: development
🔗 API URL: http://localhost:8000
```

If you see `dev-api.rukapay.net`, your environment variables aren't being picked up.

---

## 🔄 Quick Start Script

Create a file `start-local.sh` in merchant_dashboard:

```bash
#!/bin/bash
# Start merchant dashboard with local backend

export NEXT_PUBLIC_APP_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:8000
export NEXT_PUBLIC_DEV_API_URL=http://localhost:8000

echo "🌍 Starting Merchant Dashboard with LOCAL backend"
echo "🔗 API URL: http://localhost:8000"
echo "📱 Frontend: http://localhost:3000"

yarn dev
```

Make it executable:
```bash
chmod +x start-local.sh
```

Run it:
```bash
./start-local.sh
```

---

## 🧪 Testing Bulk Payment with walletType

### **1. Backend Must Be Running**
```bash
cd /Users/jimntare/Documents/code/rdbs_core
yarn start:dev
```

Wait for:
```
🚀 Application is running on: http://localhost:8000
```

### **2. Frontend Must Be Running**
```bash
cd /Users/jimntare/Documents/code/merchant_dashboard
yarn dev
```

Wait for:
```
- ready started server on 0.0.0.0:3000
```

### **3. Test Bulk Payment**

1. Open browser to: `http://localhost:3000`
2. Login to merchant dashboard
3. Go to Bulk Payment page
4. Add a payment (amount + recipient)
5. Click "Validate All" or "Process All"

**Expected:**
- ✅ No error about `walletType`
- ✅ Request goes to `localhost:8000` (check Network tab)
- ✅ `walletType: 'BUSINESS'` is automatically included

---

## 🔍 Troubleshooting

### **Issue: Still hitting dev-api.rukapay.net**

**Solution 1:** Hard refresh browser
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

**Solution 2:** Clear browser cache and restart
```bash
# Stop frontend
Ctrl+C

# Clear Next.js cache
rm -rf .next

# Restart
yarn dev
```

**Solution 3:** Force environment variables
```bash
NEXT_PUBLIC_APP_ENV=development NEXT_PUBLIC_API_URL=http://localhost:8000 yarn dev
```

### **Issue: Backend not accepting walletType**

**Check if backend is fresh:**
```bash
# Kill old processes
ps aux | grep "nest\|dist/src/main" | grep -v grep
kill -9 <PID>

# Restart backend
cd /Users/jimntare/Documents/code/rdbs_core
yarn start:dev
```

**Verify walletType is in schema:**
```bash
curl -s http://localhost:8000/internal/docs-json | grep -o '"walletType"' | wc -l
# Should output: 12 or more
```

---

## ✅ Verification Checklist

Before testing bulk payments, verify:

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Browser console shows: `API URL: http://localhost:8000`
- [ ] Network tab shows requests going to `localhost:8000` (NOT `dev-api.rukapay.net`)
- [ ] No errors in backend logs
- [ ] No errors in frontend console

---

## 🎯 What Should Work Now

1. ✅ **Bulk Payment Form**
   - No wallet type selector (removed)
   - Message: "💼 Payments will be deducted from your Business Wallet"

2. ✅ **Backend Validation**
   - Accepts `walletType: 'BUSINESS'`
   - No error: `property walletType should not exist`

3. ✅ **Transaction Processing**
   - All bulk payments use BUSINESS wallet
   - Proper wallet debiting
   - Comprehensive metadata stored

---

## 📝 Notes

- **Local Development**: Use `localhost:8000` (your updated backend)
- **Staging**: Use `dev-api.rukapay.net` (needs deployment)
- **Production**: Use `api.rukapay.net` (needs deployment)

The `walletType` field is **only** in your local backend right now. To use staging/production, you need to deploy the updated code.

---

## 🚀 Next Steps

1. **Test locally** with the steps above
2. **Deploy to staging** if tests pass
3. **Deploy to production** after staging verification

---

## 💡 Quick Commands

```bash
# Start everything locally
cd /Users/jimntare/Documents/code/rdbs_core && yarn start:dev &
cd /Users/jimntare/Documents/code/merchant_dashboard && yarn dev

# Check what's running
ps aux | grep -E "(nest|next)" | grep -v grep

# Check API URL in browser
# Open console and look for: 🔗 API URL: http://localhost:8000
```

---

**Remember:** The changes are ready and working locally. You just need to point your frontend to the local backend! 🎉

