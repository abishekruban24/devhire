import React from "react";
import { Briefcase, Users2, Code2, Award, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface RealRecruiterMetrics {
  companyName: string;
  publishedJobsCount: number;
  totalApplicantsCount: number;
  pendingApplicationsCount: number;
  shortlistedCount: number;
  assessmentsCount: number;
  awaitingReviewCount: number;
  completedReviewsCount: number;
}

interface HiringOverviewMetricsProps {
  metrics: RealRecruiterMetrics;
}

export function HiringOverviewMetrics({ metrics }: HiringOverviewMetricsProps) {
  const cards = [
    {
      label: "Published Openings",
      value: metrics.publishedJobsCount,
      subtext: "Live on candidate portal",
      icon: Briefcase,
      color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30",
    },
    {
      label: "Total Applicants",
      value: metrics.totalApplicantsCount,
      subtext: `${metrics.pendingApplicationsCount} pending review`,
      icon: Users2,
      color: "from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/30",
    },
    {
      label: "Shortlisted Candidates",
      value: metrics.shortlistedCount,
      subtext: "Selected for interview",
      icon: Award,
      color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30",
    },
    {
      label: "Assessments Created",
      value: metrics.assessmentsCount,
      subtext: "Coding assessment library",
      icon: Code2,
      color: "from-indigo-500/20 to-indigo-600/10 text-indigo-400 border-indigo-500/30",
    },
    {
      label: "Awaiting Code Review",
      value: metrics.awaitingReviewCount,
      subtext: "Submitted by candidates",
      icon: Clock,
      color: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30",
    },
    {
      label: "Completed Reviews",
      value: metrics.completedReviewsCount,
      subtext: "Official results published",
      icon: CheckCircle2,
      color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Hiring Pipeline & Review Overview</h2>
          <p className="text-xs text-slate-400">Real-time talent metrics and assessment evaluations for {metrics.companyName}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Neon Database
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-4 border-slate-800/80 bg-[#0A0F1D] rounded-2xl shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">
                  {item.label}
                </span>
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center border bg-gradient-to-br ${item.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-2.5">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {item.value}
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {item.subtext}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
