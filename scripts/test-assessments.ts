import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createJob,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";
import {
  createAssessment,
  getCompanyAssessments,
  getAssessmentById,
  updateAssessment,
  updateAssessmentStatus,
  upsertQuestion,
  deleteQuestion,
  deleteAssessment,
  getCandidateAssessmentPreview,
} from "../src/features/assessments/actions/assessment-actions";
import type { AssessmentStatus, QuestionDifficulty } from "@prisma/client";

async function runAssessmentTests() {
  console.log("==================================================================");
  console.log("  DEVHIRE PHASE 4A: RECRUITER ASSESSMENT MANAGEMENT TEST SUITE   ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `rec1.asstest.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `rec2.asstest.${timestamp}@devhire.test`;
  const CANDIDATE_EMAIL = `cand.asstest.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track created entities for clean teardown
  let company1Id = "";
  let company2Id = "";
  let recruiter1UserId = "";
  let recruiter2UserId = "";
  let candidateUserId = "";

  let publishedJob1Id = "";
  const createdJobIds: string[] = [];
  const createdAssessmentIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test companies, recruiters, candidate in Neon DB
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating test companies and users in Neon DB...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Acme Engineering Labs ${timestamp}`,
        slug: `acme-eng-${timestamp}`,
        industry: "Developer Tools",
        location: "San Francisco, CA",
        website: "https://acme-eng.example.com",
      },
    });
    company1Id = comp1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `Rival Systems Corp ${timestamp}`,
        slug: `rival-sys-${timestamp}`,
        industry: "Enterprise Cloud",
        location: "Seattle, WA",
        website: "https://rival-sys.example.com",
      },
    });
    company2Id = comp2.id;

    const rec1User = await prisma.user.create({
      data: {
        name: "Acme Principal Recruiter",
        email: RECRUITER_1_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    recruiter1UserId = rec1User.id;

    const rec2User = await prisma.user.create({
      data: {
        name: "Rival Lead Recruiter",
        email: RECRUITER_2_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company2Id,
      },
    });
    recruiter2UserId = rec2User.id;

    const candUser = await prisma.user.create({
      data: {
        name: "Candidate Test User",
        email: CANDIDATE_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    candidateUserId = candUser.id;

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

    const candSession: SessionContext = {
      user: {
        id: candidateUserId,
        email: CANDIDATE_EMAIL,
        role: "CANDIDATE",
      },
    };

    console.log("[Setup] Creating a published job for Company 1...");
    const jobRes = await createJob(
      {
        title: "Senior Backend Distributed Engineer",
        description: "Build robust distributed backend infrastructure.",
        requirements: "TypeScript, PostgreSQL, Concurrency",
        location: "San Francisco, CA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "PUBLISHED",
      },
      rec1Session
    );
    if (!jobRes.success || !jobRes.job) throw new Error("Failed to create job: " + jobRes.message);
    publishedJob1Id = (jobRes.job as { id: string }).id;
    createdJobIds.push(publishedJob1Id);

    console.log("Setup complete. Initialized test fixtures.\n");

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated & Candidate Role Rejection
    // -------------------------------------------------------------------------
    console.log("[Test 1] Testing Security: Unauthenticated & Unauthorized Rejection...");
    const unauthRes = await createAssessment(
      {
        title: "Unauthorized Assessment",
        description: "Should fail unauthenticated check",
      },
      null // No session
    );
    if (!unauthRes.success && unauthRes.errorType === "UNAUTHENTICATED") {
      console.log("  PASS: Anonymous user createAssessment blocked with UNAUTHENTICATED");
    } else {
      console.error("  FAIL: Anonymous user was not blocked:", unauthRes);
      allPassed = false;
    }

    const candRes = await createAssessment(
      {
        title: "Candidate Trying To Create Assessment",
        description: "Should fail role check",
      },
      candSession
    );
    if (!candRes.success && candRes.errorType === "ROLE_DENIED") {
      console.log("  PASS: Candidate user createAssessment blocked with ROLE_DENIED");
    } else {
      console.error("  FAIL: Candidate was not blocked:", candRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Input Validation Enforcement
    // -------------------------------------------------------------------------
    console.log("[Test 2] Testing Server-Side Input Validation...");
    const shortTitleRes = await createAssessment(
      {
        title: "AB", // too short
        description: "Valid description for assessment testing",
      },
      rec1Session
    );
    if (!shortTitleRes.success && shortTitleRes.errorType === "VALIDATION_ERROR") {
      console.log("  PASS: Short title (<3 chars) rejected");
    } else {
      console.error("  FAIL: Short title was not rejected:", shortTitleRes);
      allPassed = false;
    }

    const invalidDurationRes = await createAssessment(
      {
        title: "Valid Assessment Title",
        description: "Valid description for assessment testing",
        durationMinutes: 1, // too short (<5)
      },
      rec1Session
    );
    if (!invalidDurationRes.success && invalidDurationRes.errorType === "VALIDATION_ERROR") {
      console.log("  PASS: Duration < 5 minutes rejected");
    } else {
      console.error("  FAIL: Invalid duration was not rejected:", invalidDurationRes);
      allPassed = false;
    }

    const invalidScoreRes = await createAssessment(
      {
        title: "Valid Assessment Title",
        description: "Valid description for assessment testing",
        passingScore: 120, // > 100
      },
      rec1Session
    );
    if (!invalidScoreRes.success && invalidScoreRes.errorType === "VALIDATION_ERROR") {
      console.log("  PASS: Passing score > 100% rejected");
    } else {
      console.error("  FAIL: Invalid score was not rejected:", invalidScoreRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Create Full Assessment with Coding Question & Test Cases
    // -------------------------------------------------------------------------
    console.log("[Test 3] Testing Create Assessment with Coding Question and Test Cases...");
    let assessment1Id = "";
    const createRes = await createAssessment(
      {
        title: "Distributed Rate Limiter & Concurrency Evaluation",
        description: "Evaluate implementation of a sliding window rate limiter with microsecond precision and memory bounds.",
        durationMinutes: 75,
        passingScore: 75.0,
        status: "DRAFT",
        jobId: publishedJob1Id,
        questions: [
          {
            title: "Sliding Window Log Rate Limiter",
            description: "Implement a RateLimiter class that takes maxRequests and windowSeconds. Each call to isAllowed(timestamp) should return boolean.",
            difficulty: "HARD" as QuestionDifficulty,
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            starterCode: {
              typescript: "class RateLimiter {\n  constructor(maxRequests: number, windowSeconds: number) {}\n  isAllowed(timestamp: number): boolean {\n    return true;\n  }\n}",
              python: "class RateLimiter:\n    def __init__(self, max_requests: int, window_seconds: int):\n        pass\n    def is_allowed(self, timestamp: int) -> bool:\n        return True",
            },
            orderIndex: 0,
            testCases: [
              {
                input: "maxRequests=3, windowSeconds=10, calls=[1, 2, 3, 4, 11]",
                expectedOutput: "[true, true, true, false, true]",
                isHidden: false,
                explanation: "Visible sample case: request at t=4 is dropped because window [0-10] already has 3 requests. At t=11, request at t=1 expires.",
                weight: 1.0,
              },
              {
                input: "maxRequests=1, windowSeconds=5, calls=[1, 2, 3, 6, 7]",
                expectedOutput: "[true, false, false, true, false]",
                isHidden: false,
                explanation: "Visible edge case with strict concurrency.",
                weight: 1.0,
              },
              {
                input: "maxRequests=1000, windowSeconds=60, calls=[...10000 rapid calls]",
                expectedOutput: "[...high throughput eval results]",
                isHidden: true,
                explanation: "Hidden stress evaluation case checking memory complexity and execution timing.",
                weight: 3.0,
              },
            ],
          },
        ],
      },
      rec1Session
    );

    if (createRes.success && createRes.assessmentId) {
      assessment1Id = createRes.assessmentId;
      createdAssessmentIds.push(assessment1Id);
      console.log(`  PASS: Assessment created successfully (ID: ${assessment1Id})`);

      // Verify DB record
      const dbAssessment = await prisma.assessment.findUnique({
        where: { id: assessment1Id },
        include: {
          questions: {
            include: { testCases: true },
          },
          jobs: true,
        },
      });

      if (
        dbAssessment &&
        dbAssessment.companyId === company1Id &&
        dbAssessment.status === "DRAFT" &&
        dbAssessment.durationMinutes === 75 &&
        dbAssessment.questions.length === 1 &&
        dbAssessment.questions[0].testCases.length === 3 &&
        dbAssessment.jobs.some((j) => j.id === publishedJob1Id)
      ) {
        console.log("  PASS: Neon DB verification confirmed assessment, questions, test cases, and linked job");
      } else {
        console.error("  FAIL: Database state verification failed:", dbAssessment);
        allPassed = false;
      }
    } else {
      console.error("  FAIL: createAssessment failed:", createRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Recruiter retrieves company assessments
    // -------------------------------------------------------------------------
    console.log("[Test 4] Testing getCompanyAssessments retrieval...");
    const companyAssessmentsRes = await getCompanyAssessments(rec1Session);
    if (
      companyAssessmentsRes.success &&
      companyAssessmentsRes.assessments.length >= 1 &&
      companyAssessmentsRes.assessments.some((a) => a.id === assessment1Id)
    ) {
      console.log("  PASS: Recruiter 1 retrieves company assessment with full question details");
    } else {
      console.error("  FAIL: getCompanyAssessments failed:", companyAssessmentsRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Status Transitions (DRAFT -> ACTIVE -> ARCHIVED)
    // -------------------------------------------------------------------------
    console.log("[Test 5] Testing Assessment Status Transitions...");
    const activateRes = await updateAssessmentStatus(assessment1Id, "ACTIVE" as AssessmentStatus, rec1Session);
    if (activateRes.success) {
      console.log("  PASS: Transitioned assessment to ACTIVE");
    } else {
      console.error("  FAIL: Activation failed:", activateRes);
      allPassed = false;
    }

    const archiveRes = await updateAssessmentStatus(assessment1Id, "ARCHIVED" as AssessmentStatus, rec1Session);
    if (archiveRes.success) {
      console.log("  PASS: Transitioned assessment to ARCHIVED");
    } else {
      console.error("  FAIL: Archival failed:", archiveRes);
      allPassed = false;
    }

    // Set back to ACTIVE for subsequent tests
    await updateAssessmentStatus(assessment1Id, "ACTIVE" as AssessmentStatus, rec1Session);

    // -------------------------------------------------------------------------
    // TEST 6: Upsert Question (Add Question #2 & Edit Question #1)
    // -------------------------------------------------------------------------
    console.log("[Test 6] Testing upsertQuestion (Adding Question #2)...");
    const addQ2Res = await upsertQuestion(
      assessment1Id,
      {
        title: "LRU Cache with TTL Eviction",
        description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with per-key expiration.",
        difficulty: "HARD" as QuestionDifficulty,
        points: 150,
        timeLimitMs: 3000,
        memoryLimitKb: 524288,
        orderIndex: 1,
        testCases: [
          {
            input: "capacity=2, put(1, 1), put(2, 2), get(1)",
            expectedOutput: "1",
            isHidden: false,
            explanation: "Sample cache retrieval.",
            weight: 1.0,
          },
          {
            input: "capacity=1000, stressPutGet()",
            expectedOutput: "success",
            isHidden: true,
            explanation: "Hidden performance test case.",
            weight: 2.0,
          },
        ],
      },
      rec1Session
    );

    let question2Id = "";
    if (addQ2Res.success && addQ2Res.questionId) {
      question2Id = addQ2Res.questionId;
      console.log(`  PASS: Question #2 added successfully (ID: ${question2Id})`);
    } else {
      console.error("  FAIL: Failed to add Question #2:", addQ2Res);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Hidden Test Case Privacy Safeguard (Candidate Anti-Cheating)
    // -------------------------------------------------------------------------
    console.log("[Test 7] Testing Hidden Test Case Privacy Safeguard...");
    const candidatePreviewRes = await getCandidateAssessmentPreview(assessment1Id, candSession);

    if (candidatePreviewRes.success && candidatePreviewRes.preview) {
      const questions = candidatePreviewRes.preview.questions;
      let leakedHiddenCase = false;
      let visibleCaseFound = false;

      for (const q of questions) {
        for (const tc of q.visibleTestCases) {
          visibleCaseFound = true;
          // Check against database to make sure it's not marked isHidden
          const dbTc = await prisma.testCase.findUnique({ where: { id: tc.id } });
          if (dbTc?.isHidden) {
            leakedHiddenCase = true;
          }
        }
      }

      if (visibleCaseFound && !leakedHiddenCase) {
        console.log("  PASS: Candidate preview exposes visible sample test cases ONLY");
        console.log("  PASS: ZERO hidden evaluation test cases leaked in candidate API payload");
      } else {
        console.error("  FAIL: Security breach: Hidden test case leaked to candidate!");
        allPassed = false;
      }
    } else {
      console.error("  FAIL: Candidate preview failed:", candidatePreviewRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Cross-Company / Tenant Boundary Security Isolation
    // -------------------------------------------------------------------------
    console.log("[Test 8] Testing Cross-Company Isolation (Tenant Boundaries)...");
    // 1. Rival recruiter cannot view Company 1's assessment
    const rivalFetchRes = await getAssessmentById(assessment1Id, rec2Session);
    if (!rivalFetchRes.success && rivalFetchRes.message?.includes("Forbidden")) {
      console.log("  PASS: Rival recruiter cannot fetch Company 1's assessment (403 Forbidden)");
    } else {
      console.error("  FAIL: Rival recruiter accessed Company 1 assessment:", rivalFetchRes);
      allPassed = false;
    }

    // 2. Rival recruiter cannot update Company 1's assessment
    const rivalUpdateRes = await updateAssessment(
      assessment1Id,
      { title: "Hijacked Rival Assessment" },
      rec2Session
    );
    if (!rivalUpdateRes.success && rivalUpdateRes.message?.includes("Forbidden")) {
      console.log("  PASS: Rival recruiter cannot modify Company 1 assessment (403 Forbidden)");
    } else {
      console.error("  FAIL: Rival recruiter modified Company 1 assessment:", rivalUpdateRes);
      allPassed = false;
    }

    // 3. Rival recruiter cannot add questions to Company 1's assessment
    const rivalAddQRes = await upsertQuestion(
      assessment1Id,
      {
        title: "Malicious Question Injection",
        description: "Should fail tenant ownership check",
      },
      rec2Session
    );
    if (!rivalAddQRes.success && rivalAddQRes.message?.includes("Forbidden")) {
      console.log("  PASS: Rival recruiter question injection blocked (403 Forbidden)");
    } else {
      console.error("  FAIL: Rival recruiter added question:", rivalAddQRes);
      allPassed = false;
    }

    // 4. Rival recruiter cannot delete Company 1's assessment
    const rivalDeleteRes = await deleteAssessment(assessment1Id, rec2Session);
    if (!rivalDeleteRes.success && rivalDeleteRes.message?.includes("Forbidden")) {
      console.log("  PASS: Rival recruiter delete attempt blocked (403 Forbidden)");
    } else {
      console.error("  FAIL: Rival recruiter deleted Company 1 assessment:", rivalDeleteRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // TEST 9: Safe Question Deletion
    // -------------------------------------------------------------------------
    console.log("[Test 9] Testing Safe Question Deletion...");
    if (question2Id) {
      const deleteQRes = await deleteQuestion(assessment1Id, question2Id, rec1Session);
      if (deleteQRes.success) {
        console.log("  PASS: Question #2 safely deleted by owner");

        const qCheck = await prisma.question.findUnique({ where: { id: question2Id } });
        if (!qCheck) {
          console.log("  PASS: Question and its test cases permanently purged from database");
        } else {
          console.error("  FAIL: Question was not deleted from database:", qCheck);
          allPassed = false;
        }
      } else {
        console.error("  FAIL: Question deletion failed:", deleteQRes);
        allPassed = false;
      }
    }

    // -------------------------------------------------------------------------
    // TEST 10: Deletion Safeguard (Attempt Protection)
    // -------------------------------------------------------------------------
    console.log("[Test 10] Testing Deletion Safeguard when candidate attempts exist...");
    // Simulate candidate attempt record
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: assessment1Id,
        candidateId: candidateUserId,
        status: "IN_PROGRESS",
      },
    });

    // Try deleting assessment with active attempt
    const blockedDeleteRes = await deleteAssessment(assessment1Id, rec1Session);
    if (
      !blockedDeleteRes.success &&
      blockedDeleteRes.message.includes("candidate attempt(s) are already linked")
    ) {
      console.log("  PASS: Deletion blocked due to existing candidate attempts");
    } else {
      console.error("  FAIL: Deletion safeguard failed:", blockedDeleteRes);
      allPassed = false;
    }

    // Clean up simulated attempt
    await prisma.assessmentAttempt.delete({ where: { id: attempt.id } });

    // Now delete assessment with 0 attempts (should succeed)
    const allowedDeleteRes = await deleteAssessment(assessment1Id, rec1Session);
    if (allowedDeleteRes.success) {
      console.log("  PASS: Authorized owner deleted assessment with 0 attempts successfully");

      const assessCheck = await prisma.assessment.findUnique({ where: { id: assessment1Id } });
      if (!assessCheck) {
        console.log("  PASS: Assessment and questions verified permanently purged from Neon DB");
        // Remove from tracking array since deleted
        const idx = createdAssessmentIds.indexOf(assessment1Id);
        if (idx !== -1) createdAssessmentIds.splice(idx, 1);
      } else {
        console.error("  FAIL: Assessment still exists in database:", assessCheck);
        allPassed = false;
      }
    } else {
      console.error("  FAIL: Clean deletion failed:", allowedDeleteRes);
      allPassed = false;
    }
  } catch (error) {
    console.error("[Test Suite Error]: Unexpected exception occurred:", error);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up all test fixtures from Neon DB
    // -------------------------------------------------------------------------
    console.log("\n[Teardown] Purging test assessments, jobs, users, and companies...");
    try {
      if (createdAssessmentIds.length > 0) {
        await prisma.assessment.deleteMany({
          where: { id: { in: createdAssessmentIds } },
        });
      }
      if (createdJobIds.length > 0) {
        await prisma.job.deleteMany({
          where: { id: { in: createdJobIds } },
        });
      }
      const usersToClean = [recruiter1UserId, recruiter2UserId, candidateUserId].filter(
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
      console.log("[Teardown] Successfully purged all test records from Neon PostgreSQL.");
    } catch (cleanErr) {
      console.error("[Teardown Error]: Failed to clean up test fixtures:", cleanErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("  >>> ALL PHASE 4A ASSESSMENT TESTS PASSED SUCCESSFULLY! <<<   ");
  } else {
    console.error("  >>> SOME PHASE 4A TESTS FAILED! INSPECT LOGS ABOVE. <<<   ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runAssessmentTests()
  .catch((err) => {
    console.error("Fatal runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
