import React from "react";
import Link from "next/link";
import { Bell, ArrowLeft, ShieldCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title area & mobile trigger */}
        <div className="flex items-start gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="md:hidden mt-0.5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Open sidebar navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                DevHire Home
              </Link>
              <span className="text-slate-600 text-xs">/</span>
              <span className="text-xs text-slate-400 font-medium">{role} Console</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
              <Badge variant={role === "Candidate" ? "default" : "violet"}>
                {role} View
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{user ? "Verified Session" : "Phase 1 Mock Mode"}</span>
          </div>

          {actionButton && (
            <Link href={actionButton.href || "#"}>
              <Button
                variant={role === "Candidate" ? "default" : "accent"}
                size="sm"
                className="text-xs"
              >
                {actionButton.label}
              </Button>
            </Link>
          )}

          <button
            type="button"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors border border-slate-800"
            title="Notifications (Simulated)"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
