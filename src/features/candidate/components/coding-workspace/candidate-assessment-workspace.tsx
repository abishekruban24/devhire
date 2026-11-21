"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  saveQuestionDraft,
  submitAssessmentAttempt,
  type AssessmentAttemptData,
  type CandidateQuestionItem,
} from "@/features/assessments/actions/attempt-actions";
import { AssessmentWorkspaceHeader } from "./assessment-workspace-header";
import { ProblemDetailsPane } from "./problem-details-pane";
import { MonacoCodeEditor } from "./monaco-code-editor";
import { SubmissionConfirmationModal } from "./submission-confirmation-modal";
import { SubmissionCompletedView } from "./submission-completed-view";
import { Clock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CandidateAssessmentWorkspaceProps {
  initialData: AssessmentAttemptData;
}

export function CandidateAssessmentWorkspace({
  initialData,
}: CandidateAssessmentWorkspaceProps) {
  const [data, setData] = useState<AssessmentAttemptData>(initialData);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Initialize code state from existing saved drafts or question starter code
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of initialData.questions) {
      if (initialData.savedDrafts[q.id]?.code) {
        initial[q.id] = initialData.savedDrafts[q.id].code;
      } else {
        initial[q.id] = q.starterCode.python || q.starterCode.typescript || "";
      }
    }
    return initial;
  });

  // Initialize language state from saved drafts or default to python
  const [languageByQuestion, setLanguageByQuestion] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of initialData.questions) {
      if (initialData.savedDrafts[q.id]?.language) {
        initial[q.id] = initialData.savedDrafts[q.id].language;
      } else {
        initial[q.id] = "python";
      }
    }
    return initial;
  });

  // Server-authoritative timer countdown (seconds)
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(
    initialData.timeRemainingSeconds
  );

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">(
    "saved"
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(initialData.isExpired);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion: CandidateQuestionItem | undefined =
    data.questions[activeQuestionIndex];
  const activeCode = activeQuestion ? codeByQuestion[activeQuestion.id] || "" : "";
  const activeLanguage = activeQuestion ? languageByQuestion[activeQuestion.id] || "python" : "python";

  // Check which questions have draft code entered
  const questionStatusMap = React.useMemo(() => {
    const map: Record<number, { hasCode: boolean }> = {};
    data.questions.forEach((q, idx) => {
      const currentCode = codeByQuestion[q.id]?.trim() || "";
      const starterCode = q.starterCode.python || q.starterCode.typescript || "";
      const hasCode = currentCode.length > 0 && currentCode !== starterCode.trim();
      map[idx] = { hasCode };
    });
    return map;
  }, [data.questions, codeByQuestion]);

  // 1. Manual save draft handler
  const handleSaveDraft = useCallback(
    async (overrideQuestionId?: string, overrideCode?: string, overrideLang?: string) => {
      const qId = overrideQuestionId || activeQuestion?.id;
      if (!qId || data.isSubmitted || isTimedOut) return;

      const codeToSave = overrideCode !== undefined ? overrideCode : codeByQuestion[qId] || "";
      const langToSave = overrideLang || languageByQuestion[qId] || "python";

      setSaveStatus("saving");

      try {
        const res = await saveQuestionDraft({
          attemptId: data.attemptId,
          questionId: qId,
          code: codeToSave,
          language: langToSave,
        });

        if (res.success) {
          setSaveStatus("saved");
        } else {
          if (res.errorType === "ATTEMPT_EXPIRED") {
            setIsTimedOut(true);
          }
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [activeQuestion?.id, data.attemptId, data.isSubmitted, isTimedOut, codeByQuestion, languageByQuestion]
  );

  // 2. Debounced Autosave on code edit
  const handleCodeChange = (newCode: string) => {
    if (!activeQuestion || data.isSubmitted || isTimedOut) return;

    setCodeByQuestion((prev) => ({
      ...prev,
      [activeQuestion.id]: newCode,
    }));

    setSaveStatus("unsaved");

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      handleSaveDraft(activeQuestion.id, newCode, activeLanguage);
    }, 1500);
  };

  // 3. Language switch handler
  const handleLanguageChange = (newLanguage: string) => {
    if (!activeQuestion || data.isSubmitted || isTimedOut) return;

    setLanguageByQuestion((prev) => ({
      ...prev,
      [activeQuestion.id]: newLanguage,
    }));

    // If active code is currently empty or unmodified starter of previous language, load new language starter
    const currentCode = codeByQuestion[activeQuestion.id]?.trim() || "";
    const prevStarter = activeQuestion.starterCode[activeLanguage]?.trim();
    if (!currentCode || currentCode === prevStarter) {
      const newStarter = activeQuestion.starterCode[newLanguage] || "";
      setCodeByQuestion((prev) => ({
        ...prev,
        [activeQuestion.id]: newStarter,
      }));
      handleSaveDraft(activeQuestion.id, newStarter, newLanguage);
    } else {
      handleSaveDraft(activeQuestion.id, currentCode, newLanguage);
    }
  };

  // 4. Reset to Starter Code handler
  const handleResetStarter = () => {
    if (!activeQuestion || data.isSubmitted || isTimedOut) return;
    const starter = activeQuestion.starterCode[activeLanguage] || "";
    setCodeByQuestion((prev) => ({
      ...prev,
      [activeQuestion.id]: starter,
    }));
    handleSaveDraft(activeQuestion.id, starter, activeLanguage);
  };

  // 5. Final Submission Handler
  const handleFinalSubmit = useCallback(async () => {
    if (data.isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Prepare answers snapshot
    const answers = data.questions.map((q) => ({
      questionId: q.id,
      code: codeByQuestion[q.id] || "",
      language: languageByQuestion[q.id] || "python",
    }));

    try {
      const res = await submitAssessmentAttempt({
        attemptId: data.attemptId,
        answers,
      });

      if (res.success) {
        setIsConfirmModalOpen(false);
        setData((prev) => ({
          ...prev,
          status: "SUBMITTED",
          isSubmitted: true,
          submittedAt: res.submittedAt || new Date().toISOString(),
        }));
      } else {
        setSubmitError(res.message || "Failed to submit assessment.");
      }
    } catch {
      setSubmitError("An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  }, [data.isSubmitted, isSubmitting, data.questions, codeByQuestion, languageByQuestion, data.attemptId]);

  // 6. Server-Authoritative Timer Interval
  useEffect(() => {
    if (data.isSubmitted || isTimedOut) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimedOut(true);
          // Automatically finalize submission when countdown reaches zero
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data.isSubmitted, isTimedOut, handleFinalSubmit]);

  // Clean up autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // If already submitted, display submission confirmation view
  if (data.isSubmitted) {
    return <SubmissionCompletedView data={data} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080C14] text-slate-100 select-none">
      {/* Top Header Bar */}
      <AssessmentWorkspaceHeader
        assessmentTitle={data.assessmentTitle}
        companyName={data.companyName}
        jobTitle={data.jobTitle}
        totalQuestions={data.questions.length}
        activeQuestionIndex={activeQuestionIndex}
        onSelectQuestion={(idx) => setActiveQuestionIndex(idx)}
        questionStatusMap={questionStatusMap}
        timeRemainingSeconds={timeRemainingSeconds}
        onSubmitClick={() => setIsConfirmModalOpen(true)}
        isSubmitting={isSubmitting}
        readOnly={isTimedOut}
      />

      {/* Main Split Coding Area */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
        {/* Left Column: Problem Statement & Sample Cases (5 cols) */}
        <div className="lg:col-span-5 h-full min-h-0 flex flex-col overflow-hidden">
          {activeQuestion ? (
            <ProblemDetailsPane
              question={activeQuestion}
              questionNumber={activeQuestionIndex + 1}
              totalQuestions={data.questions.length}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-[#0B101D] rounded-xl border border-slate-800 text-slate-400 text-xs">
              No problem selected.
            </div>
          )}
        </div>

        {/* Right Column: Monaco Code Editor Workspace (7 cols) */}
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col overflow-hidden">
          <MonacoCodeEditor
            code={activeCode}
            language={activeLanguage}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            onResetStarter={handleResetStarter}
            onManualSave={() => handleSaveDraft()}
            saveStatus={saveStatus}
            readOnly={isTimedOut || data.isSubmitted}
          />
        </div>
      </div>

      {/* Mobile Question Selector Strip */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-[#0E1526] border-t border-slate-800 text-xs">
        <button
          disabled={activeQuestionIndex === 0}
          onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
          className="text-slate-400 hover:text-white disabled:opacity-40"
        >
          Previous
        </button>
        <span className="font-semibold text-slate-300">
          Problem {activeQuestionIndex + 1} of {data.questions.length}
        </span>
        <button
          disabled={activeQuestionIndex === data.questions.length - 1}
          onClick={() => setActiveQuestionIndex((prev) => Math.min(data.questions.length - 1, prev + 1))}
          className="text-slate-400 hover:text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {/* Confirmation Modal */}
      <SubmissionConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={isSubmitting}
        questions={data.questions}
        codeByQuestion={codeByQuestion}
        languageByQuestion={languageByQuestion}
      />

      {/* Timeout Auto-Finalize Modal */}
      {isTimedOut && !data.isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#0B101D] p-6 text-center space-y-5 shadow-2xl">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Assessment Time Has Expired
              </h2>
              <p className="text-xs text-slate-400">
                Your assessment time window has concluded. Your current draft code is being finalized and recorded to the submission ledger.
              </p>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
                {submitError}
              </div>
            )}

            <Button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs h-10 shadow-lg shadow-rose-950/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording Final Submissions...
                </>
              ) : (
                <>
                  <span>Finalize & View Submission</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
