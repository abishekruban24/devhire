"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { AssessmentAttemptData } from "@/features/assessments/actions/attempt-actions";
import {
  getAttemptReviewDetails,
  type AttemptReviewDetail,
} from "@/features/assessments/actions/review-actions";

interface SubmissionCompletedViewProps {
  data: AssessmentAttemptData;
}

export function SubmissionCompletedView({ data }: SubmissionCompletedViewProps) {
  const [reviewDetail, setReviewDetail] = useState<AttemptReviewDetail | null>(null);
  const [expandedCodeIndex, setExpandedCodeIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadReview() {
      try {
        const res = await getAttemptReviewDetails(data.attemptId);
        if (isMounted && res.success && res.data) {
          setReviewDetail(res.data);
        }
      } catch {
        // Silent fallback to standard confirmation
      }
    }
    loadReview();
    return () => {
      isMounted = false;
    };
  }, [data.attemptId]);

  const answeredQuestionsCount = Object.keys(data.savedDrafts || {}).length;
  const totalQuestions = data.questions.length;
  const isPublished = Boolean(reviewDetail?.review && reviewDetail.review.status === "PUBLISHED");

  const handleCopyCode = (index: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl space-y-6 animate-in fade-in zoom-in-95 duration-300 py-8">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-950/40">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isPublished ? "Assessment Results Published" : "Assessment Submitted Successfully"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {isPublished
                ? "Your technical solutions have been reviewed and graded by the engineering team."
                : "Your coding solutions have been finalized and recorded to the secure evaluation ledger."}
            </p>
          </div>
        </div>

        {/* If Results Are Published: Show Verified Score Card */}
        {isPublished && reviewDetail?.review && (
          <Card className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-b from-[#0E1B1B] to-[#0A121A] p-6 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Verified Evaluation
                  </div>
                  <h2 className="text-base font-bold text-white">
                    {reviewDetail.review.passed ? "Passed Passing Threshold" : "Completed Below Target Score"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Target: {data.passingScore}% • Evaluated by {reviewDetail.review.reviewerName || "Recruiter"}
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right">
                <div className="text-3xl font-black text-white">
                  {reviewDetail.review.totalScore}%
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-block mt-1 ${
                    reviewDetail.review.passed
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                      : "bg-rose-950/80 text-rose-300 border-rose-700/60"
                  }`}
                >
                  {reviewDetail.review.passed ? "Passed" : "Did Not Meet Threshold"}
                </span>
              </div>
            </div>

            {/* Recruiter Overall Written Feedback */}
            {reviewDetail.review.feedback && (
              <div className="p-4 rounded-2xl bg-[#080C14]/90 border border-emerald-800/30 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                  <Sparkles className="h-3 w-3" />
                  <span>Recruiter Review Summary</span>
                </div>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-xs">
                  {reviewDetail.review.feedback}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Confirmation Metadata Card */}
        <Card className="rounded-2xl border-slate-800/80 bg-[#0B101D] p-6 space-y-6 shadow-2xl">
          <div className="space-y-3 pb-5 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                Assessment Details
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isPublished
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
                    : "bg-amber-950/60 text-amber-300 border-amber-800/50"
                }`}
              >
                {isPublished ? "Results Published" : "Submitted — Awaiting Review"}
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
                Questions
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

          {/* Timestamp & Confirmation ID */}
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

          {/* Guidance Callout */}
          {!isPublished && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                <span>What happens next?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your code snapshots have been securely submitted to {data.companyName}&apos;s recruiting team for manual technical review.
                You can track the review status and view verified feedback right from your Candidate Dashboard.
              </p>
            </div>
          )}

          {/* Inspect Submitted Code Accordion */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Your Submitted Solutions (Read-Only)
              </span>
            </div>

            <div className="space-y-2">
              {data.questions.map((q, idx) => {
                const draft = data.savedDrafts[q.id];
                const code = draft?.code || "";
                const lang = draft?.language || "typescript";
                const isExpanded = expandedCodeIndex === idx;

                const qReview = reviewDetail?.questions.find((item) => item.questionId === q.id);

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-800/80 bg-[#080C14] overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedCodeIndex(isExpanded ? null : idx)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-5 w-5 rounded bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {q.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({lang})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isPublished && qReview && (
                          <span className="text-xs font-bold text-emerald-400">
                            {qReview.pointsEarned} / {q.points} pts
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-1 border-t border-slate-800/60 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Immutable Submission Snapshot:</span>
                          <button
                            onClick={() => handleCopyCode(idx, code)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>

                        <pre className="p-3.5 rounded-lg bg-[#03060C] border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-56">
                          <code>{code || "// No code was saved for this question."}</code>
                        </pre>

                        {isPublished && qReview?.feedback && (
                          <div className="p-3 rounded-lg bg-[#0E1526] border border-purple-800/30 text-xs text-slate-300 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-purple-400">
                              Question Review Feedback:
                            </span>
                            <p className="italic text-slate-300">{qReview.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Return Button */}
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
