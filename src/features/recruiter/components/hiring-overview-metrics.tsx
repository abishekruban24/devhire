import React from "react";
import { Briefcase, Users2, Code2, Award, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecruiterCompanyOverview } from "@/types";

interface HiringOverviewMetricsProps {
  overview: RecruiterCompanyOverview;
}

export function HiringOverviewMetrics({
  overview,
}: HiringOverviewMetricsProps) {
  const metrics = [
    {
      label: "Active Positions",
      value: overview.openRolesCount,
      change: "+2 this month",
      icon: Briefcase,
      color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30",
    },
    {
      label: "Candidate Applications",
      value: overview.totalApplicants,
      change: "48 screened",
      icon: Users2,
      color: "from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/30",
    },
    {
      label: "Assessments Conducted",
      value: overview.assessmentsConducted,
      change: "85% completion rate",
      icon: Code2,
      color: "from-indigo-500/20 to-indigo-600/10 text-indigo-400 border-indigo-500/30",
    },
    {
      label: "Shortlist Rate",
      value: `${overview.shortlistRate}%`,
      change: "Based on pass scores",
      icon: Award,
      color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Hiring & Assessment Overview</h2>
          <p className="text-xs text-slate-400">High-level pipeline metrics for {overview.name}</p>
        </div>
        <Badge variant="mock">Mock Statistics</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5 border-slate-800 bg-[#0E1526]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  {item.label}
                </span>
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center border bg-gradient-to-br ${item.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {item.value}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span>{item.change}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
