import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

export const instant = false;

export default async function CandidateDashboardPage() {
  const session = await auth();

  // 1. Require authenticated session
  if (!session?.user) {
    redirect("/login?callbackUrl=/candidate/dashboard");
  }

  // 2. Enforce role separation: Recruiters redirected to recruiter suite
  if (session.user.role === "RECRUITER") {
    redirect("/recruiter/dashboard");
  }

  // Personalize candidate profile with authenticated session details
  const personalizedProfile = {
    ...MOCK_CANDIDATE_PROFILE,
    name: session.user.name || MOCK_CANDIDATE_PROFILE.name,
    email: session.user.email || MOCK_CANDIDATE_PROFILE.email,
  };

  return (
    <DashboardLayout
      role="candidate"
      title="Candidate Engineering Hub"
      subtitle="Skill verification, active applications, and upcoming coding challenges"
      user={session.user}
      actionButton={{
        label: "Explore Open Roles",
        href: "#jobs",
      }}
    >
      {/* Explicit Mock Data Notice */}
      <MockDataBanner role="Candidate" />

      {/* Section 1: Candidate Profile Overview */}
      <ProfileOverviewCard profile={personalizedProfile} />

      {/* Section 2: Technical Assessments Preview */}
      <UpcomingAssessmentsPreview assessments={MOCK_ASSESSMENTS} />

      {/* Section 3: Applications Status Preview */}
      <ApplicationStatusPreview applications={MOCK_CANDIDATE_APPLICATIONS} />

      {/* Section 4: Available Jobs Preview */}
      <AvailableJobsPreview jobs={MOCK_JOBS} />
    </DashboardLayout>
  );
}
