"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  role: "Candidate" | "Recruiter";
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  actionButton?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  onMenuClick?: () => void;
}

export function DashboardHeader({
  title,
  subtitle,
  role,
  user,
  actionButton,
  onMenuClick,
}: DashboardHeaderProps) {
  const isCandidate = role === "Candidate";

  return (
    <div className="px-4 sm:px-6 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title area & mobile trigger */}
        <div className="flex items-start gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className={`md:hidden mt-0.5 p-2 rounded-lg transition-colors border focus:outline-none focus:ring-2 ${
                isCandidate
                  ? "text-slate-400 hover:text-white hover:bg-slate-800/60 border-slate-800 focus:ring-cyan-500"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60 border-slate-800 focus:ring-purple-500"
              }`}
              aria-label="Open sidebar navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                DevHire Home
              </Link>
              <span className="text-slate-600 text-xs">/</span>
              <span
                className={`text-xs font-medium ${
                  isCandidate ? "text-cyan-400" : "text-purple-400"
                }`}
              >
                {role} Console
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">{title}</h1>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                  isCandidate
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                }`}
              >
                {isCandidate ? "Developer Hub" : "Talent Suite"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{user ? "Verified Session" : "Active"}</span>
          </div>

          {actionButton && (
            actionButton.onClick ? (
              <Button
                onClick={actionButton.onClick}
                size="sm"
                className={`text-xs font-semibold h-8 px-3 shadow-sm ${
                  isCandidate
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
                }`}
              >
                {actionButton.label}
              </Button>
            ) : (
              <Link href={actionButton.href || "#"}>
                <Button
                  size="sm"
                  className={`text-xs font-semibold h-8 px-3 shadow-sm ${
                    isCandidate
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
                  }`}
                >
                  {actionButton.label}
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
