import axios from 'axios'
import { API_URL } from '../config'

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000, // Increased to 60 seconds to prevent premature timeouts
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue: any[] = []

/** Short-lived session cache so paginated/export bursts don't call getSession() every request. */
type CachedSession = {
  accessToken?: string | null
  refreshToken?: string | null
  merchantCode?: string | null
  expiresAt: number
}
let cachedSession: CachedSession | null = null
const SESSION_CACHE_TTL_MS = 5_000

export function invalidateApiSessionCache() {
  cachedSession = null
}

async function resolveSessionAuth(): Promise<{
  accessToken?: string | null
  refreshToken?: string | null
  merchantCode?: string | null
}> {
  if (typeof window === 'undefined') return {}
  const now = Date.now()
  if (cachedSession && cachedSession.expiresAt > now) {
    return cachedSession
  }
  try {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()
    cachedSession = {
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      merchantCode: (session?.user as any)?.merchantCode ?? null,
      expiresAt: now + SESSION_CACHE_TTL_MS,
    }
    return cachedSession
  } catch (error) {
    console.error('Error getting session:', error)
    return {}
  }
}

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      const session = await resolveSessionAuth()

      if (session.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`
      }
      const merchantCode = session.merchantCode
      if (merchantCode != null && String(merchantCode).trim() !== '') {
        config.headers['X-Merchant-Code'] = String(merchantCode).trim()
      }
      if (!config.headers.Authorization) {
        const accessToken = localStorage.getItem('accessToken')
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`
        }
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch(err => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      invalidateApiSessionCache()
      let refreshToken = (await resolveSessionAuth()).refreshToken || null
      if (!refreshToken) {
        refreshToken = localStorage.getItem('refreshToken')
      }
      
      if (!refreshToken) {
        try {
          const { signOut } = await import('next-auth/react')
          await signOut({ redirect: true, callbackUrl: '/auth/login' })
        } catch (err) {
          localStorage.clear()
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        })
        
        const { accessToken, refreshToken: newRefreshToken } = response.data
        
        localStorage.setItem('accessToken', accessToken)
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken)
        }

        const priorMerchantCode = cachedSession?.merchantCode ?? null
        invalidateApiSessionCache()
        cachedSession = {
          accessToken,
          refreshToken: newRefreshToken || refreshToken,
          merchantCode: priorMerchantCode,
          expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        }
        
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        
        processQueue(null, accessToken)
        
        isRefreshing = false
        
        return apiClient(originalRequest)
      } catch (refreshError: any) {
        processQueue(refreshError, null)
        isRefreshing = false
        invalidateApiSessionCache()
        
        console.error('Token refresh failed:', refreshError)
        
        localStorage.clear()
        window.location.href = '/auth/login'
        
        return Promise.reject(refreshError)
      }
    }
    
    // Handle timeout errors. For money-out process calls, the partner may still
    // complete after our client gives up — tell the merchant to check back, not retry.
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('Request timeout:', error.config.url)
      const url = String(error.config?.url || '')
      const isMoneyMovement =
        url.includes('/transactions/process') ||
        url.includes('/transactions/bulk')
      return Promise.reject(
        new Error(
          isMoneyMovement
            ? 'Request timed out while the transfer may still be processing. Please check transactions later — do not retry the same transfer.'
            : 'Request timed out. Please try again.',
        ),
      )
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
