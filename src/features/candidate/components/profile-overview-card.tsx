import React from "react";
import { MapPin, Mail, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CandidateProfile } from "@/types";

interface ProfileOverviewCardProps {
  profile: CandidateProfile;
}

export function ProfileOverviewCard({ profile }: ProfileOverviewCardProps) {
  return (
    <Card className="relative overflow-hidden border-slate-800 bg-gradient-to-br from-[#0E1526] to-[#0A101D]">
      <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30">
              AC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl text-white">{profile.name}</CardTitle>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Skill Verified
                </Badge>
              </div>
              <CardDescription className="text-slate-300 font-medium mt-0.5">
                {profile.headline}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {profile.location}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {profile.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <a
              href={profile.githubUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
              title="GitHub Profile"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href={profile.linkedinUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
              title="LinkedIn Profile"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <p className="text-sm text-slate-400 leading-relaxed">
          {profile.bio}
        </p>

        {/* Skill tags */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Demonstrated Technical Competencies
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="bg-slate-800/90 text-slate-200 border-slate-700/70 hover:border-slate-600 px-2.5 py-1 text-xs"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Metrics banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/60">
          <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Coding Benchmarks
            </span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {profile.completedAssessments} Completed
            </span>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Average Score
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              {profile.averageScore}%
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-lg bg-slate-900/60 p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Assessment Percentile
            </span>
            <span className="text-lg font-bold text-blue-400 mt-0.5 block">
              Top 8%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
