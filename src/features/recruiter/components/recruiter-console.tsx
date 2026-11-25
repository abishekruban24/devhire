"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  ShieldCheck,
  Briefcase,
  Users2,
  Globe,
  MapPin,
  Tag,
  Edit3,
  Check,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateCompanyProfile } from "@/features/recruiter/actions/company-actions";

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

  const router = useRouter();

  const [currentCompany, setCurrentCompany] = useState<CompanyProfileData>({
    id: companyProfile?.id,
    name: companyProfile?.name || companyName,
    slug: companyProfile?.slug,
    location: companyProfile?.location || "",
    industry: companyProfile?.industry || "",
    website: companyProfile?.website || "",
    description: companyProfile?.description || "",
  });
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isUpdatingCompany, startCompanyTransition] = useTransition();
  const [companyForm, setCompanyForm] = useState({
    name: currentCompany.name,
    location: currentCompany.location || "",
    industry: currentCompany.industry || "",
    website: currentCompany.website || "",
    description: currentCompany.description || "",
  });
  const [companyFormErrors, setCompanyFormErrors] = useState<Record<string, string>>({});
  const [companyFeedback, setCompanyFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyFeedback(null);
    setCompanyFormErrors({});
    startCompanyTransition(async () => {
      const res = await updateCompanyProfile({
        name: companyForm.name,
        website: companyForm.website || undefined,
        description: companyForm.description || undefined,
        industry: companyForm.industry || undefined,
        location: companyForm.location || undefined,
      });
      if (res.success) {
        setCurrentCompany((prev) => ({
          ...prev,
          name: companyForm.name,
          location: companyForm.location,
          industry: companyForm.industry,
          website: companyForm.website,
          description: companyForm.description,
        }));
        setIsEditingCompany(false);
        setCompanyFeedback({ type: "success", text: "Company profile updated successfully!" });
        router.refresh();
      } else {
        if (res.errors) {
          setCompanyFormErrors(res.errors);
        }
        setCompanyFeedback({ type: "error", text: res.message });
      }
    });
  };

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
            {companyFeedback && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between border ${
                  companyFeedback.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {companyFeedback.type === "success" ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span>{companyFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCompanyFeedback(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/30">
                  {currentCompany.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{currentCompany.name}</h2>
                    <Badge variant="violet" className="gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Registered Employer
                    </Badge>
                  </div>
                  <p className="text-xs text-purple-300 font-mono">
                    devhire.com/company/{currentCompany.slug || "company"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Recruiter Lead</div>
                  <div className="text-xs font-semibold text-white">{recruiterName || "Lead Recruiter"}</div>
                  <div className="text-[11px] text-slate-500">{recruiterEmail}</div>
                </div>
                {!isEditingCompany && (
                  <Button
                    type="button"
                    onClick={() => {
                      setCompanyForm({
                        name: currentCompany.name,
                        location: currentCompany.location || "",
                        industry: currentCompany.industry || "",
                        website: currentCompany.website || "",
                        description: currentCompany.description || "",
                      });
                      setIsEditingCompany(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs h-9 px-3 gap-1.5 ml-2"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Profile</span>
                  </Button>
                )}
              </div>
            </div>

            {isEditingCompany ? (
              <form onSubmit={handleSaveCompanyProfile} className="mt-6 space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Company Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="e.g. Acme Technical Labs"
                    />
                    {companyFormErrors.name && (
                      <p className="text-[11px] text-rose-400">{companyFormErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Official Website</label>
                    <input
                      type="url"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="https://acme.tech"
                    />
                    {companyFormErrors.website && (
                      <p className="text-[11px] text-rose-400">{companyFormErrors.website}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Industry / Sector</label>
                    <input
                      type="text"
                      value={companyForm.industry}
                      onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="e.g. Cloud Infrastructure, Fintech"
                    />
                    {companyFormErrors.industry && (
                      <p className="text-[11px] text-rose-400">{companyFormErrors.industry}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Headquarters / Location</label>
                    <input
                      type="text"
                      value={companyForm.location}
                      onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="e.g. San Francisco, CA (Hybrid / Remote)"
                    />
                    {companyFormErrors.location && (
                      <p className="text-[11px] text-rose-400">{companyFormErrors.location}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Company Overview & Engineering Mission</label>
                  <textarea
                    rows={4}
                    value={companyForm.description}
                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors leading-relaxed"
                    placeholder="Describe your engineering organization, mission, culture, tech stack, and what makes working at your company unique..."
                  />
                  {companyFormErrors.description && (
                    <p className="text-[11px] text-rose-400">{companyFormErrors.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingCompany(false);
                      setCompanyFormErrors({});
                    }}
                    disabled={isUpdatingCompany}
                    className="text-slate-400 hover:text-white text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingCompany}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs h-9 px-4 gap-2"
                  >
                    {isUpdatingCompany ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <>
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

                <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  {currentCompany.location && (
                    <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <MapPin className="h-3.5 w-3.5 text-purple-400" />
                      <span>{currentCompany.location}</span>
                    </div>
                  )}
                  {currentCompany.industry && (
                    <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <Tag className="h-3.5 w-3.5 text-purple-400" />
                      <span>{currentCompany.industry}</span>
                    </div>
                  )}
                  {currentCompany.website && (
                    <a
                      href={currentCompany.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg text-purple-300 hover:text-white transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5 text-purple-400" />
                      <span>{currentCompany.website}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="mt-6 p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300">About {currentCompany.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentCompany.description ||
                      `${currentCompany.name} is a registered technical employer on DevHire conducting structured coding assessments, manual rubric code reviews, and high-conviction engineering hiring.`}
                  </p>
                </div>
              </>
            )}
          </Card>
        </section>
      )}
    </DashboardLayout>
  );
}
