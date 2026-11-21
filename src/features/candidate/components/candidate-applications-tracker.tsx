"use client";

import React, { useState } from "react";
import {
  MapPin,
  Clock,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateApplicationItem } from "@/features/applications/actions/application-actions";
import type { ApplicationStatus } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CandidateApplicationsTrackerProps {
  applications: CandidateApplicationItem[];
}

export function CandidateApplicationsTracker({
  applications,
}: CandidateApplicationsTrackerProps) {
  const [expandedCoverLetters, setExpandedCoverLetters] = useState<Record<string, boolean>>({});

  const toggleCoverLetter = (id: string) => {
    setExpandedCoverLetters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Shortlisted
          </span>
        );
      case "ASSESSMENT_INVITED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
            Assessment Invited
          </span>
        );
      case "ASSESSMENT_COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-700/60">
            Assessment Completed
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
            Under Review
          </span>
        );
      case "OFFERED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-700/60">
            Offer Extended
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/60">
            Not Selected
          </span>
        );
      case "SUBMITTED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-700/60">
            Submitted
          </span>
        );
    }
  };

  const getNextStepAdvice = (status: ApplicationStatus) => {
    switch (status) {
      case "SHORTLISTED":
        return "Congratulations! The hiring team has shortlisted your application for direct interview rounds.";
      case "ASSESSMENT_INVITED":
        return "You have been invited to take the technical skill evaluation for this role in Technical Assessments.";
      case "ASSESSMENT_COMPLETED":
        return "Assessment results received. The engineering manager is reviewing your code benchmark.";
      case "IN_REVIEW":
        return "Your engineering background and experience are currently being evaluated by the talent team.";
      case "OFFERED":
        return "An offer has been extended! Check your registered email for official compensation and onboarding details.";
      case "REJECTED":
        return "This company chose another candidate for this role. Keep your profile updated and apply to other open positions.";
      case "SUBMITTED":
      default:
        return "Application submitted to company hiring pipeline. Awaiting initial recruiter review.";
    }
  };

  return (
    <div className="space-y-4" id="applications">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Active Applications Tracker</h2>
            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status updates and recruitment stages for your submitted job applications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            {applications.length} {applications.length === 1 ? "Active Application" : "Active Applications"}
          </span>
        </div>
      </div>

      {/* Empty State: Zero Applications */}
      {applications.length === 0 ? (
        <Card className="border-slate-800/80 bg-[#0E1526]/50 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">No Active Applications Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            You haven&apos;t applied to any technical roles yet. Browse real published positions in the Open Roles directory below and submit an application to connect with hiring teams.
          </p>
          <a href="#jobs">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
            >
              Explore Open Roles
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => {
            const hasSalary =
              app.job.salaryMin !== null &&
              app.job.salaryMin !== undefined &&
              app.job.salaryMax !== null &&
              app.job.salaryMax !== undefined;
            const isExpanded = !!expandedCoverLetters[app.id];

            return (
              <Card
                key={app.id}
                className="p-5 flex flex-col justify-between border-slate-800/90 bg-[#0A0F1D] hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-400 uppercase tracking-wide truncate max-w-[170px]">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                      {app.job.company.name}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 line-clamp-1">
                    {app.job.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 mb-3.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[120px]">{app.job.location}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>Applied {formatDate(app.createdAt)}</span>
                    </span>
                  </div>

                  {hasSalary && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium mb-3">
                      <DollarSign className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {formatCurrency(app.job.salaryMin!, app.job.currency)} –{" "}
                        {formatCurrency(app.job.salaryMax!, app.job.currency)}
                      </span>
                    </div>
                  )}

                  {/* Optional Cover Letter Display */}
                  {app.coverLetter && (
                    <div className="mb-3.5 rounded-lg border border-slate-800/70 bg-[#0E1526]/70 p-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Submitted Cover Letter</span>
                        {app.coverLetter.length > 100 && (
                          <button
                            onClick={() => toggleCoverLetter(app.id)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5 text-[10px] lowercase"
                          >
                            {isExpanded ? (
                              <>
                                less <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                more <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p
                        className={`text-xs text-slate-300 leading-relaxed ${
                          isExpanded ? "whitespace-pre-line" : "line-clamp-2"
                        }`}
                      >
                        {app.coverLetter}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Recruitment Stage / Next Step
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0E1526] p-2.5 rounded-lg border border-slate-800/80">
                    {getNextStepAdvice(app.status)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
