import React from "react";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecruiterCandidateApplication } from "@/types";

interface CandidateApplicationsPreviewProps {
  applications: RecruiterCandidateApplication[];
}

export function CandidateApplicationsPreview({
  applications,
}: CandidateApplicationsPreviewProps) {
  const getStatusBadge = (status: RecruiterCandidateApplication["status"]) => {
    switch (status) {
      case "SHORTLISTED":
        return <Badge variant="success">Shortlisted</Badge>;
      case "ASSESSMENT_COMPLETED":
        return <Badge variant="violet">Assessment Completed</Badge>;
      case "IN_REVIEW":
        return <Badge variant="warning">Under Review</Badge>;
      default:
        return <Badge variant="secondary">New Applicant</Badge>;
    }
  };

  return (
    <div className="space-y-4" id="candidates">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Recent Candidate Applications</h2>
          <p className="text-xs text-slate-400">Submissions ranked by assessment score and stack alignment</p>
        </div>
        <Badge variant="mock">Mock Applicants</Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0E1526]">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Candidate</th>
              <th className="px-5 py-3.5">Position</th>
              <th className="px-5 py-3.5">Match %</th>
              <th className="px-5 py-3.5">Coding Score</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-xs text-white">
                      {app.candidateAvatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{app.candidateName}</div>
                      <div className="text-[11px] text-slate-400">Applied {app.appliedDate}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-medium text-slate-200">
                  {app.roleApplied}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-400 text-xs">
                    {app.matchScore}%
                  </span>
                </td>
                <td className="px-5 py-4">
                  {app.assessmentScore ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-xs">
                      <Award className="h-3.5 w-3.5" />
                      {app.assessmentScore}%
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs italic">Pending</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {getStatusBadge(app.status)}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button variant="outline" size="sm" className="text-xs">
                    View Candidate
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
