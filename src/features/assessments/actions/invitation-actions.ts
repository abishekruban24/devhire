"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { InvitationStatus } from "@prisma/client";

export interface SessionContext {
  user?: {
    id?: string;
    role?: string;
    email?: string | null;
    companyId?: string | null;
  } | null;
}

export interface CreateInvitationInput {
  applicationId: string;
  assessmentId: string;
  expiresInDays?: number;
  expiresAt?: Date | string | null;
}

export interface RecruiterInvitationItem {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline?: string | null;
  candidateAvatarUrl?: string | null;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  status: InvitationStatus;
  expiresAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface CandidateInvitationItem {
  id: string;
  attemptId?: string | null;
  assessmentId: string;
  assessmentTitle: string;
  assessmentDescription: string;
  companyName: string;
  companyLogoUrl?: string | null;
  jobId: string;
  jobTitle: string;
  durationMinutes: number;
  passingScore: number;
  questionsCount: number;
  totalPoints: number;
  status: InvitationStatus;
  expiresAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

/**
 * Helper to safely revalidate paths without throwing in test/CLI environments
 */
function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In non-Next.js runtime (e.g. tsx test runners), revalidatePath throws; safe to ignore
  }
}

/**
 * Authenticate and enforce recruiter role
 */
async function authenticateRecruiter(sessionOverride?: SessionContext | null) {
  let session = sessionOverride;
  if (session === undefined) {
    try {
      session = await auth();
    } catch {
      session = null;
    }
  }

  if (!session?.user?.id) {
    return {
      authenticated: false,
      error: "Authentication required. Please sign in to access recruiter features.",
    };
  }

  if (session.user.role !== "RECRUITER") {
    return {
      authenticated: false,
      error: "Access denied. Only registered recruiters can manage assessment invitations.",
    };
  }

  let companyId = session.user.companyId;
  if (!companyId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });
    companyId = dbUser?.companyId ?? null;
  }

  if (!companyId) {
    return {
      authenticated: false,
      error: "Access denied. Your recruiter account must be linked to a registered company.",
    };
  }

  return {
    authenticated: true,
    user: session.user,
    companyId,
  };
}

/**
 * Authenticate candidate
 */
async function authenticateCandidate(sessionOverride?: SessionContext | null) {
  let session = sessionOverride;
  if (session === undefined) {
    try {
      session = await auth();
    } catch {
      session = null;
    }
  }

  if (!session?.user?.id) {
    return {
      authenticated: false,
      error: "Authentication required. Please sign in to view your assessment invitations.",
    };
  }

  return {
    authenticated: true,
    user: session.user,
  };
}

/**
 * CREATE an assessment invitation.
 * STRICT ENFORCEMENT:
 * - Recruiter authentication and company verification.
 * - Application must belong to recruiter's company.
 * - Assessment must be ACTIVE and belong to recruiter's company.
 * - Assessment must have at least 1 coding question.
 * - Job-assessment binding: If assessment is linked to a job, applicant must be for that specific job.
 * - Duplicate prevention: Rejects if an active (PENDING or STARTED) invitation already exists.
 * - Updates ApplicationStatus to ASSESSMENT_INVITED atomically.
 */
