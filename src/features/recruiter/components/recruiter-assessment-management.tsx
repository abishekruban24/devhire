"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Code2,
  Plus,
  Search,
  Filter,
  Clock,
  Target,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  FileCode,
  Layers,
  Lock,
  Unlock,
  Archive,
  Shield,
  Camera,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  RecruiterAssessmentItem,
  CreateQuestionInput,
  CreateTestCaseInput,
} from "@/features/assessments/actions/assessment-actions";
import {
  createAssessment,
  updateAssessment,
  updateAssessmentStatus,
  deleteAssessment,
} from "@/features/assessments/actions/assessment-actions";
import type { AssessmentStatus, QuestionDifficulty } from "@prisma/client";
import { formatDate } from "@/lib/utils";

interface RecruiterAssessmentManagementProps {
  initialAssessments: RecruiterAssessmentItem[];
  companyJobs: { id: string; title: string }[];
}

interface QuestionFormState {
  id?: string;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  points: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  starterCodeTs: string;
  starterCodePy: string;
  testCases: CreateTestCaseInput[];
}

const DEFAULT_QUESTION: QuestionFormState = {
  title: "Array Peak Element Finder",
  description: "Given an integer array nums, find a peak element, and return its index. If the array contains multiple peaks, return the index to any of the peaks. You must write an algorithm that runs in O(log n) time.",
  difficulty: "MEDIUM",
  points: 100,
  timeLimitMs: 2000,
  memoryLimitKb: 262144,
  starterCodeTs: `function findPeakElement(nums: number[]): number {\n  // Implement your solution here\n  return 0;\n}`,
  starterCodePy: `def findPeakElement(nums: list[int]) -> int:\n    # Implement your solution here\n    return 0`,
  testCases: [
    {
      input: "nums = [1, 2, 3, 1]",
      expectedOutput: "2",
      isHidden: false,
      explanation: "3 is a peak element and your function should return the index number 2.",
      weight: 1.0,
    },
    {
      input: "nums = [1, 2, 1, 3, 5, 6, 4]",
      expectedOutput: "5",
      isHidden: false,
      explanation: "Your function can return either index 1 (value 2) or index 5 (value 6).",
      weight: 1.0,
    },
    {
      input: "nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]",
      expectedOutput: "9",
      isHidden: true,
      explanation: "Monotonically increasing evaluation boundary case.",
      weight: 2.0,
    },
  ],
};

