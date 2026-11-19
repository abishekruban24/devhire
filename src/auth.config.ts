import "@/lib/env-diagnostics";
import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  basePath: "/api/auth",
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
        token.companyId = user.companyId ?? null;
        token.companyName = user.companyName ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        session.user.role = (token.role as UserRole) ?? "CANDIDATE";
        session.user.companyId = (token.companyId as string) ?? null;
        session.user.companyName = (token.companyName as string) ?? null;
      }
      return session;
    },
  },
  providers: [],
};
