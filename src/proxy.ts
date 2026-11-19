import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;
  const pathname = nextUrl.pathname;

  const isCandidateRoute = pathname.startsWith("/candidate");
  const isRecruiterRoute = pathname.startsWith("/recruiter");
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/register");

  // 1. If trying to access protected dashboards while not logged in, redirect to /login
  if ((isCandidateRoute || isRecruiterRoute) && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  // 2. Role-based protection:
  // Candidate trying to access recruiter dashboard
  if (isRecruiterRoute && userRole === "CANDIDATE") {
    return NextResponse.redirect(new URL("/candidate/dashboard", nextUrl));
  }

  // Recruiter trying to access candidate dashboard
  if (isCandidateRoute && userRole === "RECRUITER") {
    return NextResponse.redirect(new URL("/recruiter/dashboard", nextUrl));
  }

  // 3. If logged in and visiting /login or /register, redirect to appropriate dashboard
  if (isAuthRoute && isLoggedIn) {
    if (userRole === "RECRUITER") {
      return NextResponse.redirect(new URL("/recruiter/dashboard", nextUrl));
    }
    return NextResponse.redirect(new URL("/candidate/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/candidate/:path*",
    "/recruiter/:path*",
    "/login",
    "/register/:path*",
  ],
};
