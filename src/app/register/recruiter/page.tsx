"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal, Users2, ArrowLeft, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { registerRecruiter } from "@/features/auth/actions/register";

export default function RecruiterRegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("companyName", companyName);
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);

    startTransition(async () => {
      const res = await registerRecruiter(formData);
      if (!res.success) {
        if (res.errors) {
          setFieldErrors(res.errors);
        }
        if (res.message) {
          setFormError(res.message);
        }
      } else {
        setSuccessMessage("Recruiter account and company workspace created! Redirecting to login...");
        setTimeout(() => {
          router.push("/login?registered=recruiter");
        }, 1200);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#0A0F1D]/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">DevHire</span>
        </Link>
        <Link
          href="/register"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Change Role</span>
        </Link>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full space-y-6">
          <Card className="border-slate-800 bg-[#0E1526] shadow-2xl shadow-violet-950/20">
            <CardHeader className="space-y-2 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400 border border-violet-500/20">
                    <Users2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                    Recruiter Console
                  </span>
                </div>
                <Badge variant="violet">Recruiter Registration</Badge>
              </div>
              <CardTitle className="text-2xl text-white">Create Recruiter Account</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Author coding assessments, post vacancies, and benchmark verified engineering candidates.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-2">
                {formError && (
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-xs font-medium text-slate-300">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Lin"
                    disabled={isPending}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-red-400">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Company Name</span>
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. CloudScale Systems"
                    disabled={isPending}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  {fieldErrors.companyName && (
                    <p className="text-[11px] text-red-400">{fieldErrors.companyName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                    Work Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@cloudscale.io"
                    disabled={isPending}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-400">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters (A-Z, a-z, 0-9)"
                      disabled={isPending}
                      className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-400">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    disabled={isPending}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-red-400">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Company Workspace...</span>
                    </>
                  ) : (
                    <span>Register Recruiter & Company</span>
                  )}
                </Button>

                <div className="text-center text-xs text-slate-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-violet-400 hover:underline font-medium">
                    Log in here
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 p-4 text-center text-xs text-slate-500">
        &copy; 2026 DevHire Platform &bull; Smart Technical Recruitment
      </footer>
    </div>
  );
}
