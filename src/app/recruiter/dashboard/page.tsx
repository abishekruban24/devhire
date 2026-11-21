import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MockDataBanner } from "@/components/ui/mock-banner";
import { HiringOverviewMetrics } from "@/features/recruiter/components/hiring-overview-metrics";
import { RecruiterJobManagement, type DatabaseJobItem } from "@/features/recruiter/components/recruiter-job-management";
import { CandidateApplicationsPreview } from "@/features/recruiter/components/candidate-applications-preview";
import { AssessmentStatisticsPreview } from "@/features/recruiter/components/assessment-statistics-preview";
import {
  MOCK_RECRUITER_COMPANY,
  MOCK_RECRUITER_APPLICATIONS,
} from "@/features/recruiter/data/mock-recruiter";

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

  // 3. Fetch real recruiter user, company profile, and company jobs from Neon PostgreSQL
  let companyJobs: DatabaseJobItem[] = [];
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
        const fetchedJobs = await prisma.job.findMany({
          where: { companyId: dbUser.companyId },
          include: {
            _count: {
              select: { applications: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        companyJobs = fetchedJobs as unknown as DatabaseJobItem[];
      }
    } catch (err) {
      console.error("[Recruiter Dashboard]: Failed to fetch company jobs from database:", err);
    }
  }

  const activeRolesCount = companyJobs.filter((j) => j.status === "PUBLISHED").length;
  const totalApplicantsCount = companyJobs.reduce(
    (acc, j) => acc + (j._count?.applications || 0),
    0
  );

  // Personalize company overview with authenticated recruiter company name and real metrics
  const personalizedCompany = {
    ...MOCK_RECRUITER_COMPANY,
    name: companyName,
    openRolesCount: companyJobs.length > 0 ? activeRolesCount : MOCK_RECRUITER_COMPANY.openRolesCount,
    totalApplicants:
      totalApplicantsCount > 0 ? totalApplicantsCount : MOCK_RECRUITER_COMPANY.totalApplicants,
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

      {/* Section 3: Candidate Applications Pipeline */}
      <CandidateApplicationsPreview applications={MOCK_RECRUITER_APPLICATIONS} />

      {/* Section 4: Assessment Statistics & Domain Pass Rates */}
      <AssessmentStatisticsPreview />
    </DashboardLayout>
  );
}
