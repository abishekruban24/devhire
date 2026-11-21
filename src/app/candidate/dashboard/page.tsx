import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MockDataBanner } from "@/components/ui/mock-banner";
import { ProfileOverviewCard } from "@/features/candidate/components/profile-overview-card";
import { CandidateJobDiscovery } from "@/features/candidate/components/candidate-job-discovery";
import { UpcomingAssessmentsPreview } from "@/features/candidate/components/upcoming-assessments-preview";
import { CandidateApplicationsTracker } from "@/features/candidate/components/candidate-applications-tracker";
import { MOCK_CANDIDATE_PROFILE } from "@/features/candidate/data/mock-candidate";
import type { PublishedJobItem } from "@/features/jobs/actions/job-actions";
import {
  getCandidateApplications,
  type CandidateApplicationItem,
} from "@/features/applications/actions/application-actions";
import {
  getCandidateInvitations,
  type CandidateInvitationItem,
} from "@/features/assessments/actions/invitation-actions";

export const metadata: Metadata = {
  title: "Candidate Dashboard | DevHire",
  description:
    "Candidate dashboard with verified skill profile, technical assessment schedule, and active applications.",
};

export const instant = false;

export default async function CandidateDashboardPage() {
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
      "[Candidate Dashboard Security]: Session retrieval failed, redirecting to login:",
      error instanceof Error ? error.message : "Unknown error"
    );
    redirect("/login?callbackUrl=/candidate/dashboard&error=SessionError");
  }

  // 1. Require authenticated session
  if (!session?.user) {
    redirect("/login?callbackUrl=/candidate/dashboard");
  }

  // 2. Enforce role separation: Recruiters redirected to recruiter suite
  if (session.user.role === "RECRUITER") {
    redirect("/recruiter/dashboard");
  }

  // 3. Fetch real published jobs from Neon PostgreSQL
  let initialPublishedJobs: PublishedJobItem[] = [];
  let totalPublishedCount = 0;

  try {
    const [fetchedJobs, count] = await Promise.all([
      prisma.job.findMany({
        where: {
          status: "PUBLISHED", // STRICT SECURITY: Only display PUBLISHED jobs to candidates
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          requirements: true,
          location: true,
          locationType: true,
          type: true,
          status: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          experienceLevel: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              location: true,
              industry: true,
              website: true,
              description: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: "desc" }, // Sort newest published jobs first
      }),
      prisma.job.count({
        where: { status: "PUBLISHED" },
      }),
    ]);

    initialPublishedJobs = fetchedJobs as unknown as PublishedJobItem[];
    totalPublishedCount = count;
  } catch (err) {
    console.error("[Candidate Dashboard]: Failed to fetch published jobs from database:", err);
  }

  // 4. Fetch candidate's real applications from Neon PostgreSQL
  let candidateApplications: CandidateApplicationItem[] = [];
  try {
    const appsResult = await getCandidateApplications(session);
    if (appsResult.success) {
      candidateApplications = appsResult.applications;
    }
  } catch (err) {
    console.error("[Candidate Dashboard]: Failed to fetch candidate applications:", err);
  }

  // 5. Fetch candidate's real assessment invitations from Neon PostgreSQL
  let candidateInvitations: CandidateInvitationItem[] = [];
  try {
    const invResult = await getCandidateInvitations(session);
    if (invResult.success) {
      candidateInvitations = invResult.invitations;
    }
  } catch (err) {
    console.error("[Candidate Dashboard]: Failed to fetch candidate assessment invitations:", err);
  }

  const appliedJobIds = candidateApplications.map((app) => app.jobId);

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
      {/* Mock Notice */}
      <MockDataBanner role="Candidate" />

      {/* Section 1: Candidate Profile Overview */}
      <ProfileOverviewCard profile={personalizedProfile} />

      {/* Section 2: Technical Assessments & Verified Invitations (Phase 4B - Real Neon PostgreSQL Data) */}
      <UpcomingAssessmentsPreview initialInvitations={candidateInvitations} />

      {/* Section 3: Applications Status Tracker (Phase 3C - Real Neon PostgreSQL Data) */}
      <CandidateApplicationsTracker applications={candidateApplications} />

      {/* Section 4: Real Published Jobs Discovery (Phase 3B - Neon PostgreSQL) */}
      <CandidateJobDiscovery
        initialJobs={initialPublishedJobs}
        totalCount={totalPublishedCount}
        initialAppliedJobIds={appliedJobIds}
      />
    </DashboardLayout>
  );
}
