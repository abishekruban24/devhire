import React from "react";
import { Metadata } from "next";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MockDataBanner } from "@/components/ui/mock-banner";
import { ProfileOverviewCard } from "@/features/candidate/components/profile-overview-card";
import { AvailableJobsPreview } from "@/features/candidate/components/available-jobs-preview";
import { UpcomingAssessmentsPreview } from "@/features/candidate/components/upcoming-assessments-preview";
import { ApplicationStatusPreview } from "@/features/candidate/components/application-status-preview";
import {
  MOCK_CANDIDATE_PROFILE,
  MOCK_CANDIDATE_APPLICATIONS,
} from "@/features/candidate/data/mock-candidate";
import { MOCK_JOBS } from "@/features/jobs/data/mock-jobs";
import { MOCK_ASSESSMENTS } from "@/features/assessments/data/mock-assessments";

export const metadata: Metadata = {
  title: "Candidate Dashboard | DevHire",
  description:
    "Candidate dashboard with verified skill profile, technical assessment schedule, and active applications.",
};

export default function CandidateDashboardPage() {
  return (
    <DashboardLayout
      role="candidate"
      title="Candidate Engineering Hub"
      subtitle="Skill verification, active applications, and upcoming coding challenges"
      actionButton={{
        label: "Explore Open Roles",
        href: "#jobs",
      }}
    >
      {/* Explicit Mock Data Notice */}
      <MockDataBanner role="Candidate" />

      {/* Section 1: Candidate Profile Overview */}
      <ProfileOverviewCard profile={MOCK_CANDIDATE_PROFILE} />

      {/* Section 2: Technical Assessments Preview */}
      <UpcomingAssessmentsPreview assessments={MOCK_ASSESSMENTS} />

      {/* Section 3: Applications Status Preview */}
      <ApplicationStatusPreview applications={MOCK_CANDIDATE_APPLICATIONS} />

      {/* Section 4: Available Jobs Preview */}
      <AvailableJobsPreview jobs={MOCK_JOBS} />
    </DashboardLayout>
  );
}
