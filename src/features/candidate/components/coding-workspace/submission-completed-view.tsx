"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Trophy,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Briefcase,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { AssessmentAttemptData } from "@/features/assessments/actions/attempt-actions";

interface SubmissionCompletedViewProps {
  data: AssessmentAttemptData;
}

export function SubmissionCompletedView({ data }: SubmissionCompletedViewProps) {
  const answeredQuestionsCount = Object.keys(data.savedDrafts || {}).length;
  const totalQuestions = data.questions.length;

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Top Success Badge & Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 shadow-2xl shadow-emerald-950/50">
            <CheckCircle2 className="h-10 w-10 animate-in zoom-in duration-300" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Assessment Submitted Successfully
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your technical coding solutions have been finalized and recorded to the secure evaluation ledger.
            </p>
          </div>
        </div>

        {/* Confirmation Metadata Card */}
        <Card className="rounded-2xl border-slate-800/80 bg-[#0B101D] p-6 space-y-6 shadow-2xl">
          <div className="space-y-3 pb-5 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Assessment Details
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                Completed
              </span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">
              {data.assessmentTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-blue-400" />
                {data.companyName}
              </span>
              {data.jobTitle && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-purple-400" />
                    {data.jobTitle}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800/60 bg-[#0E1526]/80 p-4 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5 text-blue-400" />
                Challenges
              </span>
              <div className="text-base font-bold text-white">
                {answeredQuestionsCount}/{totalQuestions} Answered
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-[#0E1526]/80 p-4 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Passing Mark
              </span>
              <div className="text-base font-bold text-white">
                {data.passingScore}%
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-[#0E1526]/80 p-4 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                Duration Allowed
              </span>
              <div className="text-base font-bold text-white">
                {data.durationMinutes} Minutes
              </div>
            </div>
          </div>

          {/* Timestamp & Confirmation Code */}
          <div className="rounded-xl border border-slate-800 bg-[#080C14] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Submission Timestamp:</span>
              <span className="text-white font-mono font-medium">
                {data.submittedAt ? formatDate(data.submittedAt) : "Just now"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Attempt Confirmation ID:</span>
              <span className="text-blue-300 font-mono text-[11px]">
                {data.attemptId}
              </span>
            </div>
          </div>

          {/* Next Steps Guidance */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-blue-300">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
              <span>What happens next?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your code snapshots have been securely submitted to {data.companyName}&apos;s recruiting team.
              You will receive updates directly on your candidate dashboard as your application progresses through review.
            </p>
          </div>
        </Card>

        {/* Back to Dashboard Button */}
        <div className="text-center">
          <Link href="/candidate/dashboard">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-8 shadow-lg shadow-blue-950/40 gap-2"
            >
              <span>Return to Candidate Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
