import React from "react";
import { MapPin, DollarSign, ArrowRight, Code } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobListing } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface AvailableJobsPreviewProps {
  jobs: JobListing[];
}

export function AvailableJobsPreview({ jobs }: AvailableJobsPreviewProps) {
  return (
    <div className="space-y-4" id="jobs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Available Technical Roles</h2>
          <p className="text-xs text-slate-400">Curated positions matching your verified assessment competencies</p>
        </div>
        <Badge variant="mock">Mock Listings</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Card
            key={job.id}
            className="flex flex-col justify-between hover:border-blue-500/40 transition-all duration-200 group"
          >
            <CardHeader className="p-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                    {job.companyName}
                  </span>
                  <CardTitle className="text-base font-bold text-white group-hover:text-blue-300 transition-colors mt-0.5">
                    {job.title}
                  </CardTitle>
                </div>
                <Badge variant={job.locationType === "REMOTE" ? "default" : "secondary"}>
                  {job.locationType}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  {job.location}
                </span>
                {job.salaryMin && job.salaryMax && (
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    {formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}
                  </span>
                )}
                <span className="text-slate-500">•</span>
                <span>{job.experienceLevel}</span>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3">
              {job.assessmentTitle && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-950/30 border border-blue-900/40 px-3 py-2 text-xs text-blue-300">
                  <Code className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Required Assessment: <strong>{job.assessmentTitle}</strong></span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800/50">
                <span className="text-[11px] text-slate-500">Posted on {job.postedAt}</span>
                <Button size="sm" variant="secondary" className="text-xs group-hover:border-blue-500/50">
                  View Role
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
