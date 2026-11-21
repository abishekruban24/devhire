"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { JobLocationType, JobType, JobStatus } from "@prisma/client";

export interface JobActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  job?: Record<string, unknown> | null;
}

export interface JobInputData {
  title: string;
  description: string;
  requirements: string;
  location: string;
  locationType?: JobLocationType;
  type?: JobType;
  status?: JobStatus;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  experienceLevel?: string | null;
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle invocation in standalone CLI tests where Next.js generation store is not active
  }
}

function generateJobSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const timeSuffix = Date.now().toString(36).slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 6);
  return `${base || "job"}-${timeSuffix}${randSuffix}`;
}

const VALID_LOCATION_TYPES: JobLocationType[] = ["REMOTE", "HYBRID", "ON_SITE"];
const VALID_JOB_TYPES: JobType[] = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
const VALID_STATUSES: JobStatus[] = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"];

function validateJobFields(data: Partial<JobInputData>): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized: JobInputData;
} {
  const errors: Record<string, string> = {};

  const title = String(data.title || "").trim();
  const description = String(data.description || "").trim();
  const requirements = String(data.requirements || "").trim();
  const location = String(data.location || "").trim();

  if (!title || title.length < 3) {
    errors.title = "Job title must be at least 3 characters long.";
  } else if (title.length > 120) {
    errors.title = "Job title must not exceed 120 characters.";
  }

  if (!description || description.length < 10) {
    errors.description = "Job description must be at least 10 characters long.";
  }

  if (!requirements || requirements.length < 5) {
    errors.requirements = "Key requirements must be at least 5 characters long.";
  }

  if (!location || location.length < 2) {
    errors.location = "Job location or workplace designation is required.";
  }

  const rawLocType = String(data.locationType || "REMOTE").toUpperCase() as JobLocationType;
  const locationType = VALID_LOCATION_TYPES.includes(rawLocType) ? rawLocType : "REMOTE";

  const rawJobType = String(data.type || "FULL_TIME").toUpperCase() as JobType;
  const type = VALID_JOB_TYPES.includes(rawJobType) ? rawJobType : "FULL_TIME";

  const rawStatus = String(data.status || "DRAFT").toUpperCase() as JobStatus;
  const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : "DRAFT";

  let salaryMin: number | null = null;
  if (data.salaryMin !== undefined && data.salaryMin !== null && String(data.salaryMin).trim() !== "") {
    const parsedMin = Number(data.salaryMin);
    if (isNaN(parsedMin) || parsedMin < 0) {
      errors.salaryMin = "Minimum salary must be a positive number.";
    } else {
      salaryMin = Math.round(parsedMin);
    }
  }

  let salaryMax: number | null = null;
  if (data.salaryMax !== undefined && data.salaryMax !== null && String(data.salaryMax).trim() !== "") {
    const parsedMax = Number(data.salaryMax);
    if (isNaN(parsedMax) || parsedMax < 0) {
      errors.salaryMax = "Maximum salary must be a positive number.";
    } else {
      salaryMax = Math.round(parsedMax);
    }
  }

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    errors.salaryMax = "Maximum salary cannot be lower than minimum salary.";
  }

  const currency = String(data.currency || "USD").trim().toUpperCase() || "USD";
  const experienceLevel = data.experienceLevel ? String(data.experienceLevel).trim() : null;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      title,
      description,
      requirements,
      location,
      locationType,
      type,
      status,
      salaryMin,
      salaryMax,
      currency,
      experienceLevel,
    },
  };
}

export interface SessionContext {
  user?: {
    id?: string;
    role?: string;
    email?: string | null;
    companyId?: string | null;
  } | null;
}

/**
 * Server-side security check: verifies authenticated recruiter and resolves their registered company ID.
 * NEVER trusts client-submitted company IDs.
 */
