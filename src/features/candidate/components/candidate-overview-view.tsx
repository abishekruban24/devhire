"use client";

import React, { useMemo } from "react";
import {
  Briefcase,
  FileCheck2,
  Code2,
  History,
  ArrowRight,
  Clock,
  MapPin,
  ChevronRight,
  Award,
  Building2,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PublishedJobItem } from "@/features/jobs/actions/job-actions";
import type { CandidateApplicationItem } from "@/features/applications/actions/application-actions";
import type { CandidateInvitationItem } from "@/features/assessments/actions/invitation-actions";
import type { CandidateAssessmentHistoryItem } from "@/features/assessments/actions/review-actions";

export interface CandidateUser {
  id: string;
  name?: string | null;
  email?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  skills?: string[];
  resumeUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}

interface CandidateOverviewViewProps {
  user: CandidateUser;
  publishedJobs: PublishedJobItem[];
  totalPublishedCount: number;
  applications: CandidateApplicationItem[];
  invitations: CandidateInvitationItem[];
  assessmentHistory: CandidateAssessmentHistoryItem[];
  onNavigateView: (view: string) => void;
}

export function CandidateOverviewView({
  user,
  publishedJobs,
  totalPublishedCount,
  applications,
  invitations,
  assessmentHistory,
  onNavigateView,
}: CandidateOverviewViewProps) {
  // 1. Calculate Real Profile Completion from actual database fields
  const profileCompletion = useMemo(() => {
    const checklist = [
      {
        key: "identity",
        label: "Full Name & Email",
        isComplete: Boolean(user.name && user.email),
        weight: 20,
        tip: "Account identity verified",
      },
      {
        key: "headline",
        label: "Professional Headline",
        isComplete: Boolean(user.headline && user.headline.trim().length > 0),
        weight: 20,
        tip: "Add your role title and core specialty",
      },
      {
        key: "bio",
        label: "Engineering Bio",
        isComplete: Boolean(user.bio && user.bio.trim().length > 0),
        weight: 20,
        tip: "Highlight your architectural and project experience",
      },
      {
        key: "skills",
        label: "Technical Skills",
        isComplete: Boolean(user.skills && user.skills.length > 0),
        weight: 20,
        tip: "Tag your programming languages and core libraries",
      },
      {
        key: "links",
        label: "GitHub / Portfolio",
        isComplete: Boolean(user.githubUrl || user.linkedinUrl || user.resumeUrl),
        weight: 20,
        tip: "Link your code repositories and professional profiles",
      },
    ];

    const percentage = checklist.reduce(
      (sum, item) => sum + (item.isComplete ? item.weight : 0),
      0
    );

    const missingItems = checklist.filter((item) => !item.isComplete);

    return { percentage, checklist, missingItems };
  }, [user]);

  // 2. Metrics calculated from real PostgreSQL database records
  const totalAppsCount = applications.length;
  const shortlistedCount = applications.filter((a) => a.status === "SHORTLISTED").length;
  const pendingInvitations = invitations.filter(
    (i) => i.status === "PENDING" || i.status === "STARTED"
  );
  const completedAssessmentsCount = assessmentHistory.length;

  // 3. Format salary utility
  const formatSalary = (min?: number | null, max?: number | null, currency = "USD") => {
    if (!min && !max) return "Competitive";
    const sym = currency === "USD" ? "$" : currency + " ";
    if (min && max) return `${sym}${Math.round(min / 1000)}k - ${sym}${Math.round(max / 1000)}k`;
    if (min) return `From ${sym}${Math.round(min / 1000)}k`;
    return `Up to ${sym}${Math.round(max! / 1000)}k`;
  };

  const getFirstName = (name?: string | null) => {
    if (!name) return "Developer";
    return name.trim().split(" ")[0];
  };

  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* =========================================================================
          HERO BANNER: Developer Portal Greeting & Profile Completion Meter
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#0B1528] via-[#080E1C] to-[#060A14] p-6 sm:p-8 shadow-xl shadow-cyan-950/20">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Greeting & Summary */}
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Developer Engineering Portal</span>
              <span className="text-cyan-600">•</span>
              <span className="text-cyan-400">Electric Blue Workspace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {getFirstName(user.name)}{" "}
              <span className="inline-block animate-waving-hand">👋</span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {user.headline ||
                "Full-Stack Software Engineer • Ready for high-signal technical recruitment"}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => onNavigateView("jobs")}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 gap-2 text-xs sm:text-sm h-9 px-4"
              >
                <Briefcase className="h-4 w-4" />
                <span>Explore Open Roles</span>
                <ArrowRight className="h-4 w-4 ml-0.5" />
              </Button>

              <Button
                variant="outline"
                onClick={() => onNavigateView("applications")}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm h-9 px-4 gap-2"
              >
                <FileCheck2 className="h-4 w-4 text-cyan-400" />
                <span>View Applications ({totalAppsCount})</span>
              </Button>
            </div>
          </div>

          {/* Right: Actual Profile Completion Indicator */}
          <div className="shrink-0 w-full lg:w-72 rounded-xl border border-cyan-500/20 bg-[#0A1222]/80 backdrop-blur-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                Profile Strength
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {profileCompletion.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, profileCompletion.percentage)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              {profileCompletion.percentage === 100
                ? "Your developer profile is 100% complete and fully verified for recruiters."
                : profileCompletion.missingItems.length > 0
                ? `Tip: Complete ${profileCompletion.missingItems[0].label} to improve recruiter reach.`
                : "Complete your profile to unlock targeted technical roles."}
            </p>

            <button
              type="button"
              onClick={() => onNavigateView("profile")}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Manage Profile & Passport</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KEY METRICS ROW (4 Cards)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Applications */}
        <Card
          onClick={() => onNavigateView("applications")}
          className="border-slate-800/80 bg-[#0B101D] hover:border-cyan-500/40 transition-all cursor-pointer group p-4 sm:p-5"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Total Applications
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {totalAppsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-cyan-400 font-medium">Real-time</span> tracked in database
          </div>
        </Card>

        {/* Metric 2: Shortlisted Roles */}
        <Card
          onClick={() => onNavigateView("applications")}
          className="border-slate-800/80 bg-[#0B101D] hover:border-emerald-500/40 transition-all cursor-pointer group p-4 sm:p-5"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Shortlisted Roles
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {shortlistedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            {shortlistedCount > 0 ? (
              <span className="text-emerald-400 font-medium">Interview stage reached</span>
            ) : (
              "Awaiting evaluation"
            )}
          </div>
        </Card>

        {/* Metric 3: Pending Assessments */}
        <Card
          onClick={() => onNavigateView("assessments")}
          className="border-slate-800/80 bg-[#0B101D] hover:border-amber-500/40 transition-all cursor-pointer group p-4 sm:p-5"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Pending Challenges
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {pendingInvitations.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            {pendingInvitations.length > 0 ? (
              <span className="text-amber-400 font-medium">Action required</span>
            ) : (
              "All caught up"
            )}
          </div>
        </Card>

        {/* Metric 4: Completed Assessments */}
        <Card
          onClick={() => onNavigateView("history")}
          className="border-slate-800/80 bg-[#0B101D] hover:border-blue-500/40 transition-all cursor-pointer group p-4 sm:p-5"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
              Verified Results
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {completedAssessmentsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-blue-400 font-medium">Evaluated</span> by hiring teams
          </div>
        </Card>
      </div>

      {/* =========================================================================
          ACTIVE ASSESSMENTS NOTIFICATION (If any invitations pending)
          ========================================================================= */}
      {pendingInvitations.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-[#0E1524] to-[#0A101C] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    You have {pendingInvitations.length} Pending Technical Assessment
                    {pendingInvitations.length > 1 ? "s" : ""}
                  </h3>
                  <Badge variant="warning" className="text-[10px]">
                    Action Required
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Hiring teams have sent technical benchmark challenges for your active
                  applications. Coding workspace includes auto-save and timed attempts.
                </p>
              </div>
            </div>

            <Button
              onClick={() => onNavigateView("assessments")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm shrink-0 self-start sm:self-center"
            >
              <span>View Challenges</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TWO-COLUMN MAIN CONTENT:
          Left: Recently Published Jobs
          Right: Application Progress Tracker & Verified History
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Recently Published Jobs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                Recently Published Jobs
              </h2>
              <p className="text-xs text-slate-400">
                Verified technical roles posted directly by employers ({totalPublishedCount} total)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateView("jobs")}
              className="text-xs text-cyan-400 hover:text-cyan-300 gap-1 hover:bg-cyan-500/10"
            >
              <span>Explore All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {publishedJobs.length === 0 ? (
            <Card className="p-8 text-center border-slate-800 bg-[#0B101D] text-slate-400 space-y-3">
              <Briefcase className="h-8 w-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No published roles currently live.</p>
              <p className="text-xs text-slate-500">
                Check back shortly as companies publish new engineering openings.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {publishedJobs.slice(0, 4).map((job) => {
                const isApplied = appliedJobIds.has(job.id);
                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-slate-800/80 bg-[#0B101D] hover:border-cyan-500/40 hover:bg-[#0D1424] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                            {job.title}
                          </h3>
                          <Badge
                            variant={job.locationType === "REMOTE" ? "success" : "secondary"}
                            className="text-[10px] uppercase font-mono px-1.5 py-0"
                          >
                            {job.locationType}
                          </Badge>
                          {job.experienceLevel && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              • {job.experienceLevel}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            {job.company.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            {job.location}
                          </span>
                          <span className="text-cyan-400 font-mono font-medium">
                            {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 self-center">
                        {isApplied ? (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
                            Applied
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onNavigateView("jobs")}
                            className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 text-xs h-8 px-3 transition-colors font-medium"
                          >
                            View Job
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Application Progress & Published Results */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section: Application Progress Tracker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-400" />
                Active Applications
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateView("applications")}
                className="text-xs text-blue-400 hover:text-blue-300 p-0 h-auto"
              >
                View all ({totalAppsCount})
              </Button>
            </div>

            {applications.length === 0 ? (
              <Card className="p-6 text-center border-slate-800 bg-[#0B101D] text-slate-400 space-y-2">
                <FileCheck2 className="h-6 w-6 mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-300">No active applications yet.</p>
                <p className="text-[11px] text-slate-500">
                  Explore published jobs to submit your first application.
                </p>
                <Button
                  size="sm"
                  onClick={() => onNavigateView("jobs")}
                  className="mt-2 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
                >
                  Explore Jobs
                </Button>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {applications.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl border border-slate-800/80 bg-[#0B101D] hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="font-semibold text-xs text-white truncate">
                          {app.job.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>{app.job.company.name}</span>
                          <span>•</span>
                          <span>{new Date(app.createdAt).toLocaleDateString()}</span>
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

          {/* Section: Recent Published Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <History className="h-4 w-4 text-cyan-400" />
                Assessment Results
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateView("history")}
                className="text-xs text-cyan-400 hover:text-cyan-300 p-0 h-auto"
              >
                Full History ({completedAssessmentsCount})
              </Button>
            </div>

            {assessmentHistory.length === 0 ? (
              <Card className="p-6 text-center border-slate-800 bg-[#0B101D] text-slate-400 space-y-2">
                <History className="h-6 w-6 mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-300">No published results yet.</p>
                <p className="text-[11px] text-slate-500">
                  Scores and recruiter code feedback appear here once published.
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {assessmentHistory.slice(0, 3).map((item) => {
                  const score = item.score;
                  const passed = item.passed;

                  return (
                    <div
                      key={item.attemptId}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-[#0B101D] hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="font-semibold text-xs text-white truncate">
                            {item.assessmentTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>{item.companyName}</span>
                            {item.submittedAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {score !== null && score !== undefined && (
                            <span className="font-mono font-bold text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                              {score}/100
                            </span>
                          )}
                          <Badge
                            variant={passed ? "success" : "secondary"}
                            className="text-[10px] font-mono px-1.5 py-0.5"
                          >
                            {passed ? "PASSED" : "EVALUATED"}
                          </Badge>
                        </div>
                      </div>

                      {item.feedback && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-300 line-clamp-2">
                          <span className="text-slate-500 font-medium">Recruiter feedback: </span>
                          {item.feedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
