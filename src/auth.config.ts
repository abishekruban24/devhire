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
        // Explicitly set all user identity claims to prevent retaining previous session data
        token.sub = user.id;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role as UserRole;
        token.companyId = user.companyId ?? null;
        token.companyName = user.companyName ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.role = token.role as UserRole;
        session.user.companyId = (token.companyId as string) ?? null;
        session.user.companyName = (token.companyName as string) ?? null;
      }
      return session;
    },
  },
  providers: [],
};
