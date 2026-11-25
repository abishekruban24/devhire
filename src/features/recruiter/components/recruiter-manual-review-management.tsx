"use client";

import React, { useState, useTransition } from "react";
import {
  FileCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Send,
  Save,
  X,
  Copy,
  Check,
  Briefcase,
  Sparkles,
  Trophy,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Video,
  Camera,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  getAttemptReviewDetails,
  saveAssessmentReviewDraft,
  finalizeAndPublishReview,
  type RecruiterSubmissionItem,
  type AttemptReviewDetail,
} from "@/features/assessments/actions/review-actions";

interface RecruiterManualReviewManagementProps {
  initialSubmissions: RecruiterSubmissionItem[];
  initialCounts: {
    total: number;
    awaitingReview: number;
    draftSaved: number;
    published: number;
  };
}

export function RecruiterManualReviewManagement({
  initialSubmissions,
  initialCounts,
}: RecruiterManualReviewManagementProps) {
  const [submissions, setSubmissions] = useState<RecruiterSubmissionItem[]>(initialSubmissions);
  const [counts, setCounts] = useState(initialCounts);
  const [filter, setFilter] = useState<"ALL" | "AWAITING_REVIEW" | "DRAFT_SAVED" | "PUBLISHED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal State
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [reviewDetail, setReviewDetail] = useState<AttemptReviewDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [integrityExpanded, setIntegrityExpanded] = useState(true);

  // Form State inside Modal
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [questionFeedbacks, setQuestionFeedbacks] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);

  // Action status state
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  // Filter Submissions by search query & tab
  const filteredSubmissions = submissions.filter((item) => {
    // Tab filtering
    if (filter === "AWAITING_REVIEW" && item.reviewStatus !== "AWAITING_REVIEW") return false;
    if (filter === "DRAFT_SAVED" && item.reviewStatus !== "DRAFT_SAVED") return false;
    if (filter === "PUBLISHED" && item.reviewStatus !== "PUBLISHED") return false;

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.candidateName.toLowerCase().includes(q);
      const matchEmail = item.candidateEmail.toLowerCase().includes(q);
      const matchAssessment = item.assessmentTitle.toLowerCase().includes(q);
      const matchJob = item.jobTitle?.toLowerCase().includes(q) || false;
      return matchName || matchEmail || matchAssessment || matchJob;
    }
    return true;
  });

  // Open Review Modal & Load Details
  const handleOpenReview = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setIsLoadingDetail(true);
    setDetailError(null);
    setActionMessage(null);
    setShowConfirmPublish(false);

    try {
      const res = await getAttemptReviewDetails(attemptId);
      if (!res.success || !res.data) {
        setDetailError(res.message || "Failed to load submission details.");
        return;
      }

      const detail = res.data;
      setReviewDetail(detail);

      // Initialize form scores and feedbacks from existing review data
      const initialScores: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};

      for (const q of detail.questions) {
        initialScores[q.questionId] = q.pointsEarned || 0;
        initialFeedbacks[q.questionId] = q.feedback || "";
      }

      setQuestionScores(initialScores);
      setQuestionFeedbacks(initialFeedbacks);
      setOverallFeedback(detail.review?.feedback || "");
    } catch {
      setDetailError("Unexpected error loading assessment submission.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedAttemptId(null);
    setReviewDetail(null);
    setActionMessage(null);
    setShowConfirmPublish(false);
  };

  // Calculate live overall total score
  const calculateTotalScore = () => {
    if (!reviewDetail) return { earned: 0, possible: 0, percentage: 0, passed: false };

    let earned = 0;
    let possible = 0;

    for (const q of reviewDetail.questions) {
      earned += Number(questionScores[q.questionId]) || 0;
      possible += q.pointsPossible;
    }

    const percentage = possible > 0 ? Math.round((earned / possible) * 10000) / 100 : 0;
    const passed = percentage >= reviewDetail.assessment.passingScore;

    return { earned, possible, percentage, passed };
  };

  const currentScore = calculateTotalScore();

  // Save Draft
  const handleSaveDraft = () => {
    if (!selectedAttemptId || !reviewDetail) return;

    setActionMessage(null);
    startTransition(async () => {
      const qReviews = reviewDetail.questions.map((q) => ({
        questionId: q.questionId,
        pointsEarned: Number(questionScores[q.questionId]) || 0,
        feedback: questionFeedbacks[q.questionId] || "",
      }));

      const res = await saveAssessmentReviewDraft({
        attemptId: selectedAttemptId,
        questionReviews: qReviews,
        overallFeedback,
      });

      if (!res.success) {
        setActionMessage({ type: "error", text: res.message });
      } else {
        setActionMessage({
          type: "success",
          text: `Draft saved successfully (${res.totalScore}% calculated). Draft remains hidden from candidate.`,
        });

        // Update local status in list
        setSubmissions((prev) =>
          prev.map((item) =>
            item.attemptId === selectedAttemptId
              ? { ...item, reviewStatus: "DRAFT_SAVED" }
              : item
          )
        );
      }
    });
  };

  // Finalize & Publish Review
  const handleFinalizePublish = () => {
    if (!selectedAttemptId || !reviewDetail) return;

    setActionMessage(null);
    startTransition(async () => {
      const qReviews = reviewDetail.questions.map((q) => ({
        questionId: q.questionId,
        pointsEarned: Number(questionScores[q.questionId]) || 0,
        feedback: questionFeedbacks[q.questionId] || "",
      }));

      const res = await finalizeAndPublishReview({
        attemptId: selectedAttemptId,
        questionReviews: qReviews,
        overallFeedback,
      });

      if (!res.success) {
        setActionMessage({ type: "error", text: res.message });
      } else {
        setActionMessage({
          type: "success",
          text: `Results published! Candidate can now view their official score (${res.totalScore}%) and written feedback.`,
        });
        setShowConfirmPublish(false);

        // Update local list
        setSubmissions((prev) =>
          prev.map((item) =>
            item.attemptId === selectedAttemptId
              ? {
                  ...item,
                  reviewStatus: "PUBLISHED",
                  score: res.totalScore ?? item.score,
                  passed: res.passed ?? item.passed,
                }
              : item
          )
        );

        // Refresh counts
        setCounts((prev) => ({
          ...prev,
          awaitingReview: Math.max(0, prev.awaitingReview - 1),
          published: prev.published + 1,
        }));
      }
    });
  };

  const handleCopyCode = (questionId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedQuestionId(questionId);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  return (
    <div id="reviews" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileCode className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Manual Technical Reviews
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted candidate code, assign question-level scores, provide feedback, and publish official evaluations.
          </p>
        </div>

        {/* Quick Metric Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="px-3 py-1.5 rounded-xl bg-[#0E1526] border border-slate-800 text-xs flex items-center gap-2 shrink-0">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white">{counts.total}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs flex items-center gap-2 shrink-0">
            <span className="text-amber-400">Awaiting:</span>
            <span className="font-bold text-amber-300">{counts.awaitingReview}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs flex items-center gap-2 shrink-0">
            <span className="text-blue-400">Drafts:</span>
            <span className="font-bold text-blue-300">{counts.draftSaved}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs flex items-center gap-2 shrink-0">
            <span className="text-emerald-400">Published:</span>
            <span className="font-bold text-emerald-300">{counts.published}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                filter === "ALL"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              All Submissions ({counts.total})
            </button>
            <button
              onClick={() => setFilter("AWAITING_REVIEW")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                filter === "AWAITING_REVIEW"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Awaiting Review ({counts.awaitingReview})
            </button>
            <button
              onClick={() => setFilter("DRAFT_SAVED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                filter === "DRAFT_SAVED"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Drafts Saved ({counts.draftSaved})
            </button>
            <button
              onClick={() => setFilter("PUBLISHED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                filter === "PUBLISHED"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Published ({counts.published})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by candidate, email, job..."
              className="w-full bg-[#080C14] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <FileCode className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No candidate submissions found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "No candidate submissions match your current search criteria."
              : "No candidate has completed a technical assessment under this category yet."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredSubmissions.map((sub) => {
            const isPublished = sub.reviewStatus === "PUBLISHED";
            const isDraft = sub.reviewStatus === "DRAFT_SAVED";

            return (
              <Card
                key={sub.attemptId}
                className="rounded-2xl border-slate-800/80 bg-[#0A0F1D] hover:border-slate-700/80 p-5 transition-all shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Candidate & Assessment Details */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {sub.candidateName}
                      </span>
                      <span className="text-xs text-slate-500">({sub.candidateEmail})</span>

                      {/* Status Badge */}
                      {isPublished ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          sub.passed
                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/50"
                            : "bg-rose-950/40 text-rose-300 border-rose-800/50"
                        }`}>
                          {sub.passed ? "Passed" : "Below Threshold"} • {sub.score}%
                        </span>
                      ) : isDraft ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/40 text-blue-300 border border-blue-800/50">
                          Draft Saved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-300 border border-amber-800/50">
                          Awaiting Review
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <FileCode className="h-3.5 w-3.5 text-purple-400" />
                        {sub.assessmentTitle}
                      </span>
                      {sub.jobTitle && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                          {sub.jobTitle}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        Submitted: {sub.submittedAt ? formatDate(sub.submittedAt) : "N/A"}
                      </span>
                      <span className="text-slate-500">
                        • {sub.answeredCount} of {sub.questionsCount} questions answered
                      </span>
                    </div>
                  </div>

                  {/* Right: Review Action Button */}
                  <div className="shrink-0 flex items-center gap-3">
                    <Button
                      onClick={() => handleOpenReview(sub.attemptId)}
                      className={`text-xs font-semibold px-4 py-2 gap-2 transition-all ${
                        isPublished
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40"
                      }`}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      <span>{isPublished ? "View Published Review" : isDraft ? "Continue Review" : "Review Code"}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal Drawer */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0A0F1D] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#080C14]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {reviewDetail ? `Reviewing ${reviewDetail.candidate.name}'s Submission` : "Loading Submission..."}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {reviewDetail?.assessment.title} • Passing Threshold: {reviewDetail?.assessment.passingScore}%
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingDetail ? (
                <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                  <span>Loading candidate code snapshot and assessment details...</span>
                </div>
              ) : detailError ? (
                <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : reviewDetail ? (
                <>
                  {/* Status Banner */}
                  {actionMessage && (
                    <div
                      className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
                        actionMessage.type === "success"
                          ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                          : "bg-rose-950/30 border-rose-800/50 text-rose-300"
                      }`}
                    >
                      {actionMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      )}
                      <span>{actionMessage.text}</span>
                    </div>
                  )}

                  {/* Submission Info Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#080C14] p-3.5 rounded-2xl border border-slate-800/60">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Candidate</span>
                      <div className="text-white font-medium truncate">{reviewDetail.candidate.name}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Email</span>
                      <div className="text-slate-300 truncate">{reviewDetail.candidate.email}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Submitted</span>
                      <div className="text-slate-300">{reviewDetail.submittedAt ? formatDate(reviewDetail.submittedAt) : "N/A"}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Duration</span>
                      <div className="text-slate-300">{reviewDetail.assessment.durationMinutes} minutes</div>
                    </div>
                  </div>

                  {/* Smart Proctoring & Assessment Integrity Section */}
                  {reviewDetail.integrity && (
                    <div className="rounded-2xl border border-slate-800/90 bg-[#080C14] overflow-hidden shadow-sm">
                      <div
                        onClick={() => setIntegrityExpanded((prev) => !prev)}
                        className="px-4 py-3.5 bg-[#0B101D] border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-[#0E1526] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                              reviewDetail.integrity.violationCount > 0
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {reviewDetail.integrity.violationCount > 0 ? (
                              <ShieldAlert className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                              Smart Proctoring & Integrity Telemetry
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  reviewDetail.integrity.submissionReason === "POLICY_VIOLATION"
                                    ? "bg-rose-950/60 text-rose-300 border-rose-800/50"
                                    : reviewDetail.integrity.submissionReason === "TIMER_EXPIRED"
                                    ? "bg-amber-950/60 text-amber-300 border-amber-800/50"
                                    : "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
                                }`}
                              >
                                {reviewDetail.integrity.submissionReason === "POLICY_VIOLATION"
                                  ? "Auto-Terminated (Policy Violation)"
                                  : reviewDetail.integrity.submissionReason === "TIMER_EXPIRED"
                                  ? "Timer Expired Auto-Submit"
                                  : "Manual Submission"}
                              </span>
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {reviewDetail.integrity.violationCount === 0
                                ? "Clean session: No proctoring policy warnings recorded"
                                : `${reviewDetail.integrity.violationCount} total violation warning(s) logged during test session`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            {integrityExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {integrityExpanded && (
                        <div className="p-4 space-y-4">
                          {/* Violation Metric Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            <div className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/80 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Tab Switches
                              </span>
                              <div
                                className={`text-base font-bold mt-1 ${
                                  reviewDetail.integrity.tabSwitchCount > 0
                                    ? "text-amber-400"
                                    : "text-white"
                                }`}
                              >
                                {reviewDetail.integrity.tabSwitchCount}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/80 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Focus Loss
                              </span>
                              <div
                                className={`text-base font-bold mt-1 ${
                                  reviewDetail.integrity.focusLossCount > 0
                                    ? "text-amber-400"
                                    : "text-white"
                                }`}
                              >
                                {reviewDetail.integrity.focusLossCount}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/80 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Fullscreen Exits
                              </span>
                              <div
                                className={`text-base font-bold mt-1 ${
                                  reviewDetail.integrity.fullscreenExitCount > 0
                                    ? "text-amber-400"
                                    : "text-white"
                                }`}
                              >
                                {reviewDetail.integrity.fullscreenExitCount}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/80 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Copy / Paste
                              </span>
                              <div
                                className={`text-base font-bold mt-1 ${
                                  reviewDetail.integrity.copyPasteAttempts > 0
                                    ? "text-rose-400"
                                    : "text-white"
                                }`}
                              >
                                {reviewDetail.integrity.copyPasteAttempts}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/80 text-center col-span-2 sm:col-span-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                Face Absence
                              </span>
                              <div
                                className={`text-base font-bold mt-1 ${
                                  reviewDetail.integrity.faceAbsenceCount > 0
                                    ? "text-purple-400"
                                    : "text-white"
                                }`}
                              >
                                {reviewDetail.integrity.faceAbsenceCount}
                              </div>
                            </div>
                          </div>

                          {/* Candidate Accommodation Notes if provided */}
                          {reviewDetail.integrity.accommodationNotes && (
                            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs flex items-start gap-2.5">
                              <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-blue-200">
                                  Candidate Accommodation Request:
                                </span>
                                <p className="text-slate-300 mt-0.5 leading-relaxed">
                                  {reviewDetail.integrity.accommodationNotes}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Integrity Event Audit Timeline */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Integrity Audit Event Log ({reviewDetail.integrity.events.length})
                            </span>
                            {reviewDetail.integrity.events.length === 0 ? (
                              <div className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/60 text-xs text-slate-400 text-center">
                                No security or proctoring warnings recorded during this session.
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {reviewDetail.integrity.events.map((evt) => (
                                  <div
                                    key={evt.id}
                                    className="p-2.5 rounded-xl bg-[#0B101D] border border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                                      <span className="font-semibold text-slate-200 truncate">
                                        {evt.eventType.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                      {formatDate(evt.timestamp)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Incident Video Recordings */}
                          {reviewDetail.integrity.recordings.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                              <div className="flex items-center gap-2">
                                <Video className="h-3.5 w-3.5 text-purple-400" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                  Incident Video Recordings (
                                  {reviewDetail.integrity.recordings.length})
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {reviewDetail.integrity.recordings.map((rec) => (
                                  <div
                                    key={rec.id}
                                    className="p-3 rounded-xl bg-[#0B101D] border border-slate-800/70 space-y-2"
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-semibold text-purple-300">
                                        {rec.incidentEventType
                                          ? `Incident: ${rec.incidentEventType.replace(/_/g, " ")}`
                                          : `Mode: ${rec.recordingType}`}
                                      </span>
                                      <span className="text-slate-500 font-mono">
                                        {rec.durationSeconds}s • {Math.round(rec.fileSize / 1024)} KB
                                      </span>
                                    </div>
                                    {rec.storageKey ? (
                                      <video
                                        src={rec.storageKey}
                                        controls
                                        className="w-full rounded-lg bg-black border border-slate-800 max-h-48"
                                      />
                                    ) : (
                                      <div className="h-28 rounded-lg bg-black flex items-center justify-center text-slate-500 text-xs">
                                        Recording saved to persistent ledger
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions Review Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Questions & Code Evaluation
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">
                        Total Points Possible: {currentScore.possible} pts
                      </span>
                    </div>

                    {reviewDetail.questions.map((q, idx) => {
                      const userCode = q.candidateCode;
                      const hasSubmitted = userCode && userCode.trim().length > 0;
                      const scoreVal = questionScores[q.questionId] ?? 0;

                      return (
                        <div
                          key={q.questionId}
                          className="rounded-2xl border border-slate-800/80 bg-[#080C14] p-5 space-y-4 shadow-sm"
                        >
                          {/* Question Header */}
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
                                    Max: {q.pointsPossible} pts
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Score Input */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-400 font-medium">
                                Score (Max {q.pointsPossible}):
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={q.pointsPossible}
                                  step={1}
                                  value={scoreVal}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(q.pointsPossible, Number(e.target.value) || 0));
                                    setQuestionScores((prev) => ({
                                      ...prev,
                                      [q.questionId]: val,
                                    }));
                                  }}
                                  className="w-20 bg-[#0E1526] border border-slate-700 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-purple-500"
                                />
                                <span className="text-xs text-slate-500">/ {q.pointsPossible}</span>
                              </div>
                            </div>
                          </div>

                          {/* Problem Description */}
                          <div className="text-xs text-slate-400 bg-[#0B101D] p-3 rounded-xl border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
                            {q.description}
                          </div>

                          {/* Candidate's Submitted Code Block */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <FileCode className="h-3.5 w-3.5 text-blue-400" />
                                Submitted Candidate Code ({q.candidateLanguage || "typescript"}):
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">
                                  {hasSubmitted ? "Immutable snapshot" : "Unanswered by candidate"}
                                </span>
                                {hasSubmitted && (
                                  <button
                                    onClick={() => handleCopyCode(q.questionId, userCode)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    title="Copy submitted code"
                                  >
                                    {copiedQuestionId === q.questionId ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <pre className="p-4 rounded-xl bg-[#03060C] border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-60 leading-relaxed selection:bg-purple-900 selection:text-white">
                              <code>{userCode || "// Candidate left this question blank."}</code>
                            </pre>
                          </div>

                          {/* Question Specific Feedback */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-400">
                              Recruiter Feedback for Question #{idx + 1} (optional):
                            </label>
                            <textarea
                              rows={2}
                              value={questionFeedbacks[q.questionId] || ""}
                              onChange={(e) =>
                                setQuestionFeedbacks((prev) => ({
                                  ...prev,
                                  [q.questionId]: e.target.value,
                                }))
                              }
                              placeholder={`Feedback on logic, complexity, edge case handling for Question #${idx + 1}...`}
                              className="w-full bg-[#0E1526] border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Assessment Score & Feedback Card */}
                  <div className="rounded-2xl border-2 border-purple-500/30 bg-[#0E1526]/80 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-400" />
                          Overall Assessment Evaluation
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Total score calculated across all questions based on recruiter points.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-black text-white">
                            {currentScore.percentage}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {currentScore.earned} / {currentScore.possible} pts
                          </div>
                        </div>

                        <div className="h-8 w-[1px] bg-slate-800" />

                        <div className="text-left">
                          <div
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-block ${
                              currentScore.passed
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                                : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                            }`}
                          >
                            {currentScore.passed ? "Passed Threshold" : "Below Passing Score"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Target: {reviewDetail.assessment.passingScore}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Overall Recruiter Evaluation & Written Feedback:
                      </label>
                      <textarea
                        rows={3}
                        value={overallFeedback}
                        onChange={(e) => setOverallFeedback(e.target.value)}
                        placeholder="Provide an overall technical review summary for the candidate..."
                        className="w-full bg-[#080C14] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer Controls */}
            {reviewDetail && !isLoadingDetail && (
              <div className="px-6 py-4 border-t border-slate-800/80 bg-[#080C14] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>
                    Status:{" "}
                    <strong className="text-white">
                      {reviewDetail.review?.status === "PUBLISHED"
                        ? "Published Results"
                        : "Draft in Progress"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleCloseModal}
                    className="text-xs border-slate-800 text-slate-300 hover:text-white flex-1 sm:flex-none"
                  >
                    Close
                  </Button>

                  <Button
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex-1 sm:flex-none gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Draft</span>
                  </Button>

                  <Button
                    onClick={() => setShowConfirmPublish(true)}
                    disabled={isPending}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40 flex-1 sm:flex-none gap-1.5 font-bold"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Finalize & Publish</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Publishing */}
      {showConfirmPublish && reviewDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0E1526] border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
              <Send className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                Finalize & Publish Assessment Review?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are about to publish an official score of{" "}
                <strong className="text-white font-bold">{currentScore.percentage}%</strong> (
                {currentScore.passed ? "Passed" : "Below Threshold"}) for{" "}
                <strong className="text-white font-bold">{reviewDetail.candidate.name}</strong>.
              </p>
              <p className="text-[11px] text-amber-300/90 pt-1">
                Once published, the score and written feedback become immediately visible to the candidate on their dashboard.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1 text-xs border-slate-700 text-slate-300 hover:text-white"
              >
                Go Back
              </Button>
              <Button
                onClick={handleFinalizePublish}
                disabled={isPending}
                className="flex-1 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/50"
              >
                {isPending ? "Publishing..." : "Confirm & Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
