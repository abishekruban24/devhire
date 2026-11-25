import React from "react";
import {
  Briefcase,
  Users2,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Building2,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Plus,
  Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DatabaseJobItem } from "./recruiter-job-management";
import type { RecruiterApplicantItem } from "@/features/applications/actions/application-actions";
import type { RecruiterAssessmentItem } from "@/features/assessments/actions/assessment-actions";
import type { RecruiterInvitationItem } from "@/features/assessments/actions/invitation-actions";
import type { RecruiterSubmissionItem } from "@/features/assessments/actions/review-actions";
import type { RealRecruiterMetrics } from "./hiring-overview-metrics";

interface RecruiterOverviewViewProps {
  metrics: RealRecruiterMetrics;
  companyName: string;
  recruiterName?: string | null;
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
  onNavigateView: (view: string) => void;
}

export function RecruiterOverviewView({
  metrics,
  companyName,
  recruiterName,
  companyJobs,
  companyApplications,
  companyAssessments,
  companyInvitations,
  reviewSubmissions,
  reviewCounts,
  onNavigateView,
}: RecruiterOverviewViewProps) {
  const getFirstName = (name?: string | null) => {
    if (!name) return "Hiring Manager";
    return name.trim().split(" ")[0];
  };

  const pendingReviewSubmissions = reviewSubmissions.filter(
    (s) => s.reviewStatus === "AWAITING_REVIEW" || s.reviewStatus === "DRAFT_SAVED"
  );

  // Hiring pipeline funnel calculation based on real PostgreSQL records
  const pipeline = [
    {
      stage: "Applications Received",
      count: metrics.totalApplicantsCount,
      color: "from-blue-500 to-indigo-500",
      textColor: "text-blue-400",
      description: "Direct candidate applications",
    },
    {
      stage: "In Review / Screening",
      count: metrics.pendingApplicationsCount,
      color: "from-indigo-500 to-violet-500",
      textColor: "text-indigo-400",
      description: "Applications currently being screened",
    },
    {
      stage: "Assessments Invited",
      count: companyInvitations.length,
      color: "from-violet-500 to-purple-500",
      textColor: "text-violet-400",
      description: "Coding challenge invitations issued",
    },
    {
      stage: "Awaiting Code Review",
      count: reviewCounts.awaitingReview,
      color: "from-amber-500 to-rose-500",
      textColor: "text-amber-400",
      description: "Submissions needing manual scoring",
    },
    {
      stage: "Shortlisted Candidates",
      count: metrics.shortlistedCount,
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-400",
      description: "Advanced to technical interview",
    },
  ];

  const maxPipelineCount = Math.max(1, metrics.totalApplicantsCount);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* =========================================================================
          HERO BANNER: Enterprise Recruiter Greeting & Company Identity
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#120E24] via-[#0E0A1C] to-[#090714] p-6 sm:p-8 shadow-xl shadow-purple-950/20">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 h-72 w-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Greeting & Recruiter Role Summary */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <Building2 className="h-3.5 w-3.5 text-purple-400" />
              <span>{companyName}</span>
              <span className="text-purple-600">•</span>
              <span className="text-purple-400 font-medium">Enterprise Recruitment Suite</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {getFirstName(recruiterName)}{" "}
              <span className="inline-block animate-waving-hand">💼</span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Managing end-to-end technical hiring pipeline, job requisitions, and manual code
              evaluations for <span className="text-white font-medium">{companyName}</span>.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => onNavigateView("jobs")}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/25 gap-2 text-xs sm:text-sm h-9 px-4"
              >
                <Plus className="h-4 w-4" />
                <span>Post New Opening</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => onNavigateView("reviews")}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm h-9 px-4 gap-2"
              >
                <ClipboardCheck className="h-4 w-4 text-purple-400" />
                <span>
                  Review Queue (
                  <span className={reviewCounts.awaitingReview > 0 ? "text-amber-400 font-bold" : ""}>
                    {reviewCounts.awaitingReview}
                  </span>
                  )
                </span>
              </Button>
            </div>
          </div>

          {/* Right: Company Identity & Status Card */}
          <div className="shrink-0 w-full lg:w-80 rounded-xl border border-purple-500/20 bg-[#110D22]/80 backdrop-blur-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                  {companyName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-white truncate max-w-[160px]">
                    {companyName}
                  </div>
                  <div className="text-[10px] text-purple-300/80 font-mono">
                    Registered Employer
                  </div>
                </div>
              </div>

              <Badge variant="violet" className="text-[10px]">
                Active
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Published Roles</span>
                <span className="font-mono font-bold text-white">
                  {metrics.publishedJobsCount} Requisitions
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total Pipeline</span>
                <span className="font-mono font-bold text-purple-400">
                  {metrics.totalApplicantsCount} Candidates
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateView("company")}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors pt-1"
            >
              <span>Manage Company Profile</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KEY ENTERPRISE METRICS ROW (5 Cards)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Active Jobs */}
        <Card
          onClick={() => onNavigateView("jobs")}
          className="border-slate-800/80 bg-[#0E0C1C] hover:border-purple-500/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Active Jobs
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {metrics.publishedJobsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Live on job discovery</div>
        </Card>

        {/* Metric 2: Total Applicants */}
        <Card
          onClick={() => onNavigateView("applicants")}
          className="border-slate-800/80 bg-[#0E0C1C] hover:border-purple-500/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Applicants
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Users2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {metrics.totalApplicantsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.pendingApplicationsCount} pending review
          </div>
        </Card>

        {/* Metric 3: Shortlisted Candidates */}
        <Card
          onClick={() => onNavigateView("applicants")}
          className="border-slate-800/80 bg-[#0E0C1C] hover:border-emerald-500/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Shortlisted
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {metrics.shortlistedCount}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-medium">Selected for interview</div>
        </Card>

        {/* Metric 4: Awaiting Code Review */}
        <Card
          onClick={() => onNavigateView("reviews")}
          className="border-slate-800/80 bg-[#0E0C1C] hover:border-amber-500/40 transition-all cursor-pointer group p-4"
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Awaiting Review
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            <span className={reviewCounts.awaitingReview > 0 ? "text-amber-400" : ""}>
              {reviewCounts.awaitingReview}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Needs manual grading</div>
        </Card>

        {/* Metric 5: Published Evaluations */}
        <Card
          onClick={() => onNavigateView("reviews")}
          className="border-slate-800/80 bg-[#0E0C1C] hover:border-violet-500/40 transition-all cursor-pointer group p-4 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Evaluated
            </span>
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {reviewCounts.published}
          </div>
          <div className="text-[10px] text-violet-400 mt-1 font-medium">Results published</div>
        </Card>
      </div>

      {/* =========================================================================
          HIRING PIPELINE VISUALIZATION (Real Conversion Funnel)
          ========================================================================= */}
      <Card className="border-slate-800/80 bg-[#0E0C1C] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              Company Hiring Pipeline
            </h2>
            <p className="text-xs text-slate-400">
              Visual conversion stages across your company&apos;s active talent pool ({metrics.totalApplicantsCount} total candidates)
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateView("applicants")}
            className="text-xs text-purple-400 hover:text-purple-300 gap-1 hover:bg-purple-500/10"
          >
            <span>Manage Candidates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Funnel Progress Bars */}
        <div className="space-y-3 pt-2">
          {pipeline.map((step) => {
            const percentage =
              maxPipelineCount > 0 ? Math.round((step.count / maxPipelineCount) * 100) : 0;
            return (
              <div key={step.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{step.stage}</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      • {step.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`font-bold ${step.textColor}`}>{step.count}</span>
                    <span className="text-slate-500 text-[10px]">({percentage}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(step.count > 0 ? 3 : 0, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* =========================================================================
          TWO-COLUMN MAIN CONTENT:
          Left: Pending Review Queue (High Priority)
          Right: Recent Applications & Requisitions
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (6 cols): Pending Review Queue */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-400" />
                Pending Technical Code Reviews
              </h2>
              <p className="text-xs text-slate-400">
                Submitted candidate solutions awaiting manual rubric scoring
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateView("reviews")}
              className="text-xs text-purple-400 hover:text-purple-300 p-0 h-auto"
            >
              All Reviews ({reviewCounts.total})
            </Button>
          </div>

          {pendingReviewSubmissions.length === 0 ? (
            <Card className="p-8 text-center border-slate-800 bg-[#0E0C1C] text-slate-400 space-y-2">
              <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-400" />
              <p className="text-sm font-semibold text-white">Review queue is completely clear!</p>
              <p className="text-xs text-slate-400">
                All submitted candidate assessments have been scored and published.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingReviewSubmissions.slice(0, 4).map((sub) => (
                <div
                  key={sub.attemptId}
                  className="p-4 rounded-xl border border-slate-800/80 bg-[#0E0C1C] hover:border-purple-500/40 hover:bg-[#120F24] transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">
                          {sub.candidateName}
                        </span>
                        <Badge
                          variant={sub.reviewStatus === "DRAFT_SAVED" ? "warning" : "secondary"}
                          className="text-[10px] uppercase font-mono px-1.5 py-0"
                        >
                          {sub.reviewStatus === "DRAFT_SAVED" ? "Draft Saved" : "Needs Review"}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 truncate">
                        Assessment: <span className="text-slate-300">{sub.assessmentTitle}</span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Submitted {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "Pending"}</span>
                        <span>•</span>
                        <span>{sub.candidateEmail}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onNavigateView("reviews")}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8 px-3 shrink-0 self-center font-medium shadow-sm shadow-purple-600/20"
                    >
                      Score Code
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (6 cols): Recent Applicants Queue */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Users2 className="h-4 w-4 text-purple-400" />
                Recent Applicants
              </h2>
              <p className="text-xs text-slate-400">
                Latest submissions across your company job postings
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateView("applicants")}
              className="text-xs text-purple-400 hover:text-purple-300 p-0 h-auto"
            >
              All Applicants ({companyApplications.length})
            </Button>
          </div>

          {companyApplications.length === 0 ? (
            <Card className="p-8 text-center border-slate-800 bg-[#0E0C1C] text-slate-400 space-y-2">
              <Users2 className="h-7 w-7 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-white">No applications received yet.</p>
              <p className="text-xs text-slate-400">
                Ensure your job openings are published to attract candidates.
              </p>
              <Button
                size="sm"
                onClick={() => onNavigateView("jobs")}
                className="mt-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold"
              >
                View Jobs
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {companyApplications.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-[#0E0C1C] hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate">
                          {app.candidate.name}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                          ({app.candidate.email})
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Applied for: <span className="text-slate-300">{app.job.title}</span>
                      </div>

                      <div className="text-[10px] text-slate-500">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <Badge
                      variant={
                        app.status === "SHORTLISTED"
                          ? "success"
                          : app.status === "REJECTED"
                          ? "danger"
                          : app.status === "ASSESSMENT_INVITED"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px] uppercase font-mono px-2 py-0.5 shrink-0"
                    >
                      {app.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ACTIVE REQUISITIONS OVERVIEW
          ========================================================================= */}
      <Card className="border-slate-800/80 bg-[#0E0C1C] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-400" />
              Active Requisitions Overview
            </h2>
            <p className="text-xs text-slate-400">
              Live job listings and applicant counts across active openings ({companyJobs.length} total postings, {companyAssessments.length} linked assessments)
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateView("jobs")}
            className="text-xs text-purple-400 hover:text-purple-300 gap-1 hover:bg-purple-500/10"
          >
            <span>Manage Jobs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {companyJobs.length === 0 ? (
          <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <p className="text-xs">No job requisitions created yet.</p>
            <Button
              size="sm"
              onClick={() => onNavigateView("jobs")}
              className="mt-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Requisition
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companyJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-xl border border-slate-800/80 bg-[#120F24]/60 hover:border-purple-500/40 transition-colors space-y-2 cursor-pointer"
                onClick={() => onNavigateView("jobs")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-white truncate flex-1">
                    {job.title}
                  </div>
                  <Badge
                    variant={job.status === "PUBLISHED" ? "success" : "secondary"}
                    className="text-[9px] uppercase font-mono px-1.5 py-0 shrink-0"
                  >
                    {job.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{job.location} • {job.type.replace("_", " ")}</span>
                  <span className="font-mono text-purple-300 font-medium">
                    {job._count?.applications || 0} applicants
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
