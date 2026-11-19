"use client";

import React, { useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { DashboardHeader, DashboardHeaderProps } from "./dashboard-header";
import { MobileSidebarDrawer } from "./mobile-sidebar-drawer";
import { BackToTop } from "@/components/ui/back-to-top";

interface DashboardLayoutProps {
  role: "candidate" | "recruiter";
  title: string;
  subtitle: string;
  actionButton?: DashboardHeaderProps["actionButton"];
  children: React.ReactNode;
}

export function DashboardLayout({
  role,
  title,
  subtitle,
  actionButton,
  children,
}: DashboardLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#080C14] text-slate-100">
      {/* Mobile Collapsible Navigation Drawer */}
      <MobileSidebarDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        role={role}
      />

      {/* Stationary Desktop Sidebar (~260px wide, outside scroll container) */}
      <aside className="hidden h-full w-[260px] shrink-0 border-r border-slate-800/80 bg-[#0A0F1D] md:flex md:flex-col">
        <Sidebar role={role} />
      </aside>

      {/* Right Column: Stationary Header + Scrollable Content Panel */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Stationary Dashboard Header */}
        <header className="shrink-0 border-b border-slate-800/80 bg-[#080C14]">
          <DashboardHeader
            title={title}
            subtitle={subtitle}
            role={role === "candidate" ? "Candidate" : "Recruiter"}
            actionButton={actionButton}
            onMenuClick={() => setMobileDrawerOpen(true)}
          />
        </header>

        {/* Scrollable Main Content Container */}
        <main
          ref={mainScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Floating subtle Back-To-Top button attached to scrollable main */}
      <BackToTop scrollContainerRef={mainScrollRef} />
    </div>
  );
}
