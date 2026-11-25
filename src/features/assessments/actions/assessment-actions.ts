"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  type AssessmentStatus,
  type QuestionDifficulty,
  type JobStatus,
  type Question,
} from "@prisma/client";

export interface SessionContext {
  user?: {
    id?: string;
    role?: string;
    email?: string | null;
    companyId?: string | null;
  } | null;
}

export interface CreateTestCaseInput {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  explanation?: string | null;
  weight?: number;
}

export interface CreateQuestionInput {
  id?: string;
  title: string;
  description: string;
  difficulty?: QuestionDifficulty;
  points?: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  starterCode?: Record<string, string> | null;
  orderIndex?: number;
  testCases?: CreateTestCaseInput[];
}

export interface CreateAssessmentInput {
  title: string;
  description: string;
  durationMinutes?: number;
  passingScore?: number;
  status?: AssessmentStatus;
  jobId?: string | null;
  questions?: CreateQuestionInput[];
  enableProctoring?: boolean;
  requireFullscreen?: boolean;
  trackTabSwitches?: boolean;
  trackFocusLoss?: boolean;
  restrictPaste?: boolean;
  restrictCopy?: boolean;
  maxViolations?: number;
  autoSubmitOnViolations?: boolean;
  webcamProctoring?: boolean;
  recordingMode?: string;
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  durationMinutes?: number;
  passingScore?: number;
  status?: AssessmentStatus;
  jobId?: string | null;
  enableProctoring?: boolean;
  requireFullscreen?: boolean;
  trackTabSwitches?: boolean;
  trackFocusLoss?: boolean;
  restrictPaste?: boolean;
  restrictCopy?: boolean;
  maxViolations?: number;
  autoSubmitOnViolations?: boolean;
  webcamProctoring?: boolean;
  recordingMode?: string;
}

export interface RecruiterTestCaseItem {
  id: string;
  questionId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string | null;
  weight: number;
  createdAt: Date | string;
}

export interface RecruiterQuestionItem {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  points: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  starterCode?: Record<string, string> | null;
  orderIndex: number;
  testCases: RecruiterTestCaseItem[];
  createdAt: Date | string;
}

export interface RecruiterAssessmentItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  status: AssessmentStatus;
  companyId: string;
  creatorId: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  jobs: {
    id: string;
    title: string;
    slug: string;
    status: JobStatus;
  }[];
  questions: RecruiterQuestionItem[];
  enableProctoring: boolean;
  requireFullscreen: boolean;
  trackTabSwitches: boolean;
  trackFocusLoss: boolean;
  restrictPaste: boolean;
  restrictCopy: boolean;
  maxViolations: number;
  autoSubmitOnViolations: boolean;
  webcamProctoring: boolean;
  recordingMode: string;
  _count: {
    questions: number;
    attempts: number;
    jobs: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CandidateVisibleQuestionItem {
  id: string;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  points: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  starterCode?: Record<string, string> | null;
  orderIndex: number;
  visibleTestCases: {
    id: string;
    input: string;
    expectedOutput: string;
    explanation?: string | null;
  }[];
}

export interface CandidateAssessmentPreview {
  id: string;
  invitationId?: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  status: AssessmentStatus;
  companyName: string;
  relatedJobTitle?: string;
  questionsCount: number;
  totalPoints: number;
  expiresAt?: string | null;
  questions: CandidateVisibleQuestionItem[];
  enableProctoring: boolean;
  requireFullscreen: boolean;
  trackTabSwitches: boolean;
  trackFocusLoss: boolean;
  restrictPaste: boolean;
  restrictCopy: boolean;
  maxViolations: number;
  autoSubmitOnViolations: boolean;
  webcamProctoring: boolean;
  recordingMode: string;
}

const VALID_ASSESSMENT_STATUSES: AssessmentStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const VALID_QUESTION_DIFFICULTIES: QuestionDifficulty[] = ["EASY", "MEDIUM", "HARD"];

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle invocation in standalone CLI tests
  }
}

/**
 * Server-side security check: verifies authenticated recruiter and resolves company ID.
 * Strictly prevents unauthenticated access and candidate access.
 */
