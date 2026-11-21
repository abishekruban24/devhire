"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ApplicationStatus, JobLocationType, JobType, JobStatus } from "@prisma/client";

export interface SessionContext {
  user?: {
    id?: string;
    role?: string;
    email?: string | null;
    companyId?: string | null;
    name?: string | null;
  } | null;
}

export interface ApplyJobInput {
  jobId: string;
  coverLetter?: string | null;
}

export interface CandidateApplicationItem {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  job: {
    id: string;
    title: string;
    slug: string;
    location: string;
    locationType: JobLocationType;
    type: JobType;
    status: JobStatus;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency: string;
    experienceLevel?: string | null;
    company: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
      location?: string | null;
      industry?: string | null;
    };
  };
}

export interface RecruiterApplicantItem {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  candidate: {
    id: string;
    name: string;
    email: string;
    headline?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    skills: string[];
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    resumeUrl?: string | null;
  };
  job: {
    id: string;
    title: string;
    slug: string;
    location: string;
    locationType: JobLocationType;
    type: JobType;
    status: JobStatus;
  };
}

const VALID_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "IN_REVIEW",
  "ASSESSMENT_INVITED",
  "ASSESSMENT_COMPLETED",
  "SHORTLISTED",
  "REJECTED",
  "OFFERED",
];

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle invocation in standalone CLI tests
  }
}

/**
 * Server-side security check: verifies authenticated candidate.
 * Strictly prevents unauthenticated access and recruiter access.
 */