async function authenticateRecruiter(sessionOverride?: SessionContext | null) {
  const session = sessionOverride !== undefined ? sessionOverride : await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
      error: "Authentication required. Please sign in to access recruiter features.",
    };
  }

  if (session.user.role !== "RECRUITER") {
    return {
      authenticated: false,
      error: "Access denied. Only registered recruiters can manage job postings.",
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
 * Helper to extract data whether passed via FormData or plain object
 */
function extractJobData(input: FormData | Partial<JobInputData>): Partial<JobInputData> {
  if (input instanceof FormData) {
    return {
      title: String(input.get("title") || ""),
      description: String(input.get("description") || ""),
      requirements: String(input.get("requirements") || ""),
      location: String(input.get("location") || ""),
      locationType: (input.get("locationType") as JobLocationType) || "REMOTE",
      type: (input.get("type") as JobType) || "FULL_TIME",
      status: (input.get("status") as JobStatus) || "DRAFT",
      salaryMin: input.get("salaryMin") ? Number(input.get("salaryMin")) : null,
      salaryMax: input.get("salaryMax") ? Number(input.get("salaryMax")) : null,
      currency: String(input.get("currency") || "USD"),
      experienceLevel: input.get("experienceLevel") ? String(input.get("experienceLevel")) : null,
    };
  }
  return input;
}

/**
 * CREATE a new job posting for the recruiter's company.
 */
export async function createJob(
  input: FormData | Partial<JobInputData>,
  sessionOverride?: SessionContext | null
): Promise<JobActionResult> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  const rawData = extractJobData(input);
  const { isValid, errors, sanitized } = validateJobFields(rawData);

  if (!isValid) {
    return {
      success: false,
      message: "Please correct the highlighted form errors before proceeding.",
      errors,
    };
  }

  try {
    const slug = generateJobSlug(sanitized.title);

    const job = await prisma.job.create({
      data: {
        title: sanitized.title,
        slug,
        description: sanitized.description,
        requirements: sanitized.requirements,
        location: sanitized.location,
        locationType: sanitized.locationType || "REMOTE",
        type: sanitized.type || "FULL_TIME",
        status: sanitized.status || "DRAFT",
        salaryMin: sanitized.salaryMin,
        salaryMax: sanitized.salaryMax,
        currency: sanitized.currency || "USD",
        experienceLevel: sanitized.experienceLevel,
        companyId: authCheck.companyId,
        recruiterId: authCheck.user.id,
      },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message:
        sanitized.status === "PUBLISHED"
          ? `Job "${sanitized.title}" is now published and accepting candidate applications.`
          : `Draft job opening "${sanitized.title}" has been saved.`,
      job,
    };
  } catch (err) {
    console.error("[Create Job Server Action Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while saving the job posting. Please try again.",
    };
  }
}

/**
 * UPDATE an existing job posting owned by the recruiter's company.
 */
export async function updateJob(
  jobId: string,
  input: FormData | Partial<JobInputData>,
  sessionOverride?: SessionContext | null
): Promise<JobActionResult> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  if (!jobId || typeof jobId !== "string") {
    return { success: false, message: "Valid Job ID is required." };
  }

  try {
    // Verify job existence and strict company ownership
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, companyId: true, status: true },
    });

    if (!existingJob) {
      return { success: false, message: "Job posting not found." };
    }

    if (existingJob.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to modify job openings from another company.",
      };
    }

    const rawData = extractJobData(input);
    const { isValid, errors, sanitized } = validateJobFields(rawData);

    if (!isValid) {
      return {
        success: false,
        message: "Please correct the highlighted form errors before proceeding.",
        errors,
      };
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        title: sanitized.title,
        description: sanitized.description,
        requirements: sanitized.requirements,
        location: sanitized.location,
        locationType: sanitized.locationType || "REMOTE",
        type: sanitized.type || "FULL_TIME",
        status: sanitized.status || existingJob.status,
        salaryMin: sanitized.salaryMin,
        salaryMax: sanitized.salaryMax,
        currency: sanitized.currency || "USD",
        experienceLevel: sanitized.experienceLevel,
      },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Job "${updatedJob.title}" has been updated successfully.`,
      job: updatedJob,
    };
  } catch (err) {
    console.error("[Update Job Server Action Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while updating the job. Please try again.",
    };
  }
}

/**
 * CHANGE JOB STATUS (Publish, Draft, Close, Archive)
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  sessionOverride?: SessionContext | null
): Promise<JobActionResult> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, message: "Invalid job status specified." };
  }

  try {
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, companyId: true, title: true, status: true },
    });

    if (!existingJob) {
      return { success: false, message: "Job posting not found." };
    }

    if (existingJob.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to modify job openings from another company.",
      };
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: newStatus },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    safeRevalidatePath("/recruiter/dashboard");

    const statusLabels: Record<JobStatus, string> = {
      PUBLISHED: "published and open for applicants",
      DRAFT: "moved to drafts",
      CLOSED: "closed to new applications",
      ARCHIVED: "archived",
    };

    return {
      success: true,
      message: `Job "${updatedJob.title}" is now ${statusLabels[newStatus]}.`,
      job: updatedJob,
    };
  } catch (err) {
    console.error("[Update Job Status Server Action Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while updating job status.",
    };
  }
}

/**
 * DELETE a job posting (only allowed if 0 applications exist)
 */
export async function deleteJob(
  jobId: string,
  sessionOverride?: SessionContext | null
): Promise<JobActionResult> {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.user || !authCheck.companyId) {
    return {
      success: false,
      message: authCheck.error || "Authentication required.",
    };
  }

  try {
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        companyId: true,
        title: true,
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!existingJob) {
      return { success: false, message: "Job posting not found." };
    }

    if (existingJob.companyId !== authCheck.companyId) {
      return {
        success: false,
        message: "Forbidden: You do not have permission to delete job openings from another company.",
      };
    }

    if (existingJob._count.applications > 0) {
      return {
        success: false,
        message: `Cannot delete "${existingJob.title}" because it already has ${existingJob._count.applications} active candidate application(s). Close or archive the job instead.`,
      };
    }

    await prisma.job.delete({
      where: { id: jobId },
    });

    safeRevalidatePath("/recruiter/dashboard");

    return {
      success: true,
      message: `Job posting "${existingJob.title}" has been permanently removed.`,
    };
  } catch (err) {
    console.error("[Delete Job Server Action Error]:", err);
    return {
      success: false,
      message: "An unexpected error occurred while deleting the job posting.",
    };
  }
}

/**
 * Retrieve all jobs for the authenticated recruiter's company from the database
 */
export async function getCompanyJobs(sessionOverride?: SessionContext | null) {
  const authCheck = await authenticateRecruiter(sessionOverride);
  if (!authCheck.authenticated || !authCheck.companyId) {
    return { success: false, error: authCheck.error, jobs: [] };
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { companyId: authCheck.companyId },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, jobs };
  } catch (err) {
    console.error("[Get Company Jobs Error]:", err);
    return { success: false, error: "Failed to retrieve company jobs.", jobs: [] };
  }
}