export async function authenticateRecruiter(sessionOverride?: SessionContext | null) {
  const session = sessionOverride !== undefined ? sessionOverride : await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
      roleDenied: false,
      error: "Authentication required. Please sign in as a recruiter to manage assessments.",
    };
  }

  if (session.user.role !== "RECRUITER") {
    return {
      authenticated: false,
      roleDenied: true,
      error: "Access denied. Only registered recruiters can create and manage assessments.",
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!dbUser || dbUser.role !== "RECRUITER") {
    return {
      authenticated: false,
      roleDenied: true,
      error: "Recruiter account not found or access revoked.",
    };
  }

  if (!dbUser.companyId || !dbUser.company) {
    return {
      authenticated: false,
      roleDenied: false,
      error: "Recruiter profile is not associated with an active company.",
    };
  }

  return {
    authenticated: true,
    roleDenied: false,
    user: dbUser,
    companyId: dbUser.companyId,
    company: dbUser.company,
  };
}

/**
 * Server-side security check: verifies authenticated candidate.
 */
export async function authenticateCandidate(sessionOverride?: SessionContext | null) {
  const session = sessionOverride !== undefined ? sessionOverride : await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
      roleDenied: false,
      error: "Authentication required. Please sign in as a candidate to view assessment details.",
    };
  }

  if (session.user.role !== "CANDIDATE") {
    return {
      authenticated: false,
      roleDenied: true,
      error: "Access denied. Candidate privileges required to view candidate assessment details.",
    };
  }

  return {
    authenticated: true,
    roleDenied: false,
    user: session.user,
  };
}

/**
 * CREATE a technical assessment with questions and test cases.
 * STRICT ENFORCEMENT:
 * - Scoped exclusively to the authenticated recruiter's registered company.
 * - Server-side validation of duration, passingScore, questions, and test cases.
 * - If jobId is provided, verifies job belongs to recruiter's company.
 */