export async function createAssessmentInvitation(
  input: CreateInvitationInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  invitationId?: string;
  errorType?: "UNAUTHENTICATED" | "ROLE_DENIED" | "FORBIDDEN" | "VALIDATION_ERROR" | "DUPLICATE_INVITATION" | "SERVER_ERROR";
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId || !authCheck.user?.id) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      errorType: authCheck.error?.includes("denied") ? "ROLE_DENIED" : "UNAUTHENTICATED",
    };
  }

  const cleanAppId = String(input.applicationId || "").trim();
  const cleanAssId = String(input.assessmentId || "").trim();

  if (!cleanAppId) {
    return {
      success: false,
      message: "Application ID is required.",
      errorType: "VALIDATION_ERROR",
    };
  }

  if (!cleanAssId) {
    return {
      success: false,
      message: "Assessment ID is required.",
      errorType: "VALIDATION_ERROR",
    };
  }

  let assessmentTitle = cleanAssId;

  try {
    // 1. Fetch application and verify company ownership
    const application = await prisma.application.findUnique({
      where: { id: cleanAppId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            companyId: true,
          },
        },
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      return {
        success: false,
        message: "Application record not found.",
        errorType: "VALIDATION_ERROR",
      };
    }

    if (application.job.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to invite applicants for jobs outside your company.",
        errorType: "FORBIDDEN",
      };
    }

    // 2. Fetch assessment and verify status, ownership, and questions count
    const assessment = await prisma.assessment.findUnique({
      where: { id: cleanAssId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!assessment) {
      return {
        success: false,
        message: "Assessment record not found.",
        errorType: "VALIDATION_ERROR",
      };
    }

    assessmentTitle = assessment.title;

    if (assessment.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to use assessments belonging to another company.",
        errorType: "FORBIDDEN",
      };
    }

    if (assessment.status !== "ACTIVE") {
      return {
        success: false,
        message: `Only ACTIVE assessments can be sent to applicants. "${assessment.title}" is currently in ${assessment.status} status. Please activate the assessment first.`,
        errorType: "VALIDATION_ERROR",
      };
    }

    if (assessment._count.questions === 0) {
      return {
        success: false,
        message: `Assessment "${assessment.title}" does not contain any coding challenges. Please author at least one coding question before inviting candidates.`,
        errorType: "VALIDATION_ERROR",
      };
    }

    // 3. Job-Assessment Binding Verification:
    // If the assessment is assigned to specific job(s), the application must be for one of those jobs!
    if (assessment.jobs.length > 0) {
      const isJobMatched = assessment.jobs.some((j) => j.id === application.job.id);
      if (!isJobMatched) {
        return {
          success: false,
          message: `Assessment "${assessment.title}" is assigned exclusively to "${assessment.jobs[0].title}" and cannot be sent to applicants for "${application.job.title}".`,
          errorType: "VALIDATION_ERROR",
        };
      }
    }

    // 4. Expiration Calculation
    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      const parsedDate = new Date(input.expiresAt);
      if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        return {
          success: false,
          message: "Expiration date must be a valid future date and time.",
          errorType: "VALIDATION_ERROR",
        };
      }
      expiresAt = parsedDate;
    } else if (input.expiresInDays && input.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    } else {
      // Default: 7 days expiration window
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // 5. Transactional Creation with Concurrency-Safe Duplicate Guard
    const createdInvitation = await prisma.$transaction(async (tx) => {
      // Atomic active check inside transaction
      const existingActive = await tx.assessmentInvitation.findFirst({
        where: {
          applicationId: cleanAppId,
          assessmentId: cleanAssId,
          status: { in: ["PENDING", "STARTED"] },
        },
      });

      if (existingActive) {
        const error = new Error(`An active assessment invitation for "${assessment.title}" is already pending or in progress for this candidate.`);
        (error as unknown as { isDuplicate: boolean }).isDuplicate = true;
        throw error;
      }

      const inv = await tx.assessmentInvitation.create({
        data: {
          assessmentId: cleanAssId,
          candidateId: application.candidateId,
          applicationId: cleanAppId,
          companyId: authCheck.companyId,
          invitedById: authCheck.user.id!,
          status: "PENDING",
          expiresAt,
        },
      });

      // Update application status to ASSESSMENT_INVITED if not already past this stage
      if (application.status !== "OFFERED" && application.status !== "REJECTED") {
        await tx.application.update({
          where: { id: cleanAppId },
          data: { status: "ASSESSMENT_INVITED" },
        });
      }

      return inv;
    });

    safeRevalidatePath("/recruiter/dashboard");
    safeRevalidatePath("/candidate/dashboard");

    const candidateName = application.candidate.name || application.candidate.email;
    return {
      success: true,
      message: `Technical assessment invitation for "${assessment.title}" successfully sent to ${candidateName}.`,
      invitationId: createdInvitation.id,
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string; isDuplicate?: boolean };
    if (
      errObj?.isDuplicate ||
      errObj?.code === "P2002" ||
      errObj?.code === "P2028" ||
      errObj?.code === "P2034" ||
      errObj?.message?.includes("AssessmentInvitation_unique_active") ||
      errObj?.message?.includes("already pending or in progress") ||
      errObj?.message?.includes("Transaction API error")
    ) {
      return {
        success: false,
        message: `An active assessment invitation for "${assessmentTitle}" is already pending or in progress for this candidate.`,
        errorType: "DUPLICATE_INVITATION",
      };
    }

    console.error("[Create Assessment Invitation Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while sending the assessment invitation.",
      errorType: "SERVER_ERROR",
    };
  }
}

/**
 * REVOKE an unstarted assessment invitation.
 * STRICT ENFORCEMENT:
 * - Scoped to recruiter's company.
 * - Only PENDING invitations can be revoked.
 */
