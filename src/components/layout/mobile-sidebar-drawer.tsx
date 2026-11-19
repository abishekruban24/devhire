"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Terminal,
  LayoutDashboard,
  Briefcase,
  Code2,
  FileCheck2,
  User,
  Building2,
  Users2,
  LogOut,
  ChevronRight,
  Sparkles,
  X,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarUser } from "./sidebar";

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: "candidate" | "recruiter";
  user?: SidebarUser | null;
}

function getInitials(name?: string | null, email?: string | null, fallback = "DH"): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return fallback;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  role,
  user,
}: MobileSidebarDrawerProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when opened
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const candidateNavItems = [
    { label: "Dashboard Overview", href: "/candidate/dashboard", icon: LayoutDashboard },
    { label: "Available Jobs", href: "/candidate/dashboard#jobs", icon: Briefcase },
    { label: "Technical Assessments", href: "/candidate/dashboard#assessments", icon: Code2 },
    { label: "Application Tracker", href: "/candidate/dashboard#applications", icon: FileCheck2 },
    { label: "Candidate Profile", href: "/candidate/dashboard#profile", icon: User },
  ];

  const recruiterNavItems = [
    { label: "Hiring Overview", href: "/recruiter/dashboard", icon: LayoutDashboard },
    { label: "Job Postings", href: "/recruiter/dashboard#jobs", icon: Briefcase },
    { label: "Assessment Library", href: "/recruiter/dashboard#assessments", icon: Code2 },
    { label: "Candidate Pipeline", href: "/recruiter/dashboard#candidates", icon: Users2 },
    { label: "Company Profile", href: "/recruiter/dashboard#company", icon: Building2 },
  ];

  const navItems = role === "candidate" ? candidateNavItems : recruiterNavItems;

  const displayName = user?.name || user?.email || (role === "candidate" ? "Alex Chen" : "Sarah Lin");
  const displayRoleLabel =
    role === "candidate"
      ? user
        ? "Candidate (Verified)"
        : "Candidate (Full Stack)"
      : user?.companyName
      ? `Recruiter • ${user.companyName}`
      : user
      ? "Technical Recruiter"
      : "Lead Tech Recruiter";
  const initials = getInitials(user?.name, user?.email, role === "candidate" ? "AC" : "SL");

  const handleSignOut = async () => {
    onClose();
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${role === "candidate" ? "Candidate" : "Recruiter"} Dashboard Navigation`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[#0A0F1D] border-r border-slate-800 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <div>
          {/* Header with Brand & Close Button */}
          <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-2.5"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm",
                  role === "candidate"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                    : "bg-gradient-to-br from-indigo-600 to-violet-600"
                )}
              >
                <Terminal className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white tracking-tight">DevHire</span>
                <span className="text-[10px] font-medium text-slate-400 capitalize">
                  {role} Console
                </span>
              </div>
            </Link>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close navigation drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-5 space-y-1">
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group",
                    isActive
                      ? role === "candidate"
                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                        : "bg-violet-600/10 text-violet-400 border border-violet-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? role === "candidate"
                          ? "text-blue-400"
                          : "text-violet-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </Link>
              );
            })}
          </div>

          {/* Role Status or Switcher */}
          {user ? (
            <div className="px-3 py-3 mx-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Active Account Session</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Role locked to <span className="text-white font-medium capitalize">{role}</span> account.
              </p>
            </div>
          ) : (
            <div className="px-3 py-3 mx-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Role Switcher (Demo Mode)</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Switch role view:
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <Link
                  href="/candidate/dashboard"
                  onClick={onClose}
                  className={cn(
                    "py-1.5 text-center rounded-md font-medium transition-all text-[11px]",
                    role === "candidate"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  Candidate
                </Link>
                <Link
                  href="/recruiter/dashboard"
                  onClick={onClose}
                  className={cn(
                    "py-1.5 text-center rounded-md font-medium transition-all text-[11px]",
                    role === "recruiter"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  Recruiter
                </Link>
              </div>
            </div>
          )}

          {/* Settings Link */}
          <div className="px-3 pt-3">
            <Link
              href={role === "candidate" ? "/candidate/dashboard#profile" : "/recruiter/dashboard#company"}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors group"
            >
              <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
              <span className="flex-1 truncate">Settings & Preferences</span>
            </Link>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080C16]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white",
                role === "candidate" ? "bg-blue-600" : "bg-violet-600"
              )}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate" title={displayName}>
                {displayName}
              </div>
              <div className="text-[11px] text-slate-400 truncate" title={displayRoleLabel}>
                {displayRoleLabel}
              </div>
            </div>
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out of DevHire"
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                title="Sign In"
                className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800/60 transition-colors"
                aria-label="Sign In"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