export function RecruiterAssessmentManagement({
  initialAssessments,
  companyJobs,
}: RecruiterAssessmentManagementProps) {
  const [assessments, setAssessments] = useState<RecruiterAssessmentItem[]>(initialAssessments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AssessmentStatus>("ALL");
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);

  // Assessment Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState<number>(60);
  const [formPassingScore, setFormPassingScore] = useState<number>(70);
  const [formStatus, setFormStatus] = useState<AssessmentStatus>("DRAFT");
  const [formJobId, setFormJobId] = useState<string>("");
  const [formQuestions, setFormQuestions] = useState<QuestionFormState[]>([DEFAULT_QUESTION]);

  // Proctoring Settings State (Phase 9B, 9C, 9D)
  const [formEnableProctoring, setFormEnableProctoring] = useState<boolean>(false);
  const [formRequireFullscreen, setFormRequireFullscreen] = useState<boolean>(false);
  const [formTrackTabSwitches, setFormTrackTabSwitches] = useState<boolean>(true);
  const [formTrackFocusLoss, setFormTrackFocusLoss] = useState<boolean>(true);
  const [formRestrictPaste, setFormRestrictPaste] = useState<boolean>(true);
  const [formRestrictCopy, setFormRestrictCopy] = useState<boolean>(true);
  const [formMaxViolations, setFormMaxViolations] = useState<number>(3);
  const [formAutoSubmitOnViolations, setFormAutoSubmitOnViolations] = useState<boolean>(true);
  const [formWebcamProctoring, setFormWebcamProctoring] = useState<boolean>(false);
  const [formRecordingMode, setFormRecordingMode] = useState<string>("NONE");

  // Active question editing within modal
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);

  // Filtered Assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchJob = item.jobs.some((j) => j.title.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchJob) return false;
      }
      return true;
    });
  }, [assessments, statusFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingAssessmentId(null);
    setFormTitle("");
    setFormDescription("");
    setFormDuration(60);
    setFormPassingScore(70);
    setFormStatus("DRAFT");
    setFormJobId(companyJobs[0]?.id || "");
    setFormQuestions([{ ...DEFAULT_QUESTION }]);
    setFormEnableProctoring(false);
    setFormRequireFullscreen(false);
    setFormTrackTabSwitches(true);
    setFormTrackFocusLoss(true);
    setFormRestrictPaste(true);
    setFormRestrictCopy(true);
    setFormMaxViolations(3);
    setFormAutoSubmitOnViolations(true);
    setFormWebcamProctoring(false);
    setFormRecordingMode("NONE");
    setActiveQuestionIdx(0);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: RecruiterAssessmentItem) => {
    setEditingAssessmentId(item.id);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormDuration(item.durationMinutes);
    setFormPassingScore(item.passingScore);
    setFormStatus(item.status);
    setFormJobId(item.jobs[0]?.id || "");
    setFormEnableProctoring(item.enableProctoring ?? false);
    setFormRequireFullscreen(item.requireFullscreen ?? false);
    setFormTrackTabSwitches(item.trackTabSwitches ?? true);
    setFormTrackFocusLoss(item.trackFocusLoss ?? true);
    setFormRestrictPaste(item.restrictPaste ?? true);
    setFormRestrictCopy(item.restrictCopy ?? true);
    setFormMaxViolations(item.maxViolations ?? 3);
    setFormAutoSubmitOnViolations(item.autoSubmitOnViolations ?? true);
    setFormWebcamProctoring(item.webcamProctoring ?? false);
    setFormRecordingMode(item.recordingMode ?? "NONE");
    setFeedback(null);

    if (item.questions && item.questions.length > 0) {
      setFormQuestions(
        item.questions.map((q) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          points: q.points,
          timeLimitMs: q.timeLimitMs,
          memoryLimitKb: q.memoryLimitKb,
          starterCodeTs:
            (q.starterCode as Record<string, string>)?.typescript ||
            DEFAULT_QUESTION.starterCodeTs,
          starterCodePy:
            (q.starterCode as Record<string, string>)?.python ||
            DEFAULT_QUESTION.starterCodePy,
          testCases: q.testCases.map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            explanation: tc.explanation,
            weight: tc.weight,
          })),
        }))
      );
    } else {
      setFormQuestions([{ ...DEFAULT_QUESTION }]);
    }
    setActiveQuestionIdx(0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssessmentId(null);
  };

  // Question helpers
  const handleAddQuestion = () => {
    const newQ: QuestionFormState = {
      title: `Coding Challenge #${formQuestions.length + 1}`,
      description: "Describe the algorithm, input format, constraints, and time complexity requirements.",
      difficulty: "MEDIUM",
      points: 100,
      timeLimitMs: 2000,
      memoryLimitKb: 262144,
      starterCodeTs: `function solution(input: string): string {\n  return input;\n}`,
      starterCodePy: `def solution(input: str) -> str:\n    return input`,
      testCases: [
        {
          input: `"test_case_1"`,
          expectedOutput: `"test_case_1"`,
          isHidden: false,
          explanation: "Sample visible test case.",
          weight: 1.0,
        },
        {
          input: `"hidden_eval_1"`,
          expectedOutput: `"hidden_eval_1"`,
          isHidden: true,
          explanation: "Hidden evaluation test case.",
          weight: 2.0,
        },
      ],
    };
    setFormQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIdx(formQuestions.length);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (formQuestions.length <= 1) {
      alert("An assessment must have at least one coding question.");
      return;
    }
    setFormQuestions((prev) => prev.filter((_, i) => i !== idx));
    setActiveQuestionIdx(Math.max(0, idx - 1));
  };

  const handleAddTestCase = (qIdx: number) => {
    setFormQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIdx] };
      q.testCases = [
        ...q.testCases,
        {
          input: "input_data",
          expectedOutput: "expected_data",
          isHidden: false,
          weight: 1.0,
        },
      ];
      next[qIdx] = q;
      return next;
    });
  };

  const handleRemoveTestCase = (qIdx: number, tcIdx: number) => {
    setFormQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIdx] };
      if (q.testCases.length <= 1) {
        alert("Each question must contain at least one test case.");
        return prev;
      }
      q.testCases = q.testCases.filter((_, i) => i !== tcIdx);
      next[qIdx] = q;
      return next;
    });
  };

  // Submit Handler
  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFeedback({ type: "error", message: "Assessment title is required." });
      return;
    }
    if (!formDescription.trim()) {
      setFeedback({ type: "error", message: "Assessment description is required." });
      return;
    }

    startTransition(async () => {
      const questionsPayload: CreateQuestionInput[] = formQuestions.map((q, idx) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        points: q.points,
        timeLimitMs: q.timeLimitMs,
        memoryLimitKb: q.memoryLimitKb,
        orderIndex: idx,
        starterCode: {
          typescript: q.starterCodeTs,
          python: q.starterCodePy,
        },
        testCases: q.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          explanation: tc.explanation,
          weight: tc.weight,
        })),
      }));

      if (editingAssessmentId) {
        // Update
        const res = await updateAssessment(editingAssessmentId, {
          title: formTitle,
          description: formDescription,
          durationMinutes: formDuration,
          passingScore: formPassingScore,
          status: formStatus,
          jobId: formJobId || null,
          enableProctoring: formEnableProctoring,
          requireFullscreen: formRequireFullscreen,
          trackTabSwitches: formTrackTabSwitches,
          trackFocusLoss: formTrackFocusLoss,
          restrictPaste: formRestrictPaste,
          restrictCopy: formRestrictCopy,
          maxViolations: formMaxViolations,
          autoSubmitOnViolations: formAutoSubmitOnViolations,
          webcamProctoring: formWebcamProctoring,
          recordingMode: formRecordingMode,
        });

        if (res.success) {
          setAssessments((prev) =>
            prev.map((item) =>
              item.id === editingAssessmentId
                ? {
                    ...item,
                    title: formTitle,
                    description: formDescription,
                    durationMinutes: formDuration,
                    passingScore: formPassingScore,
                    status: formStatus,
                    enableProctoring: formEnableProctoring,
                    requireFullscreen: formRequireFullscreen,
                    trackTabSwitches: formTrackTabSwitches,
                    trackFocusLoss: formTrackFocusLoss,
                    restrictPaste: formRestrictPaste,
                    restrictCopy: formRestrictCopy,
                    maxViolations: formMaxViolations,
                    autoSubmitOnViolations: formAutoSubmitOnViolations,
                    webcamProctoring: formWebcamProctoring,
                    recordingMode: formRecordingMode,
                    jobs: formJobId
                      ? [
                          {
                            id: formJobId,
                            title: companyJobs.find((j) => j.id === formJobId)?.title || "Linked Job",
                            slug: "job-slug",
                            status: "PUBLISHED",
                          },
                        ]
                      : [],
                  }
                : item
            )
          );
          setFeedback({ type: "success", message: res.message });
          closeModal();
        } else {
          setFeedback({ type: "error", message: res.message });
        }
      } else {
        // Create
        const res = await createAssessment({
          title: formTitle,
          description: formDescription,
          durationMinutes: formDuration,
          passingScore: formPassingScore,
          status: formStatus,
          jobId: formJobId || null,
          questions: questionsPayload,
          enableProctoring: formEnableProctoring,
          requireFullscreen: formRequireFullscreen,
          trackTabSwitches: formTrackTabSwitches,
          trackFocusLoss: formTrackFocusLoss,
          restrictPaste: formRestrictPaste,
          restrictCopy: formRestrictCopy,
          maxViolations: formMaxViolations,
          autoSubmitOnViolations: formAutoSubmitOnViolations,
          webcamProctoring: formWebcamProctoring,
          recordingMode: formRecordingMode,
        });

        if (res.success && res.assessmentId) {
          const newAssessmentItem: RecruiterAssessmentItem = {
            id: res.assessmentId,
            title: formTitle,
            description: formDescription,
            durationMinutes: formDuration,
            passingScore: formPassingScore,
            status: formStatus,
            companyId: "company-id",
            creatorId: "creator-id",
            creator: { id: "me", name: "Recruiter", email: "me@devhire.test" },
            enableProctoring: formEnableProctoring,
            requireFullscreen: formRequireFullscreen,
            trackTabSwitches: formTrackTabSwitches,
            trackFocusLoss: formTrackFocusLoss,
            restrictPaste: formRestrictPaste,
            restrictCopy: formRestrictCopy,
            maxViolations: formMaxViolations,
            autoSubmitOnViolations: formAutoSubmitOnViolations,
            webcamProctoring: formWebcamProctoring,
            recordingMode: formRecordingMode,
            jobs: formJobId
              ? [
                  {
                    id: formJobId,
                    title: companyJobs.find((j) => j.id === formJobId)?.title || "Linked Job",
                    slug: "job-slug",
                    status: "PUBLISHED",
                  },
                ]
              : [],
            questions: questionsPayload.map((q, i) => ({
              id: `q-${i}`,
              assessmentId: res.assessmentId!,
              title: q.title,
              description: q.description,
              difficulty: q.difficulty || "MEDIUM",
              points: q.points || 100,
              timeLimitMs: q.timeLimitMs || 2000,
              memoryLimitKb: q.memoryLimitKb || 262144,
              orderIndex: i,
              testCases: (q.testCases || []).map((tc, tcI) => ({
                id: `tc-${tcI}`,
                questionId: `q-${i}`,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: Boolean(tc.isHidden),
                explanation: tc.explanation,
                weight: tc.weight || 1.0,
                createdAt: new Date(),
              })),
              createdAt: new Date(),
            })),
            _count: {
              questions: questionsPayload.length,
              attempts: 0,
              jobs: formJobId ? 1 : 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setAssessments((prev) => [newAssessmentItem, ...prev]);
          setFeedback({ type: "success", message: res.message });
          closeModal();
        } else {
          setFeedback({ type: "error", message: res.message });
        }
      }
    });
  };

  // Status Change
  const handleStatusChange = (id: string, newStatus: AssessmentStatus) => {
    startTransition(async () => {
      const res = await updateAssessmentStatus(id, newStatus);
      if (res.success) {
        setAssessments((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  };

  // Delete Handler
  const handleDelete = (item: RecruiterAssessmentItem) => {
    if (item._count.attempts > 0) {
      alert(
        `Cannot delete "${item.title}" because candidates have already taken it (${item._count.attempts} attempts). Archive the assessment instead to retire it safely.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete assessment "${item.title}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAssessment(item.id);
      if (res.success) {
        setAssessments((prev) => prev.filter((a) => a.id !== item.id));
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  };

  const getStatusBadge = (status: AssessmentStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Archived
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
            Draft
          </span>
        );
    }
  };

  const getDifficultyBadge = (diff: QuestionDifficulty) => {
    switch (diff) {
      case "EASY":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
            Easy
          </span>
        );
      case "HARD":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
            Hard
          </span>
        );
      case "MEDIUM":
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
            Medium
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="assessments">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Technical Assessment Library & Creator
            </h2>
            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Author coding challenges, configure visible sample and hidden evaluation test cases, and attach benchmarks to job postings
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/20 flex items-center gap-2 text-xs"
        >
          <Plus className="h-4 w-4" />
          Create Assessment
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0E1526]/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments by title, description, or linked role..."
            className="w-full pl-9 pr-4 py-2 bg-[#080C14] border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <div className="flex rounded-lg border border-slate-700/60 bg-[#080C14] p-0.5 text-xs">
            {(["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assessment List */}
      {filteredAssessments.length === 0 ? (
        <Card className="p-12 text-center border-slate-800/80 bg-[#0E1526]/50">
          <Code2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No technical assessments found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "No assessments match the selected search or filter criteria. Try clearing filters."
              : "Create your first coding assessment to evaluate candidate technical problem solving and algorithm design."}
          </p>
          <Button
            onClick={openCreateModal}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create First Assessment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssessments.map((item) => {
            const isExpanded = expandedAssessmentId === item.id;
            const totalQuestions = item.questions?.length || item._count.questions;
            const totalAttempts = item._count.attempts;
            const linkedJob = item.jobs && item.jobs.length > 0 ? item.jobs[0] : null;

            return (
              <Card
                key={item.id}
                className="border-slate-800/90 bg-[#0E1526]/80 hover:border-slate-700/80 transition-all p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {item.title}
                      </h3>
                      {getStatusBadge(item.status)}
                      {linkedJob && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/40">
                          <Briefcase className="h-3 w-3 text-blue-400" />
                          Attached to: {linkedJob.title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start shrink-0 pt-1 lg:pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                      className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>

                    {item.status === "DRAFT" && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleStatusChange(item.id, "ACTIVE")}
                        className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-600/30 text-xs flex items-center gap-1.5"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Activate
                      </Button>
                    )}

                    {item.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleStatusChange(item.id, "ARCHIVED")}
                        className="bg-amber-600/20 text-amber-300 border border-amber-600/40 hover:bg-amber-600/30 text-xs flex items-center gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending || totalAttempts > 0}
                      onClick={() => handleDelete(item)}
                      className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 text-xs disabled:opacity-40"
                      title={totalAttempts > 0 ? "Cannot delete: candidate attempts recorded" : "Delete assessment"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/70">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>{item.durationMinutes} minutes duration</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Passing threshold: {item.passingScore}%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-purple-400" />
                    <span>{totalQuestions} coding question(s)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{totalAttempts} candidate attempt(s)</span>
                  </div>

                  {item.enableProctoring && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/40">
                      <Shield className="h-3 w-3 text-blue-400" />
                      <span>Proctored</span>
                    </div>
                  )}

                  {item.webcamProctoring && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/40">
                      <Camera className="h-3 w-3 text-purple-400" />
                      <span>Webcam</span>
                    </div>
                  )}

                  {item.recordingMode && item.recordingMode !== "NONE" && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/40">
                      <Video className="h-3 w-3 text-rose-400" />
                      <span>{item.recordingMode === "FULL" ? "Full Video" : "Incident Clips"}</span>
                    </div>
                  )}

                  <div className="ml-auto text-[11px] text-slate-500">
                    Created {formatDate(item.createdAt)}
                  </div>
                </div>

                {/* Expand / Collapse Questions Inspector */}
                {item.questions && item.questions.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() =>
                        setExpandedAssessmentId(isExpanded ? null : item.id)
                      }
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Hide Questions & Test Cases
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Inspect {item.questions.length} Question(s) & Test Cases
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 pt-3 border-t border-slate-800/60 animate-in fade-in duration-150">
                        {item.questions.map((q, idx) => {
                          const visibleCases = q.testCases.filter((tc) => !tc.isHidden);
                          const hiddenCases = q.testCases.filter((tc) => tc.isHidden);

                          return (
                            <div
                              key={q.id || idx}
                              className="p-3.5 rounded-lg bg-[#080C14] border border-slate-800/80 space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400">
                                    Q{idx + 1}.
                                  </span>
                                  <h4 className="text-xs font-semibold text-white">
                                    {q.title}
                                  </h4>
                                  {getDifficultyBadge(q.difficulty)}
                                  <span className="text-[10px] text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded">
                                    {q.points} pts
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span className="flex items-center gap-1 text-emerald-400/90">
                                    <Eye className="h-3 w-3" />
                                    {visibleCases.length} sample
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-amber-400/90">
                                    <EyeOff className="h-3 w-3" />
                                    {hiddenCases.length} evaluation
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 line-clamp-2">
                                {q.description}
                              </p>

                              {/* Test cases breakdown pills */}
                              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                                {q.testCases.map((tc, tcIdx) => (
                                  <span
                                    key={tc.id || tcIdx}
                                    className={`px-2 py-0.5 rounded border ${
                                      tc.isHidden
                                        ? "bg-amber-950/30 border-amber-800/40 text-amber-300"
                                        : "bg-blue-950/30 border-blue-800/40 text-blue-300"
                                    }`}
                                  >
                                    Case #{tcIdx + 1} ({tc.isHidden ? "Hidden" : "Visible"}, w={tc.weight})
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ASSESSMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0B1120] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 bg-[#0E1526]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAssessmentId ? "Edit Technical Assessment" : "Create Technical Assessment"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define assessment benchmarks, coding problems, starter code, and test cases
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveAssessment} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Overview */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Assessment Details & Benchmark
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Assessment Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Full Stack Concurrency & High-Throughput Architecture"
                      className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Description & Candidate Instructions <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Explain the scope of this evaluation, time allocation advice, and evaluation rubric..."
                      className="w-full p-3 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Passing Score Benchmark (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formPassingScore}
                      onChange={(e) => setFormPassingScore(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Assessment Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as AssessmentStatus)}
                      className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="DRAFT">Draft (Internal Review)</option>
                      <option value="ACTIVE">Active (Ready for Candidate Invitations)</option>
                      <option value="ARCHIVED">Archived (Retired)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Attach to Open Job Position (Optional)
                    </label>
                    <select
                      value={formJobId}
                      onChange={(e) => setFormJobId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">None (Standalone Assessment Library)</option>
                      {companyJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Smart Proctoring & Assessment Integrity (Phase 9B, 9C, 9D) */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Smart Proctoring & Anti-Cheating Settings
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEnableProctoring}
                      onChange={(e) => setFormEnableProctoring(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-white">Enable Proctoring</span>
                  </label>
                </div>

                {formEnableProctoring ? (
                  <div className="rounded-xl border border-purple-500/30 bg-[#0E1526]/70 p-4 space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Require Fullscreen */}
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-[#080C14] cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={formRequireFullscreen}
                          onChange={(e) => setFormRequireFullscreen(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <div>
                          <strong className="text-white block font-medium">Require Fullscreen</strong>
                          <span className="text-[11px] text-slate-400">Flags exits from browser fullscreen mode</span>
                        </div>
                      </label>

                      {/* Track Tab Switches */}
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-[#080C14] cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={formTrackTabSwitches}
                          onChange={(e) => setFormTrackTabSwitches(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <div>
                          <strong className="text-white block font-medium">Track Tab Switches</strong>
                          <span className="text-[11px] text-slate-400">Detects Page Visibility API tab switches</span>
                        </div>
                      </label>

                      {/* Track Focus Loss */}
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-[#080C14] cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={formTrackFocusLoss}
                          onChange={(e) => setFormTrackFocusLoss(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <div>
                          <strong className="text-white block font-medium">Track Window Blur / Focus Loss</strong>
                          <span className="text-[11px] text-slate-400">Detects switching to other desktop applications</span>
                        </div>
                      </label>

                      {/* Restrict Code Paste */}
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-[#080C14] cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={formRestrictPaste}
                          onChange={(e) => setFormRestrictPaste(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <div>
                          <strong className="text-white block font-medium">Block External Paste</strong>
                          <span className="text-[11px] text-slate-400">Prevents pasting external clipboard code into Monaco</span>
                        </div>
                      </label>

                      {/* Restrict Copy */}
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-[#080C14] cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={formRestrictCopy}
                          onChange={(e) => setFormRestrictCopy(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <div>
                          <strong className="text-white block font-medium">Restrict Problem Copying</strong>
                          <span className="text-[11px] text-slate-400">Disables copying problem text and test cases</span>
                        </div>
                      </label>

                      {/* Webcam Proctoring */}
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800/80 bg-[#080C14] cursor-pointer hover:border-slate-700">
                        <input
                          type="checkbox"
                          checked={formWebcamProctoring}
                          onChange={(e) => setFormWebcamProctoring(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <div>
                          <strong className="text-white block font-medium flex items-center gap-1.5">
                            <Camera className="h-3 w-3 text-purple-400" />
                            Smart Webcam Presence
                          </strong>
                          <span className="text-[11px] text-slate-400">Local face presence detection (no audio recorded)</span>
                        </div>
                      </label>
                    </div>

                    {/* Violation Limits & Recording Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                      <div>
                        <label className="text-xs font-semibold text-slate-200 block mb-1">
                          Max Policy Violations
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={formMaxViolations}
                          onChange={(e) => setFormMaxViolations(Math.max(1, Math.min(10, Number(e.target.value))))}
                          className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-200 block mb-1">
                          Auto-Submit on Limit
                        </label>
                        <select
                          value={formAutoSubmitOnViolations ? "YES" : "NO"}
                          onChange={(e) => setFormAutoSubmitOnViolations(e.target.value === "YES")}
                          className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        >
                          <option value="YES">Yes — Auto-Submit (POLICY_VIOLATION)</option>
                          <option value="NO">No — Review Signal Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-200 block mb-1">
                          Video Recording Mode
                        </label>
                        <select
                          value={formRecordingMode}
                          onChange={(e) => setFormRecordingMode(e.target.value)}
                          className="w-full px-3 py-2 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        >
                          <option value="NONE">No Video Recording</option>
                          <option value="INCIDENT_ONLY">Incident-Based (15-30s clips)</option>
                          <option value="FULL">Full Assessment Session</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Proctoring is disabled. Candidates will take this assessment in standard open-workspace mode without browser tracking or webcam requirements.
                  </p>
                )}
              </div>

              {/* Section 3: Questions & Test Cases Builder */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" />
                    Coding Questions ({formQuestions.length})
                  </h4>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="border-blue-500/40 text-blue-300 hover:bg-blue-950/40 text-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Another Question
                  </Button>
                </div>

                {/* Question Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
                  {formQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-2 transition-colors ${
                        activeQuestionIdx === idx
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>Q{idx + 1}: {q.title.slice(0, 18) || "Untitled"}...</span>
                      {formQuestions.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveQuestion(idx);
                          }}
                          className="hover:text-rose-300 p-0.5 rounded"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Active Question Editor */}
                {formQuestions[activeQuestionIdx] && (
                  <div className="space-y-4 bg-[#080C14] p-4 rounded-xl border border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-300">
                          Question Title
                        </label>
                        <input
                          type="text"
                          required
                          value={formQuestions[activeQuestionIdx].title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], title: val };
                              return next;
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Difficulty
                        </label>
                        <select
                          value={formQuestions[activeQuestionIdx].difficulty}
                          onChange={(e) => {
                            const val = e.target.value as QuestionDifficulty;
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], difficulty: val };
                              return next;
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Points
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={formQuestions[activeQuestionIdx].points}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], points: val };
                              return next;
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Time Limit (ms)
                        </label>
                        <input
                          type="number"
                          min={500}
                          max={10000}
                          value={formQuestions[activeQuestionIdx].timeLimitMs}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], timeLimitMs: val };
                              return next;
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Memory Limit (KB)
                        </label>
                        <input
                          type="number"
                          min={65536}
                          max={1048576}
                          value={formQuestions[activeQuestionIdx].memoryLimitKb}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], memoryLimitKb: val };
                              return next;
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-[#0B1120] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Problem Statement & Constraints
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formQuestions[activeQuestionIdx].description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormQuestions((prev) => {
                            const next = [...prev];
                            next[activeQuestionIdx] = { ...next[activeQuestionIdx], description: val };
                            return next;
                          });
                        }}
                        className="w-full p-2.5 bg-[#0B1120] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Starter Code Templates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-blue-400">
                          TypeScript Starter Code
                        </label>
                        <textarea
                          rows={4}
                          value={formQuestions[activeQuestionIdx].starterCodeTs}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], starterCodeTs: val };
                              return next;
                            });
                          }}
                          className="w-full p-2 bg-[#04060A] border border-slate-800 rounded font-mono text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-amber-400">
                          Python Starter Code
                        </label>
                        <textarea
                          rows={4}
                          value={formQuestions[activeQuestionIdx].starterCodePy}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormQuestions((prev) => {
                              const next = [...prev];
                              next[activeQuestionIdx] = { ...next[activeQuestionIdx], starterCodePy: val };
                              return next;
                            });
                          }}
                          className="w-full p-2 bg-[#04060A] border border-slate-800 rounded font-mono text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Test Cases Sub-builder */}
                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>Test Cases ({formQuestions[activeQuestionIdx].testCases.length})</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Sample cases visible during assessment; evaluation cases hidden from candidate
                          </span>
                        </h5>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddTestCase(activeQuestionIdx)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 p-1 h-auto"
                        >
                          <Plus className="h-3 w-3" />
                          Add Test Case
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        {formQuestions[activeQuestionIdx].testCases.map((tc, tcIdx) => (
                          <div
                            key={tcIdx}
                            className={`p-3 rounded-lg border text-xs space-y-2 ${
                              tc.isHidden
                                ? "bg-amber-950/20 border-amber-800/40"
                                : "bg-blue-950/20 border-blue-800/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                                {tc.isHidden ? (
                                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                                ) : (
                                  <Unlock className="h-3.5 w-3.5 text-blue-400" />
                                )}
                                Case #{tcIdx + 1}
                              </span>

                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(tc.isHidden)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setFormQuestions((prev) => {
                                        const next = [...prev];
                                        const q = { ...next[activeQuestionIdx] };
                                        const cases = [...q.testCases];
                                        cases[tcIdx] = { ...cases[tcIdx], isHidden: checked };
                                        q.testCases = cases;
                                        next[activeQuestionIdx] = q;
                                        return next;
                                      });
                                    }}
                                    className="rounded border-slate-700 bg-slate-900 text-blue-600"
                                  />
                                  <span>Hidden Evaluation Case</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveTestCase(activeQuestionIdx, tcIdx)}
                                  className="text-slate-500 hover:text-rose-400 p-0.5"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-medium">Input</span>
                                <input
                                  type="text"
                                  required
                                  value={tc.input}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormQuestions((prev) => {
                                      const next = [...prev];
                                      const q = { ...next[activeQuestionIdx] };
                                      const cases = [...q.testCases];
                                      cases[tcIdx] = { ...cases[tcIdx], input: val };
                                      q.testCases = cases;
                                      next[activeQuestionIdx] = q;
                                      return next;
                                    });
                                  }}
                                  placeholder="e.g. [1, 2, 3], target=4"
                                  className="w-full px-2 py-1 bg-[#04060A] border border-slate-800 rounded font-mono text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-medium">Expected Output</span>
                                <input
                                  type="text"
                                  required
                                  value={tc.expectedOutput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormQuestions((prev) => {
                                      const next = [...prev];
                                      const q = { ...next[activeQuestionIdx] };
                                      const cases = [...q.testCases];
                                      cases[tcIdx] = { ...cases[tcIdx], expectedOutput: val };
                                      q.testCases = cases;
                                      next[activeQuestionIdx] = q;
                                      return next;
                                    });
                                  }}
                                  placeholder="e.g. 2"
                                  className="w-full px-2 py-1 bg-[#04060A] border border-slate-800 rounded font-mono text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="border-slate-700 text-slate-300 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingAssessmentId ? "Save Assessment Changes" : "Create Technical Assessment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
