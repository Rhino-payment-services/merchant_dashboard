import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const authOptions: NextAuthOptions = {
  providers: [
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

          // Verify OTP with backend
          const response = await axios.post(`${API_URL}/auth/merchant/verify-otp`, {
            phoneNumber: credentials.phoneNumber,
            otp: credentials.otp
          })

          const { success, user, accessToken, refreshToken, message } = response.data

          if (!success || !accessToken || !refreshToken) {
            throw new Error(message || "OTP verification failed")
          }

          // Return user data with tokens
          return {
            id: user.id,
            email: user.email,
            phone: user.phone,
            name: user.profile?.firstName + " " + user.profile?.lastName || user.phone,
            role: user.role,
            userType: user.userType,
            subscriberType: user.subscriberType,
            merchantCode: user.merchantCode,
            accessToken,
            refreshToken,
            user: user
          }
        } catch (error: any) {
          console.error("Authorization error:", error)
          throw new Error(error.response?.data?.message || error.message || "OTP verification failed")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.user = user.user
        token.id = user.id
        token.role = user.role
        token.userType = user.userType
        token.subscriberType = user.subscriberType
        token.merchantCode = user.merchantCode
      }

      // Handle session update
      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      // Pass token data to session
      session.user = {
        ...session.user,
        id: token.id as string,
        role: token.role as string,
        userType: token.userType as string,
        subscriberType: token.subscriberType as string,
        merchantCode: token.merchantCode as string,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        userData: token.user as any
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
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