export async function createAssessment(
  input: CreateAssessmentInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  assessmentId?: string;
  errorType?: "UNAUTHENTICATED" | "ROLE_DENIED" | "VALIDATION_ERROR" | "FORBIDDEN" | "INTERNAL_ERROR";
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      errorType: authCheck.roleDenied ? "ROLE_DENIED" : "UNAUTHENTICATED",
    };
  }

  // 1. Validate Assessment metadata
  const title = String(input.title || "").trim();
  if (!title || title.length < 3 || title.length > 150) {
    return {
      success: false,
      message: "Assessment title is required and must be between 3 and 150 characters.",
      errorType: "VALIDATION_ERROR",
    };
  }

  const description = String(input.description || "").trim();
  if (!description || description.length < 10) {
    return {
      success: false,
      message: "Assessment description is required and must be at least 10 characters.",
      errorType: "VALIDATION_ERROR",
    };
  }

  const durationMinutes = Number(input.durationMinutes ?? 60);
  if (isNaN(durationMinutes) || durationMinutes < 5 || durationMinutes > 300) {
    return {
      success: false,
      message: "Duration must be a valid number of minutes between 5 and 300 (up to 5 hours).",
      errorType: "VALIDATION_ERROR",
    };
  }

  const passingScore = Number(input.passingScore ?? 70.0);
  if (isNaN(passingScore) || passingScore < 1.0 || passingScore > 100.0) {
    return {
      success: false,
      message: "Passing score benchmark must be between 1.0% and 100.0%.",
      errorType: "VALIDATION_ERROR",
    };
  }

  const status: AssessmentStatus = input.status && VALID_ASSESSMENT_STATUSES.includes(input.status)
    ? input.status
    : "DRAFT";

  // 2. Validate linked job if specified
  const jobId = input.jobId ? String(input.jobId).trim() : null;
  if (jobId) {
    const targetJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, companyId: true, title: true },
    });

    if (!targetJob) {
      return {
        success: false,
        message: "The specified job opening does not exist.",
        errorType: "VALIDATION_ERROR",
      };
    }

    if (targetJob.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You cannot attach an assessment to a job opening belonging to another company.",
        errorType: "FORBIDDEN",
      };
    }
  }

  // 3. Validate questions and test cases
  const questionsInput = input.questions || [];
  for (let qIdx = 0; qIdx < questionsInput.length; qIdx++) {
    const q = questionsInput[qIdx];
    const qTitle = String(q.title || "").trim();
    if (!qTitle || qTitle.length < 3 || qTitle.length > 200) {
      return {
        success: false,
        message: `Question #${qIdx + 1}: Title must be between 3 and 200 characters.`,
        errorType: "VALIDATION_ERROR",
      };
    }

    const qDesc = String(q.description || "").trim();
    if (!qDesc || qDesc.length < 10) {
      return {
        success: false,
        message: `Question #${qIdx + 1} ("${qTitle}"): Problem statement must be at least 10 characters.`,
        errorType: "VALIDATION_ERROR",
      };
    }

    if (q.difficulty && !VALID_QUESTION_DIFFICULTIES.includes(q.difficulty)) {
      return {
        success: false,
        message: `Question #${qIdx + 1}: Invalid difficulty "${q.difficulty}". Must be EASY, MEDIUM, or HARD.`,
        errorType: "VALIDATION_ERROR",
      };
    }

    const points = Number(q.points ?? 100);
    if (isNaN(points) || points < 1 || points > 1000) {
      return {
        success: false,
        message: `Question #${qIdx + 1}: Points must be between 1 and 1000.`,
        errorType: "VALIDATION_ERROR",
      };
    }

    const testCases = q.testCases || [];
    for (let tcIdx = 0; tcIdx < testCases.length; tcIdx++) {
      const tc = testCases[tcIdx];
      if (tc.input === undefined || tc.input === null || String(tc.input).trim() === "") {
        return {
          success: false,
          message: `Question #${qIdx + 1}, Test Case #${tcIdx + 1}: Test case input cannot be empty.`,
          errorType: "VALIDATION_ERROR",
        };
      }
      if (tc.expectedOutput === undefined || tc.expectedOutput === null || String(tc.expectedOutput).trim() === "") {
        return {
          success: false,
          message: `Question #${qIdx + 1}, Test Case #${tcIdx + 1}: Expected output cannot be empty.`,
          errorType: "VALIDATION_ERROR",
        };
      }
    }
  }

  // 4. Atomic transaction creation in Neon PostgreSQL
  try {
    const createdAssessment = await prisma.$transaction(async (tx) => {
      // Create Assessment record
      const assessment = await tx.assessment.create({
        data: {
          title,
          description,
          durationMinutes,
          passingScore,
          status,
          companyId: authCheck.companyId,
          creatorId: authCheck.user.id,
          enableProctoring: input.enableProctoring ?? false,
          requireFullscreen: input.requireFullscreen ?? false,
          trackTabSwitches: input.trackTabSwitches ?? true,
          trackFocusLoss: input.trackFocusLoss ?? true,
          restrictPaste: input.restrictPaste ?? true,
          restrictCopy: input.restrictCopy ?? true,
          maxViolations: input.maxViolations ?? 3,
          autoSubmitOnViolations: input.autoSubmitOnViolations ?? true,
          webcamProctoring: input.webcamProctoring ?? false,
          recordingMode: input.recordingMode ?? "NONE",
        },
      });

      // Link job if provided
      if (jobId) {
        await tx.job.update({
          where: { id: jobId },
          data: { assessmentId: assessment.id },
        });
      }

      // Create questions and test cases
      for (let i = 0; i < questionsInput.length; i++) {
        const q = questionsInput[i];
        const newQuestion = await tx.question.create({
          data: {
            assessmentId: assessment.id,
            title: q.title.trim(),
            description: q.description.trim(),
            difficulty: q.difficulty || "MEDIUM",
            points: Number(q.points ?? 100),
            timeLimitMs: Number(q.timeLimitMs ?? 2000),
            memoryLimitKb: Number(q.memoryLimitKb ?? 262144),
            starterCode: q.starterCode ? (q.starterCode as Prisma.InputJsonValue) : Prisma.JsonNull,
            orderIndex: Number(q.orderIndex ?? i),
          },
        });

        const testCases = q.testCases || [];
        if (testCases.length > 0) {
          await tx.testCase.createMany({
            data: testCases.map((tc) => ({
              questionId: newQuestion.id,
              input: String(tc.input).trim(),
              expectedOutput: String(tc.expectedOutput).trim(),
              isHidden: Boolean(tc.isHidden),
              explanation: tc.explanation ? String(tc.explanation).trim() : null,
              weight: Number(tc.weight ?? 1.0),
            })),
          });
        }
      }

      return assessment;
    }, { maxWait: 15000, timeout: 30000 });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Technical assessment "${createdAssessment.title}" created successfully with ${questionsInput.length} coding question(s).`,
      assessmentId: createdAssessment.id,
    };
  } catch (err) {
    console.error("[Create Assessment Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while creating the assessment. Please try again.",
      errorType: "INTERNAL_ERROR",
    };
  }
}

/**
 * RETRIEVE all assessments belonging to the authenticated recruiter's company.
 * STRICT ENFORCEMENT:
 * - Scoped strictly to recruiter's companyId.
 * - Returns questions, test cases, and linked jobs.
 */
export async function getCompanyAssessments(
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  assessments: RecruiterAssessmentItem[];
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      assessments: [],
    };
  }

  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        companyId: authCheck.companyId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        passingScore: true,
        status: true,
        companyId: true,
        creatorId: true,
        enableProctoring: true,
        requireFullscreen: true,
        trackTabSwitches: true,
        trackFocusLoss: true,
        restrictPaste: true,
        restrictCopy: true,
        maxViolations: true,
        autoSubmitOnViolations: true,
        webcamProctoring: true,
        recordingMode: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
        questions: {
          select: {
            id: true,
            assessmentId: true,
            title: true,
            description: true,
            difficulty: true,
            points: true,
            timeLimitMs: true,
            memoryLimitKb: true,
            starterCode: true,
            orderIndex: true,
            testCases: {
              select: {
                id: true,
                questionId: true,
                input: true,
                expectedOutput: true,
                isHidden: true,
                explanation: true,
                weight: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            createdAt: true,
          },
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
            jobs: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      assessments: assessments as unknown as RecruiterAssessmentItem[],
    };
  } catch (err) {
    console.error("[Get Company Assessments Error]:", err);
    return {
      success: false,
      message: "An error occurred while fetching company assessments.",
      assessments: [],
    };
  }
}

/**
 * RETRIEVE a single assessment by ID for recruiter editing.
 * STRICT ENFORCEMENT:
 * - Scoped strictly to recruiter's companyId.
 */
export async function getAssessmentById(
  assessmentId: string,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  assessment?: RecruiterAssessmentItem;
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanId = String(assessmentId || "").trim();
  if (!cleanId) {
    return { success: false, message: "Valid assessment ID required." };
  }

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        passingScore: true,
        status: true,
        companyId: true,
        creatorId: true,
        enableProctoring: true,
        requireFullscreen: true,
        trackTabSwitches: true,
        trackFocusLoss: true,
        restrictPaste: true,
        restrictCopy: true,
        maxViolations: true,
        autoSubmitOnViolations: true,
        webcamProctoring: true,
        recordingMode: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
        questions: {
          select: {
            id: true,
            assessmentId: true,
            title: true,
            description: true,
            difficulty: true,
            points: true,
            timeLimitMs: true,
            memoryLimitKb: true,
            starterCode: true,
            orderIndex: true,
            testCases: {
              select: {
                id: true,
                questionId: true,
                input: true,
                expectedOutput: true,
                isHidden: true,
                explanation: true,
                weight: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            createdAt: true,
          },
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
            jobs: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!assessment) {
      return { success: false, message: "Assessment not found." };
    }

    if (assessment.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to view assessments from another company.",
      };
    }

    return {
      success: true,
      assessment: assessment as unknown as RecruiterAssessmentItem,
    };
  } catch (err) {
    console.error("[Get Assessment By ID Error]:", err);
    return { success: false, message: "An error occurred while fetching assessment details." };
  }
}

/**
 * UPDATE an existing assessment's title, description, duration, passing score, status, or linked job.
 * STRICT ENFORCEMENT:
 * - Scoped strictly to recruiter's companyId.
 */
export async function updateAssessment(
  assessmentId: string,
  input: UpdateAssessmentInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  assessment?: RecruiterAssessmentItem;
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanId = String(assessmentId || "").trim();
  if (!cleanId) {
    return { success: false, message: "A valid assessment ID must be provided." };
  }

  try {
    const existing = await prisma.assessment.findUnique({
      where: { id: cleanId },
      select: { id: true, companyId: true, title: true, status: true },
    });

    if (!existing) {
      return { success: false, message: "Assessment not found." };
    }

    if (existing.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to modify assessments from another company.",
      };
    }

    const data: Prisma.AssessmentUpdateInput = {};

    if (input.title !== undefined) {
      const cleanTitle = String(input.title).trim();
      if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 150) {
        return { success: false, message: "Assessment title must be between 3 and 150 characters." };
      }
      data.title = cleanTitle;
    }

    if (input.description !== undefined) {
      const cleanDesc = String(input.description).trim();
      if (!cleanDesc || cleanDesc.length < 10) {
        return { success: false, message: "Assessment description must be at least 10 characters." };
      }
      data.description = cleanDesc;
    }

    if (input.durationMinutes !== undefined) {
      const dur = Number(input.durationMinutes);
      if (isNaN(dur) || dur < 5 || dur > 300) {
        return { success: false, message: "Duration must be between 5 and 300 minutes." };
      }
      data.durationMinutes = dur;
    }

    if (input.passingScore !== undefined) {
      const ps = Number(input.passingScore);
      if (isNaN(ps) || ps < 1.0 || ps > 100.0) {
        return { success: false, message: "Passing score benchmark must be between 1.0% and 100.0%." };
      }
      data.passingScore = ps;
    }

    if (input.status !== undefined) {
      if (!VALID_ASSESSMENT_STATUSES.includes(input.status)) {
        return { success: false, message: "Invalid assessment status specified." };
      }
      data.status = input.status;
    }

    // Handle job linking/unlinking
    if (input.jobId !== undefined) {
      if (input.jobId === null || input.jobId === "") {
        // Disconnect all linked jobs
        await prisma.job.updateMany({
          where: { assessmentId: cleanId, companyId: authCheck.companyId },
          data: { assessmentId: null },
        });
      } else {
        const targetJob = await prisma.job.findUnique({
          where: { id: input.jobId.trim() },
          select: { id: true, companyId: true },
        });
        if (!targetJob || targetJob.companyId !== authCheck.companyId) {
          return {
            success: false,
            message: "Target job not found or belongs to another company.",
          };
        }
        await prisma.job.update({
          where: { id: targetJob.id },
          data: { assessmentId: cleanId },
        });
      }
    }

    if (input.enableProctoring !== undefined) data.enableProctoring = input.enableProctoring;
    if (input.requireFullscreen !== undefined) data.requireFullscreen = input.requireFullscreen;
    if (input.trackTabSwitches !== undefined) data.trackTabSwitches = input.trackTabSwitches;
    if (input.trackFocusLoss !== undefined) data.trackFocusLoss = input.trackFocusLoss;
    if (input.restrictPaste !== undefined) data.restrictPaste = input.restrictPaste;
    if (input.restrictCopy !== undefined) data.restrictCopy = input.restrictCopy;
    if (input.maxViolations !== undefined) data.maxViolations = input.maxViolations;
    if (input.autoSubmitOnViolations !== undefined) data.autoSubmitOnViolations = input.autoSubmitOnViolations;
    if (input.webcamProctoring !== undefined) data.webcamProctoring = input.webcamProctoring;
    if (input.recordingMode !== undefined) data.recordingMode = input.recordingMode;

    await prisma.assessment.update({
      where: { id: cleanId },
      data,
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Assessment "${input.title || existing.title}" updated successfully.`,
    };
  } catch (err) {
    console.error("[Update Assessment Error]:", err);
    return { success: false, message: "An unexpected error occurred while updating the assessment." };
  }
}

