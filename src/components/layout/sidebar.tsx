"use client";

import React from "react";
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
  ShieldCheck,
  ClipboardCheck,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  companyName?: string | null;
}

export interface SidebarProps {
  role: "candidate" | "recruiter";
  className?: string;
  user?: SidebarUser | null;
  activeView?: string;
  onViewChange?: (view: string) => void;
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

export function Sidebar({ role, className, user, activeView, onViewChange }: SidebarProps) {
  const pathname = usePathname();

  const candidateNavItems = [
    { id: "overview", label: "Overview", href: "/candidate/dashboard?view=overview", icon: LayoutDashboard },
    { id: "jobs", label: "Explore Jobs", href: "/candidate/dashboard?view=jobs", icon: Briefcase },
    { id: "applications", label: "My Applications", href: "/candidate/dashboard?view=applications", icon: FileCheck2 },
    { id: "assessments", label: "My Assessments", href: "/candidate/dashboard?view=assessments", icon: Code2 },
    { id: "history", label: "Assessment History", href: "/candidate/dashboard?view=history", icon: History },
    { id: "profile", label: "My Profile", href: "/candidate/dashboard?view=profile", icon: User },
  ];

  const recruiterNavItems = [
    { id: "overview", label: "Hiring Overview", href: "/recruiter/dashboard?view=overview", icon: LayoutDashboard },
    { id: "jobs", label: "Job Management", href: "/recruiter/dashboard?view=jobs", icon: Briefcase },
    { id: "applicants", label: "Applicants", href: "/recruiter/dashboard?view=applicants", icon: Users2 },
    { id: "assessments", label: "Assessments", href: "/recruiter/dashboard?view=assessments", icon: Code2 },
    { id: "reviews", label: "Manual Reviews", href: "/recruiter/dashboard?view=reviews", icon: ClipboardCheck },
    { id: "company", label: "Company Profile", href: "/recruiter/dashboard?view=company", icon: Building2 },
  ];

  const navItems = role === "candidate" ? candidateNavItems : recruiterNavItems;

  const displayName = user?.name || user?.email || (role === "candidate" ? "Candidate" : "Recruiter");
  const displayRoleLabel =
    role === "candidate"
      ? user
        ? "Candidate (Verified)"
        : "Candidate (Developer)"
      : user?.companyName
      ? `Recruiter • ${user.companyName}`
      : user
      ? "Technical Recruiter"
      : "Lead Recruiter";
  const initials = getInitials(user?.name, user?.email, role === "candidate" ? "AC" : "SL");

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full justify-between text-slate-100",
        role === "candidate"
          ? "bg-[#0A101E] border-r border-cyan-950/40"
          : "bg-[#0E0C1B] border-r border-purple-950/40",
        className
      )}
    >
      {/* Top: Logo & Navigation */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm",
                role === "candidate"
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20"
                  : "bg-gradient-to-br from-violet-600 to-purple-600 shadow-purple-500/20"
              )}
            >
              <Terminal className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-tight">DevHire</span>
              <span className="text-[10px] font-medium text-slate-400 capitalize">
                {role === "candidate" ? "Developer Portal" : "Talent Operating System"}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-500 font-mono">
              {role === "candidate" ? "Engineering Navigation" : "Recruitment Console"}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView ? activeView === item.id : pathname === item.href;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (onViewChange) {
                      e.preventDefault();
                      onViewChange(item.id);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 group",
                    isActive
                      ? role === "candidate"
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 shadow-sm shadow-cyan-500/10 font-semibold"
                        : "bg-purple-500/15 text-purple-300 border border-purple-500/35 shadow-sm shadow-purple-500/10 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? role === "candidate"
                          ? "text-cyan-400"
                          : "text-purple-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                </Link>
              );
            })}
          </div>

          {/* Role Status */}
          {user ? (
            <div
              className={cn(
                "rounded-xl border p-3",
                role === "candidate"
                  ? "border-cyan-500/20 bg-cyan-950/20"
                  : "border-purple-500/20 bg-purple-950/20"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Active Session</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Signed in with <span className="text-white font-medium capitalize">{role}</span> credentials.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Role Switcher (Demo)</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Toggle between consoles:
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <Link
                  href="/candidate/dashboard"
                  className={cn(
                    "py-1.5 text-center rounded-md font-medium transition-all text-[11px]",
                    role === "candidate"
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  Candidate
                </Link>
                <Link
                  href="/recruiter/dashboard"
                  className={cn(
                    "py-1.5 text-center rounded-md font-medium transition-all text-[11px]",
                    role === "recruiter"
                      ? "bg-purple-600 text-white font-bold shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  Recruiter
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User profile footer - anchored to the bottom */}
      <div
        className={cn(
          "p-4 border-t border-slate-800/80 shrink-0",
          role === "candidate" ? "bg-[#0A101E]" : "bg-[#0E0C1B]"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm",
              role === "candidate"
                ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                : "bg-gradient-to-br from-violet-600 to-purple-600"
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
              title="Sign In"
              className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800/60 transition-colors"
              aria-label="Sign In"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
