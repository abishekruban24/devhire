import React from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_ASSESSMENT_METRICS } from "@/features/recruiter/data/mock-recruiter";

export function AssessmentStatisticsPreview() {
  return (
    <div className="space-y-4" id="assessments">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Assessment Statistics & Benchmarks</h2>
          <p className="text-xs text-slate-400">Aggregated technical evaluation performance metrics</p>
        </div>
        <Badge variant="mock">Mock Analytics</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Stats Card */}
        <Card className="p-5 border-slate-800 bg-[#0E1526] lg:col-span-1 space-y-4">
          <CardTitle className="text-sm font-semibold text-slate-300">
            Overall Benchmark Health
          </CardTitle>

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400">Total Assessments Created</span>
              <span className="font-bold text-white text-sm">
                {MOCK_ASSESSMENT_METRICS.totalAssessmentsCreated}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400">Active Candidates Evaluating</span>
              <span className="font-bold text-blue-400 text-sm">
                {MOCK_ASSESSMENT_METRICS.activeCandidatesEvaluating}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400">Average Passing Score</span>
              <span className="font-bold text-emerald-400 text-sm">
                {MOCK_ASSESSMENT_METRICS.averagePassingScore}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Overall Completion Rate</span>
              <span className="font-bold text-violet-400 text-sm">
                {MOCK_ASSESSMENT_METRICS.completionRate}%
              </span>
            </div>
          </div>
        </Card>

        {/* Skill Category Breakdown */}
        <Card className="p-5 border-slate-800 bg-[#0E1526] lg:col-span-2 space-y-3">
          <CardTitle className="text-sm font-semibold text-slate-300">
            Pass Rates by Technical Domain
          </CardTitle>

          <div className="space-y-3 pt-1">
            {MOCK_ASSESSMENT_METRICS.topicsTested.map((topic) => (
              <div key={topic.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{topic.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{topic.count} tests taken</span>
                    <span className="font-semibold text-emerald-400">{topic.passRate}</span>
                  </div>
                </div>
                {/* Progress bar mock */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: topic.passRate }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
