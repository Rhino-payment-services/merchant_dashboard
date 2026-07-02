import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import axios from "axios"
import { getApiUrl } from "./config"
import {
  mapMerchantVerifyResponseToAuthUser,
  type MerchantVerifyOtpResponse,
} from "./auth/merchantOtpUser"
import { normalizeMerchantPortalPhone } from "./auth/merchantOtpPhone"

function buildMerchantAuthUserFromPayload(payload: string) {
  const data = JSON.parse(payload) as MerchantVerifyOtpResponse
  return mapMerchantVerifyResponseToAuthUser(data)
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Provider 1: Phone + OTP (Business Owners) — server-side verify fallback
    CredentialsProvider({
      id: "merchant-otp",
      name: "Merchant OTP",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.phoneNumber || !credentials?.otp) {
            throw new Error("Phone number and OTP are required")
          }

          const apiUrl = getApiUrl()
          const phoneNumber = normalizeMerchantPortalPhone(credentials.phoneNumber.trim())
          const response = await axios.post(`${apiUrl}/auth/merchant/verify-otp`, {
            phoneNumber,
            otp: String(credentials.otp).trim(),
          })

          return buildMerchantAuthUserFromPayload(JSON.stringify(response.data))
        } catch (error: any) {
          console.error("Authorization error:", error)
          const message = error.response?.data?.message
          throw new Error(
            (Array.isArray(message) ? message[0] : message) ||
              error.message ||
              "OTP verification failed",
          )
        }
      }
    }),
    // Provider 2: Email + Password (Team Members)
    CredentialsProvider({
      id: "team-member",
      name: "Team Member",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required")
          }

          // Login with backend
          const response = await axios.post(`${getApiUrl()}/auth/login`, {
            email: credentials.email,
            password: credentials.password
          })

          const { user, accessToken, refreshToken } = response.data

          console.log('📊 [Auth] Email login - Backend response:', {
            userId: user.id,
            email: user.email,
            merchantCode: user.merchantCode,
            merchants: user.merchants,
            merchantsLength: user.merchants?.length || 0
          })

          if (!accessToken || !refreshToken) {
            throw new Error("Login failed")
          }

          // Return user data with tokens (includes merchants for selection)
          const authResult = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            name: user.profile?.firstName + " " + user.profile?.lastName || user.email,
            role: user.role,
            userType: user.userType,
            subscriberType: user.subscriberType,
            merchantCode: user.merchantCode,
            merchants: user.merchants || [],
            hasPassword: user.hasPassword ?? !!user.password,
            hasPendingMerchant: user.hasPendingMerchant || false,
            accessToken,
            refreshToken,
            user: {
              ...user,
              mustChangePassword: user.mustChangePassword || user.isFirstLogin || false,
              isFirstLogin: user.isFirstLogin || false
            }
          }
          console.log('📊 [Auth] Email login - Returning:', { merchants: authResult.merchants, merchantCode: authResult.merchantCode })
          return authResult
        } catch (error: any) {
          console.error("Authorization error:", error)
          throw new Error(error.response?.data?.message || error.message || "Invalid email or password")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        const u = user as any
        console.log('📊 [Auth JWT] Initial sign in - storing merchants:', {
          merchantsCount: u.merchants?.length || 0,
          merchants: u.merchants,
          merchantCode: u.merchantCode
        })
        token.accessToken = u.accessToken
        token.refreshToken = u.refreshToken
        token.user = u.user
        token.id = u.id
        token.role = u.role
        token.userType = u.userType
        token.subscriberType = u.subscriberType
        token.merchantCode = u.merchantCode
        token.merchants = u.merchants || []
        token.viewingChildMerchantId = u.viewingChildMerchantId ?? null
        token.viewingChildMerchantName = u.viewingChildMerchantName ?? null
        token.hasPendingMerchant = u.hasPendingMerchant || false
        token.hasPassword = u.hasPassword ?? false
      }

      // Handle session update (e.g. merchant selection)
      if (trigger === "update" && session) {
        console.log('📊 [Auth JWT] Session update:', session)
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      // Pass token data to session
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).userType = token.userType as string;
        (session.user as any).subscriberType = token.subscriberType as string;
        (session.user as any).merchantCode = token.merchantCode as string;
        (session.user as any).merchants = token.merchants as any[];
        (session.user as any).viewingChildMerchantId = (token.viewingChildMerchantId as string | null) ?? null;
        (session.user as any).viewingChildMerchantName = (token.viewingChildMerchantName as string | null) ?? null;
        (session.user as any).hasPendingMerchant = token.hasPendingMerchant as boolean;
        (session.user as any).hasPassword = token.hasPassword as boolean;
        (session.user as any).accessToken = token.accessToken as string;
        (session.user as any).refreshToken = token.refreshToken as string;
        (session.user as any).userData = token.user as any;
      }
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string

      return session
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // 4 hours (match backend JWT expiry)
    updateAge: 24 * 60 * 60, // Update session only once per day
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",
}

