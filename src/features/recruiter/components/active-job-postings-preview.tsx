import React from "react";
import { Plus, Users, Code } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecruiterJobItem } from "@/types";

interface ActiveJobPostingsPreviewProps {
  jobs: RecruiterJobItem[];
}

export function ActiveJobPostingsPreview({
  jobs,
}: ActiveJobPostingsPreviewProps) {
  return (
    <div className="space-y-4" id="jobs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Active Job Postings</h2>
          <p className="text-xs text-slate-400">Manage technical roles, applicants, and tied coding assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="mock">Mock Postings</Badge>
          <Button size="sm" variant="accent" className="text-xs gap-1.5 hidden sm:inline-flex">
            <Plus className="h-3.5 w-3.5" />
            Create Position
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card
            key={job.id}
            className="p-5 border-slate-800 hover:border-slate-700 bg-[#0E1526] transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {job.department}
                  </span>
                  <Badge variant={job.locationType === "REMOTE" ? "default" : "secondary"}>
                    {job.locationType}
                  </Badge>
                  <Badge variant="success">Active</Badge>
                </div>

                <h3 className="text-base font-bold text-white">
                  {job.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    {job.applicantsCount} Total Applicants
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-violet-300 font-medium">
                    <Code className="h-3.5 w-3.5 text-violet-400" />
                    {job.activeAssessments} Assessments in Progress
                  </span>
                  <span>•</span>
                  <span className="text-slate-500">Published {job.publishedDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button variant="secondary" size="sm" className="text-xs">
                  Review Pipeline
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Settings
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
