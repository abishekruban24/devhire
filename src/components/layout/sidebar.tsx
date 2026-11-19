"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  role: "candidate" | "recruiter";
  className?: string;
}

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();

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

  return (
    <div
      className={cn(
        "flex flex-col h-full justify-between bg-[#0A0F1D] text-slate-100",
        className
      )}
    >
      {/* Top: Logo & Navigation & Role Switcher & Settings */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
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
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <div className="space-y-1">
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

          {/* Role Switcher Section */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Role Switcher (Phase 1)</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
              Toggle between roles to review both perspective mock layouts:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Link
                href="/candidate/dashboard"
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

          {/* Settings Link */}
          <div className="pt-1">
            <Link
              href={role === "candidate" ? "/candidate/dashboard#profile" : "/recruiter/dashboard#company"}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors group"
            >
              <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
              <span className="flex-1 truncate">Settings & Preferences</span>
            </Link>
          </div>
        </div>
      </div>

      {/* User profile footer - anchored to the bottom */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0A0F1D] shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0",
              role === "candidate" ? "bg-blue-600" : "bg-violet-600"
            )}
          >
            {role === "candidate" ? "AC" : "SL"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {role === "candidate" ? "Alex Chen" : "Sarah Lin"}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {role === "candidate" ? "Candidate (Full Stack)" : "Lead Tech Recruiter"}
            </div>
          </div>
          <Link
            href="/"
            title="Return to Landing Page"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
