import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Server-rendered auth redirect resolver.
 * Executes on the server after authentication to authoritatively inspect
 * the user's current PostgreSQL role and route to their correct dashboard.
 * Prevents client-side race conditions or cached token stale states.
 */
export const instant = false;

export default async function AuthRedirectPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!dbUser) {
    redirect("/login?error=UserNotFound");
  }

  if (dbUser.role === "RECRUITER") {
    redirect("/recruiter/dashboard");
  }

  if (dbUser.role === "CANDIDATE") {
    redirect("/candidate/dashboard");
  }

  // Fails closed for any invalid or undefined role
  redirect("/login?error=AccessDenied");
}