/**
 * UPDATE assessment status directly (DRAFT, ACTIVE, ARCHIVED).
 * STRICT ENFORCEMENT:
 * - Scoped strictly to recruiter's companyId.
 */
export async function updateAssessmentStatus(
  assessmentId: string,
  newStatus: AssessmentStatus,
  sessionOverride?: SessionContext | null
): Promise<{ success: boolean; message: string }> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  if (!VALID_ASSESSMENT_STATUSES.includes(newStatus)) {
    return { success: false, message: "Invalid assessment status specified." };
  }

  const cleanId = String(assessmentId || "").trim();
  try {
    const existing = await prisma.assessment.findUnique({
      where: { id: cleanId },
      select: { id: true, companyId: true, title: true },
    });

    if (!existing) {
      return { success: false, message: "Assessment not found." };
    }

    if (existing.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to modify assessments from another company.",
      };
    }

    await prisma.assessment.update({
      where: { id: cleanId },
      data: { status: newStatus },
    });

    safeRevalidatePath("/recruiter/dashboard");

    const statusLabels: Record<AssessmentStatus, string> = {
      ACTIVE: "activated and ready for candidate evaluation",
      DRAFT: "moved to drafts",
      ARCHIVED: "archived",
    };

    return {
      success: true,
      message: `Assessment "${existing.title}" is now ${statusLabels[newStatus]}.`,
    };
  } catch (err) {
    console.error("[Update Assessment Status Error]:", err);
    return { success: false, message: "An error occurred while updating status." };
  }
}

