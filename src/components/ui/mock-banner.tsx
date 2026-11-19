import React from "react";
import { Info, Sparkles } from "lucide-react";
import { Badge } from "./badge";

interface MockDataBannerProps {
  role: "Candidate" | "Recruiter";
}

export function MockDataBanner({ role }: MockDataBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 p-4 mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                DevHire {role} Dashboard Preview
              </span>
              <Badge variant="mock">Phase 1 Mock Data</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulated dashboard state demonstrating layout architecture and UI ergonomics. Authentication and live PostgreSQL persistence will activate in Phase 2.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-center text-xs text-indigo-300/80 font-medium bg-indigo-950/50 px-3 py-1.5 rounded-md border border-indigo-800/40">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Stateless Prototype</span>
        </div>
      </div>
    </div>
  );
}
