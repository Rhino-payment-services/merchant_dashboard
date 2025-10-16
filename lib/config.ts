/**
 * Environment-based configuration
 * Uses NEXT_PUBLIC_APP_ENV to select the correct API URL
 */

export const getApiUrl = (): string => {
  // Use custom NEXT_PUBLIC_APP_ENV instead of NODE_ENV
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  
  // Select API URL based on app environment
  if (appEnv === 'production') {
    return process.env.NEXT_PUBLIC_PRODUCTION_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  } else if (appEnv === 'staging') {
    return process.env.NEXT_PUBLIC_STAGING_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  } else {
    // development or any other value
    return process.env.NEXT_PUBLIC_DEV_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  }
};

// Export the current API URL
export const API_URL = getApiUrl();

// Log environment configuration (only in browser)
if (typeof window !== 'undefined') {
  console.log(`🌍 App Environment: ${process.env.NEXT_PUBLIC_APP_ENV || 'development'}`);
  console.log(`🔗 API URL: ${API_URL}`);
}

export default {
  apiUrl: API_URL,
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
};

