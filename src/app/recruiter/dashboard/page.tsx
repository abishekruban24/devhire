import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MockDataBanner } from "@/components/ui/mock-banner";
import { HiringOverviewMetrics } from "@/features/recruiter/components/hiring-overview-metrics";
import { RecruiterJobManagement, type DatabaseJobItem } from "@/features/recruiter/components/recruiter-job-management";
import { RecruiterApplicantManagement } from "@/features/recruiter/components/recruiter-applicant-management";
import { RecruiterAssessmentManagement } from "@/features/recruiter/components/recruiter-assessment-management";
import { AssessmentStatisticsPreview } from "@/features/recruiter/components/assessment-statistics-preview";
import { MOCK_RECRUITER_COMPANY } from "@/features/recruiter/data/mock-recruiter";
import type { RecruiterApplicantItem } from "@/features/applications/actions/application-actions";
import type { RecruiterAssessmentItem } from "@/features/assessments/actions/assessment-actions";

export const metadata: Metadata = {
  title: "Recruiter Dashboard | DevHire",
  description:
    "Recruiter management console with hiring metrics, job postings preview, candidate pipeline, and assessment analytics.",
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
  if (!session?.user) {
    redirect("/login?callbackUrl=/recruiter/dashboard");
  }

  // 2. Enforce role separation: Candidates redirected to candidate hub
  if (session.user.role === "CANDIDATE") {
    redirect("/candidate/dashboard");
  }

  // 3. Fetch real recruiter user, company profile, jobs, applications, and assessments from Neon PostgreSQL
  let companyJobs: DatabaseJobItem[] = [];
  let companyApplications: RecruiterApplicantItem[] = [];
  let companyAssessments: RecruiterAssessmentItem[] = [];
  let companyName = session.user.companyName || MOCK_RECRUITER_COMPANY.name;

  if (session.user.id) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          companyId: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      });

      if (dbUser?.company?.name) {
        companyName = dbUser.company.name;
      }

      if (dbUser?.companyId) {
        const [fetchedJobs, fetchedApplications, fetchedAssessments] = await Promise.all([
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
        ]);

        companyJobs = fetchedJobs as unknown as DatabaseJobItem[];
        companyApplications = fetchedApplications as unknown as RecruiterApplicantItem[];
        companyAssessments = fetchedAssessments as unknown as RecruiterAssessmentItem[];
      }
    } catch (err) {
      console.error("[Recruiter Dashboard]: Failed to fetch company jobs, applications, and assessments from database:", err);
    }
  }

  const activeRolesCount = companyJobs.filter((j) => j.status === "PUBLISHED").length;
  const totalApplicantsCount = companyApplications.length;
  const shortlistedCount = companyApplications.filter((a) => a.status === "SHORTLISTED").length;
  const shortlistRate =
    totalApplicantsCount > 0
      ? Math.round((shortlistedCount / totalApplicantsCount) * 100)
      : MOCK_RECRUITER_COMPANY.shortlistRate;

  // Personalize company overview with authenticated recruiter company name and real metrics
  const personalizedCompany = {
    ...MOCK_RECRUITER_COMPANY,
    name: companyName,
    openRolesCount: companyJobs.length > 0 ? activeRolesCount : MOCK_RECRUITER_COMPANY.openRolesCount,
    totalApplicants:
      totalApplicantsCount > 0 ? totalApplicantsCount : MOCK_RECRUITER_COMPANY.totalApplicants,
    shortlistRate,
  };

  return (
    <DashboardLayout
      role="recruiter"
      title="Recruiter Management Suite"
      subtitle="Talent pipeline, coding evaluation benchmarks, and active job postings"
      user={session.user}
      actionButton={{
        label: "Post Opening",
        href: "#jobs",
      }}
    >
      {/* Mock Notice */}
      <MockDataBanner role="Recruiter" />

      {/* Section 1: Hiring Overview Metrics */}
      <HiringOverviewMetrics overview={personalizedCompany} />

      {/* Section 2: Real Database-Backed Job Postings Management */}
      <RecruiterJobManagement
        initialJobs={companyJobs}
        companyName={companyName}
      />

      {/* Section 3: Candidate Applications Management (Phase 3C - Real Neon PostgreSQL Data) */}
      <RecruiterApplicantManagement
        initialApplications={companyApplications}
        companyJobs={companyJobs.map((j) => ({ id: j.id, title: j.title }))}
      />

      {/* Section 4: Technical Assessment Library & Creator (Phase 4A - Real Neon PostgreSQL Data) */}
      <RecruiterAssessmentManagement
        initialAssessments={companyAssessments}
        companyJobs={companyJobs.map((j) => ({ id: j.id, title: j.title }))}
      />

      {/* Section 5: Assessment Statistics & Domain Pass Rates */}
      <AssessmentStatisticsPreview />
    </DashboardLayout>
  );
}
