"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Terminal,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { getAuthenticatedUserRole } from "@/features/auth/actions/auth-actions";

function isSafeInternalCallback(url: string | null): url is string {
  if (!url) return false;
  // Must start with single forward slash, no backslashes, no double slashes, no protocol
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
    return false;
  }
  try {
    const parsed = new URL(url, "https://devhire.local");
    return parsed.origin === "https://devhire.local";
  } catch {
    return false;
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const registered = searchParams.get("registered");
  const initialEmail = searchParams.get("email");

  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Authenticate credentials first (prevents unauthenticated user/role enumeration)
        const res = await signIn("credentials", {
          email: cleanEmail,
          password,
          redirect: false,
        });

        if (res?.error) {
          if (res.error.toLowerCase().includes("too many")) {
            setErrorMessage(
              "Too many failed login attempts. Please wait 5 minutes before trying again."
            );
          } else {
            setErrorMessage(
              "Invalid email or password. Please verify your credentials and try again."
            );
          }
          return;
        }

        // 2. Credentials valid - display success feedback
        setSuccessMessage("Authentication verified. Redirecting to your dashboard...");

        // 3. Resolve user role authoritatively from the authenticated server session
        const authRoleRes = await getAuthenticatedUserRole();

        let targetUrl = "/auth/redirect";

        if (authRoleRes.success && authRoleRes.role) {
          const userRole = authRoleRes.role;
          targetUrl = userRole === "RECRUITER" ? "/recruiter/dashboard" : "/candidate/dashboard";

          // If a valid safe internal callbackUrl was specified and compatible with role
          if (isSafeInternalCallback(callbackUrl)) {
            const isCandidateRoute = callbackUrl.startsWith("/candidate");
            const isRecruiterRoute = callbackUrl.startsWith("/recruiter");

            if (userRole === "RECRUITER" && !isCandidateRoute) {
              targetUrl = callbackUrl;
            } else if (userRole === "CANDIDATE" && !isRecruiterRoute) {
              targetUrl = callbackUrl;
            }
          }
        }

        // Hard navigation to flush client memory caches and ensure all cookies are sent to document
        window.location.href = targetUrl;
      } catch (err) {
        console.error("Login unexpected error:", err);
        setErrorMessage("An unexpected network or authentication error occurred. Please try again.");
      }
    });
  };

  return (
    <Card className="border-slate-800 bg-[#0E1526] shadow-2xl shadow-blue-950/20">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <LogIn className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              DevHire Sign In
            </span>
          </div>
          <Badge variant="default">Verified Credentials</Badge>
        </div>
        <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          Sign in to access your technical evaluations, pipelines, or candidate profile.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-2">
          {registered && !errorMessage && !successMessage && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                {registered === "recruiter"
                  ? "Recruiter workspace registered successfully! Please log in below."
                  : "Candidate account registered successfully! Please log in below."}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Email input */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-slate-300">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com or recruiter@company.com"
              disabled={isPending}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60"
            />
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isPending}
                className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            variant="default"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to DevHire</span>
            )}
          </Button>

          <div className="text-center text-xs text-slate-400 pt-1">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-blue-400 hover:underline font-medium">
              Create an account
            </Link>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-800/80">
            <Link href="/register/candidate" className="hover:text-slate-300 transition-colors">
              Candidate Register &rarr;
            </Link>
            <span>&bull;</span>
            <Link href="/register/recruiter" className="hover:text-slate-300 transition-colors">
              Recruiter Register &rarr;
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#0A0F1D]/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">DevHire</span>
        </Link>
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full space-y-6">
          <Suspense
            fallback={
              <Card className="border-slate-800 bg-[#0E1526] p-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-xs">Loading sign-in interface...</p>
              </Card>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 p-4 text-center text-xs text-slate-500">
        &copy; 2026 DevHire Platform &bull; Smart Technical Recruitment
      </footer>
    </div>
  );
}
