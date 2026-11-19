"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Terminal,
  Menu,
  X,
  ArrowRight,
  UserCheck,
  Briefcase,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NavbarUser {
  name?: string | null;
  email?: string | null;
  role?: string;
}

export interface NavbarProps {
  user?: NavbarUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardHref =
    user?.role === "RECRUITER" ? "/recruiter/dashboard" : "/candidate/dashboard";

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#080C14]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              DevHire
              <span className="inline-block rounded bg-blue-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a
            href="#features"
            className="hover:text-white transition-colors duration-150"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-white transition-colors duration-150"
          >
            How It Works
          </a>
          {user ? (
            <Link
              href={dashboardHref}
              className="hover:text-blue-400 transition-colors duration-150 flex items-center gap-1.5"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-blue-400" />
              My Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register/candidate"
                className="hover:text-blue-400 transition-colors duration-150 flex items-center gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                For Candidates
              </Link>
              <Link
                href="/register/recruiter"
                className="hover:text-violet-400 transition-colors duration-150 flex items-center gap-1.5"
              >
                <Briefcase className="h-3.5 w-3.5 text-violet-400" />
                For Recruiters
              </Link>
            </>
          )}
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href={dashboardHref}>
                <Button variant="default" size="sm" className="group gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-slate-700/80 hover:border-rose-500/50 hover:text-rose-400 text-slate-300 gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700/80 hover:border-slate-600 text-slate-200"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="default" size="sm" className="group gap-1.5">
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0A101D] px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-white"
            >
              How It Works
            </a>
            {user ? (
              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 text-blue-400 hover:text-blue-300 flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                My Dashboard ({user.role?.toLowerCase()})
              </Link>
            ) : (
              <>
                <Link
                  href="/register/candidate"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 text-blue-400 hover:text-blue-300 flex items-center gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Candidate Registration
                </Link>
                <Link
                  href="/register/recruiter"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 text-violet-400 hover:text-violet-300 flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Recruiter Registration
                </Link>
              </>
            )}
          </div>
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            {user ? (
              <>
                <Link href={dashboardHref} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full justify-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Go to Dashboard</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full justify-center gap-2 text-rose-400 border-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full justify-center">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
