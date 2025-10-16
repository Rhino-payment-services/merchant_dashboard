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
    // Try to get session from NextAuth
    if (typeof window !== 'undefined') {
      try {
        const { getSession } = await import('next-auth/react')
        const session = await getSession()
        
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`
        } else {
          // Fallback to localStorage for backwards compatibility
          const accessToken = localStorage.getItem('accessToken')
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
          }
        }
      } catch (error) {
        console.error('Error getting session:', error)
        // Fallback to localStorage
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

      // Try to get refresh token from session or localStorage
      let refreshToken = null
      
      try {
        const { getSession } = await import('next-auth/react')
        const session = await getSession()
        refreshToken = session?.refreshToken
      } catch (err) {
        console.error('Error getting session for refresh:', err)
      }
      
      if (!refreshToken) {
        refreshToken = localStorage.getItem('refreshToken')
      }
      
      if (!refreshToken) {
        // No refresh token, logout with NextAuth
        try {
          const { signOut } = await import('next-auth/react')
          await signOut({ redirect: true, callbackUrl: '/auth/login' })
        } catch (err) {
          // Fallback to manual redirect
          localStorage.clear()
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      }

      try {
        // Try to refresh token using the standard auth refresh endpoint
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        })
        
        const { accessToken, refreshToken: newRefreshToken } = response.data
        
        // Store new tokens
        localStorage.setItem('accessToken', accessToken)
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken)
        }
        
        // Update authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        
        // Process queued requests
        processQueue(null, accessToken)
        
        isRefreshing = false
        
        // Retry original request
        return apiClient(originalRequest)
      } catch (refreshError: any) {
        // Refresh failed
        processQueue(refreshError, null)
        isRefreshing = false
        
        console.error('Token refresh failed:', refreshError)
        
        // Clear storage and redirect to login
        localStorage.clear()
        window.location.href = '/auth/login'
        
        return Promise.reject(refreshError)
      }
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('Request timeout:', error.config.url)
      return Promise.reject(new Error('Request timed out. Please try again.'))
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
