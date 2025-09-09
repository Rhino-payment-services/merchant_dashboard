import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      merchantId?: string;
      phoneNumber?: string;
    } & DefaultSession["user"];
  }
  interface User {
    merchantId?: string;
    phoneNumber?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    merchantId?: string;
    phoneNumber?: string;
  }
} 