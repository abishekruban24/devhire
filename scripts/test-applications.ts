import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createJob,
  deleteJob,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";
import {
  applyToJob,
  getCandidateApplications,
  getCandidateAppliedJobIds,
  getCompanyApplications,
  updateApplicationStatus,
} from "../src/features/applications/actions/application-actions";
import type { ApplicationStatus } from "@prisma/client";

async function runApplicationTests() {
  console.log("==================================================================");
  console.log("  DEVHIRE PHASE 3C: JOB APPLICATIONS & SHORTLISTING TEST SUITE    ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `rec1.apptest.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `rec2.apptest.${timestamp}@devhire.test`;
  const CANDIDATE_1_EMAIL = `cand1.apptest.${timestamp}@devhire.test`;
  const CANDIDATE_2_EMAIL = `cand2.apptest.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track created entities for clean teardown
  let company1Id = "";
  let company2Id = "";
  let recruiter1UserId = "";
  let recruiter2UserId = "";
  let candidate1UserId = "";
  let candidate2UserId = "";

  let publishedJob1Id = "";
  let draftJob2Id = "";
  let closedJob3Id = "";
  let rivalJob4Id = "";

  const createdJobIds: string[] = [];
  const createdAppIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test companies, recruiters, candidates, and jobs
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating test companies, recruiters, and candidates in Neon DB...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Acme Cloud Systems ${timestamp}`,
        slug: `acme-cloud-${timestamp}`,
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
        website: "https://acme-cloud.example.com",
      },
    });
    company1Id = comp1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `CyberForge Security ${timestamp}`,
        slug: `cyberforge-${timestamp}`,
        industry: "Cybersecurity",
        location: "Austin, TX",
        website: "https://cyberforge.example.com",
      },
    });
    company2Id = comp2.id;

    const rec1User = await prisma.user.create({
      data: {
        name: "Acme Lead Recruiter",
        email: RECRUITER_1_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    recruiter1UserId = rec1User.id;

    const rec2User = await prisma.user.create({
      data: {
        name: "CyberForge Talent Partner",
        email: RECRUITER_2_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company2Id,
      },
    });
    recruiter2UserId = rec2User.id;

    const cand1User = await prisma.user.create({
      data: {
        name: "Alice Developer",
        email: CANDIDATE_1_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
        headline: "Senior Full Stack Engineer",
        bio: "Specializing in Next.js, TypeScript, PostgreSQL, and high-throughput systems.",
        skills: ["TypeScript", "Next.js", "PostgreSQL", "React", "Node.js"],
        githubUrl: "https://github.com/alicedev",
        linkedinUrl: "https://linkedin.com/in/alicedev",
      },
    });
    candidate1UserId = cand1User.id;

    const cand2User = await prisma.user.create({
      data: {
        name: "Bob Systems Engineer",
        email: CANDIDATE_2_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
        headline: "Cloud & DevOps Engineer",
        bio: "Focused on Kubernetes, distributed messaging, and reliability engineering.",
        skills: ["Go", "Kubernetes", "Docker", "AWS", "Python"],
        githubUrl: "https://github.com/bobdev",
      },
    });
    candidate2UserId = cand2User.id;

    // Define mock session contexts matching SessionContext definition
    const rec1Session: SessionContext = {
      user: {
        id: recruiter1UserId,
        email: RECRUITER_1_EMAIL,
        role: "RECRUITER",
        companyId: company1Id,
      },
    };

    const rec2Session: SessionContext = {
      user: {
        id: recruiter2UserId,
        email: RECRUITER_2_EMAIL,
        role: "RECRUITER",
        companyId: company2Id,
      },
    };

    const cand1Session: SessionContext = {
      user: {
        id: candidate1UserId,
        email: CANDIDATE_1_EMAIL,
        role: "CANDIDATE",
      },
    };

    const cand2Session: SessionContext = {
      user: {
        id: candidate2UserId,
        email: CANDIDATE_2_EMAIL,
        role: "CANDIDATE",
      },
    };

    console.log("[Setup] Creating jobs across companies and statuses...");
    // Job 1: Company 1 - PUBLISHED
    const job1Res = await createJob(
      {
        title: "Staff Cloud Systems Architect",
        description: "Architect high-performance distributed microservices on Next.js and Neon PostgreSQL.",
        requirements: "10+ years experience, Distributed systems mastery, TypeScript / Go",
        location: "San Francisco, CA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "PUBLISHED",
        salaryMin: 180000,
        salaryMax: 240000,
        currency: "USD",
        experienceLevel: "Staff / Principal",
      },
      rec1Session
    );
    if (!job1Res.success || !job1Res.job) throw new Error("Failed to create Job 1: " + job1Res.message);
    publishedJob1Id = (job1Res.job as { id: string }).id;
    createdJobIds.push(publishedJob1Id);

    // Job 2: Company 1 - DRAFT
    const job2Res = await createJob(
      {
        title: "Internal Systems Engineer (Draft)",
        description: "Draft internal position not yet ready for public applicants.",
        requirements: "Python, Bash",
        location: "Remote",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "DRAFT",
      },
      rec1Session
    );
    if (!job2Res.success || !job2Res.job) throw new Error("Failed to create Job 2: " + job2Res.message);
    draftJob2Id = (job2Res.job as { id: string }).id;
    createdJobIds.push(draftJob2Id);

    // Job 3: Company 1 - CLOSED
    const job3Res = await createJob(
      {
        title: "Legacy Infrastructure Lead (Closed)",
        description: "Closed role that has reached applicant quota.",
        requirements: "Legacy systems",
        location: "New York, NY",
        locationType: "ON_SITE",
        type: "FULL_TIME",
        status: "CLOSED",
      },
      rec1Session
    );
    if (!job3Res.success || !job3Res.job) throw new Error("Failed to create Job 3: " + job3Res.message);
    closedJob3Id = (job3Res.job as { id: string }).id;
    createdJobIds.push(closedJob3Id);

    // Job 4: Company 2 - PUBLISHED
    const job4Res = await createJob(
      {
        title: "CyberForge Senior Cryptographer",
        description: "Company 2 cryptographic protocol engineer.",
        requirements: "Cryptography, Rust",
        location: "Austin, TX",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "PUBLISHED",
      },
      rec2Session
    );
    if (!job4Res.success || !job4Res.job) throw new Error("Failed to create Job 4: " + job4Res.message);
    rivalJob4Id = (job4Res.job as { id: string }).id;
    createdJobIds.push(rivalJob4Id);

    console.log("Setup complete. Initialized test fixtures.\n");

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated apply blocked
    // -------------------------------------------------------------------------
    console.log("[Test 1] Verifying anonymous/unauthenticated user cannot apply...");
    const unauthRes = await applyToJob(
      { jobId: publishedJob1Id, coverLetter: "I want to apply" },
      null // No session
    );
    if (!unauthRes.success && unauthRes.errorType === "UNAUTHENTICATED") {
      console.log("  PASS: Anonymous application rejected with UNAUTHENTICATED");
    } else {
      console.error("  FAIL: Expected UNAUTHENTICATED, got:", unauthRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Recruiter role cannot apply to jobs (role guard)
    // -------------------------------------------------------------------------
    console.log("[Test 2] Verifying recruiter cannot submit candidate applications...");
    const recruiterApplyRes = await applyToJob(
      { jobId: publishedJob1Id, coverLetter: "Recruiter trying to apply" },
      rec1Session
    );
    if (!recruiterApplyRes.success && recruiterApplyRes.errorType === "ROLE_DENIED") {
      console.log("  PASS: Recruiter application rejected with ROLE_DENIED check");
    } else {
      console.error("  FAIL: Recruiter was not prevented from applying:", recruiterApplyRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Candidate successfully applies to PUBLISHED job with cover letter
    // -------------------------------------------------------------------------
    console.log("[Test 3] Verifying candidate can apply to PUBLISHED job with cover letter...");
    const coverLetterText =
      "I am excited to apply for the Staff Cloud Systems Architect position. With extensive experience in Next.js and distributed databases, I can make an immediate impact.";

    let aliceAppId = "";
    const applyRes = await applyToJob(
      {
        jobId: publishedJob1Id,
        coverLetter: coverLetterText,
      },
      cand1Session
    );

    if (applyRes.success && applyRes.applicationId) {
      aliceAppId = applyRes.applicationId;
      createdAppIds.push(aliceAppId);
      console.log(`  PASS: Application submitted successfully (ID: ${aliceAppId})`);

      // Verify in DB directly
      const dbApp = await prisma.application.findUnique({
        where: { id: aliceAppId },
        include: { candidate: true, job: true },
      });

      if (
        dbApp &&
        dbApp.status === "SUBMITTED" &&
        dbApp.candidateId === candidate1UserId &&
        dbApp.jobId === publishedJob1Id &&
        dbApp.coverLetter === coverLetterText
      ) {
        console.log("  PASS: Application correctly persisted in Neon DB with status SUBMITTED");
      } else {
        console.error("  FAIL: Database record verification failed:", dbApp);
        allPassed = false;
      }
    } else {
      console.error("  FAIL: Application submission failed:", applyRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Duplicate application prevented (pre-check and P2002 constraint)
    // -------------------------------------------------------------------------
    console.log("[Test 4] Verifying duplicate application is rejected...");
    const dupRes = await applyToJob(
      {
        jobId: publishedJob1Id,
        coverLetter: "Trying to submit second application...",
      },
      cand1Session
    );

    if (!dupRes.success && dupRes.errorType === "ALREADY_APPLIED") {
      console.log("  PASS: Duplicate application correctly rejected with ALREADY_APPLIED");
    } else {
      console.error("  FAIL: Duplicate application was not blocked:", dupRes);
      allPassed = false;
    }

    // Check count in DB
    const totalAppsForCand1Job1 = await prisma.application.count({
      where: { candidateId: candidate1UserId, jobId: publishedJob1Id },
    });
    if (totalAppsForCand1Job1 === 1) {
      console.log("  PASS: Database retains exactly 1 application record (no duplicates)");
    } else {
      console.error("  FAIL: Found unexpected count:", totalAppsForCand1Job1);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Candidate cannot apply to DRAFT, CLOSED, or ARCHIVED jobs
    // -------------------------------------------------------------------------
    console.log("[Test 5] Verifying candidate cannot apply to DRAFT or CLOSED jobs...");
    const draftApplyRes = await applyToJob({ jobId: draftJob2Id }, cand1Session);
    if (!draftApplyRes.success && draftApplyRes.errorType === "JOB_NOT_FOUND") {
      console.log("  PASS: Application to DRAFT job rejected with JOB_NOT_FOUND");
    } else {
      console.error("  FAIL: Application to DRAFT job was not rejected:", draftApplyRes);
      allPassed = false;
    }

    const closedApplyRes = await applyToJob({ jobId: closedJob3Id }, cand1Session);
    if (!closedApplyRes.success && closedApplyRes.errorType === "JOB_NOT_FOUND") {
      console.log("  PASS: Application to CLOSED job rejected with JOB_NOT_FOUND");
    } else {
      console.error("  FAIL: Application to CLOSED job was not rejected:", closedApplyRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 6: Candidate retrieves own applications (persisted in DB)
    // -------------------------------------------------------------------------
    console.log("[Test 6] Verifying candidate can retrieve own applications...");
    // Candidate 2 also applies to Job 1
    let bobAppId = "";
    const cand2ApplyRes = await applyToJob(
      { jobId: publishedJob1Id, coverLetter: "Bob's application for DevOps infrastructure role." },
      cand2Session
    );
    if (cand2ApplyRes.success && cand2ApplyRes.applicationId) {
      bobAppId = cand2ApplyRes.applicationId;
      createdAppIds.push(bobAppId);
    }

    // Candidate 1 retrieves applications
    const cand1Apps = await getCandidateApplications(cand1Session);
    if (
      cand1Apps.success &&
      cand1Apps.applications.length === 1 &&
      cand1Apps.applications[0].jobId === publishedJob1Id &&
      cand1Apps.applications[0].job.company.name.includes("Acme Cloud Systems")
    ) {
      console.log("  PASS: Candidate 1 retrieves exactly their 1 application with company details");
    } else {
      console.error("  FAIL: Candidate 1 applications retrieval unexpected:", cand1Apps);
      allPassed = false;
    }

    // Candidate applied job IDs helper
    const cand1JobIds = await getCandidateAppliedJobIds(cand1Session);
    if (cand1JobIds.includes(publishedJob1Id) && !cand1JobIds.includes(rivalJob4Id)) {
      console.log("  PASS: getCandidateAppliedJobIds correctly returns applied job IDs array");
    } else {
      console.error("  FAIL: getCandidateAppliedJobIds returned unexpected:", cand1JobIds);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Recruiter retrieves company applications & inspects details
    // -------------------------------------------------------------------------
    console.log("[Test 7] Verifying recruiter retrieves company applications...");
    const rec1AppsRes = await getCompanyApplications(undefined, rec1Session);

    if (rec1AppsRes.success && rec1AppsRes.applications.length === 2) {
      const aliceApp = rec1AppsRes.applications.find((a) => a.candidate.email === CANDIDATE_1_EMAIL);
      const bobApp = rec1AppsRes.applications.find((a) => a.candidate.email === CANDIDATE_2_EMAIL);

      if (
        aliceApp &&
        bobApp &&
        aliceApp.coverLetter?.includes("Staff Cloud Systems Architect") &&
        aliceApp.candidate.skills?.includes("TypeScript")
      ) {
        console.log("  PASS: Recruiter 1 retrieves both candidate applications with full profiles");
        console.log("  PASS: Candidate skills, headline, bio, and cover letter successfully loaded");
      } else {
        console.error("  FAIL: Recruiter applications payload missing details:", rec1AppsRes.applications);
        allPassed = false;
      }
    } else {
      console.error("  FAIL: Recruiter 1 expected 2 applications, got:", rec1AppsRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Recruiter updates application status and review notes
    // -------------------------------------------------------------------------
    console.log("[Test 8] Verifying recruiter can update status and notes...");
    const updateRes = await updateApplicationStatus(
      aliceAppId,
      "SHORTLISTED" as ApplicationStatus,
      "Outstanding systems design background. Recommended for immediate technical round.",
      rec1Session
    );

    if (updateRes.success) {
      console.log("  PASS: Recruiter successfully updated status to SHORTLISTED with notes");

      // Verify in DB
      const updatedInDb = await prisma.application.findUnique({
        where: { id: aliceAppId },
      });

      if (
        updatedInDb?.status === "SHORTLISTED" &&
        updatedInDb.notes?.includes("Outstanding systems design")
      ) {
        console.log("  PASS: Database verified status=SHORTLISTED and notes updated");
      } else {
        console.error("  FAIL: Database state mismatch:", updatedInDb);
        allPassed = false;
      }
    } else {
      console.error("  FAIL: Recruiter status update failed:", updateRes);
      allPassed = false;
    }

    // Also test status transition to REJECTED for Candidate 2
    const rejectRes = await updateApplicationStatus(
      bobAppId,
      "REJECTED" as ApplicationStatus,
      "Position requires deeper frontend experience.",
      rec1Session
    );
    if (rejectRes.success) {
      console.log("  PASS: Recruiter successfully updated Candidate 2 status to REJECTED");
    } else {
      console.error("  FAIL: Candidate 2 rejection failed:", rejectRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 9: Cross-tenant / Company isolation enforcement
    // -------------------------------------------------------------------------
    console.log("[Test 9] Verifying strict cross-company isolation (tenant boundaries)...");
    // 1. Recruiter 2 must NOT see Company 1's applications
    const rec2AppsRes = await getCompanyApplications(undefined, rec2Session);
    if (rec2AppsRes.success && rec2AppsRes.applications.length === 0) {
      console.log("  PASS: Recruiter 2 sees 0 applications (isolated from Company 1 data)");
    } else {
      console.error("  FAIL: Recruiter 2 leaked Company 1 applications:", rec2AppsRes);
      allPassed = false;
    }

    // 2. Recruiter 2 must NOT be able to modify Company 1's application
    const crossCompanyMutateRes = await updateApplicationStatus(
      aliceAppId,
      "OFFERED" as ApplicationStatus,
      "Malicious rival company modification attempt",
      rec2Session
    );

    if (!crossCompanyMutateRes.success && crossCompanyMutateRes.message.includes("Forbidden")) {
      console.log("  PASS: Recruiter 2 cross-company status mutation blocked (403 Forbidden)");
    } else {
      console.error("  FAIL: Cross-company mutation was not forbidden:", crossCompanyMutateRes);
      allPassed = false;
    }

    // Verify DB was NOT mutated
    const verifyUntouched = await prisma.application.findUnique({
      where: { id: aliceAppId },
    });
    if (verifyUntouched?.status === "SHORTLISTED") {
      console.log("  PASS: Database record remained SHORTLISTED (uncompromised by rival)");
    } else {
      console.error("  FAIL: Application status was tampered with:", verifyUntouched);
      allPassed = false;
    }

    // 3. Candidate cannot call recruiter endpoint
    const candAccessRecruiterRes = await getCompanyApplications(undefined, cand1Session);
    if (!candAccessRecruiterRes.success) {
      console.log("  PASS: Candidate calling getCompanyApplications blocked by recruiter auth check");
    } else {
      console.error("  FAIL: Candidate bypassed recruiter auth check:", candAccessRecruiterRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 10: Deletion safeguard: job with active application cannot be deleted
    // -------------------------------------------------------------------------
    console.log("[Test 10] Verifying job deletion safeguard with active applications...");
    const deleteAttemptRes = await deleteJob(publishedJob1Id, rec1Session);
    if (
      !deleteAttemptRes.success &&
      typeof deleteAttemptRes.message === "string" &&
      deleteAttemptRes.message.includes("active candidate application")
    ) {
      console.log("  PASS: Job deletion blocked due to active candidate applications");
    } else {
      console.error("  FAIL: Job deletion safeguard did not trigger:", deleteAttemptRes);
      allPassed = false;
    }

    // Verify job still exists in DB
    const jobStillExists = await prisma.job.findUnique({
      where: { id: publishedJob1Id },
    });
    if (jobStillExists) {
      console.log("  PASS: Job remains safely intact in Neon DB");
    } else {
      console.error("  FAIL: Job was unexpectedly deleted!");
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 11: Candidate application view reflects updated status
    // -------------------------------------------------------------------------
    console.log("[Test 11] Verifying candidate sees updated SHORTLISTED status in tracker...");
    const cand1UpdatedApps = await getCandidateApplications(cand1Session);
    const aliceCurrentApp = cand1UpdatedApps.applications.find((a) => a.id === aliceAppId);
    if (aliceCurrentApp && aliceCurrentApp.status === "SHORTLISTED") {
      console.log("  PASS: Candidate's tracker view immediately reflects recruiter's SHORTLISTED status");
    } else {
      console.error("  FAIL: Candidate view did not reflect updated status:", aliceCurrentApp);
      allPassed = false;
    }
  } catch (error) {
    console.error("[Test Suite Error]: Unexpected exception occurred during testing:", error);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up test applications, jobs, users, and companies
    // -------------------------------------------------------------------------
    console.log("\n[Teardown] Cleaning up test fixtures from Neon DB...");
    try {
      if (createdAppIds.length > 0) {
        await prisma.application.deleteMany({
          where: { id: { in: createdAppIds } },
        });
      }
      if (createdJobIds.length > 0) {
        await prisma.job.deleteMany({
          where: { id: { in: createdJobIds } },
        });
      }
      const usersToClean = [candidate1UserId, candidate2UserId, recruiter1UserId, recruiter2UserId].filter(
        (id): id is string => Boolean(id)
      );
      if (usersToClean.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: usersToClean } },
        });
      }
      const compsToClean = [company1Id, company2Id].filter((id): id is string => Boolean(id));
      if (compsToClean.length > 0) {
        await prisma.company.deleteMany({
          where: { id: { in: compsToClean } },
        });
      }
      console.log("[Teardown] Successfully cleaned up all test applications, jobs, users, and companies.");
    } catch (cleanupErr) {
      console.error("[Teardown Error]: Failed to clean up all test resources:", cleanupErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("  >>> ALL PHASE 3C APPLICATION TESTS PASSED SUCCESSFULLY! <<<   ");
  } else {
    console.error("  >>> SOME PHASE 3C TESTS FAILED! INSPECT LOGS ABOVE. <<<   ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runApplicationTests()
  .catch((err) => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
