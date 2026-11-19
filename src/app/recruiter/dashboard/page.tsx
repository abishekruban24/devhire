import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MockDataBanner } from "@/components/ui/mock-banner";
import { HiringOverviewMetrics } from "@/features/recruiter/components/hiring-overview-metrics";
import { ActiveJobPostingsPreview } from "@/features/recruiter/components/active-job-postings-preview";
import { CandidateApplicationsPreview } from "@/features/recruiter/components/candidate-applications-preview";
import { AssessmentStatisticsPreview } from "@/features/recruiter/components/assessment-statistics-preview";
import {
  MOCK_RECRUITER_COMPANY,
  MOCK_RECRUITER_JOBS,
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

  // Personalize company overview with authenticated recruiter company name
  const personalizedCompany = {
    ...MOCK_RECRUITER_COMPANY,
    name: session.user.companyName || MOCK_RECRUITER_COMPANY.name,
  };

  return (
    <DashboardLayout
      role="recruiter"
      title="Recruiter Management Suite"
      subtitle="Talent pipeline, coding evaluation benchmarks, and active job postings"
      user={session.user}
      actionButton={{
        label: "Create Assessment",
        href: "#assessments",
      }}
    >
      {/* Mock Notice */}
      <MockDataBanner role="Recruiter" />

      {/* Section 1: Hiring Overview Metrics */}
      <HiringOverviewMetrics overview={personalizedCompany} />

      {/* Section 2: Active Job Postings */}
      <ActiveJobPostingsPreview jobs={MOCK_RECRUITER_JOBS} />

      {/* Section 3: Candidate Applications Pipeline */}
      <CandidateApplicationsPreview applications={MOCK_RECRUITER_APPLICATIONS} />

      {/* Section 4: Assessment Statistics & Domain Pass Rates */}
      <AssessmentStatisticsPreview />
    </DashboardLayout>
  );
}
