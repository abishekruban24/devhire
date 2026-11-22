import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  HiringOverviewMetrics,
  type RealRecruiterMetrics,
} from "@/features/recruiter/components/hiring-overview-metrics";
import {
  RecruiterJobManagement,
  type DatabaseJobItem,
} from "@/features/recruiter/components/recruiter-job-management";
import { RecruiterApplicantManagement } from "@/features/recruiter/components/recruiter-applicant-management";
import { RecruiterAssessmentManagement } from "@/features/recruiter/components/recruiter-assessment-management";
import { RecruiterManualReviewManagement } from "@/features/recruiter/components/recruiter-manual-review-management";
import type { RecruiterApplicantItem } from "@/features/applications/actions/application-actions";
import type { RecruiterAssessmentItem } from "@/features/assessments/actions/assessment-actions";
import {
  getCompanyInvitations,
  type RecruiterInvitationItem,
} from "@/features/assessments/actions/invitation-actions";
import {
  getCompanySubmissionsForReview,
  type RecruiterSubmissionItem,
} from "@/features/assessments/actions/review-actions";

export const metadata: Metadata = {
  title: "Recruiter Dashboard | DevHire",
  description:
    "Recruiter management console with live hiring metrics, job postings preview, candidate pipeline, and manual technical code review.",
};

export const instant = false;

export default async function RecruiterDashboardPage() {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: string }).digest === "string"
    ) {
      throw error;
    }
    console.error(
      "[Recruiter Dashboard Security]: Session retrieval failed, redirecting to login:",
      error instanceof Error ? error.message : "Unknown error"
    );
    redirect("/login?callbackUrl=/recruiter/dashboard&error=SessionError");
  }

  // 1. Require authenticated session
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/recruiter/dashboard");
  }

  // 2. Database-authoritative role verification: Prevent any session bleed or stale token impersonation
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
          name: true,
        },
      },
    },
  });

  if (!dbUser) {
    redirect("/login?callbackUrl=/recruiter/dashboard&error=UserNotFound");
  }

  // Strict role separation: Candidates redirected to candidate hub
  if (dbUser.role === "CANDIDATE") {
    redirect("/candidate/dashboard");
  }

  // Fail closed: User must strictly have role RECRUITER
  if (dbUser.role !== "RECRUITER") {
    redirect("/login?error=AccessDenied");
  }

  // 3. Fetch real recruiter user, company profile, jobs, applications, assessments, and invitations from Neon PostgreSQL
  let companyJobs: DatabaseJobItem[] = [];
  let companyApplications: RecruiterApplicantItem[] = [];
  let companyAssessments: RecruiterAssessmentItem[] = [];
  let companyInvitations: RecruiterInvitationItem[] = [];
  let reviewSubmissions: RecruiterSubmissionItem[] = [];
  let reviewCounts = { total: 0, awaitingReview: 0, draftSaved: 0, published: 0 };
  const companyName = dbUser.company?.name || session.user.companyName || "Acme Technical Labs";

  if (dbUser.companyId) {
    try {
      const [fetchedJobs, fetchedApplications, fetchedAssessments, reviewRes, invRes] =
        await Promise.all([
            prisma.job.findMany({
              where: { companyId: dbUser.companyId },
              include: {
                _count: {
                  select: { applications: true },
                },
              },
              orderBy: { createdAt: "desc" },
            }),
            prisma.application.findMany({
              where: {
                job: { companyId: dbUser.companyId },
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
            }),
            prisma.assessment.findMany({
              where: {
                companyId: dbUser.companyId,
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
            }),
            getCompanySubmissionsForReview("ALL", session),
            getCompanyInvitations("ALL", session),
          ]);

        companyJobs = fetchedJobs as unknown as DatabaseJobItem[];
        companyApplications = fetchedApplications as unknown as RecruiterApplicantItem[];
        companyAssessments = fetchedAssessments as unknown as RecruiterAssessmentItem[];

        if (reviewRes.success) {
          reviewSubmissions = reviewRes.submissions;
          reviewCounts = reviewRes.counts;
        }

        if (invRes.success) {
          companyInvitations = invRes.invitations;
        }
      } catch (err) {
        console.error(
          "[Recruiter Dashboard]: Failed to fetch company jobs, applications, assessments, and reviews from database:",
          err
        );
      }
    }

  const publishedJobsCount = companyJobs.filter((j) => j.status === "PUBLISHED").length;
  const totalApplicantsCount = companyApplications.length;
  const pendingApplicationsCount = companyApplications.filter(
    (a) => a.status === "SUBMITTED" || a.status === "IN_REVIEW"
  ).length;
  const shortlistedCount = companyApplications.filter((a) => a.status === "SHORTLISTED").length;

  const realMetrics: RealRecruiterMetrics = {
    companyName,
    publishedJobsCount,
    totalApplicantsCount,
    pendingApplicationsCount,
    shortlistedCount,
    assessmentsCount: companyAssessments.length,
    awaitingReviewCount: reviewCounts.awaitingReview,
    completedReviewsCount: reviewCounts.published,
  };

  return (
    <DashboardLayout
      role="recruiter"
      title="Recruiter Management Suite"
      subtitle="Talent pipeline, manual coding reviews, and active technical job postings"
      user={session.user}
      actionButton={{
        label: "Post Opening",
        href: "#jobs",
      }}
    >
      {/* Section 1: Real Database-Backed Hiring Overview Metrics */}
      <HiringOverviewMetrics metrics={realMetrics} />

      {/* Section 2: Technical Assessment Manual Review Management (Phase 5) */}
      <RecruiterManualReviewManagement
        initialSubmissions={reviewSubmissions}
        initialCounts={reviewCounts}
      />

      {/* Section 3: Real Database-Backed Job Postings Management */}
      <RecruiterJobManagement
        initialJobs={companyJobs}
        companyName={companyName}
      />

      {/* Section 4: Candidate Applications & Assessment Invitations */}
      <RecruiterApplicantManagement
        initialApplications={companyApplications}
        companyJobs={companyJobs.map((j) => ({ id: j.id, title: j.title }))}
        companyAssessments={companyAssessments}
        initialInvitations={companyInvitations}
      />

      {/* Section 5: Technical Assessment Library & Creator */}
      <RecruiterAssessmentManagement
        initialAssessments={companyAssessments}
        companyJobs={companyJobs.map((j) => ({ id: j.id, title: j.title }))}
      />
    </DashboardLayout>
  );
}
