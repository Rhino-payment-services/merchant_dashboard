
import axios from "axios";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const options = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phoneNumber: { label: "phoneNumber", type: "text" },
        otp: { label: "otp", type: "text" },
      },

      async authorize(credentials) {
        console.log("[NextAuth] authorize called with:", credentials);
        if (!credentials?.phoneNumber || !credentials?.otp) {
          return null; 
        }
        try {
          const response = await axios.post(`${process.env.NEXT_PUBLIC_MERCHANT_URL}/merchant/verify-otp-and-phonenumber`, {
            phoneNumber: credentials.phoneNumber,
            otp: credentials.otp,
          });
          console.log("[NextAuth] backend response:", response.data);
          if (response?.data && response?.data?.merchantId) {
            return {
              merchantId: response.data.merchantId,
              phoneNumber: credentials.phoneNumber, // always set from credentials
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error(
            "Error during authentication:",
            error.response?.data || error.message
          );
          return null; 
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("[NextAuth] jwt callback user:", user);
        return {
          merchantId: user.merchantId,
          phoneNumber: user.phoneNumber,
        };
      }
      console.log("[NextAuth] jwt callback token:", token);
      return token;
    },
    async session({ session, token }) {
      console.log("[NextAuth] session callback token:", token);
      return {
        ...session,
        user: {
          ...session.user,
          merchantId: token.merchantId,
          phoneNumber: token.phoneNumber,
        },
      };
    },
  },
  secret: process.env.NEXT_PUBLIC_NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
};

export default function auth(req, res) {
  return NextAuth(req, res, options);
}