export async function revokeAssessmentInvitation(
  invitationId: string,
  sessionOverride?: SessionContext | null
): Promise<{ success: boolean; message: string }> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanId = String(invitationId || "").trim();

  try {
    const invitation = await prisma.assessmentInvitation.findUnique({
      where: { id: cleanId },
      include: {
        assessment: { select: { title: true } },
        candidate: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      return { success: false, message: "Assessment invitation not found." };
    }

    if (invitation.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to revoke invitations for another company.",
      };
    }

    // Atomic Compare-And-Swap update: status must be PENDING and companyId must match
    const updateResult = await prisma.assessmentInvitation.updateMany({
      where: {
        id: cleanId,
        companyId: authCheck.companyId,
        status: "PENDING",
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      // Re-query current state to deliver precise error message
      const current = await prisma.assessmentInvitation.findUnique({
        where: { id: cleanId },
        select: { status: true, companyId: true },
      });

      if (!current || current.companyId !== authCheck.companyId) {
        return { success: false, message: "Assessment invitation not found." };
      }

      return {
        success: false,
        message: `Cannot revoke invitation with status "${current.status}". Only unstarted PENDING invitations can be revoked.`,
      };
    }

    safeRevalidatePath("/recruiter/dashboard");
    safeRevalidatePath("/candidate/dashboard");

    const candidateName = invitation.candidate.name || invitation.candidate.email;
    return {
      success: true,
      message: `Assessment invitation for ${candidateName} has been revoked successfully.`,
    };
  } catch (err) {
    console.error("[Revoke Assessment Invitation Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while revoking the assessment invitation.",
    };
  }
}

/**
 * GET company's assessment invitations (for recruiter pipeline & monitoring).
 * Scoped strictly to recruiter's company.
 */
export async function getCompanyInvitations(
  jobId?: string,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  invitations: RecruiterInvitationItem[];
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      invitations: [],
    };
  }

  try {
    // 1. Automatically update expired invitations lazily
    await prisma.assessmentInvitation.updateMany({
      where: {
        companyId: authCheck.companyId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    // 2. Query company invitations
    const whereClause: { companyId: string; application?: { jobId: string } } = {
      companyId: authCheck.companyId,
    };
    if (jobId && jobId !== "ALL") {
      whereClause.application = { jobId };
    }

    const items = await prisma.assessmentInvitation.findMany({
      where: whereClause,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
          },
        },
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            avatarUrl: true,
          },
        },
        application: {
          select: {
            id: true,
            jobId: true,
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

    const invitations: RecruiterInvitationItem[] = items.map((inv) => ({
      id: inv.id,
      assessmentId: inv.assessment.id,
      assessmentTitle: inv.assessment.title,
      candidateId: inv.candidate.id,
      candidateName: inv.candidate.name,
      candidateEmail: inv.candidate.email,
      candidateHeadline: inv.candidate.headline,
      candidateAvatarUrl: inv.candidate.avatarUrl,
      applicationId: inv.application.id,
      jobId: inv.application.jobId,
      jobTitle: inv.application.job.title,
      status: inv.status,
      expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
      startedAt: inv.startedAt ? inv.startedAt.toISOString() : null,
      completedAt: inv.completedAt ? inv.completedAt.toISOString() : null,
      revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
      createdAt: inv.createdAt.toISOString(),
    }));

    return {
      success: true,
      invitations,
    };
  } catch (err) {
    console.error("[Get Company Invitations Error]:", err);
    return {
      success: false,
      message: "Failed to load assessment invitations.",
      invitations: [],
    };
  }
}

/**
 * GET candidate's assessment invitations (for Candidate Dashboard).
 * Scoped strictly to the authenticated candidate.
 * Returns permitted metadata only; complete questions withheld until attempt initiation.
 */
export async function getCandidateInvitations(
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  invitations: CandidateInvitationItem[];
}> {
  const authCheck = await authenticateCandidate(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      invitations: [],
    };
  }

  try {
    // 1. Automatically update expired invitations lazily
    await prisma.assessmentInvitation.updateMany({
      where: {
        candidateId: authCheck.user.id,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    // 2. Query invitations for candidate
    const items = await prisma.assessmentInvitation.findMany({
      where: {
        candidateId: authCheck.user.id,
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            description: true,
            durationMinutes: true,
            passingScore: true,
            company: {
              select: {
                name: true,
                logoUrl: true,
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
        },
        application: {
          select: {
            jobId: true,
            job: {
              select: {
                title: true,
              },
            },
          },
        },
        attempts: {
          select: {
            id: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const invitations: CandidateInvitationItem[] = items.map((inv) => ({
      id: inv.id,
      attemptId: inv.attempts[0]?.id || null,
      assessmentId: inv.assessment.id,
      assessmentTitle: inv.assessment.title,
      assessmentDescription: inv.assessment.description,
      companyName: inv.assessment.company.name,
      companyLogoUrl: inv.assessment.company.logoUrl,
      jobId: inv.application.jobId,
      jobTitle: inv.application.job.title,
      durationMinutes: inv.assessment.durationMinutes,
      passingScore: inv.assessment.passingScore,
      questionsCount: inv.assessment._count.questions,
      totalPoints: inv.assessment.questions.reduce((sum, q) => sum + q.points, 0),
      status: inv.status,
      expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
      startedAt: inv.startedAt ? inv.startedAt.toISOString() : null,
      completedAt: inv.completedAt ? inv.completedAt.toISOString() : null,
      createdAt: inv.createdAt.toISOString(),
    }));

    return {
      success: true,
      invitations,
    };
  } catch (err) {
    console.error("[Get Candidate Invitations Error]:", err);
    return {
      success: false,
      message: "Failed to load candidate assessment invitations.",
      invitations: [],
    };
  }
}
