/**
 * Environment-based configuration
 * Uses NEXT_PUBLIC_APP_ENV to select the correct API URL
 */

export const getApiUrl = (): string => {
  // Use custom NEXT_PUBLIC_APP_ENV instead of NODE_ENV
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  
  let apiUrl = '';
  
  // Select API URL based on app environment
  if (appEnv === 'production') {
    apiUrl = process.env.NEXT_PUBLIC_PRODUCTION_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  } else if (appEnv === 'staging') {
    apiUrl = process.env.NEXT_PUBLIC_STAGING_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  } else {
    // development or any other value
    apiUrl = process.env.NEXT_PUBLIC_DEV_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  }
  
  // Safety check - if still empty/undefined, use fallback
  if (!apiUrl || apiUrl === 'undefined') {
    console.error('⚠️ API_URL is undefined! Check your environment variables.');
    console.log('Environment variables:', {
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
      NEXT_PUBLIC_PRODUCTION_API_URL: process.env.NEXT_PUBLIC_PRODUCTION_API_URL,
      NEXT_PUBLIC_STAGING_API_URL: process.env.NEXT_PUBLIC_STAGING_API_URL,
      NEXT_PUBLIC_DEV_API_URL: process.env.NEXT_PUBLIC_DEV_API_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    });
    // Fallback to localhost for development
    return 'http://localhost:8000';
  }
  
  return apiUrl;
};

// Export the current API URL
export const API_URL = getApiUrl();

// Get the base URL for the payment page
const getBaseUrl = (): string => {
  // Use custom environment variable or fallback to window.location.origin in browser
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_PAYMENT_PAGE_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_PAYMENT_PAGE_URL || '';
};

export const API_CONFIG = {
  API_URL: API_URL,
  PAYMENT_PAGE_URL: getBaseUrl(),
  ENVIRONMENT: process.env.NEXT_PUBLIC_APP_ENV || 'development',
};

// Log environment configuration (only in browser)
if (typeof window !== 'undefined') {
  console.log(`🌍 App Environment: ${process.env.NEXT_PUBLIC_APP_ENV || 'development'}`);
  console.log(`🔗 API URL: ${API_URL}`);
  console.log(`💳 Payment Page URL: ${API_CONFIG.PAYMENT_PAGE_URL}`);
}

export default {
  apiUrl: API_URL,
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
};

