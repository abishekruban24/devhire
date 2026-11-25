"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RecruiterOverviewView } from "./recruiter-overview-view";
import { RecruiterJobManagement, DatabaseJobItem } from "./recruiter-job-management";
import { RecruiterApplicantManagement } from "./recruiter-applicant-management";
import { RecruiterAssessmentManagement } from "./recruiter-assessment-management";
import { RecruiterManualReviewManagement } from "./recruiter-manual-review-management";
import type { RecruiterApplicantItem } from "@/features/applications/actions/application-actions";
import type { RecruiterAssessmentItem } from "@/features/assessments/actions/assessment-actions";
import type { RecruiterInvitationItem } from "@/features/assessments/actions/invitation-actions";
import type { RecruiterSubmissionItem } from "@/features/assessments/actions/review-actions";
import type { RealRecruiterMetrics } from "./hiring-overview-metrics";
import type { SidebarUser } from "@/components/layout/sidebar";
import { ShieldCheck, Briefcase, Users2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type RecruiterViewId =
  | "overview"
  | "jobs"
  | "applicants"
  | "assessments"
  | "reviews"
  | "company";

interface CompanyProfileData {
  id?: string;
  name: string;
  slug?: string | null;
  location?: string | null;
  industry?: string | null;
  website?: string | null;
  description?: string | null;
}

interface RecruiterConsoleProps {
  companyName: string;
  recruiterName?: string | null;
  recruiterEmail?: string | null;
  companyProfile?: CompanyProfileData | null;
  sessionUser?: SidebarUser | null;
  metrics: RealRecruiterMetrics;
  companyJobs: DatabaseJobItem[];
  companyApplications: RecruiterApplicantItem[];
  companyAssessments: RecruiterAssessmentItem[];
  companyInvitations: RecruiterInvitationItem[];
  reviewSubmissions: RecruiterSubmissionItem[];
  reviewCounts: {
    total: number;
    awaitingReview: number;
    draftSaved: number;
    published: number;
  };
}

export function RecruiterConsole({
  companyName,
  recruiterName,
  recruiterEmail,
  companyProfile,
  sessionUser,
  metrics,
  companyJobs,
  companyApplications,
  companyAssessments,
  companyInvitations,
  reviewSubmissions,
  reviewCounts,
}: RecruiterConsoleProps) {
  const searchParams = useSearchParams();

  // Determine initial view from query param (?view=...) or default to "overview"
  const qView = searchParams.get("view");
  const initialView: RecruiterViewId =
    qView === "jobs" ||
    qView === "applicants" ||
    qView === "assessments" ||
    qView === "reviews" ||
    qView === "company"
      ? qView
      : "overview";

  const [activeView, setActiveView] = useState<RecruiterViewId>(initialView);
  const [prevViewParam, setPrevViewParam] = useState(qView);

  // Sync state if searchParams changes externally
  if (qView !== prevViewParam) {
    setPrevViewParam(qView);
    if (initialView !== activeView) {
      setActiveView(initialView);
    }
  }

  // Listen to browser hash changes (e.g. #jobs, #applicants)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "jobs") setActiveView("jobs");
      else if (hash === "candidates" || hash === "applicants") setActiveView("applicants");
      else if (hash === "assessments") setActiveView("assessments");
      else if (hash === "reviews") setActiveView("reviews");
      else if (hash === "company") setActiveView("company");
      else if (hash === "overview") setActiveView("overview");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavigateView = useCallback(
    (view: string) => {
      const validView: RecruiterViewId =
        view === "jobs" ||
        view === "applicants" ||
        view === "assessments" ||
        view === "reviews" ||
        view === "company"
          ? (view as RecruiterViewId)
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

  // Dynamic Page Heading & Subtitle based on active view
  const getViewMeta = () => {
    switch (activeView) {
      case "jobs":
        return {
          title: "Job Requisition Management",
          subtitle: `Create, edit, and publish technical job postings for ${companyName} (${companyJobs.length} total)`,
          actionButton: {
            label: "Dashboard Overview",
            onClick: () => handleNavigateView("overview"),
          },
        };
      case "applicants":
        return {
          title: "Candidate Pipeline & Applications",
          subtitle: `Track applicant stages, review developer profiles, and issue assessment invitations (${companyApplications.length} candidates)`,
          actionButton: {
            label: "Post New Opening",
            onClick: () => handleNavigateView("jobs"),
          },
        };
      case "assessments":
        return {
          title: "Technical Assessment Library",
          subtitle: `Author custom coding challenges, point rubrics, and attach assessments to active roles (${companyAssessments.length} assessments)`,
          actionButton: {
            label: "Review Submissions",
            onClick: () => handleNavigateView("reviews"),
          },
        };
      case "reviews":
        return {
          title: "Manual Technical Code Reviews",
          subtitle: `Inspect candidate code submissions, grade questions against rubrics, and publish transparent scores (${reviewCounts.total} total reviews)`,
          actionButton: {
            label: "View Candidate Pipeline",
            onClick: () => handleNavigateView("applicants"),
          },
        };
      case "company":
        return {
          title: "Company Profile & Hiring Identity",
          subtitle: `Manage ${companyName}'s employer branding, company slug, and recruitment team settings`,
          actionButton: {
            label: "Back to Overview",
            onClick: () => handleNavigateView("overview"),
          },
        };
      default:
        return {
          title: "Recruiter Management Suite",
          subtitle: "Talent pipeline, manual coding reviews, and active technical job postings",
          actionButton: {
            label: "Post Opening",
            onClick: () => handleNavigateView("jobs"),
          },
        };
    }
  };

  const viewMeta = getViewMeta();

  return (
    <DashboardLayout
      role="recruiter"
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
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Hiring Overview
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("jobs")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "jobs"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Job Management ({companyJobs.length})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("applicants")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "applicants"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Applicants ({companyApplications.length})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("assessments")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "assessments"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Assessments ({companyAssessments.length})
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("reviews")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "reviews"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Manual Reviews ({reviewCounts.awaitingReview} pending)
        </button>

        <button
          type="button"
          onClick={() => handleNavigateView("company")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            activeView === "company"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 font-semibold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Company Profile
        </button>
      </div>

      {/* View Content Rendering */}
      {activeView === "overview" && (
        <RecruiterOverviewView
          metrics={metrics}
          companyName={companyName}
          recruiterName={recruiterName}
          companyJobs={companyJobs}
          companyApplications={companyApplications}
          companyAssessments={companyAssessments}
          companyInvitations={companyInvitations}
          reviewSubmissions={reviewSubmissions}
          reviewCounts={reviewCounts}
          onNavigateView={handleNavigateView}
        />
      )}

      {activeView === "jobs" && (
        <section id="jobs" className="space-y-6">
          <RecruiterJobManagement initialJobs={companyJobs} companyName={companyName} />
        </section>
      )}

      {activeView === "applicants" && (
        <section id="candidates" className="space-y-6">
          <RecruiterApplicantManagement
            initialApplications={companyApplications}
            companyJobs={companyJobs.map((j) => ({ id: j.id, title: j.title }))}
            companyAssessments={companyAssessments}
            initialInvitations={companyInvitations}
          />
        </section>
      )}

      {activeView === "assessments" && (
        <section id="assessments" className="space-y-6">
          <RecruiterAssessmentManagement
            initialAssessments={companyAssessments}
            companyJobs={companyJobs.map((j) => ({ id: j.id, title: j.title }))}
          />
        </section>
      )}

      {activeView === "reviews" && (
        <section id="reviews" className="space-y-6">
          <RecruiterManualReviewManagement
            initialSubmissions={reviewSubmissions}
            initialCounts={reviewCounts}
          />
        </section>
      )}

      {activeView === "company" && (
        <section id="company" className="space-y-6">
          <Card className="border-purple-500/20 bg-gradient-to-br from-[#120E24] via-[#0E0A1C] to-[#090714] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/30">
                  {companyName.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{companyName}</h2>
                    <Badge variant="violet" className="gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Verified Employer
                    </Badge>
                  </div>
                  <p className="text-xs text-purple-300 font-mono">
                    devhire.com/company/{companyProfile?.slug || "company"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Recruiter Lead</div>
                  <div className="text-xs font-semibold text-white">{recruiterName || "Lead Recruiter"}</div>
                  <div className="text-[11px] text-slate-500">{recruiterEmail}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="space-y-1 p-4 rounded-xl border border-slate-800 bg-[#0E0C1C]">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-purple-400" />
                  Active Job Openings
                </div>
                <div className="text-2xl font-bold text-white">{metrics.publishedJobsCount}</div>
                <div className="text-[11px] text-slate-500">Live technical requisitions</div>
              </div>

              <div className="space-y-1 p-4 rounded-xl border border-slate-800 bg-[#0E0C1C]">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Users2 className="h-4 w-4 text-purple-400" />
                  Candidate Pipeline
                </div>
                <div className="text-2xl font-bold text-white">{metrics.totalApplicantsCount}</div>
                <div className="text-[11px] text-slate-500">Total applied candidates</div>
              </div>

              <div className="space-y-1 p-4 rounded-xl border border-slate-800 bg-[#0E0C1C]">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Evaluations Completed
                </div>
                <div className="text-2xl font-bold text-white">{reviewCounts.published}</div>
                <div className="text-[11px] text-slate-500">Official candidate scores published</div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300">About {companyName}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {companyProfile?.description ||
                  `${companyName} is an authorized technical employer on DevHire conducting structured coding assessments, manual rubric code reviews, and high-conviction engineering hiring.`}
              </p>
            </div>
          </Card>
        </section>
      )}
    </DashboardLayout>
  );
}
