import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getCompanyJobs,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";

async function runRecruiterJobTests() {
  console.log("==================================================================");
  console.log("      DEVHIRE PHASE 3A: RECRUITER JOB MANAGEMENT TEST SUITE       ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `rec1.jobtest.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `rec2.jobtest.${timestamp}@devhire.test`;
  const CANDIDATE_EMAIL = `cand.jobtest.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track created entities for guaranteed teardown
  let company1Id = "";
  let company2Id = "";
  let user1Id = "";
  let user2Id = "";
  let candidateUserId = "";
  let createdJobId = "";

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test companies and users in Neon DB
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating test companies and users in Neon PostgreSQL...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Acme Cloud Labs ${timestamp}`,
        slug: `acme-cloud-${timestamp}`,
      },
    });
    company1Id = comp1.id;

    const user1 = await prisma.user.create({
      data: {
        name: "Primary Recruiter",
        email: RECRUITER_1_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    user1Id = user1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `Rival Tech Corp ${timestamp}`,
        slug: `rival-tech-${timestamp}`,
      },
    });
    company2Id = comp2.id;

    const user2 = await prisma.user.create({
      data: {
        name: "Rival Recruiter",
        email: RECRUITER_2_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company2Id,
      },
    });
    user2Id = user2.id;

    const candUser = await prisma.user.create({
      data: {
        name: "Candidate Test User",
        email: CANDIDATE_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    candidateUserId = candUser.id;

    console.log(`  ✓ Company 1 created: ${comp1.name} (ID: ${company1Id})`);
    console.log(`  ✓ Recruiter 1 created: ${user1.email} (Role: ${user1.role})`);
    console.log(`  ✓ Company 2 created: ${comp2.name} (ID: ${company2Id})`);
    console.log(`  ✓ Recruiter 2 created: ${user2.email} (Role: ${user2.role})`);
    console.log(`  ✓ Candidate created: ${candUser.email} (Role: ${candUser.role})\n`);

    const sessionUnauth: SessionContext = { user: null };
    const sessionCandidate: SessionContext = { user: { id: candidateUserId, role: "CANDIDATE", email: CANDIDATE_EMAIL } };
    const sessionRecruiter1: SessionContext = { user: { id: user1Id, role: "RECRUITER", email: RECRUITER_1_EMAIL, companyId: company1Id } };
    const sessionRecruiter2: SessionContext = { user: { id: user2Id, role: "RECRUITER", email: RECRUITER_2_EMAIL, companyId: company2Id } };

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated & Candidate Role Rejection
    // -------------------------------------------------------------------------
    console.log("[Test 1] Testing Security: Unauthenticated & Unauthorized Rejection...");
    const unauthRes = await createJob(
      {
        title: "Senior Cloud Architect",
        description: "Design cloud infrastructure systems",
        requirements: "Go, Kubernetes, AWS",
        location: "San Francisco, CA",
      },
      sessionUnauth
    );
    const unauthBlocked = !unauthRes.success && Boolean(unauthRes.message?.includes("Authentication required"));
    console.log(`  ✓ Unauthenticated createJob blocked: ${unauthBlocked} ("${unauthRes.message}")`);
    if (!unauthBlocked) allPassed = false;

    const candRes = await createJob(
      {
        title: "Senior Cloud Architect",
        description: "Design cloud infrastructure systems",
        requirements: "Go, Kubernetes, AWS",
        location: "San Francisco, CA",
      },
      sessionCandidate
    );
    const candBlocked = !candRes.success && Boolean(candRes.message?.includes("Only registered recruiters"));
    console.log(`  ✓ Candidate role createJob blocked: ${candBlocked} ("${candRes.message}")`);
    if (!candBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 2: Server-Side Input Validation
    // -------------------------------------------------------------------------
    console.log("[Test 2] Testing Server-Side Input Validation...");
    // 2A: Missing title & description
    const badRes1 = await createJob(
      {
        title: "A", // too short
        description: "short", // too short (<10 chars)
        requirements: "",
        location: "",
      },
      sessionRecruiter1
    );
    const badValidation1 =
      !badRes1.success &&
      Boolean(badRes1.errors?.title) &&
      Boolean(badRes1.errors?.description) &&
      Boolean(badRes1.errors?.location);
    console.log(`  ✓ Short/missing fields properly rejected: ${badValidation1}`);
    if (!badValidation1) allPassed = false;

    // 2B: Invalid salary range (salaryMin > salaryMax)
    const badRes2 = await createJob(
      {
        title: "Staff Distributed Systems Engineer",
        description: "Lead distributed systems development at scale",
        requirements: "Rust, Raft, Distributed DBs",
        location: "Remote",
        salaryMin: 200000,
        salaryMax: 150000, // Invalid: max < min
      },
      sessionRecruiter1
    );
    const badSalary = !badRes2.success && Boolean(badRes2.errors?.salaryMax);
    console.log(`  ✓ Inverted salary range (min > max) properly rejected: ${badSalary}`);
    if (!badSalary) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 3: Create Job with DRAFT Status
    // -------------------------------------------------------------------------
    console.log("[Test 3] Testing Create Job Opening as DRAFT...");
    const draftRes = await createJob(
      {
        title: "Senior Full-Stack Engineer",
        description: "Build robust full-stack features using Next.js 16, React 19, and Prisma 7.",
        requirements: "TypeScript, PostgreSQL, Next.js App Router, Tailwind CSS",
        location: "San Francisco, CA & Remote",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "DRAFT",
        salaryMin: 140000,
        salaryMax: 180000,
        currency: "USD",
        experienceLevel: "Senior (5+ yrs)",
      },
      sessionRecruiter1
    );

    if (!draftRes.success || !draftRes.job) {
      console.error("  ✗ Draft creation failed:", draftRes.message);
      allPassed = false;
    } else {
      createdJobId = draftRes.job.id as string;
      const dbJob = await prisma.job.findUnique({
        where: { id: createdJobId },
        include: { company: true },
      });

      const draftCorrect =
        dbJob !== null &&
        dbJob.status === "DRAFT" &&
        dbJob.companyId === company1Id &&
        dbJob.recruiterId === user1Id &&
        dbJob.salaryMin === 140000 &&
        dbJob.salaryMax === 180000 &&
        Boolean(dbJob.slug);

      console.log(`  ✓ Job created in DB: id=${dbJob?.id}, slug=${dbJob?.slug}`);
      console.log(`  ✓ Status is strictly DRAFT: ${dbJob?.status === "DRAFT"}`);
      console.log(`  ✓ Company ownership locked to Recruiter 1's company: ${dbJob?.companyId === company1Id}`);
      if (!draftCorrect) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 4: Publish Job (Status Transition DRAFT -> PUBLISHED)
    // -------------------------------------------------------------------------
    console.log("[Test 4] Testing Status Transition (DRAFT -> PUBLISHED)...");
    const pubRes = await updateJobStatus(createdJobId, "PUBLISHED", sessionRecruiter1);
    if (!pubRes.success) {
      console.error("  ✗ Failed to publish job:", pubRes.message);
      allPassed = false;
    } else {
      const dbPublished = await prisma.job.findUnique({ where: { id: createdJobId } });
      const isPublished = dbPublished?.status === "PUBLISHED";
      console.log(`  ✓ Job status updated to PUBLISHED: ${isPublished}`);
      if (!isPublished) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 5: Edit Existing Job Details
    // -------------------------------------------------------------------------
    console.log("[Test 5] Testing Editing Existing Job Details...");
    const editRes = await updateJob(
      createdJobId,
      {
        title: "Lead Full-Stack Architect",
        description: "Architect high-throughput web applications with Next.js 16 and microservices.",
        requirements: "TypeScript, PostgreSQL, Distributed Systems, Redis",
        location: "Global Remote",
        locationType: "REMOTE",
        type: "FULL_TIME",
        salaryMin: 160000,
        salaryMax: 210000,
        currency: "USD",
        experienceLevel: "Lead / Staff (8+ yrs)",
      },
      sessionRecruiter1
    );

    if (!editRes.success) {
      console.error("  ✗ Failed to update job:", editRes.message);
      allPassed = false;
    } else {
      const dbUpdated = await prisma.job.findUnique({ where: { id: createdJobId } });
      const editCorrect =
        dbUpdated?.title === "Lead Full-Stack Architect" &&
        dbUpdated?.location === "Global Remote" &&
        dbUpdated?.locationType === "REMOTE" &&
        dbUpdated?.salaryMin === 160000 &&
        dbUpdated?.salaryMax === 210000;
      console.log(`  ✓ Title updated: "${dbUpdated?.title}"`);
      console.log(`  ✓ Location updated: "${dbUpdated?.location}" (${dbUpdated?.locationType})`);
      console.log(`  ✓ Salary range updated: $${dbUpdated?.salaryMin} - $${dbUpdated?.salaryMax}`);
      if (!editCorrect) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 6: Close and Archive Workflow
    // -------------------------------------------------------------------------
    console.log("[Test 6] Testing Close and Archive Workflow...");
    // 6A: Close job
    const closeRes = await updateJobStatus(createdJobId, "CLOSED", sessionRecruiter1);
    const dbClosed = await prisma.job.findUnique({ where: { id: createdJobId } });
    console.log(`  ✓ Job transitioned to CLOSED: ${dbClosed?.status === "CLOSED"} (${closeRes.message})`);
    if (dbClosed?.status !== "CLOSED") allPassed = false;

    // 6B: Archive job
    const archiveRes = await updateJobStatus(createdJobId, "ARCHIVED", sessionRecruiter1);
    const dbArchived = await prisma.job.findUnique({ where: { id: createdJobId } });
    console.log(`  ✓ Job transitioned to ARCHIVED: ${dbArchived?.status === "ARCHIVED"} (${archiveRes.message})`);
    if (dbArchived?.status !== "ARCHIVED") allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 7: Cross-Company Ownership Restrictions (Rival Recruiter Attack)
    // -------------------------------------------------------------------------
    console.log("[Test 7] Testing Cross-Company Ownership Security (Rival Company Recruiter)...");
    // Rival tries to modify Recruiter 1's job
    const rivalEditRes = await updateJob(
      createdJobId,
      {
        title: "Hacked by Rival Corp",
        description: "Unauthorized description update",
        requirements: "None",
        location: "Dark Web",
      },
      sessionRecruiter2
    );
    const rivalEditBlocked =
      !rivalEditRes.success && Boolean(rivalEditRes.message?.includes("Forbidden"));
    console.log(`  ✓ Rival recruiter update attempt blocked: ${rivalEditBlocked} ("${rivalEditRes.message}")`);
    if (!rivalEditBlocked) allPassed = false;

    // Rival tries to change status on Recruiter 1's job
    const rivalStatusRes = await updateJobStatus(createdJobId, "PUBLISHED", sessionRecruiter2);
    const rivalStatusBlocked =
      !rivalStatusRes.success && Boolean(rivalStatusRes.message?.includes("Forbidden"));
    console.log(`  ✓ Rival recruiter status change blocked: ${rivalStatusBlocked} ("${rivalStatusRes.message}")`);
    if (!rivalStatusBlocked) allPassed = false;

    // Rival tries to delete Recruiter 1's job
    const rivalDeleteRes = await deleteJob(createdJobId, sessionRecruiter2);
    const rivalDeleteBlocked =
      !rivalDeleteRes.success && Boolean(rivalDeleteRes.message?.includes("Forbidden"));
    console.log(`  ✓ Rival recruiter delete attempt blocked: ${rivalDeleteBlocked} ("${rivalDeleteRes.message}")`);
    if (!rivalDeleteBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 8: Retrieve Company Jobs Query
    // -------------------------------------------------------------------------
    console.log("[Test 8] Testing Company Jobs Retrieval (Scoped to Recruiter's Company)...");
    const companyJobsRes = await getCompanyJobs(sessionRecruiter1);
    const hasJob = companyJobsRes.success && companyJobsRes.jobs.some((j: { id: string }) => j.id === createdJobId);
    console.log(`  ✓ Company 1 retrieves its own job: ${hasJob} (Total jobs: ${companyJobsRes.jobs.length})`);

    const rivalJobsRes = await getCompanyJobs(sessionRecruiter2);
    const rivalHasJob = rivalJobsRes.success && rivalJobsRes.jobs.some((j: { id: string }) => j.id === createdJobId);
    console.log(`  ✓ Rival company CANNOT see Company 1's job in their list: ${!rivalHasJob}`);
    if (!hasJob || rivalHasJob) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 9: Authorized Deletion of Job with 0 Applications
    // -------------------------------------------------------------------------
    console.log("[Test 9] Testing Authorized Job Deletion by Owner...");
    const ownerDeleteRes = await deleteJob(createdJobId, sessionRecruiter1);
    if (!ownerDeleteRes.success) {
      console.error("  ✗ Owner failed to delete job:", ownerDeleteRes.message);
      allPassed = false;
    } else {
      const dbAfterDelete = await prisma.job.findUnique({ where: { id: createdJobId } });
      const isDeleted = dbAfterDelete === null;
      console.log(`  ✓ Job permanently deleted from database: ${isDeleted}`);
      if (!isDeleted) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("[Cleanup] Removing all test recruiters, companies, and test data from Neon DB...");
    await prisma.job.deleteMany({
      where: { companyId: { in: [company1Id, company2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id, candidateUserId] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [company1Id, company2Id] } },
    });
    console.log("  ✓ Teardown complete. Zero test records remaining in Neon DB.");

    console.log("\n==================================================================");
    if (allPassed) {
      console.log("    ALL 9 RECRUITER JOB MANAGEMENT TESTS PASSED SUCCESSFULLY!    ");
    } else {
      console.log("    ONE OR MORE TESTS FAILED - REVIEW LOGS ABOVE.               ");
    }
    console.log("==================================================================");
  } catch (err) {
    console.error("Test execution threw exception:", err);
    allPassed = false;
  } finally {
    try {
      if (company1Id || company2Id) {
        await prisma.job.deleteMany({ where: { companyId: { in: [company1Id, company2Id] } } });
        await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id, candidateUserId] } } });
        await prisma.company.deleteMany({ where: { id: { in: [company1Id, company2Id] } } });
      }
    } catch {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
    if (!allPassed) {
      process.exit(1);
    }
  }
}

runRecruiterJobTests();
