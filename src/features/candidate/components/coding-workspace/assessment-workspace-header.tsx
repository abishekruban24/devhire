"use client";

import React from "react";
import {
  Code2,
  Clock,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssessmentWorkspaceHeaderProps {
  assessmentTitle: string;
  companyName: string;
  jobTitle?: string | null;
  totalQuestions: number;
  activeQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  questionStatusMap: Record<number, { hasCode: boolean }>;
  timeRemainingSeconds: number;
  onSubmitClick: () => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

export function AssessmentWorkspaceHeader({
  assessmentTitle,
  companyName,
  jobTitle,
  totalQuestions,
  activeQuestionIndex,
  onSelectQuestion,
  questionStatusMap,
  timeRemainingSeconds,
  onSubmitClick,
  isSubmitting = false,
  readOnly = false,
}: AssessmentWorkspaceHeaderProps) {
  // Format timer as HH:MM:SS or MM:SS
  const formatTime = (totalSecs: number) => {
    if (totalSecs <= 0) return "00:00";
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Timer color states
  const getTimerStyles = (secs: number) => {
    if (secs <= 300) {
      // Under 5 minutes: urgent rose with pulse
      return "border-rose-500/60 bg-rose-950/40 text-rose-300 animate-pulse";
    }
    if (secs <= 900) {
      // Under 15 minutes: warning amber
      return "border-amber-500/50 bg-amber-950/30 text-amber-300";
    }
    // Normal: calm slate / emerald
    return "border-slate-800 bg-[#0E1526] text-emerald-400";
  };

  return (
    <header className="shrink-0 h-16 bg-[#080C14] border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Branding & Assessment Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
          <Code2 className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {assessmentTitle}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/50 uppercase tracking-wider">
              Live Session
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {companyName} {jobTitle ? `• ${jobTitle}` : ""}
          </p>
        </div>
      </div>

      {/* Middle: Question Navigation Pills */}
      <div className="hidden md:flex items-center gap-1.5 bg-[#0B101D] p-1 rounded-xl border border-slate-800/80">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isActive = idx === activeQuestionIndex;
          const hasCode = questionStatusMap[idx]?.hasCode;

          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(idx)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>Problem {idx + 1}</span>
              {hasCode && (
                <CheckCircle2
                  className={`h-3 w-3 ${isActive ? "text-blue-200" : "text-emerald-400"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Server-Authoritative Timer & Submit Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tracking-wider shadow-inner transition-colors ${getTimerStyles(
            timeRemainingSeconds
          )}`}
          title="Server-authoritative assessment countdown timer"
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{formatTime(timeRemainingSeconds)}</span>
        </div>

        {/* Submit Assessment Button */}
        {!readOnly && (
          <Button
            size="sm"
            onClick={onSubmitClick}
            disabled={isSubmitting}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Submit Assessment</span>
                <span className="sm:hidden">Submit</span>
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
