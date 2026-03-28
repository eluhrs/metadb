import { PrismaAdapter } from "@auth/prisma-adapter";
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
          prompt: "consent",
          access_type: "offline"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      
      const adminEmail = process.env.ADMIN_EMAIL;
      const isAdmin = user.email === adminEmail;

      if (!isAdmin) {
        // Enforce the UserAllowList whitelist!
        const allowed = await prisma.userAllowList.findUnique({
          where: { email: user.email }
        });
        
        if (!allowed) {
          console.log(`Login blocked for unauthorized email: ${user.email}`);
          return false; // Deny login completely!
        }
      }

      // Auto-promote the designated admin email to LIBRARIAN on login
      if (isAdmin) {
        try {
          await prisma.user.update({
            where: { email: user.email },
            data: { role: "LIBRARIAN" }
          });
          (user as any).role = "LIBRARIAN";
        } catch (e) {
          console.error("Admin promotion failed", e);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Inject id and role from the JWT token into the active session
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
};
