"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

/**
 * Server action to securely resolve the authenticated user's role from their server session.
 * STRICT SECURITY:
 * - Requires an authenticated session via auth()
 * - Never accepts arbitrary unauthenticated email parameters to prevent email/role enumeration
 * - Queries PostgreSQL authoritatively using the authenticated session's user ID
 */
export async function getAuthenticatedUserRole(): Promise<{
  success: boolean;
  role?: UserRole;
  defaultDestination?: string;
  message?: string;
}> {
  let session = null;
  try {
    session = await auth();
  } catch {
    // If auth fails or is called outside a valid request context, fail closed as unauthorized
    return { success: false, message: "Unauthorized: Active session required." };
  }

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized: Active session required." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return { success: false, message: "User not found in database." };
    }

    const role = user.role as UserRole;
    const defaultDestination =
      role === "RECRUITER"
        ? "/recruiter/dashboard"
        : role === "CANDIDATE"
        ? "/candidate/dashboard"
        : "/login?error=AccessDenied";

    return {
      success: true,
      role,
      defaultDestination,
    };
  } catch (err) {
    console.error("[getAuthenticatedUserRole Error]:", err);
    return { success: false, message: "Database lookup failed." };
  }
}
