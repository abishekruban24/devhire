import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createJob,
  getPublishedJobs,
  getPublishedJobById,
  getCompanyJobs,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";

async function runCandidateJobTests() {
  console.log("==================================================================");
  console.log("      DEVHIRE PHASE 3B: CANDIDATE JOB DISCOVERY TEST SUITE        ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_EMAIL = `rec.candtest.${timestamp}@devhire.test`;
  const CANDIDATE_1_EMAIL = `cand1.candtest.${timestamp}@devhire.test`;
  const CANDIDATE_2_EMAIL = `cand2.candtest.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track created entities for clean teardown
  let company1Id = "";
  let company2Id = "";
  let recruiterUserId = "";
  let candidate1UserId = "";
  let candidate2UserId = "";

  const createdJobIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test companies, recruiter, and candidate users in Neon DB
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating test companies and users in Neon PostgreSQL...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Acme Distributed Labs ${timestamp}`,
        slug: `acme-dist-${timestamp}`,
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
        website: "https://acme-labs.example.com",
      },
    });
    company1Id = comp1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `CyberGuard Security ${timestamp}`,
        slug: `cyberguard-${timestamp}`,
        industry: "Cybersecurity",
        location: "Austin, TX",
        website: "https://cyberguard.example.com",
      },
    });
    company2Id = comp2.id;

    const recUser = await prisma.user.create({
      data: {
        name: "Acme Tech Recruiter",
        email: RECRUITER_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    recruiterUserId = recUser.id;

    const candUser1 = await prisma.user.create({
      data: {
        name: "Alex DevCandidate",
        email: CANDIDATE_1_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    candidate1UserId = candUser1.id;

    const candUser2 = await prisma.user.create({
      data: {
        name: "Jordan TestCandidate",
        email: CANDIDATE_2_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    candidate2UserId = candUser2.id;

    console.log(`  ✓ Company 1 created: ${comp1.name} (ID: ${company1Id})`);
    console.log(`  ✓ Company 2 created: ${comp2.name} (ID: ${company2Id})`);
    console.log(`  ✓ Recruiter created: ${RECRUITER_EMAIL} (Role: RECRUITER)`);
    console.log(`  ✓ Candidate 1 created: ${CANDIDATE_1_EMAIL} (Role: CANDIDATE)`);
    console.log(`  ✓ Candidate 2 created: ${CANDIDATE_2_EMAIL} (Role: CANDIDATE)`);
    console.log("");

    const sessionCandidate1: SessionContext = {
      user: {
        id: candidate1UserId,
        role: "CANDIDATE",
        email: CANDIDATE_1_EMAIL,
      },
    };

    const sessionRecruiter: SessionContext = {
      user: {
        id: recruiterUserId,
        role: "RECRUITER",
        email: RECRUITER_EMAIL,
        companyId: company1Id,
      },
    };

    // -------------------------------------------------------------------------
    // SETUP JOBS: Create 5 jobs with distinct statuses, types, and locations
    // -------------------------------------------------------------------------
    console.log("[Setup] Seeding test jobs across PUBLISHED, DRAFT, CLOSED, ARCHIVED states...");

    // Job 1: PUBLISHED (Acme)
    const job1Res = await createJob(
      {
        title: `Senior Distributed Systems Architect ${timestamp}`,
        description: "Designing large-scale distributed databases and fault-tolerant storage consensus protocols.",
        requirements: "5+ years Go or Rust\nDeep knowledge of Raft or Paxos\nExperience with Kubernetes in production",
        location: "San Francisco, CA / Remote",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "PUBLISHED",
        salaryMin: 180000,
        salaryMax: 240000,
        currency: "USD",
        experienceLevel: "Senior (5+ yrs)",
      },
      sessionRecruiter
    );
    if (!job1Res.success || !job1Res.job) throw new Error("Failed to create Job 1: " + job1Res.message);
    const job1Id = String(job1Res.job.id);
    createdJobIds.push(job1Id);
    console.log(`  ✓ Job 1 (PUBLISHED): ${job1Res.job.title} (ID: ${job1Id})`);

    // Job 2: DRAFT (Acme) - MUST NOT be visible to candidates
    const job2Res = await createJob(
      {
        title: `Confidential Quantum AI Researcher ${timestamp}`,
        description: "Exploratory quantum computing algorithms for cryptographic acceleration.",
        requirements: "PhD in Physics or Computer Science\nQuantum circuit compilation",
        location: "San Francisco, CA",
        locationType: "ON_SITE",
        type: "FULL_TIME",
        status: "DRAFT",
        salaryMin: 220000,
        salaryMax: 300000,
        currency: "USD",
        experienceLevel: "Lead / Staff (8+ yrs)",
      },
      sessionRecruiter
    );
    if (!job2Res.success || !job2Res.job) throw new Error("Failed to create Job 2: " + job2Res.message);
    const job2Id = String(job2Res.job.id);
    createdJobIds.push(job2Id);
    console.log(`  ✓ Job 2 (DRAFT): ${job2Res.job.title} (ID: ${job2Id})`);

    // Job 3: CLOSED (Acme) - MUST NOT be visible to candidates
    const job3Res = await createJob(
      {
        title: `Closed Site Reliability Engineer ${timestamp}`,
        description: "Managing multi-region Kubernetes clusters and incident response pipelines.",
        requirements: "Terraform\nPrometheus and Grafana\nLinux kernel tuning",
        location: "New York, NY",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "CLOSED",
        salaryMin: 140000,
        salaryMax: 180000,
        currency: "USD",
        experienceLevel: "Mid-level (3-5 yrs)",
      },
      sessionRecruiter
    );
    if (!job3Res.success || !job3Res.job) throw new Error("Failed to create Job 3: " + job3Res.message);
    const job3Id = String(job3Res.job.id);
    createdJobIds.push(job3Id);
    console.log(`  ✓ Job 3 (CLOSED): ${job3Res.job.title} (ID: ${job3Id})`);

    // Job 4: ARCHIVED (Acme) - MUST NOT be visible to candidates
    const job4Res = await createJob(
      {
        title: `Archived Mobile React Native Engineer ${timestamp}`,
        description: "Legacy mobile application maintenance and offline synchronization.",
        requirements: "React Native\nTypeScript\nMobile release pipelines",
        location: "Austin, TX",
        locationType: "REMOTE",
        type: "CONTRACT",
        status: "ARCHIVED",
        salaryMin: 90000,
        salaryMax: 120000,
        currency: "USD",
        experienceLevel: "Entry-level (0-2 yrs)",
      },
      sessionRecruiter
    );
    if (!job4Res.success || !job4Res.job) throw new Error("Failed to create Job 4: " + job4Res.message);
    const job4Id = String(job4Res.job.id);
    createdJobIds.push(job4Id);
    console.log(`  ✓ Job 4 (ARCHIVED): ${job4Res.job.title} (ID: ${job4Id})`);

    // Job 5: PUBLISHED (CyberGuard) - Contract / Hybrid
    const job5 = await prisma.job.create({
      data: {
        title: `Staff Cloud Security Analyst ${timestamp}`,
        slug: `staff-cloud-sec-${timestamp}`,
        description: "Zero-trust network architecture, penetration testing, and cloud workload isolation.",
        requirements: "CISSP or equivalent\nAWS & GCP security architectures\nThreat modeling",
        location: "Austin, TX",
        locationType: "HYBRID",
        type: "CONTRACT",
        status: "PUBLISHED",
        salaryMin: 160000,
        salaryMax: 210000,
        currency: "USD",
        experienceLevel: "Lead / Staff (8+ yrs)",
        companyId: company2Id,
        recruiterId: recruiterUserId,
      },
    });
    const job5Id = job5.id;
    createdJobIds.push(job5Id);
    console.log(`  ✓ Job 5 (PUBLISHED): ${job5.title} (ID: ${job5Id})`);
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 1: Security - Block unauthenticated access
    // -------------------------------------------------------------------------
    console.log("[Test 1] Testing Security: Unauthenticated access blocked...");
    const unauthList = await getPublishedJobs({}, null);
    const unauthBlocked = !unauthList.success && unauthList.jobs.length === 0;
    console.log(`  ✓ Unauthenticated getPublishedJobs blocked: ${unauthBlocked} ("${unauthList.message}")`);
    if (!unauthBlocked) allPassed = false;

    const unauthDetail = await getPublishedJobById(job1Id, null);
    const unauthDetailBlocked = !unauthDetail.success && !unauthDetail.job;
    console.log(`  ✓ Unauthenticated getPublishedJobById blocked: ${unauthDetailBlocked} ("${unauthDetail.message}")`);
    if (!unauthDetailBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 2: Security - Block recruiter-role access from candidate discovery
    // -------------------------------------------------------------------------
    console.log("[Test 2] Testing Security: Recruiter role blocked from candidate discovery...");
    const recruiterList = await getPublishedJobs({}, sessionRecruiter);
    const recruiterBlocked = !recruiterList.success && recruiterList.jobs.length === 0;
    console.log(`  ✓ Recruiter getPublishedJobs blocked: ${recruiterBlocked} ("${recruiterList.message}")`);
    if (!recruiterBlocked) allPassed = false;

    const recruiterDetail = await getPublishedJobById(job1Id, sessionRecruiter);
    const recruiterDetailBlocked = !recruiterDetail.success && !recruiterDetail.job;
    console.log(`  ✓ Recruiter getPublishedJobById blocked: ${recruiterDetailBlocked} ("${recruiterDetail.message}")`);
    if (!recruiterDetailBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 3: Status Filtering - Only PUBLISHED jobs are visible to candidates
    // -------------------------------------------------------------------------
    console.log("[Test 3] Testing Status Filtering: ONLY PUBLISHED jobs returned...");
    const candidateList = await getPublishedJobs({ pageSize: 50 }, sessionCandidate1);
    console.log(`  ✓ Query succeeded for Candidate: ${candidateList.success}`);

    const returnedIds = candidateList.jobs.map((j) => j.id);
    const containsJob1 = returnedIds.includes(job1Id);
    const containsJob5 = returnedIds.includes(job5Id);
    const containsDraftJob2 = returnedIds.includes(job2Id);
    const containsClosedJob3 = returnedIds.includes(job3Id);
    const containsArchivedJob4 = returnedIds.includes(job4Id);

    console.log(`  ✓ PUBLISHED Job 1 is visible: ${containsJob1}`);
    console.log(`  ✓ PUBLISHED Job 5 is visible: ${containsJob5}`);
    console.log(`  ✓ DRAFT Job 2 is STRICTLY HIDDEN: ${!containsDraftJob2}`);
    console.log(`  ✓ CLOSED Job 3 is STRICTLY HIDDEN: ${!containsClosedJob3}`);
    console.log(`  ✓ ARCHIVED Job 4 is STRICTLY HIDDEN: ${!containsArchivedJob4}`);

    // Verify all returned jobs have status PUBLISHED
    const allArePublished = candidateList.jobs.every((j) => j.status === "PUBLISHED");
    console.log(`  ✓ 100% of returned jobs have status === "PUBLISHED": ${allArePublished}`);

    if (
      !containsJob1 ||
      !containsJob5 ||
      containsDraftJob2 ||
      containsClosedJob3 ||
      containsArchivedJob4 ||
      !allArePublished
    ) {
      allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 4: Search functionality (title, company, location, keywords)
    // -------------------------------------------------------------------------
    console.log("[Test 4] Testing Search Functionality...");

    // Search by title keyword
    const searchDist = await getPublishedJobs({ search: "Distributed" }, sessionCandidate1);
    const hasDistOnly =
      searchDist.jobs.some((j) => j.id === job1Id) && !searchDist.jobs.some((j) => j.id === job5Id);
    console.log(`  ✓ Search "Distributed" returns Job 1 only: ${hasDistOnly}`);
    if (!hasDistOnly) allPassed = false;

    // Search by company name
    const searchCompany = await getPublishedJobs({ search: "CyberGuard" }, sessionCandidate1);
    const hasCyberOnly =
      searchCompany.jobs.some((j) => j.id === job5Id) && !searchCompany.jobs.some((j) => j.id === job1Id);
    console.log(`  ✓ Search "CyberGuard" returns Job 5 only: ${hasCyberOnly}`);
    if (!hasCyberOnly) allPassed = false;

    // Search non-existent keyword returns 0
    const searchNone = await getPublishedJobs({ search: "NonExistentTermXYZ123" }, sessionCandidate1);
    const returnsZero = searchNone.jobs.length === 0;
    console.log(`  ✓ Search for non-existent keyword returns 0 results: ${returnsZero}`);
    if (!returnsZero) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 5: Filter functionality (type, locationType, experienceLevel)
    // -------------------------------------------------------------------------
    console.log("[Test 5] Testing Filter Functionality...");

    // Filter by type: CONTRACT
    const filterContract = await getPublishedJobs({ type: "CONTRACT" }, sessionCandidate1);
    const contractMatches =
      filterContract.jobs.some((j) => j.id === job5Id) && !filterContract.jobs.some((j) => j.id === job1Id);
    console.log(`  ✓ Filter type="CONTRACT" returns Job 5 only: ${contractMatches}`);
    if (!contractMatches) allPassed = false;

    // Filter by locationType: REMOTE
    const filterRemote = await getPublishedJobs({ locationType: "REMOTE" }, sessionCandidate1);
    const remoteMatches =
      filterRemote.jobs.some((j) => j.id === job1Id) && !filterRemote.jobs.some((j) => j.id === job5Id);
    console.log(`  ✓ Filter locationType="REMOTE" returns Job 1 only: ${remoteMatches}`);
    if (!remoteMatches) allPassed = false;

    // Filter by locationType: HYBRID
    const filterHybrid = await getPublishedJobs({ locationType: "HYBRID" }, sessionCandidate1);
    const hybridMatches =
      filterHybrid.jobs.some((j) => j.id === job5Id) && !filterHybrid.jobs.some((j) => j.id === job1Id);
    console.log(`  ✓ Filter locationType="HYBRID" returns Job 5 only: ${hybridMatches}`);
    if (!hybridMatches) allPassed = false;

    // Filter by experienceLevel: Senior
    const filterExp = await getPublishedJobs({ experienceLevel: "Senior" }, sessionCandidate1);
    const expMatches = filterExp.jobs.some((j) => j.id === job1Id);
    console.log(`  ✓ Filter experienceLevel="Senior" matches Job 1: ${expMatches}`);
    if (!expMatches) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 6: Job details retrieval & Guessed ID Protection
    // -------------------------------------------------------------------------
    console.log("[Test 6] Testing Job Details & Guessed ID Protection...");

    // Valid published job details
    const job1Detail = await getPublishedJobById(job1Id, sessionCandidate1);
    const job1DetailOk =
      job1Detail.success &&
      job1Detail.job?.id === job1Id &&
      job1Detail.job?.title.includes("Senior Distributed Systems Architect") &&
      job1Detail.job?.company.name.includes("Acme Distributed Labs");
    console.log(`  ✓ Published Job 1 details retrieved successfully: ${job1DetailOk}`);
    if (!job1DetailOk) allPassed = false;

    // Guessed ID for DRAFT job: MUST return 404 / error
    const draftGuess = await getPublishedJobById(job2Id, sessionCandidate1);
    const draftBlocked = !draftGuess.success && !draftGuess.job;
    console.log(`  ✓ Guessed ID for DRAFT job strictly rejected: ${draftBlocked} ("${draftGuess.message}")`);
    if (!draftBlocked) allPassed = false;

    // Guessed ID for CLOSED job: MUST return 404 / error
    const closedGuess = await getPublishedJobById(job3Id, sessionCandidate1);
    const closedBlocked = !closedGuess.success && !closedGuess.job;
    console.log(`  ✓ Guessed ID for CLOSED job strictly rejected: ${closedBlocked} ("${closedGuess.message}")`);
    if (!closedBlocked) allPassed = false;

    // Guessed ID for ARCHIVED job: MUST return 404 / error
    const archivedGuess = await getPublishedJobById(job4Id, sessionCandidate1);
    const archivedBlocked = !archivedGuess.success && !archivedGuess.job;
    console.log(`  ✓ Guessed ID for ARCHIVED job strictly rejected: ${archivedBlocked} ("${archivedGuess.message}")`);
    if (!archivedBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 7: Privacy & Security - No password hashes or private data leaked
    // -------------------------------------------------------------------------
    console.log("[Test 7] Testing Privacy & Leak Prevention...");
    const detailPayload = JSON.stringify(job1Detail.job || {});
    const leaksPasswordHash = detailPayload.includes("passwordHash") || detailPayload.includes(hash);
    const leaksRecruiterEmail = detailPayload.includes(RECRUITER_EMAIL);
    console.log(`  ✓ No recruiter passwordHash leaked: ${!leaksPasswordHash}`);
    console.log(`  ✓ No private recruiter email leaked in candidate job payload: ${!leaksRecruiterEmail}`);
    if (leaksPasswordHash || leaksRecruiterEmail) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 8: Recruiter job management regression check
    // -------------------------------------------------------------------------
    console.log("[Test 8] Regression Check: Recruiter Job Management remains operational...");
    const recJobsRes = await getCompanyJobs(sessionRecruiter);
    const recCanSeeAllTheirJobs =
      recJobsRes.success &&
      recJobsRes.jobs.length >= 4 &&
      recJobsRes.jobs.some((j) => j.id === job1Id) &&
      recJobsRes.jobs.some((j) => j.id === job2Id) &&
      recJobsRes.jobs.some((j) => j.id === job3Id) &&
      recJobsRes.jobs.some((j) => j.id === job4Id);
    console.log(`  ✓ Recruiter still accesses their own company's DRAFT, CLOSED, and ARCHIVED jobs: ${recCanSeeAllTheirJobs}`);
    if (!recCanSeeAllTheirJobs) allPassed = false;
    console.log("");

  } catch (err) {
    console.error("Test execution threw an unhandled error:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Teardown test jobs, users, and companies
    // -------------------------------------------------------------------------
    console.log("[Cleanup] Removing test jobs, recruiters, candidates, and companies from Neon DB...");
    try {
      if (createdJobIds.length > 0) {
        await prisma.job.deleteMany({
          where: { id: { in: createdJobIds } },
        });
      }
      const testUserIds = [recruiterUserId, candidate1UserId, candidate2UserId].filter(Boolean);
      if (testUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: testUserIds } },
        });
      }
      const testCompanyIds = [company1Id, company2Id].filter(Boolean);
      if (testCompanyIds.length > 0) {
        await prisma.company.deleteMany({
          where: { id: { in: testCompanyIds } },
        });
      }
      console.log("  ✓ Teardown complete. Zero test records remaining in Neon DB.\n");
    } catch (cleanupErr) {
      console.error("  ⚠ Cleanup warning:", cleanupErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("    ALL 8 CANDIDATE JOB DISCOVERY TESTS PASSED SUCCESSFULLY!     ");
  } else {
    console.log("    SOME TESTS FAILED! Check log above.                         ");
  }
  console.log("==================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runCandidateJobTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
