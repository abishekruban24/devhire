"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Code2,
  Trophy,
  Clock,
  AlertCircle,
  FileCode,
  Building,
  Briefcase,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  getAttemptReviewDetails,
  type CandidateAssessmentHistoryItem,
  type AttemptReviewDetail,
} from "@/features/assessments/actions/review-actions";

interface CandidateAssessmentHistoryTrackerProps {
  initialHistory: CandidateAssessmentHistoryItem[];
}

export function CandidateAssessmentHistoryTracker({
  initialHistory,
}: CandidateAssessmentHistoryTrackerProps) {
  const [history] = useState<CandidateAssessmentHistoryItem[]>(initialHistory);
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "PENDING">("ALL");

  // Read-only Submission Inspector Modal State
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptReviewDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);

  const completedReviews = history.filter((h) => h.lifecycleState === "RESULTS_PUBLISHED");
  const awaitingReview = history.filter((h) => h.lifecycleState === "SUBMITTED_AWAITING_REVIEW");
  const passedCount = completedReviews.filter((h) => h.passed).length;
  const passRate = completedReviews.length > 0 ? Math.round((passedCount / completedReviews.length) * 100) : 0;

  const filteredHistory = history.filter((item) => {
    if (filter === "PUBLISHED" && item.lifecycleState !== "RESULTS_PUBLISHED") return false;
    if (filter === "PENDING" && item.lifecycleState !== "SUBMITTED_AWAITING_REVIEW") return false;
    return true;
  });

  const handleOpenInspection = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const res = await getAttemptReviewDetails(attemptId);
      if (!res.success || !res.data) {
        setDetailError(res.message || "Failed to load assessment review details.");
        return;
      }
      setAttemptDetail(res.data);
    } catch {
      setDetailError("Unexpected error loading assessment review.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCopyCode = (questionId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedQuestionId(questionId);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  return (
    <div id="history" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Code2 className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Assessment History & Evaluation
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review past coding assessments, verified scores, and feedback from hiring engineering teams.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === "ALL"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilter("PUBLISHED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === "PUBLISHED"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            Published Results ({completedReviews.length})
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === "PENDING"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            Awaiting Review ({awaitingReview.length})
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Completed
          </span>
          <div className="text-2xl font-bold text-white">{history.length}</div>
        </Card>

        <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Awaiting Review
          </span>
          <div className="text-2xl font-bold text-amber-300">{awaitingReview.length}</div>
        </Card>

        <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Published Results
          </span>
          <div className="text-2xl font-bold text-emerald-300">{completedReviews.length}</div>
        </Card>

        <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-4 space-y-1">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
            Pass Rate
          </span>
          <div className="text-2xl font-bold text-purple-300">{passRate}%</div>
        </Card>
      </div>

      {/* History Cards */}
      {filteredHistory.length === 0 ? (
        <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Code2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No technical assessments recorded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When you complete technical coding assessments for open roles, your submissions and recruiter reviews will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.map((item) => {
            const isPublished = item.lifecycleState === "RESULTS_PUBLISHED";
            const isAwaiting = item.lifecycleState === "SUBMITTED_AWAITING_REVIEW";
            const isInProgress = item.lifecycleState === "IN_PROGRESS";

            return (
              <Card
                key={item.attemptId}
                className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] hover:border-slate-700/80 p-5 space-y-4 transition-all shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{item.assessmentTitle}</h4>
                      {isPublished ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.passed
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50"
                              : "bg-rose-950/40 text-rose-300 border-rose-800/50"
                          }`}
                        >
                          {item.passed ? "Passed Threshold" : "Needs Improvement"} • {item.score}%
                        </span>
                      ) : isAwaiting ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-300 border border-amber-800/50 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Submitted — Awaiting Review</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/40 text-blue-300 border border-blue-800/50">
                          In Progress
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                          Expired
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Building className="h-3.5 w-3.5 text-blue-400" />
                        {item.companyName}
                      </span>
                      {item.jobTitle && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-purple-400" />
                          {item.jobTitle}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        Submitted: {item.submittedAt ? formatDate(item.submittedAt) : "In Progress"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isInProgress ? (
                      <Link href={`/candidate/assessment/${item.attemptId}`}>
                        <Button className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white gap-2">
                          <span>Resume Assessment</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handleOpenInspection(item.attemptId)}
                        className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 gap-2"
                      >
                        <FileCode className="h-3.5 w-3.5 text-purple-400" />
                        <span>Inspect Submission & Feedback</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Published Recruiter Feedback Preview Quote */}
                {isPublished && item.feedback && (
                  <div className="p-3.5 rounded-xl bg-[#080C14] border border-slate-800/80 text-xs text-slate-300 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Reviewer Feedback</span>
                    </div>
                    <p className="text-slate-300 italic leading-relaxed text-xs">
                      &ldquo;{item.feedback}&rdquo;
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Candidate Code Inspection Modal */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0A0F1D] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#080C14]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {attemptDetail ? attemptDetail.assessment.title : "Loading Submission..."}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Read-only snapshot of your submitted technical solutions
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAttemptId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span>Loading submitted solutions...</span>
                </div>
              ) : detailError ? (
                <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : attemptDetail ? (
                <>
                  {/* Results Banner (If Published) */}
                  {attemptDetail.review && attemptDetail.review.status === "PUBLISHED" ? (
                    <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              Official Evaluation Published
                            </h4>
                            <p className="text-[11px] text-emerald-300/80">
                              Reviewed by {attemptDetail.review.reviewerName || "Recruiter"} on{" "}
                              {attemptDetail.review.publishedAt ? formatDate(attemptDetail.review.publishedAt) : "Recently"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black text-white">
                            {attemptDetail.review.totalScore}%
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                              attemptDetail.review.passed
                                ? "bg-emerald-900/60 text-emerald-300 border-emerald-700/60"
                                : "bg-rose-900/60 text-rose-300 border-rose-700/60"
                            }`}
                          >
                            {attemptDetail.review.passed ? "Passed" : "Below Threshold"}
                          </span>
                        </div>
                      </div>

                      {attemptDetail.review.feedback && (
                        <div className="p-3.5 rounded-xl bg-[#080C14] border border-emerald-800/30 text-xs text-slate-300 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-400">
                            Recruiter Review Notes
                          </span>
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {attemptDetail.review.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200/90 flex items-center gap-3">
                      <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold text-white block">Awaiting Recruiter Review</span>
                        <span>Your code submission has been received and is in line for technical review by the hiring engineering team.</span>
                      </div>
                    </div>
                  )}

                  {/* Submitted Code per Question */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                      Submitted Technical Questions
                    </h4>

                    {attemptDetail.questions.map((q, idx) => (
                      <div
                        key={q.questionId}
                        className="rounded-2xl border border-slate-800/80 bg-[#080C14] p-5 space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="h-6 w-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="text-sm font-bold text-white">{q.title}</h5>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                                  {q.difficulty}
                                </span>
                                <span className="text-xs text-slate-400">
                                  Points: {q.pointsPossible} pts
                                </span>
                              </div>
                            </div>
                          </div>

                          {attemptDetail.review?.status === "PUBLISHED" && (
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-400">
                                Earned: {q.pointsEarned} / {q.pointsPossible} pts
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 bg-[#0B101D] p-3 rounded-xl border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
                          {q.description}
                        </div>

                        {/* Submitted Code */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                              <FileCode className="h-3.5 w-3.5 text-blue-400" />
                              Your Submitted Code ({q.candidateLanguage || "typescript"}):
                            </span>
                            <button
                              onClick={() => handleCopyCode(q.questionId, q.candidateCode)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Copy code"
                            >
                              {copiedQuestionId === q.questionId ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          <pre className="p-4 rounded-xl bg-[#03060C] border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-60 leading-relaxed">
                            <code>{q.candidateCode || "// No code was submitted for this question."}</code>
                          </pre>
                        </div>

                        {/* Recruiter Feedback for Question */}
                        {q.feedback && (
                          <div className="p-3 rounded-xl bg-[#0B101D] border border-purple-800/30 text-xs text-slate-300 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-purple-400">
                              Question #{idx + 1} Reviewer Note:
                            </span>
                            <p className="text-slate-300 italic">{q.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800/80 bg-[#080C14] flex items-center justify-end shrink-0">
              <Button
                variant="outline"
                onClick={() => setSelectedAttemptId(null)}
                className="text-xs border-slate-800 text-slate-300 hover:text-white"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
