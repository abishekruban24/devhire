"use server";

/**
 * DEVHIRE PHASE 5: RECRUITER MANUAL ASSESSMENT REVIEW & CANDIDATE HISTORY ACTIONS
 *
 * Implements secure, database-backed manual evaluation of candidate coding submissions:
 * - Recruiters can view submitted candidate attempts for their company's assessments.
 * - Recruiters can grade questions with point validation (0 <= score <= maxPoints).
 * - Recruiters can save review drafts (hidden from candidates).
 * - Recruiters can finalize & publish reviews (atomically updating AssessmentAttempt to EVALUATED).
 * - Candidate assessment history exposes only PUBLISHED scores and feedback.
 * - Submissions are strictly immutable (candidate code cannot be altered).
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ReviewStatus, AttemptStatus, QuestionDifficulty } from "@prisma/client";

export interface SessionContext {
  user?: {
    id?: string;
    role?: string;
    email?: string | null;
    companyId?: string | null;
    name?: string | null;
  } | null;
}

async function authenticateSession(sessionOverride?: SessionContext | null) {
  if (sessionOverride?.user?.id) {
    return {
      authenticated: true,
      user: sessionOverride.user,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      authenticated: false,
      user: null,
      error: "Authentication required.",
      errorType: "UNAUTHENTICATED" as const,
    };
  }

  return {
    authenticated: true,
    user: session.user,
  };
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback in non-request contexts
  }
}

// -------------------------------------------------------------
// DATA TYPES
// -------------------------------------------------------------

export interface RecruiterSubmissionItem {
  attemptId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatarUrl: string | null;
  candidateHeadline: string | null;
  assessmentId: string;
  assessmentTitle: string;
  passingScore: number;
  jobId: string | null;
  jobTitle: string | null;
  applicationId: string | null;
  status: AttemptStatus;
  startedAt: string | null;
  submittedAt: string | null;
  questionsCount: number;
  answeredCount: number;
  reviewStatus: "AWAITING_REVIEW" | "DRAFT_SAVED" | "PUBLISHED";
  score: number | null;
  totalPointsEarned: number | null;
  totalPointsPossible: number | null;
  passed: boolean | null;
  reviewedBy: string | null;
  publishedAt: string | null;
}

export interface QuestionReviewInput {
  questionId: string;
  pointsEarned: number;
  feedback?: string;
}

export interface SaveReviewDraftInput {
  attemptId: string;
  questionReviews: QuestionReviewInput[];
  overallFeedback?: string;
}

export interface FinalizeReviewInput {
  attemptId: string;
  questionReviews: QuestionReviewInput[];
  overallFeedback?: string;
}

export interface QuestionReviewDetail {
  questionId: string;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  pointsPossible: number;
  orderIndex: number;
  candidateCode: string;
  candidateLanguage: string;
  submittedAt: string | null;
  pointsEarned: number;
  feedback: string | null;
}

export interface AttemptReviewDetail {
  attemptId: string;
  status: AttemptStatus;
  startedAt: string | null;
  submittedAt: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    headline: string | null;
  };
  assessment: {
    id: string;
    title: string;
    passingScore: number;
    durationMinutes: number;
  };
  job: {
    id: string;
    title: string;
  } | null;
  review: {
    id: string;
    status: ReviewStatus;
    totalScore: number;
    totalPoints: number;
    pointsPossible: number;
    passed: boolean;
    feedback: string | null;
    publishedAt: string | null;
    updatedAt: string;
    reviewerName: string | null;
  } | null;
  questions: QuestionReviewDetail[];
}

export interface CandidateAssessmentHistoryItem {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  companyName: string;
  companyLogoUrl: string | null;
  jobId: string | null;
  jobTitle: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  status: AttemptStatus;
  lifecycleState:
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "SUBMITTED_AWAITING_REVIEW"
    | "RESULTS_PUBLISHED"
    | "EXPIRED";
  score: number | null;
  passingScore: number;
  passed: boolean | null;
  feedback: string | null;
  publishedAt: string | null;
  questionsCount: number;
}

// -------------------------------------------------------------
// 1. RECRUITER: GET COMPANY SUBMISSIONS FOR REVIEW
// -------------------------------------------------------------
export async function getCompanySubmissionsForReview(
  filter: "ALL" | "AWAITING_REVIEW" | "DRAFT_SAVED" | "PUBLISHED" = "ALL",
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  submissions: RecruiterSubmissionItem[];
  counts: {
    total: number;
    awaitingReview: number;
    draftSaved: number;
    published: number;
  };
}> {
  const authCheck = await authenticateSession(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return {
      success: false,
      message: "Authentication required.",
      submissions: [],
      counts: { total: 0, awaitingReview: 0, draftSaved: 0, published: 0 },
    };
  }

  if (authCheck.user.role !== "RECRUITER") {
    return {
      success: false,
      message: "Access denied. Recruiter privileges required.",
      submissions: [],
      counts: { total: 0, awaitingReview: 0, draftSaved: 0, published: 0 },
    };
  }

  const companyId = authCheck.user.companyId;
  if (!companyId) {
    return {
      success: false,
      message: "Recruiter must belong to a registered company.",
      submissions: [],
      counts: { total: 0, awaitingReview: 0, draftSaved: 0, published: 0 },
    };
  }

  try {
    const attempts = await prisma.assessmentAttempt.findMany({
      where: {
        assessment: { companyId },
        status: { in: ["SUBMITTED", "EVALUATED"] },
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            headline: true,
          },
        },
        assessment: {
          select: {
            id: true,
            title: true,
            passingScore: true,
            questions: {
              select: { id: true, points: true },
            },
          },
        },
        application: {
          select: {
            id: true,
            job: {
              select: { id: true, title: true },
            },
          },
        },
        review: {
          include: {
            reviewer: { select: { id: true, name: true } },
          },
        },
        submissions: {
          select: {
            id: true,
            questionId: true,
            code: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    let awaitingCount = 0;
    let draftCount = 0;
    let publishedCount = 0;

    const mappedSubmissions: RecruiterSubmissionItem[] = [];

    for (const a of attempts) {
      let itemReviewStatus: "AWAITING_REVIEW" | "DRAFT_SAVED" | "PUBLISHED" = "AWAITING_REVIEW";

      if (a.review?.status === "PUBLISHED") {
        itemReviewStatus = "PUBLISHED";
        publishedCount++;
      } else if (a.review?.status === "DRAFT") {
        itemReviewStatus = "DRAFT_SAVED";
        draftCount++;
      } else {
        awaitingCount++;
      }

      // Filter check
      if (
        filter === "ALL" ||
        (filter === "AWAITING_REVIEW" && itemReviewStatus === "AWAITING_REVIEW") ||
        (filter === "DRAFT_SAVED" && itemReviewStatus === "DRAFT_SAVED") ||
        (filter === "PUBLISHED" && itemReviewStatus === "PUBLISHED")
      ) {
        const answeredCount = a.submissions.filter((s) => s.code && s.code.trim().length > 0).length;

        mappedSubmissions.push({
          attemptId: a.id,
          candidateId: a.candidate.id,
          candidateName: a.candidate.name,
          candidateEmail: a.candidate.email,
          candidateAvatarUrl: a.candidate.avatarUrl,
          candidateHeadline: a.candidate.headline,
          assessmentId: a.assessment.id,
          assessmentTitle: a.assessment.title,
          passingScore: a.assessment.passingScore || 70,
          jobId: a.application?.job?.id || null,
          jobTitle: a.application?.job?.title || null,
          applicationId: a.application?.id || null,
          status: a.status,
          startedAt: a.startedAt?.toISOString() || null,
          submittedAt: a.submittedAt?.toISOString() || null,
          questionsCount: a.assessment.questions.length,
          answeredCount,
          reviewStatus: itemReviewStatus,
          score: a.review?.status === "PUBLISHED" ? a.review.totalScore : a.score ?? null,
          totalPointsEarned: a.review ? a.review.totalPoints : null,
          totalPointsPossible: a.review ? a.review.pointsPossible : null,
          passed: a.review?.status === "PUBLISHED" ? a.review.passed : null,
          reviewedBy: a.review?.reviewer?.name || null,
          publishedAt: a.review?.publishedAt?.toISOString() || null,
        });
      }
    }

    return {
      success: true,
      submissions: mappedSubmissions,
      counts: {
        total: attempts.length,
        awaitingReview: awaitingCount,
        draftSaved: draftCount,
        published: publishedCount,
      },
    };
  } catch (err) {
    console.error("[getCompanySubmissionsForReview Error]:", err);
    return {
      success: false,
      message: "Failed to retrieve company submissions for review.",
      submissions: [],
      counts: { total: 0, awaitingReview: 0, draftSaved: 0, published: 0 },
    };
  }
}

// -------------------------------------------------------------
// 2. RECRUITER / CANDIDATE: GET ATTEMPT REVIEW DETAILS
// -------------------------------------------------------------
export async function getAttemptReviewDetails(
  attemptId: string,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  data?: AttemptReviewDetail;
  isRecruiter?: boolean;
}> {
  const authCheck = await authenticateSession(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return { success: false, message: "Authentication required." };
  }

  const cleanAttemptId = attemptId?.trim();
  if (!cleanAttemptId) {
    return { success: false, message: "Attempt ID is required." };
  }

  try {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: cleanAttemptId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            headline: true,
          },
        },
        assessment: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        application: {
          select: {
            id: true,
            job: {
              select: { id: true, title: true },
            },
          },
        },
        submissions: true,
        review: {
          include: {
            reviewer: { select: { id: true, name: true } },
            questionReviews: true,
          },
        },
      },
    });

    if (!attempt) {
      return { success: false, message: "Assessment attempt not found." };
    }

    const userId = authCheck.user.id;
    const userRole = authCheck.user.role;
    const userCompanyId = authCheck.user.companyId;

    const isCompanyRecruiter = userRole === "RECRUITER" && attempt.assessment.companyId === userCompanyId;
    const isCandidateOwner = userRole === "CANDIDATE" && attempt.candidateId === userId;

    if (!isCompanyRecruiter && !isCandidateOwner) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to view this assessment review.",
      };
    }

    // Candidate Privacy Guard:
    // If candidate is accessing and review is DRAFT (or not yet published), do NOT expose recruiter draft scores or notes
    const reviewData = attempt.review;
    const isReviewPublished = reviewData?.status === "PUBLISHED";

    if (isCandidateOwner && !isReviewPublished) {
      // Candidate can only view their own code and status "Awaiting Review"
      const questionDetails: QuestionReviewDetail[] = attempt.assessment.questions.map((q) => {
        const sub = attempt.submissions.find((s) => s.questionId === q.id);
        return {
          questionId: q.id,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          pointsPossible: q.points,
          orderIndex: q.orderIndex,
          candidateCode: sub?.code || "",
          candidateLanguage: sub?.language || "typescript",
          submittedAt: sub?.updatedAt?.toISOString() || null,
          pointsEarned: 0,
          feedback: null, // Hidden from candidate
        };
      });

      return {
        success: true,
        isRecruiter: false,
        data: {
          attemptId: attempt.id,
          status: attempt.status,
          startedAt: attempt.startedAt?.toISOString() || null,
          submittedAt: attempt.submittedAt?.toISOString() || null,
          candidate: attempt.candidate,
          assessment: {
            id: attempt.assessment.id,
            title: attempt.assessment.title,
            passingScore: attempt.assessment.passingScore || 70,
            durationMinutes: attempt.assessment.durationMinutes,
          },
          job: attempt.application?.job || null,
          review: null, // Hidden while DRAFT
          questions: questionDetails,
        },
      };
    }

    // Map question reviews by questionId
    type QuestionReviewItem = NonNullable<typeof reviewData>["questionReviews"][number];
    const qReviewsMap = new Map<string, QuestionReviewItem>();
    if (reviewData?.questionReviews) {
      for (const qr of reviewData.questionReviews) {
        qReviewsMap.set(qr.questionId, qr);
      }
    }

    const questionDetails: QuestionReviewDetail[] = attempt.assessment.questions.map((q) => {
      const sub = attempt.submissions.find((s) => s.questionId === q.id);
      const qr = qReviewsMap.get(q.id);

      return {
        questionId: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        pointsPossible: q.points,
        orderIndex: q.orderIndex,
        candidateCode: sub?.code || "",
        candidateLanguage: sub?.language || "typescript",
        submittedAt: sub?.updatedAt?.toISOString() || null,
        pointsEarned: qr?.pointsEarned ?? 0,
        feedback: qr?.feedback ?? null,
      };
    });

    return {
      success: true,
      isRecruiter: isCompanyRecruiter,
      data: {
        attemptId: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt?.toISOString() || null,
        submittedAt: attempt.submittedAt?.toISOString() || null,
        candidate: attempt.candidate,
        assessment: {
          id: attempt.assessment.id,
          title: attempt.assessment.title,
          passingScore: attempt.assessment.passingScore || 70,
          durationMinutes: attempt.assessment.durationMinutes,
        },
        job: attempt.application?.job || null,
        review: reviewData
          ? {
              id: reviewData.id,
              status: reviewData.status,
              totalScore: reviewData.totalScore,
              totalPoints: reviewData.totalPoints,
              pointsPossible: reviewData.pointsPossible,
              passed: reviewData.passed,
              feedback: reviewData.feedback,
              publishedAt: reviewData.publishedAt?.toISOString() || null,
              updatedAt: reviewData.updatedAt.toISOString(),
              reviewerName: reviewData.reviewer.name,
            }
          : null,
        questions: questionDetails,
      },
    };
  } catch (err) {
    console.error("[getAttemptReviewDetails Error]:", err);
    return { success: false, message: "Failed to load assessment review details." };
  }
}

// -------------------------------------------------------------
// 3. RECRUITER: SAVE ASSESSMENT REVIEW DRAFT
// -------------------------------------------------------------
export async function saveAssessmentReviewDraft(
  input: SaveReviewDraftInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  totalScore?: number;
  totalPoints?: number;
  pointsPossible?: number;
  passed?: boolean;
}> {
  const authCheck = await authenticateSession(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return { success: false, message: "Authentication required." };
  }

  if (authCheck.user.role !== "RECRUITER") {
    return { success: false, message: "Access denied. Only recruiters can review assessments." };
  }

  const cleanAttemptId = input.attemptId?.trim();
  if (!cleanAttemptId) {
    return { success: false, message: "Attempt ID is required." };
  }

  try {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: cleanAttemptId },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt) {
      return { success: false, message: "Assessment attempt not found." };
    }

    if (attempt.assessment.companyId !== authCheck.user.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to review assessments for another company.",
      };
    }

    if (attempt.status === "EVALUATED") {
      return {
        success: false,
        message: "Assessment review has already been published and cannot be modified as a draft.",
      };
    }

    // Validate points for each question
    const questionsMap = new Map(attempt.assessment.questions.map((q) => [q.id, q]));
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;

    for (const q of attempt.assessment.questions) {
      totalPointsPossible += q.points;
    }

    for (const qr of input.questionReviews) {
      const q = questionsMap.get(qr.questionId);
      if (!q) {
        return { success: false, message: `Invalid question ID: ${qr.questionId}` };
      }
      if (typeof qr.pointsEarned !== "number" || qr.pointsEarned < 0 || qr.pointsEarned > q.points) {
        return {
          success: false,
          message: `Score for "${q.title}" must be between 0 and ${q.points} points.`,
        };
      }
      totalPointsEarned += qr.pointsEarned;
    }

    const totalScore =
      totalPointsPossible > 0
        ? Math.round((totalPointsEarned / totalPointsPossible) * 10000) / 100
        : 0.0;
    const passingScore = attempt.assessment.passingScore || 70.0;
    const passed = totalScore >= passingScore;

    // Persist draft in atomic transaction
    await prisma.$transaction(async (tx) => {
      // Guard against concurrent publication: draft cannot overwrite a finalized/evaluated attempt
      const currentAttempt = await tx.assessmentAttempt.findUnique({
        where: { id: cleanAttemptId },
        select: { status: true },
      });
      if (!currentAttempt || currentAttempt.status === "EVALUATED") {
        throw new Error(
          "ALREADY_PUBLISHED: Assessment review has already been published and cannot be modified as a draft."
        );
      }

      const review = await tx.assessmentReview.upsert({
        where: { attemptId: cleanAttemptId },
        create: {
          attemptId: cleanAttemptId,
          reviewerId: authCheck.user!.id!,
          status: "DRAFT",
          totalScore,
          totalPoints: totalPointsEarned,
          pointsPossible: totalPointsPossible,
          passed,
          feedback: input.overallFeedback?.trim() || null,
        },
        update: {
          reviewerId: authCheck.user!.id!,
          status: "DRAFT", // Keep DRAFT
          totalScore,
          totalPoints: totalPointsEarned,
          pointsPossible: totalPointsPossible,
          passed,
          feedback: input.overallFeedback?.trim() || null,
        },
      });

      // Upsert individual question reviews
      for (const qr of input.questionReviews) {
        const q = questionsMap.get(qr.questionId)!;
        await tx.questionReview.upsert({
          where: {
            reviewId_questionId: {
              reviewId: review.id,
              questionId: qr.questionId,
            },
          },
          create: {
            reviewId: review.id,
            questionId: qr.questionId,
            pointsEarned: qr.pointsEarned,
            pointsPossible: q.points,
            feedback: qr.feedback?.trim() || null,
          },
          update: {
            pointsEarned: qr.pointsEarned,
            pointsPossible: q.points,
            feedback: qr.feedback?.trim() || null,
          },
        });
      }
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: "Review draft saved successfully. Results remain hidden from candidate.",
      totalScore,
      totalPoints: totalPointsEarned,
      pointsPossible: totalPointsPossible,
      passed,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("ALREADY_PUBLISHED")) {
      return {
        success: false,
        message: "Assessment review has already been published and cannot be modified as a draft.",
      };
    }
    console.error("[saveAssessmentReviewDraft Error]:", err);
    return { success: false, message: "Failed to save assessment review draft." };
  }
}

// -------------------------------------------------------------
// 4. RECRUITER: FINALIZE & PUBLISH ASSESSMENT REVIEW
// -------------------------------------------------------------
export async function finalizeAndPublishReview(
  input: FinalizeReviewInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  totalScore?: number;
  totalPoints?: number;
  pointsPossible?: number;
  passed?: boolean;
}> {
  const authCheck = await authenticateSession(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return { success: false, message: "Authentication required." };
  }

  if (authCheck.user.role !== "RECRUITER") {
    return { success: false, message: "Access denied. Only recruiters can finalize reviews." };
  }

  const cleanAttemptId = input.attemptId?.trim();
  if (!cleanAttemptId) {
    return { success: false, message: "Attempt ID is required." };
  }

  try {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: cleanAttemptId },
      include: {
        assessment: {
          include: { questions: true },
        },
        application: true,
      },
    });

    if (!attempt) {
      return { success: false, message: "Assessment attempt not found." };
    }

    if (attempt.assessment.companyId !== authCheck.user.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to review assessments for another company.",
      };
    }

    if (attempt.status !== "SUBMITTED") {
      if (attempt.status === "EVALUATED") {
        return {
          success: false,
          message: "Assessment review has already been published and cannot be modified.",
        };
      }
      return {
        success: false,
        message: `Assessment cannot be finalized in status '${attempt.status}'. Attempt must be SUBMITTED.`,
      };
    }

    // Validate points for each question
    const questionsMap = new Map(attempt.assessment.questions.map((q) => [q.id, q]));
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;

    for (const q of attempt.assessment.questions) {
      totalPointsPossible += q.points;
    }

    for (const qr of input.questionReviews) {
      const q = questionsMap.get(qr.questionId);
      if (!q) {
        return { success: false, message: `Invalid question ID: ${qr.questionId}` };
      }
      if (typeof qr.pointsEarned !== "number" || qr.pointsEarned < 0 || qr.pointsEarned > q.points) {
        return {
          success: false,
          message: `Score for "${q.title}" must be between 0 and ${q.points} points.`,
        };
      }
      totalPointsEarned += qr.pointsEarned;
    }

    const totalScore =
      totalPointsPossible > 0
        ? Math.round((totalPointsEarned / totalPointsPossible) * 10000) / 100
        : 0.0;
    const passingScore = attempt.assessment.passingScore || 70.0;
    const passed = totalScore >= passingScore;
    const now = new Date();

    // Atomic conditional transaction: Publish review and update AssessmentAttempt
    await prisma.$transaction(async (tx) => {
      // 1. Atomic conditional state transition on AssessmentAttempt:
      // Status MUST be 'SUBMITTED' to transition to 'EVALUATED'.
      // If concurrent recruiters publish simultaneously, exactly one will update 1 row (count: 1);
      // all concurrent or subsequent transactions will update 0 rows (count: 0) and roll back.
      const transitionResult = await tx.assessmentAttempt.updateMany({
        where: {
          id: cleanAttemptId,
          status: "SUBMITTED",
        },
        data: {
          status: "EVALUATED",
          score: totalScore,
          updatedAt: now,
        },
      });

      if (transitionResult.count === 0) {
        throw new Error(
          "ALREADY_PUBLISHED: Assessment review has already been published and cannot be overwritten."
        );
      }

      // 2. Upsert AssessmentReview in PUBLISHED status
      const review = await tx.assessmentReview.upsert({
        where: { attemptId: cleanAttemptId },
        create: {
          attemptId: cleanAttemptId,
          reviewerId: authCheck.user!.id!,
          status: "PUBLISHED",
          totalScore,
          totalPoints: totalPointsEarned,
          pointsPossible: totalPointsPossible,
          passed,
          feedback: input.overallFeedback?.trim() || null,
          publishedAt: now,
        },
        update: {
          reviewerId: authCheck.user!.id!,
          status: "PUBLISHED",
          totalScore,
          totalPoints: totalPointsEarned,
          pointsPossible: totalPointsPossible,
          passed,
          feedback: input.overallFeedback?.trim() || null,
          publishedAt: now,
        },
      });

      // 3. Upsert QuestionReviews
      for (const qr of input.questionReviews) {
        const q = questionsMap.get(qr.questionId)!;
        await tx.questionReview.upsert({
          where: {
            reviewId_questionId: {
              reviewId: review.id,
              questionId: qr.questionId,
            },
          },
          create: {
            reviewId: review.id,
            questionId: qr.questionId,
            pointsEarned: qr.pointsEarned,
            pointsPossible: q.points,
            feedback: qr.feedback?.trim() || null,
          },
          update: {
            pointsEarned: qr.pointsEarned,
            pointsPossible: q.points,
            feedback: qr.feedback?.trim() || null,
          },
        });
      }

      // 4. If application is linked, update application status if appropriate
      if (attempt.applicationId) {
        await tx.application.update({
          where: { id: attempt.applicationId },
          data: {
            status: "ASSESSMENT_COMPLETED",
            updatedAt: now,
          },
        });
      }
    });

    safeRevalidatePath("/recruiter/dashboard");
    safeRevalidatePath("/candidate/dashboard");
    safeRevalidatePath(`/candidate/assessment/${cleanAttemptId}`);

    return {
      success: true,
      message: "Assessment review finalized and published. Results are now visible to the candidate.",
      totalScore,
      totalPoints: totalPointsEarned,
      pointsPossible: totalPointsPossible,
      passed,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("ALREADY_PUBLISHED")) {
      return {
        success: false,
        message: "Assessment review has already been published and cannot be modified.",
      };
    }
    console.error("[finalizeAndPublishReview Error]:", err);
    return { success: false, message: "Failed to finalize and publish assessment review." };
  }
}

// -------------------------------------------------------------
// 5. CANDIDATE: GET CANDIDATE ASSESSMENT HISTORY
// -------------------------------------------------------------
export async function getCandidateAssessmentHistory(
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  history: CandidateAssessmentHistoryItem[];
}> {
  const authCheck = await authenticateSession(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return { success: false, message: "Authentication required.", history: [] };
  }

  if (authCheck.user.role !== "CANDIDATE") {
    return { success: false, message: "Candidate access only.", history: [] };
  }

  const candidateId = authCheck.user.id;

  try {
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { candidateId },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            passingScore: true,
            company: {
              select: { id: true, name: true, logoUrl: true },
            },
            questions: {
              select: { id: true, points: true },
            },
          },
        },
        application: {
          select: {
            id: true,
            status: true,
            job: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
        // PRIVACY ENFORCEMENT: ONLY fetch review if status is PUBLISHED!
        review: {
          where: { status: "PUBLISHED" },
          select: {
            id: true,
            status: true,
            totalScore: true,
            passed: true,
            feedback: true,
            publishedAt: true,
          },
        },
        submissions: {
          select: { id: true, questionId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedHistory: CandidateAssessmentHistoryItem[] = attempts.map((a) => {
      let lifecycleState: CandidateAssessmentHistoryItem["lifecycleState"] = "NOT_STARTED";

      if (a.status === "EXPIRED") {
        lifecycleState = "EXPIRED";
      } else if (a.status === "IN_PROGRESS") {
        lifecycleState = "IN_PROGRESS";
      } else if (a.status === "EVALUATED" && a.review) {
        lifecycleState = "RESULTS_PUBLISHED";
      } else if (a.status === "SUBMITTED" || a.status === "EVALUATED") {
        lifecycleState = "SUBMITTED_AWAITING_REVIEW";
      }

      const isPublished = Boolean(a.review && a.review.status === "PUBLISHED");

      return {
        attemptId: a.id,
        assessmentId: a.assessment.id,
        assessmentTitle: a.assessment.title,
        companyName: a.assessment.company.name,
        companyLogoUrl: a.assessment.company.logoUrl,
        jobId: a.application?.job?.id || null,
        jobTitle: a.application?.job?.title || null,
        applicationId: a.application?.id || null,
        applicationStatus: a.application?.status || null,
        startedAt: a.startedAt?.toISOString() || null,
        submittedAt: a.submittedAt?.toISOString() || null,
        status: a.status,
        lifecycleState,
        score: isPublished ? a.review!.totalScore : null, // Hidden until published
        passingScore: a.assessment.passingScore || 70,
        passed: isPublished ? a.review!.passed : null,
        feedback: isPublished ? a.review!.feedback : null,
        publishedAt: isPublished ? a.review!.publishedAt?.toISOString() || null : null,
        questionsCount: a.assessment.questions.length,
      };
    });

    return {
      success: true,
      history: mappedHistory,
    };
  } catch (err) {
    console.error("[getCandidateAssessmentHistory Error]:", err);
    return { success: false, message: "Failed to load candidate assessment history.", history: [] };
  }
}
