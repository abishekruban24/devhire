import React from "react";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationPreview } from "@/types";

interface ApplicationStatusPreviewProps {
  applications: ApplicationPreview[];
}

export function ApplicationStatusPreview({
  applications,
}: ApplicationStatusPreviewProps) {
  const getStatusBadge = (status: ApplicationPreview["status"]) => {
    switch (status) {
      case "SHORTLISTED":
        return <Badge variant="success">Shortlisted</Badge>;
      case "ASSESSMENT_INVITED":
        return <Badge variant="default">Assessment Invited</Badge>;
      case "IN_REVIEW":
        return <Badge variant="warning">In Review</Badge>;
      case "OFFERED":
        return <Badge variant="success">Offer Extended</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Not Selected</Badge>;
      default:
        return <Badge variant="secondary">Submitted</Badge>;
    }
  };

  return (
    <div className="space-y-4" id="applications">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Active Applications Tracker</h2>
          <p className="text-xs text-slate-400">Live recruitment stage and progress updates</p>
        </div>
        <Badge variant="mock">Mock Tracker</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {applications.map((app) => (
          <Card key={app.id} className="p-5 flex flex-col justify-between border-slate-800 bg-[#0E1526]">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-blue-400">
                  {app.companyName}
                </span>
                {getStatusBadge(app.status)}
              </div>

              <h3 className="text-base font-semibold text-white mb-1.5">
                {app.jobTitle}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                <MapPin className="h-3 w-3 text-slate-500" />
                <span>{app.location}</span>
                <span>•</span>
                <span>Applied {app.appliedDate}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Next Step
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                {app.nextStep || "Awaiting recruiter review"}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
