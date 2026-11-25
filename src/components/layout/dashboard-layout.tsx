"use client";

import React, { useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { DashboardHeader, DashboardHeaderProps } from "./dashboard-header";
import { MobileSidebarDrawer } from "./mobile-sidebar-drawer";
import { BackToTop } from "@/components/ui/back-to-top";
import { cn } from "@/lib/utils";
import type { SidebarUser } from "./sidebar";

interface DashboardLayoutProps {
  role: "candidate" | "recruiter";
  title: string;
  subtitle: string;
  user?: SidebarUser | null;
  actionButton?: DashboardHeaderProps["actionButton"];
  activeView?: string;
  onViewChange?: (view: string) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  role,
  title,
  subtitle,
  user,
  actionButton,
  activeView,
  onViewChange,
  children,
}: DashboardLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  return (
    <div
      className={cn(
        "flex h-dvh overflow-hidden text-slate-100",
        role === "candidate" ? "bg-[#070B14]" : "bg-[#080712]"
      )}
    >
      {/* Mobile Collapsible Navigation Drawer */}
      <MobileSidebarDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        role={role}
        user={user}
        activeView={activeView}
        onViewChange={onViewChange}
      />

      {/* Stationary Desktop Sidebar (~260px wide, outside scroll container) */}
      <aside className="hidden h-full w-[260px] shrink-0 md:flex md:flex-col">
        <Sidebar
          role={role}
          user={user}
          activeView={activeView}
          onViewChange={onViewChange}
        />
      </aside>

      {/* Right Column: Stationary Header + Scrollable Content Panel */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Stationary Dashboard Header */}
        <header
          className={cn(
            "shrink-0 border-b",
            role === "candidate"
              ? "border-cyan-950/40 bg-[#070B14]/90 backdrop-blur-md"
              : "border-purple-950/40 bg-[#080712]/90 backdrop-blur-md"
          )}
        >
          <DashboardHeader
            title={title}
            subtitle={subtitle}
            role={role === "candidate" ? "Candidate" : "Recruiter"}
            user={user}
            actionButton={actionButton}
            onMenuClick={() => setMobileDrawerOpen(true)}
          />
        </header>

        {/* Scrollable Main Content Container */}
        <main
          ref={mainScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain overflow-x-hidden"
        >
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Floating subtle Back-To-Top button attached to scrollable main */}
      <BackToTop scrollContainerRef={mainScrollRef} />
    </div>
  );
}
