# Environment Configuration Guide

## API URL Configuration

The merchant dashboard automatically selects the correct API URL based on `NODE_ENV`:

### Environment Variables

```bash
# .env file
NODE_ENV=development  # or staging or production

# Development (default)
NEXT_PUBLIC_DEV_API_URL=http://localhost:8000/api

# Staging
NEXT_PUBLIC_STAGING_API_URL=https://staging-api.rukapay.com/api

# Production
NEXT_PUBLIC_PRODUCTION_API_URL=https://api.rukapay.com/api

# Fallback (if env-specific URL not set)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### How It Works

The system automatically selects the API URL:

```
NODE_ENV=development → NEXT_PUBLIC_DEV_API_URL
NODE_ENV=staging → NEXT_PUBLIC_STAGING_API_URL
NODE_ENV=production → NEXT_PUBLIC_PRODUCTION_API_URL
```

If the environment-specific URL is not set, it falls back to `NEXT_PUBLIC_API_URL`.

### Files Updated

All API calls now use centralized config from `lib/config.ts`:
- ✅ `lib/auth.ts` - NextAuth authentication
- ✅ `lib/api/client.ts` - Axios client
- ✅ `lib/api/auth.api.ts` - Auth API calls
- ✅ `lib/utils/token-refresh.ts` - Token refresh
- ✅ `app/receive_payment/[merchant_code]/page.tsx` - Payment page

### Usage

```typescript
// Import centralized config
import { API_URL } from '@/lib/config';

// API_URL automatically contains the correct URL
fetch(`${API_URL}/endpoint`);
```

### Build for Different Environments

```bash
# Development
NODE_ENV=development npm run build

# Staging
NODE_ENV=staging npm run build

# Production
NODE_ENV=production npm run build
```

### Testing

On app startup, you'll see:
```
🌍 Environment: production
🔗 API URL: https://api.rukapay.com/api
```

This confirms the correct API URL is being used.
