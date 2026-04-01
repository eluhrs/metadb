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
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      
      const incomingEmail = user.email.toLowerCase();
      const adminEmail = (process.env.ADMIN_EMAIL || "").replace(/['"]/g, "").toLowerCase();
      const isAdmin = incomingEmail === adminEmail;

      if (!isAdmin) {
        // Enforce the UserAllowList whitelist!
        const allowed = await prisma.userAllowList.findUnique({
          where: { email: incomingEmail }
        });
        
        if (!allowed) {
          console.log(`Login blocked for unauthorized email: ${user.email} (parsed as ${incomingEmail})`);
          return false; // Deny login completely!
        }
      }

      // Auto-promote the designated admin email to LIBRARIAN on login
      if (isAdmin) {
        try {
          await prisma.user.update({
            where: { email: incomingEmail },
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
      if (account && user) {
        token.accessToken = account.access_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3500 * 1000;
        token.id = user.id;
        token.role = (user as any).role;
        
        let rt = account.refresh_token;
        if (!rt) {
           const dbAcc = await prisma.account.findFirst({ where: { userId: user.id, provider: 'google' } });
           rt = dbAcc?.refresh_token || undefined;
        }
        token.refreshToken = rt;
      }

      // Check if access token is still physically valid
      if (Date.now() < ((token.accessTokenExpires as number) || 0)) {
        return token;
      }

      // Token has expired -> Execute silent Google API Refresh
      if (token.refreshToken) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
            method: "POST",
          });
          const refreshedTokens = await response.json();
          if (response.ok) {
            token.accessToken = refreshedTokens.access_token;
            token.accessTokenExpires = Date.now() + (refreshedTokens.expires_in * 1000);
            if (refreshedTokens.refresh_token) {
               token.refreshToken = refreshedTokens.refresh_token;
            }
          }
        } catch (e) {
          console.error("Google Token Refresh Sequence Failed:", e);
        }
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
