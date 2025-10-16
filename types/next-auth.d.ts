import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      email?: string
      name?: string
      phone?: string
      role?: string
      userType?: string
      subscriberType?: string
      merchantCode?: string
      accessToken?: string
      refreshToken?: string
      userData?: any
    }
  }

  interface User {
    id: string
    email?: string
    name?: string
    phone?: string
    role?: string
    userType?: string
    subscriberType?: string
    merchantCode?: string
    accessToken: string
    refreshToken: string
    user?: any
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    accessToken?: string
    refreshToken?: string
    role?: string
    userType?: string
    subscriberType?: string
    merchantCode?: string
    user?: any
  }
}