export async function authenticateCandidate(sessionOverride?: SessionContext | null) {
  const session = sessionOverride !== undefined ? sessionOverride : await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
      roleDenied: false,
      error: "Authentication required. Please sign in as a candidate to proceed.",
    };
  }

  if (session.user.role !== "CANDIDATE") {
    return {
      authenticated: false,
      roleDenied: true,
      error: "Access denied. Candidate privileges required to submit or view job applications.",
    };
  }

  return {
    authenticated: true,
    roleDenied: false,
    user: session.user,
  };
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
      error: "Authentication required. Please sign in as a recruiter to manage applications.",
    };
  }

  if (session.user.role !== "RECRUITER") {
    return {
      authenticated: false,
      error: "Access denied. Recruiter privileges required to manage candidate applications.",
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

  if (!dbUser || dbUser.role !== "RECRUITER" || !dbUser.companyId) {
    return {
      authenticated: false,
      error: "No active company workspace found for this recruiter profile. Please complete company setup.",
    };
  }

  return {
    authenticated: true,
    user: dbUser,
    companyId: dbUser.companyId,
  };
}

/**
 * APPLY to a job opening as an authenticated candidate.
 * STRICT ENFORCEMENT:
 * - Only PUBLISHED jobs accept applications. (Blocks DRAFT, CLOSED, ARCHIVED).
 * - Duplicate application prevention via both pre-check and database unique constraint @@unique([jobId, candidateId]).
 * - Candidate ID is ALWAYS resolved from session, NEVER trusted from browser input.
 */
export async function applyToJob(
  input: ApplyJobInput,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  applicationId?: string;
  errorType?: "UNAUTHENTICATED" | "ROLE_DENIED" | "JOB_NOT_FOUND" | "ALREADY_APPLIED" | "VALIDATION_ERROR" | "INTERNAL_ERROR";
}> {
  const authCheck = await authenticateCandidate(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return {
      success: false,
      message: authCheck.error || "Authentication required. Please sign in as a candidate to apply.",
      errorType: authCheck.roleDenied ? "ROLE_DENIED" : "UNAUTHENTICATED",
    };
  }

  const jobId = String(input.jobId || "").trim();
  if (!jobId) {
    return {
      success: false,
      message: "A valid job ID must be provided to submit an application.",
      errorType: "VALIDATION_ERROR",
    };
  }

  let coverLetter: string | null = null;
  if (input.coverLetter && String(input.coverLetter).trim()) {
    const trimmed = String(input.coverLetter).trim();
    if (trimmed.length > 3000) {
      return {
        success: false,
        message: "Cover letter is too long. Maximum allowed length is 3000 characters.",
        errorType: "VALIDATION_ERROR",
      };
    }
    coverLetter = trimmed;
  }

  // 1. Verify target job exists and is strictly in PUBLISHED status
  const targetJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      status: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!targetJob) {
    return {
      success: false,
      message: "The requested job opening does not exist.",
      errorType: "JOB_NOT_FOUND",
    };
  }

  if (targetJob.status !== "PUBLISHED") {
    return {
      success: false,
      message: `Applications are closed for "${targetJob.title}". Only actively published roles accept candidate submissions.`,
      errorType: "JOB_NOT_FOUND",
    };
  }

  // 2. Pre-check if already applied
  const existingApp = await prisma.application.findUnique({
    where: {
      jobId_candidateId: {
        jobId,
        candidateId: authCheck.user.id,
      },
    },
  });

  if (existingApp) {
    return {
      success: false,
      message: `You have already applied for "${targetJob.title}". Check your Application Tracker for status updates.`,
      errorType: "ALREADY_APPLIED",
    };
  }

  // 3. Transaction-safe insert (catches concurrent duplicate race condition P2002)
  try {
    const newApplication = await prisma.application.create({
      data: {
        jobId,
        candidateId: authCheck.user.id,
        status: "SUBMITTED",
        coverLetter,
      },
      select: {
        id: true,
        jobId: true,
        status: true,
        createdAt: true,
      },
    });

    safeRevalidatePath("/candidate/dashboard");
    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Your application for "${targetJob.title}" at ${targetJob.company.name} has been submitted successfully!`,
      applicationId: newApplication.id,
    };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        message: `You have already applied for "${targetJob.title}". Duplicate applications are not permitted.`,
        errorType: "ALREADY_APPLIED",
      };
    }

    console.error("[Apply to Job Server Action Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while saving your application. Please try again.",
      errorType: "INTERNAL_ERROR",
    };
  }
}

/**
 * Retrieve all applications submitted by the authenticated candidate.
 * Strictly scoped to the candidate's authenticated user ID.
 */
export async function getCandidateApplications(sessionOverride?: SessionContext | null): Promise<{
  success: boolean;
  message?: string;
  applications: CandidateApplicationItem[];
}> {
  const authCheck = await authenticateCandidate(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      applications: [],
    };
  }

  try {
    const apps = await prisma.application.findMany({
      where: {
        candidateId: authCheck.user.id,
      },
      select: {
        id: true,
        jobId: true,
        candidateId: true,
        status: true,
        coverLetter: true,
        createdAt: true,
        updatedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true,
            locationType: true,
            type: true,
            status: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            experienceLevel: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                location: true,
                industry: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      applications: apps as unknown as CandidateApplicationItem[],
    };
  } catch (err) {
    console.error("[Get Candidate Applications Error]:", err);
    return {
      success: false,
      message: "An error occurred while fetching your applications.",
      applications: [],
    };
  }
}

/**
 * Quick helper to get array of job IDs the authenticated candidate has already applied to.
 */
export async function getCandidateAppliedJobIds(
  sessionOverride?: SessionContext | null
): Promise<string[]> {
  const authCheck = await authenticateCandidate(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user?.id) {
    return [];
  }

  try {
    const apps = await prisma.application.findMany({
      where: { candidateId: authCheck.user.id },
      select: { jobId: true },
    });
    return apps.map((a) => a.jobId);
  } catch {
    return [];
  }
}

/**
 * Retrieve candidate applications for the authenticated recruiter's company jobs.
 * STRICT ENFORCEMENT:
 * - Scoped exclusively to jobs belonging to the recruiter's registered companyId.
 * - Never returns password hashes or sensitive authentication data.
 */
export async function getCompanyApplications(
  filters?: {
    jobId?: string;
    status?: ApplicationStatus | "ALL";
  },
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message?: string;
  applications: RecruiterApplicantItem[];
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
      applications: [],
    };
  }

  try {
    const filterJobId = filters?.jobId && filters.jobId !== "ALL" ? filters.jobId.trim() : undefined;
    const filterStatus =
      filters?.status && filters.status !== "ALL" && VALID_STATUSES.includes(filters.status)
        ? filters.status
        : undefined;

    const apps = await prisma.application.findMany({
      where: {
        job: {
          companyId: authCheck.companyId,
          ...(filterJobId ? { id: filterJobId } : {}),
        },
        ...(filterStatus ? { status: filterStatus } : {}),
      },
      select: {
        id: true,
        jobId: true,
        candidateId: true,
        status: true,
        coverLetter: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            bio: true,
            avatarUrl: true,
            skills: true,
            githubUrl: true,
            linkedinUrl: true,
            resumeUrl: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true,
            locationType: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      applications: apps as unknown as RecruiterApplicantItem[],
    };
  } catch (err) {
    console.error("[Get Company Applications Error]:", err);
    return {
      success: false,
      message: "An error occurred while fetching company applications.",
      applications: [],
    };
  }
}

/**
 * UPDATE applicant status (e.g. IN_REVIEW, SHORTLISTED, REJECTED, OFFERED).
 * STRICT ENFORCEMENT:
 * - Recruiter can ONLY update applications for their own company's jobs.
 * - Rejects any unauthorized attempts to modify other companies' applicants.
 * - Validates status belongs to the Prisma ApplicationStatus enum.
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  notes?: string,
  sessionOverride?: SessionContext | null
): Promise<{
  success: boolean;
  message: string;
  application?: Record<string, unknown>;
}> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const cleanAppId = String(applicationId || "").trim();
  if (!cleanAppId) {
    return {
      success: false,
      message: "A valid application ID must be provided.",
    };
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    return {
      success: false,
      message: `Invalid application status "${newStatus}". Must be one of: ${VALID_STATUSES.join(", ")}.`,
    };
  }

  // 1. Look up existing application and verify company ownership
  const existingApp = await prisma.application.findUnique({
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

  if (!existingApp) {
    return {
      success: false,
      message: "Application record not found.",
    };
  }

  if (existingApp.job.companyId !== authCheck.companyId) {
    return {
      success: false,
      message: "Forbidden: You do not have permission to modify applications for another company's job postings.",
    };
  }

  try {
    const updated = await prisma.application.update({
      where: { id: cleanAppId },
      data: {
        status: newStatus,
        ...(notes !== undefined ? { notes: String(notes).trim().slice(0, 2000) } : {}),
      },
      select: {
        id: true,
        status: true,
        notes: true,
        updatedAt: true,
      },
    });

    safeRevalidatePath("/recruiter/dashboard");
    safeRevalidatePath("/candidate/dashboard");

    const statusDescriptions: Record<ApplicationStatus, string> = {
      SUBMITTED: "Application reset to Submitted status.",
      IN_REVIEW: "Candidate has been placed Under Review.",
      ASSESSMENT_INVITED: "Candidate invited to Technical Assessment.",
      ASSESSMENT_COMPLETED: "Candidate marked as Assessment Completed.",
      SHORTLISTED: "Candidate successfully Shortlisted for next interview rounds!",
      REJECTED: "Application has been marked as Not Selected.",
      OFFERED: "Job Offer extended to candidate!",
    };

    return {
      success: true,
      message: statusDescriptions[newStatus] || `Status updated to ${newStatus}.`,
      application: updated,
    };
  } catch (err) {
    console.error("[Update Application Status Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while updating application status.",
    };
  }
}
