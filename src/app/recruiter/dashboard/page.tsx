import React from "react";
import { Metadata } from "next";
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

export default function RecruiterDashboardPage() {
  return (
    <DashboardLayout
      role="recruiter"
      title="Recruiter Management Suite"
      subtitle="Talent pipeline, coding evaluation benchmarks, and active job postings"
      actionButton={{
        label: "Create Assessment",
        href: "#assessments",
      }}
    >
      {/* Mock Notice */}
      <MockDataBanner role="Recruiter" />

      {/* Section 1: Hiring Overview Metrics */}
      <HiringOverviewMetrics overview={MOCK_RECRUITER_COMPANY} />

      {/* Section 2: Active Job Postings */}
      <ActiveJobPostingsPreview jobs={MOCK_RECRUITER_JOBS} />

      {/* Section 3: Candidate Applications Pipeline */}
      <CandidateApplicationsPreview applications={MOCK_RECRUITER_APPLICATIONS} />

      {/* Section 4: Assessment Statistics & Domain Pass Rates */}
      <AssessmentStatisticsPreview />
    </DashboardLayout>
  );
}
