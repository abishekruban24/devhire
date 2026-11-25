"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CandidateOverviewView, CandidateUser } from "./candidate-overview-view";
import { CandidateJobDiscovery } from "./candidate-job-discovery";
import { CandidateApplicationsTracker } from "./candidate-applications-tracker";
import { UpcomingAssessmentsPreview } from "./upcoming-assessments-preview";
import { CandidateAssessmentHistoryTracker } from "./candidate-assessment-history-tracker";
import { ProfileOverviewCard } from "./profile-overview-card";
import type { PublishedJobItem } from "@/features/jobs/actions/job-actions";
import type { CandidateApplicationItem } from "@/features/applications/actions/application-actions";
import type { CandidateInvitationItem } from "@/features/assessments/actions/invitation-actions";
import type { CandidateAssessmentHistoryItem } from "@/features/assessments/actions/review-actions";
import type { CandidateProfile } from "@/types";
import type { SidebarUser } from "@/components/layout/sidebar";

export type CandidateViewId =
  | "overview"
  | "jobs"
  | "applications"
  | "assessments"
  | "history"
  | "profile";

interface CandidateConsoleProps {
  user: CandidateUser;
  profile: CandidateProfile;
  sessionUser?: SidebarUser | null;
  initialPublishedJobs: PublishedJobItem[];
  totalPublishedCount: number;
  initialApplications: CandidateApplicationItem[];
  initialInvitations: CandidateInvitationItem[];
  initialHistory: CandidateAssessmentHistoryItem[];
}

export function CandidateConsole({
  user,
  profile,
  sessionUser,
  initialPublishedJobs,
  totalPublishedCount,
  initialApplications,
  initialInvitations,
  initialHistory,
}: CandidateConsoleProps) {
  const searchParams = useSearchParams();

  // Determine initial view from query param (?view=...) or default to "overview"
  const qView = searchParams.get("view");
  const initialView: CandidateViewId =
    qView === "jobs" ||
    qView === "applications" ||
    qView === "assessments" ||
    qView === "history" ||
    qView === "profile"
      ? qView
      : "overview";

  const [activeView, setActiveView] = useState<CandidateViewId>(initialView);
  const [prevViewParam, setPrevViewParam] = useState(qView);

  // Sync state if searchParams changes externally
  if (qView !== prevViewParam) {
    setPrevViewParam(qView);
    if (initialView !== activeView) {
      setActiveView(initialView);
    }
  }

  // Listen to browser hash changes (e.g. #jobs, #applications)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (
        hash === "jobs" ||
        hash === "applications" ||
        hash === "assessments" ||
        hash === "history" ||
        hash === "profile" ||
        hash === "overview"
      ) {
        setActiveView(hash as CandidateViewId);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigateView = useCallback(
    (view: string) => {
      const validView: CandidateViewId =
        view === "jobs" ||
        view === "applications" ||
        view === "assessments" ||
        view === "history" ||
        view === "profile"
          ? (view as CandidateViewId)
          : "overview";

      setActiveView(validView);
      // Soft push URL query without full page reload
      const url = new URL(window.location.href);
      url.searchParams.set("view", validView);
      url.hash = validView;
      window.history.pushState(null, "", url.toString());
    },
    []
  );

  const appliedJobIds = initialApplications.map((a) => a.jobId);

  // Dynamic Page Heading & Subtitle based on active view
  const getViewMeta = () => {
    switch (activeView) {
      case "jobs":
        return {
          title: "Explore Engineering Openings",
          subtitle: `Browse ${totalPublishedCount} published technical roles with verified compensation and skill requirements`,
          actionButton: {
            label: "Dashboard Overview",
            onClick: () => handleNavigateView("overview"),
          },
        };
      case "applications":
        return {
          title: "My Applications Tracker",
          subtitle: `Monitor the real-time status of your ${initialApplications.length} active technical job applications`,
          actionButton: {
            label: "Explore More Jobs",
            onClick: () => handleNavigateView("jobs"),
          },
        };
      case "assessments":
        return {
          title: "Technical Assessments",
          subtitle: `Active invitations, upcoming countdowns, and distraction-free coding challenges`,
          actionButton: {
            label: "View Assessment History",
            onClick: () => handleNavigateView("history"),
          },
        };
      case "history":
        return {
          title: "Assessment History & Reviews",
          subtitle: `Official evaluations, question-level scores, and recruiter code feedback`,
          actionButton: {
            label: "Active Challenges",
            onClick: () => handleNavigateView("assessments"),
          },
        };
      case "profile":
        return {
          title: "Developer Skill Profile & Passport",
          subtitle: "Verified skill tags, contact credentials, and engineering portfolio links",
          actionButton: {
            label: "Back to Overview",
            onClick: () => handleNavigateView("overview"),
          },
        };
      default:
        return {
          title: "Candidate Engineering Hub",
          subtitle: "Skill verification, active applications, and verified technical assessment history",
          actionButton: {
            label: "Explore Open Roles",
            onClick: () => handleNavigateView("jobs"),
          },
        };
    }
  };

  const viewMeta = getViewMeta();

  return (
    <DashboardLayout
      role="candidate"
      title={viewMeta.title}
      subtitle={viewMeta.subtitle}
      user={sessionUser}
      activeView={activeView}
      onViewChange={handleNavigateView}
      actionButton={viewMeta.actionButton}
    >
      {/* Tab Navigation Pill Bar (Desktop & Mobile quick switcher) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80 -mt-2">
        <button
          type="button"
          onClick={() => handleNavigateView("overview")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "overview"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("jobs")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "jobs"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Explore Jobs ({totalPublishedCount})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("applications")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "applications"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          My Applications ({initialApplications.length})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("assessments")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "assessments"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          My Assessments ({initialInvitations.length})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("history")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "history"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Assessment History ({initialHistory.length})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("profile")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "profile"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          My Profile
        </button>
      </div>

      {/* View Content Rendering */}
      {activeView === "overview" && (
        <CandidateOverviewView
          user={user}
          publishedJobs={initialPublishedJobs}
          totalPublishedCount={totalPublishedCount}
          applications={initialApplications}
          invitations={initialInvitations}
          assessmentHistory={initialHistory}
          onNavigateView={handleNavigateView}
        />
      )}

      {activeView === "jobs" && (
        <section id="jobs" className="space-y-6">
          <CandidateJobDiscovery
            initialJobs={initialPublishedJobs}
            totalCount={totalPublishedCount}
            initialAppliedJobIds={appliedJobIds}
          />
        </section>
      )}

      {activeView === "applications" && (
        <section id="applications" className="space-y-6">
          <CandidateApplicationsTracker applications={initialApplications} />
        </section>
      )}

      {activeView === "assessments" && (
        <section id="assessments" className="space-y-6">
          <UpcomingAssessmentsPreview initialInvitations={initialInvitations} />
        </section>
      )}

      {activeView === "history" && (
        <section id="history" className="space-y-6">
          <CandidateAssessmentHistoryTracker initialHistory={initialHistory} />
        </section>
      )}

      {activeView === "profile" && (
        <section id="profile" className="space-y-6">
          <ProfileOverviewCard profile={profile} />
        </section>
      )}
    </DashboardLayout>
  );
}
