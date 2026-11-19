import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: authSecret,
  providers: [
    Credentials({
      name: "DevHire Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rawEmail = String(credentials.email).trim().toLowerCase();
        const rawPassword = String(credentials.password);

        if (!rawEmail || !rawPassword) {
          return null;
        }

        // Apply brute-force protection: 5 attempts per 5 minutes per email
        const rateLimitKey = `login:${rawEmail}`;
        const limitCheck = await rateLimit(rateLimitKey, 5, 5 * 60 * 1000);
        if (!limitCheck.success) {
          throw new Error("Too many failed login attempts. Please wait 5 minutes before trying again.");
        }

        // Ensure database URL is configured
        if (!process.env.DATABASE_URL) {
          console.error("[Auth Server Error]: DATABASE_URL is not configured.");
          throw new Error("Database configuration error. Please contact administrator.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: rawEmail },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              companyId: true,
              passwordHash: true,
              company: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(rawPassword, user.passwordHash);
          if (!passwordsMatch) {
            return null;
          }

          // Clear rate limit record on successful authentication
          await resetRateLimit(rateLimitKey);

          // Return sanitized user object (never return passwordHash)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            companyName: user.company?.name ?? null,
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes("Too many")) {
            throw error;
          }
          console.error("[Auth Authorize Error]:", error);
          return null;
        }
      },
    }),
  ],
});