/**
 * UPSERT a coding question (with its test cases) into an assessment.
 * STRICT ENFORCEMENT:
 * - Enforces assessment belongs to the authenticated recruiter's company.
 * - Test cases are created or replaced transactionally.
 */
export async function upsertQuestion(
  assessmentId: string,
  questionInput: CreateQuestionInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  questionId?: string;
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanAssessmentId = String(assessmentId || "").trim();
  const existingAssessment = await prisma.assessment.findUnique({
    where: { id: cleanAssessmentId },
    select: { id: true, companyId: true, title: true },
  });

  if (!existingAssessment) {
    return { success: false, message: "Assessment not found." };
  }

  if (existingAssessment.companyId !== authCheck.companyId) {
    return {
      success: false,
      message: "Forbidden: You do not have permission to modify questions for another company's assessment.",
    };
  }

  const qTitle = String(questionInput.title || "").trim();
  if (!qTitle || qTitle.length < 3 || qTitle.length > 200) {
    return { success: false, message: "Question title must be between 3 and 200 characters." };
  }

  const qDesc = String(questionInput.description || "").trim();
  if (!qDesc || qDesc.length < 10) {
    return { success: false, message: "Problem statement must be at least 10 characters." };
  }

  const difficulty = questionInput.difficulty && VALID_QUESTION_DIFFICULTIES.includes(questionInput.difficulty)
    ? questionInput.difficulty
    : "MEDIUM";

  const points = Number(questionInput.points ?? 100);
  if (isNaN(points) || points < 1 || points > 1000) {
    return { success: false, message: "Points must be between 1 and 1000." };
  }

  const testCases = questionInput.testCases || [];
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (tc.input === undefined || tc.input === null || String(tc.input).trim() === "") {
      return { success: false, message: `Test Case #${i + 1}: Input cannot be empty.` };
    }
    if (tc.expectedOutput === undefined || tc.expectedOutput === null || String(tc.expectedOutput).trim() === "") {
      return { success: false, message: `Test Case #${i + 1}: Expected output cannot be empty.` };
    }
  }

  try {
    const resultQuestion = await prisma.$transaction(async (tx) => {
      let qRecord: Question;

      if (questionInput.id) {
        // Update existing question
        const existingQ = await tx.question.findUnique({
          where: { id: questionInput.id },
          select: { id: true, assessmentId: true },
        });

        if (!existingQ || existingQ.assessmentId !== cleanAssessmentId) {
          throw new Error("Target question does not exist or does not belong to this assessment.");
        }

        qRecord = await tx.question.update({
          where: { id: questionInput.id },
          data: {
            title: qTitle,
            description: qDesc,
            difficulty,
            points,
            timeLimitMs: Number(questionInput.timeLimitMs ?? 2000),
            memoryLimitKb: Number(questionInput.memoryLimitKb ?? 262144),
            starterCode: questionInput.starterCode
              ? (questionInput.starterCode as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            orderIndex: Number(questionInput.orderIndex ?? 0),
          },
        });

        // Only replace test cases if explicitly provided
        if (questionInput.testCases !== undefined) {
          await tx.testCase.deleteMany({
            where: { questionId: qRecord.id },
          });

          if (questionInput.testCases.length > 0) {
            await tx.testCase.createMany({
              data: questionInput.testCases.map((tc) => ({
                questionId: qRecord.id,
                input: String(tc.input).trim(),
                expectedOutput: String(tc.expectedOutput).trim(),
                isHidden: Boolean(tc.isHidden),
                explanation: tc.explanation ? String(tc.explanation).trim() : null,
                weight: Number(tc.weight ?? 1.0),
              })),
            });
          }
        }
      } else {
        // Count existing questions to default orderIndex
        const count = await tx.question.count({
          where: { assessmentId: cleanAssessmentId },
        });

        qRecord = await tx.question.create({
          data: {
            assessmentId: cleanAssessmentId,
            title: qTitle,
            description: qDesc,
            difficulty,
            points,
            timeLimitMs: Number(questionInput.timeLimitMs ?? 2000),
            memoryLimitKb: Number(questionInput.memoryLimitKb ?? 262144),
            starterCode: questionInput.starterCode
              ? (questionInput.starterCode as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            orderIndex: Number(questionInput.orderIndex ?? count),
          },
        });

        // Insert test cases for new question
        if (testCases.length > 0) {
          await tx.testCase.createMany({
            data: testCases.map((tc) => ({
              questionId: qRecord.id,
              input: String(tc.input).trim(),
              expectedOutput: String(tc.expectedOutput).trim(),
              isHidden: Boolean(tc.isHidden),
              explanation: tc.explanation ? String(tc.explanation).trim() : null,
              weight: Number(tc.weight ?? 1.0),
            })),
          });
        }
      }

      return qRecord;
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Question "${resultQuestion.title}" saved successfully with ${testCases.length} test case(s).`,
      questionId: resultQuestion.id,
    };
  } catch (err: unknown) {
    console.error("[Upsert Question Error]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "An error occurred while saving the question.",
    };
  }
}

/**
 * DELETE a coding question from an assessment.
 * STRICT ENFORCEMENT:
 * - Scoped strictly to recruiter's companyId.
 * - Safely blocks deletion if submissions or attempts already exist.
 */
export async function deleteQuestion(
  assessmentId: string,
  questionId: string,
  sessionOverride?: SessionContext | null
): Promise<{ success: boolean; message: string }> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanAssessmentId = String(assessmentId || "").trim();
  const cleanQuestionId = String(questionId || "").trim();

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: cleanAssessmentId },
      select: { id: true, companyId: true },
    });

    if (!assessment) {
      return { success: false, message: "Assessment not found." };
    }

    if (assessment.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to delete questions from another company's assessment.",
      };
    }

    const question = await prisma.question.findUnique({
      where: { id: cleanQuestionId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!question || question.assessmentId !== cleanAssessmentId) {
      return { success: false, message: "Question not found in this assessment." };
    }

    if (question._count.submissions > 0) {
      return {
        success: false,
        message: `Cannot delete question "${question.title}" because it already has ${question._count.submissions} candidate submission(s) recorded. Archive the assessment instead to preserve audit logs.`,
      };
    }

    await prisma.question.delete({
      where: { id: cleanQuestionId },
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Question "${question.title}" has been deleted successfully.`,
    };
  } catch (err) {
    console.error("[Delete Question Error]:", err);
    return { success: false, message: "An error occurred while deleting the question." };
  }
}

/**
 * DELETE an assessment.
 * STRICT SAFEGUARD:
 * - Scoped strictly to recruiter's companyId.
 * - If any candidate assessment attempts exist, deletion is strictly prohibited!
 *   Recruiters must archive the assessment instead to preserve compliance and history.
 */
export async function deleteAssessment(
  assessmentId: string,
  sessionOverride?: SessionContext | null
): Promise<{ success: boolean; message: string }> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanId = String(assessmentId || "").trim();

  try {
    const existing = await prisma.assessment.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        companyId: true,
        title: true,
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!existing) {
      return { success: false, message: "Assessment not found." };
    }

    if (existing.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to delete assessments belonging to another company.",
      };
    }

    // Safety guard: attempts check
    if (existing._count.attempts > 0) {
      return {
        success: false,
        message: `Cannot delete assessment "${existing.title}" because ${existing._count.attempts} candidate attempt(s) are already linked to it. Archive the assessment instead to preserve historical records.`,
      };
    }

    // Unlink any jobs before deleting
    await prisma.job.updateMany({
      where: { assessmentId: cleanId },
      data: { assessmentId: null },
    });

    // Delete assessment (cascades to questions and testCases via Prisma schema)
    await prisma.assessment.delete({
      where: { id: cleanId },
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Assessment "${existing.title}" and its associated questions were permanently deleted.`,
    };
  } catch (err) {
    console.error("[Delete Assessment Error]:", err);
    return { success: false, message: "An unexpected error occurred while deleting the assessment." };
  }
}

/**
 * CANDIDATE / PUBLIC ASSESSMENT PREVIEW:
 * STRICT PRIVACY & ANTI-CHEATING SAFEGUARD:
 * - Hidden evaluation test cases (isHidden === true) are NEVER returned.
/**
 * CANDIDATE ASSESSMENT PREVIEW:
 * STRICT PRIVACY, AUTHORIZATION & ANTI-CHEATING SAFEGUARDS (PHASE 4B):
 * 1. Candidates MUST have an authorized invitation for this assessment. Guessed IDs return 403.
 * 2. Cross-candidate isolation: Candidate can only access invitations belonging to their own user account.
 * 3. Expired and revoked invitations are rejected with specific error messages.
 * 4. Assessment must be ACTIVE.
 * 5. Complete questions and test cases are strictly withheld until proctored attempt initiation in Phase 4C.
 * 6. Never expose hidden evaluation test cases or recruiter internal configuration.
 */
export async function getCandidateAssessmentPreview(
  assessmentId: string,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  preview?: CandidateAssessmentPreview;
}> {
  const authCheck = await authenticateCandidate(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return {
      success: false,
      message: authCheck.error || "Authentication required to preview assessment.",
    };
  }

  const cleanId = String(assessmentId || "").trim();
  try {
    // 1. Verify candidate has an authorized invitation for this assessment
    const invitation = await prisma.assessmentInvitation.findFirst({
      where: {
        assessmentId: cleanId,
        candidateId: authCheck.user.id,
      },
      include: {
        application: {
          include: {
            job: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invitation) {
      return {
        success: false,
        message: "Access Denied: You do not have an active invitation to access this assessment.",
      };
    }

    if (invitation.status === "REVOKED") {
      return {
        success: false,
        message: "Access Denied: This assessment invitation has been revoked by the recruiter.",
      };
    }

    if (
      invitation.status === "EXPIRED" ||
      (invitation.expiresAt && new Date(invitation.expiresAt) < new Date())
    ) {
      if (invitation.status !== "EXPIRED") {
        await prisma.assessmentInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
      }
      return {
        success: false,
        message: "Access Denied: This assessment invitation has expired.",
      };
    }

    // 2. Query assessment permitted metadata
    const assessment = await prisma.assessment.findUnique({
      where: { id: cleanId },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        passingScore: true,
        status: true,
        enableProctoring: true,
        requireFullscreen: true,
        trackTabSwitches: true,
        trackFocusLoss: true,
        restrictPaste: true,
        restrictCopy: true,
        maxViolations: true,
        autoSubmitOnViolations: true,
        webcamProctoring: true,
        recordingMode: true,
        company: {
          select: {
            name: true,
          },
        },
        questions: {
          select: {
            points: true,
          },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!assessment) {
      return { success: false, message: "Assessment not found." };
    }

    if (assessment.status !== "ACTIVE") {
      return {
        success: false,
        message: "This assessment is not currently active for candidate access.",
      };
    }

    // 3. Return permitted overview metadata ONLY. Complete coding problems and test cases are withheld until attempt in Phase 4C.
    const preview: CandidateAssessmentPreview = {
      id: assessment.id,
      invitationId: invitation.id,
      title: assessment.title,
      description: assessment.description,
      durationMinutes: assessment.durationMinutes,
      passingScore: assessment.passingScore,
      status: assessment.status,
      companyName: assessment.company.name,
      relatedJobTitle: invitation.application.job.title,
      questionsCount: assessment._count.questions,
      totalPoints: assessment.questions.reduce((sum, q) => sum + q.points, 0),
      expiresAt: invitation.expiresAt ? invitation.expiresAt.toISOString() : null,
      questions: [],
      enableProctoring: assessment.enableProctoring,
      requireFullscreen: assessment.requireFullscreen,
      trackTabSwitches: assessment.trackTabSwitches,
      trackFocusLoss: assessment.trackFocusLoss,
      restrictPaste: assessment.restrictPaste,
      restrictCopy: assessment.restrictCopy,
      maxViolations: assessment.maxViolations,
      autoSubmitOnViolations: assessment.autoSubmitOnViolations,
      webcamProctoring: assessment.webcamProctoring,
      recordingMode: assessment.recordingMode,
    };

    return {
      success: true,
      preview,
    };
  } catch (err) {
    console.error("[Get Candidate Assessment Preview Error]:", err);
    return { success: false, message: "An error occurred while loading assessment preview." };
  }
}
