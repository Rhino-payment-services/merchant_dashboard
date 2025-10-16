import axios from 'axios'

// Get API URL based on app environment (not NODE_ENV)
const getApiUrl = () => {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  
  if (appEnv === 'production') {
    return process.env.NEXT_PUBLIC_PRODUCTION_API_URL || process.env.NEXT_PUBLIC_API_URL;
  } else if (appEnv === 'staging') {
    return process.env.NEXT_PUBLIC_STAGING_API_URL || process.env.NEXT_PUBLIC_API_URL;
  } else {
    return process.env.NEXT_PUBLIC_DEV_API_URL || process.env.NEXT_PUBLIC_API_URL;
  }
};

const API_URL = getApiUrl();
const REFRESH_INTERVAL = 3.5 * 60 * 60 * 1000 // 3.5 hours (refresh before 4-hour expiry)

let refreshTimer: NodeJS.Timeout | null = null

/**
 * Decode JWT token to get expiry time
 */
function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Check if token is about to expire (within 30 minutes)
 */
function isTokenExpiringSoon(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  
  const now = Date.now() / 1000
  const timeUntilExpiry = decoded.exp - now
  
  // Refresh if less than 30 minutes until expiry
  return timeUntilExpiry < (30 * 60)
}

/**
 * Refresh the access token
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    
    if (!refreshToken) {
      console.warn('No refresh token available')
      return false
    }
    
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken
    })
    
    const { accessToken, refreshToken: newRefreshToken } = response.data
    
    // Update tokens in localStorage
    localStorage.setItem('accessToken', accessToken)
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken)
    }
    
    console.log('✅ Token refreshed successfully')
    return true
  } catch (error) {
    console.error('❌ Token refresh failed:', error)
    
    // If refresh fails, clear tokens and redirect to login
    localStorage.clear()
    window.location.href = '/auth/login'
    return false
  }
}

/**
 * Start automatic token refresh
 */
export function startTokenRefresh() {
  // Clear any existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  // Check token immediately
  const accessToken = localStorage.getItem('accessToken')
  if (accessToken && isTokenExpiringSoon(accessToken)) {
    refreshAccessToken()
  }
  
  // Set up periodic refresh
  refreshTimer = setInterval(async () => {
    const token = localStorage.getItem('accessToken')
    
    if (!token) {
      console.warn('No access token found, stopping refresh timer')
      stopTokenRefresh()
      return
    }
    
    // Check if token needs refresh
    if (isTokenExpiringSoon(token)) {
      console.log('🔄 Token expiring soon, refreshing...')
      await refreshAccessToken()
    }
  }, REFRESH_INTERVAL) // Check every 3.5 hours
  
  console.log('✅ Token refresh timer started')
}

/**
 * Stop automatic token refresh
 */
export function stopTokenRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
    console.log('⏹️ Token refresh timer stopped')
  }
}

/**
 * Manual token refresh (can be called on user activity)
 */
export async function manualRefreshToken(): Promise<boolean> {
  const token = localStorage.getItem('accessToken')
  
  if (!token) {
    return false
  }
  
  if (isTokenExpiringSoon(token)) {
    return await refreshAccessToken()
  }
  
  return true
}

