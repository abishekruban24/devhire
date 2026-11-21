import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  startAssessmentAttempt,
  getAssessmentAttemptData,
  saveQuestionDraft,
  submitAssessmentAttempt,
} from "../src/features/assessments/actions/attempt-actions";
import {
  createAssessmentInvitation,
} from "../src/features/assessments/actions/invitation-actions";
import {
  createAssessment,
} from "../src/features/assessments/actions/assessment-actions";
import {
  createJob,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";

async function runAttemptTests() {
  console.log("==================================================================");
  console.log("  DEVHIRE PHASE 4C: CANDIDATE CODING & TIMED ATTEMPTS TEST SUITE  ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `rec1.atttest.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `rec2.atttest.${timestamp}@devhire.test`;
  const CANDIDATE_1_EMAIL = `cand1.atttest.${timestamp}@devhire.test`;
  const CANDIDATE_2_EMAIL = `cand2.atttest.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track entities for teardown
  let company1Id = "";
  let company2Id = "";
  let rec1UserId = "";
  let rec2UserId = "";
  let cand1UserId = "";
  let cand2UserId = "";

  let job1Id = "";
  let app1Id = "";
  let app2Id = "";

  let activeAssessmentId = "";
  let draftAssessmentId = "";
  let question1Id = "";
  let question2Id = "";

  let inv1Id = "";
  let inv2Id = "";
  let invRevokedId = "";
  let invExpiredId = "";
  let invDraftId = "";

  let candidate1AttemptId = "";

  try {
    // -------------------------------------------------------------
    // SETUP: Create companies, recruiters, candidates, jobs, assessments
    // -------------------------------------------------------------
    console.log("[Setup] Creating test companies and users in Neon DB...");
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const company1 = await prisma.company.create({
      data: {
        name: `Acme Engineering Labs ${timestamp}`,
        slug: `acme-eng-${timestamp}`,
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
      },
    });
    company1Id = company1.id;

    const company2 = await prisma.company.create({
      data: {
        name: `Rival Tech Labs ${timestamp}`,
        slug: `rival-tech-${timestamp}`,
        industry: "Enterprise SaaS",
        location: "New York, NY",
      },
    });
    company2Id = company2.id;

    const rec1User = await prisma.user.create({
      data: {
        email: RECRUITER_1_EMAIL,
        name: "Recruiter One",
        passwordHash: hashedPassword,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    rec1UserId = rec1User.id;

    const rec2User = await prisma.user.create({
      data: {
        email: RECRUITER_2_EMAIL,
        name: "Recruiter Two",
        passwordHash: hashedPassword,
        role: "RECRUITER",
        companyId: company2Id,
      },
    });
    rec2UserId = rec2User.id;

    const cand1User = await prisma.user.create({
      data: {
        email: CANDIDATE_1_EMAIL,
        name: "Alice Candidate",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
      },
    });
    cand1UserId = cand1User.id;

    const cand2User = await prisma.user.create({
      data: {
        email: CANDIDATE_2_EMAIL,
        name: "Bob Candidate",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
      },
    });
    cand2UserId = cand2User.id;

    const sessionRec1: SessionContext = {
      user: { id: rec1UserId, role: "RECRUITER", email: RECRUITER_1_EMAIL, companyId: company1Id },
    };
    const sessionCand1: SessionContext = {
      user: { id: cand1UserId, role: "CANDIDATE", email: CANDIDATE_1_EMAIL },
    };
    const sessionCand2: SessionContext = {
      user: { id: cand2UserId, role: "CANDIDATE", email: CANDIDATE_2_EMAIL },
    };

    console.log("[Setup] Creating jobs and applications...");
    const job1Res = await createJob(
      {
        title: "Staff Distributed Systems Engineer",
        description: "Develop high-scale fault-tolerant consensus systems.",
        requirements: "Go, Rust, Distributed Systems, Raft",
        location: "Remote",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "PUBLISHED",
      },
      sessionRec1
    );
    job1Id = (job1Res.job as { id: string }).id;

    const app1 = await prisma.application.create({
      data: {
        jobId: job1Id,
        candidateId: cand1UserId,
        status: "SUBMITTED",
        coverLetter: "Excited about high-scale distributed consensus.",
      },
    });
    app1Id = app1.id;

    const app2 = await prisma.application.create({
      data: {
        jobId: job1Id,
        candidateId: cand2UserId,
        status: "SUBMITTED",
        coverLetter: "Passionate about Raft and Paxos.",
      },
    });
    app2Id = app2.id;

    console.log("[Setup] Creating assessments with questions and test cases...");
    // 1. ACTIVE assessment with 2 coding questions (visible + hidden test cases)
    const activeAsmtRes = await createAssessment(
      {
        title: "Distributed Algorithms Challenge",
        description: "Benchmark evaluating data structures, concurrency, and algorithm optimization.",
        durationMinutes: 60,
        passingScore: 75.0,
        questions: [
          {
            title: "LRU Cache Implementation",
            description: "Implement a Least Recently Used (LRU) cache with O(1) get and put operations.",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            starterCode: {
              python: "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n",
              typescript: "class LRUCache {\n  constructor(capacity: number) {}\n}\n",
            },
            testCases: [
              {
                input: '["LRUCache", [2], "put", [1, 1], "get", [1]]',
                expectedOutput: "[null, null, 1]",
                isHidden: false,
                explanation: "Public sample test case verifying basic cache retrieval.",
              },
              {
                input: '["LRUCache", [1], "put", [1, 1], "put", [2, 2], "get", [1]]',
                expectedOutput: "[null, null, -1]",
                isHidden: true,
                explanation: "Evaluation test case checking key eviction under capacity constraint.",
              },
            ],
          },
          {
            title: "Network Packet Throttle",
            description: "Design a sliding window rate limiter.",
            difficulty: "HARD",
            points: 150,
            timeLimitMs: 1500,
            memoryLimitKb: 262144,
            starterCode: {
              python: "def can_send(timestamps: list[int], limit: int) -> bool:\n    pass\n",
              typescript: "function canSend(timestamps: number[], limit: number): boolean {\n  return false;\n}\n",
            },
            testCases: [
              {
                input: "[1, 2, 3], limit=5",
                expectedOutput: "true",
                isHidden: false,
                explanation: "Public sample case under limit.",
              },
              {
                input: "[1, 1, 1, 1, 1, 1], limit=5",
                expectedOutput: "false",
                isHidden: true,
                explanation: "Evaluation edge case with simultaneous burst traffic.",
              },
            ],
          },
        ],
      },
      sessionRec1
    );

    activeAssessmentId = activeAsmtRes.assessmentId!;

    // Activate the assessment
    await prisma.assessment.update({
      where: { id: activeAssessmentId },
      data: { status: "ACTIVE" },
    });

    // Retrieve question IDs
    const questions = await prisma.question.findMany({
      where: { assessmentId: activeAssessmentId },
      orderBy: { orderIndex: "asc" },
    });
    question1Id = questions[0].id;
    question2Id = questions[1].id;

    // 2. DRAFT assessment
    const draftAsmtRes = await createAssessment(
      {
        title: "Draft Experimental Challenge",
        description: "Unpublished assessment still under review.",
        durationMinutes: 45,
        passingScore: 60,
        questions: [
          {
            title: "Simple Sum",
            description: "Add two numbers.",
            difficulty: "EASY",
            points: 50,
            timeLimitMs: 1000,
            memoryLimitKb: 131072,
            testCases: [{ input: "1, 2", expectedOutput: "3", isHidden: false }],
          },
        ],
      },
      sessionRec1
    );
    draftAssessmentId = draftAsmtRes.assessmentId!;

    console.log("[Setup] Creating invitations across statuses...");
    // Invitation 1: Candidate 1, Active Assessment (PENDING)
    const inv1Res = await createAssessmentInvitation(
      { applicationId: app1Id, assessmentId: activeAssessmentId, expiresInDays: 7 },
      sessionRec1
    );
    inv1Id = inv1Res.invitationId!;

    // Invitation 2: Candidate 2, Active Assessment (PENDING)
    const inv2Res = await createAssessmentInvitation(
      { applicationId: app2Id, assessmentId: activeAssessmentId, expiresInDays: 7 },
      sessionRec1
    );
    inv2Id = inv2Res.invitationId!;

    // Invitation 3: Revoked invitation
    const invRevoked = await prisma.assessmentInvitation.create({
      data: {
        assessmentId: activeAssessmentId,
        candidateId: cand1UserId,
        applicationId: app1Id,
        companyId: company1Id,
        invitedById: rec1UserId,
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });
    invRevokedId = invRevoked.id;

    // Invitation 4: Expired invitation (expired yesterday)
    const invExpired = await prisma.assessmentInvitation.create({
      data: {
        assessmentId: activeAssessmentId,
        candidateId: cand1UserId,
        applicationId: app1Id,
        companyId: company1Id,
        invitedById: rec1UserId,
        status: "EXPIRED",
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });
    invExpiredId = invExpired.id;

    // Invitation 5: Linked to DRAFT assessment
    const invDraft = await prisma.assessmentInvitation.create({
      data: {
        assessmentId: draftAssessmentId,
        candidateId: cand1UserId,
        applicationId: app1Id,
        companyId: company1Id,
        invitedById: rec1UserId,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    invDraftId = invDraft.id;

    console.log("[Setup] Database fixtures successfully seeded.\n");

    // =============================================================
    // TEST 1: Unauthenticated candidate cannot start attempt
    // =============================================================
    console.log("TEST 1: Unauthenticated user cannot start attempt");
    const test1Res = await startAssessmentAttempt({ invitationId: inv1Id }, null);
    if (!test1Res.success && test1Res.errorType === "UNAUTHENTICATED") {
      console.log("  [PASS] Unauthenticated access blocked correctly with UNAUTHENTICATED.");
    } else {
      console.error("  [FAIL] Unauthenticated access was not blocked properly:", test1Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 2: Recruiter role cannot start attempt
    // =============================================================
    console.log("\nTEST 2: Recruiter role cannot start attempt");
    const test2Res = await startAssessmentAttempt({ invitationId: inv1Id }, sessionRec1);
    if (!test2Res.success && test2Res.errorType === "ROLE_DENIED") {
      console.log("  [PASS] Recruiter attempt start blocked with ROLE_DENIED.");
    } else {
      console.error("  [FAIL] Recruiter attempt start was not blocked properly:", test2Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 3: Candidate 2 cannot start Candidate 1's invitation
    // =============================================================
    console.log("\nTEST 3: Cross-candidate invitation start blocked");
    const test3Res = await startAssessmentAttempt({ invitationId: inv1Id }, sessionCand2);
    if (!test3Res.success && test3Res.errorType === "FORBIDDEN") {
      console.log("  [PASS] Candidate 2 blocked from starting Candidate 1's invitation with FORBIDDEN.");
    } else {
      console.error("  [FAIL] Cross-candidate attempt start was not blocked:", test3Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 4: Candidate cannot start REVOKED invitation
    // =============================================================
    console.log("\nTEST 4: Cannot start REVOKED invitation");
    const test4Res = await startAssessmentAttempt({ invitationId: invRevokedId }, sessionCand1);
    if (!test4Res.success && test4Res.errorType === "INVITATION_REVOKED") {
      console.log("  [PASS] Revoked invitation start blocked with INVITATION_REVOKED.");
    } else {
      console.error("  [FAIL] Revoked invitation was not blocked properly:", test4Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 5: Candidate cannot start EXPIRED invitation
    // =============================================================
    console.log("\nTEST 5: Cannot start EXPIRED invitation");
    const test5Res = await startAssessmentAttempt({ invitationId: invExpiredId }, sessionCand1);
    if (!test5Res.success && test5Res.errorType === "INVITATION_EXPIRED") {
      console.log("  [PASS] Expired invitation start blocked with INVITATION_EXPIRED.");
    } else {
      console.error("  [FAIL] Expired invitation was not blocked properly:", test5Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 6: Candidate cannot start inactive (DRAFT) assessment
    // =============================================================
    console.log("\nTEST 6: Cannot start inactive (DRAFT) assessment");
    const test6Res = await startAssessmentAttempt({ invitationId: invDraftId }, sessionCand1);
    if (!test6Res.success && test6Res.errorType === "ASSESSMENT_NOT_ACTIVE") {
      console.log("  [PASS] Inactive assessment start blocked with ASSESSMENT_NOT_ACTIVE.");
    } else {
      console.error("  [FAIL] Inactive assessment was not blocked properly:", test6Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 7: Valid attempt start
    // =============================================================
    console.log("\nTEST 7: Valid attempt start creates AssessmentAttempt");
    const test7Res = await startAssessmentAttempt({ invitationId: inv1Id }, sessionCand1);
    if (test7Res.success && test7Res.attemptId) {
      candidate1AttemptId = test7Res.attemptId;
      console.log(`  [PASS] Attempt successfully started (ID: ${candidate1AttemptId}).`);

      // Verify DB record
      const dbAttempt = await prisma.assessmentAttempt.findUnique({
        where: { id: candidate1AttemptId },
        include: { invitation: true },
      });

      if (
        dbAttempt &&
        dbAttempt.status === "IN_PROGRESS" &&
        dbAttempt.startedAt &&
        dbAttempt.expiresAt &&
        dbAttempt.invitation?.status === "STARTED"
      ) {
        const remainingMinutes = Math.round(
          (dbAttempt.expiresAt.getTime() - dbAttempt.startedAt.getTime()) / (60 * 1000)
        );
        console.log(`  [PASS] Attempt status is IN_PROGRESS with deadline in ${remainingMinutes}m.`);
        console.log("  [PASS] Invitation status atomically transitioned to STARTED.");
      } else {
        console.error("  [FAIL] Database verification failed for started attempt:", dbAttempt);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] Valid attempt start failed:", test7Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 8: Duplicate start returns existing attempt (idempotent resume)
    // =============================================================
    console.log("\nTEST 8: Duplicate start returns existing attempt (idempotent resume)");
    const test8Res = await startAssessmentAttempt({ invitationId: inv1Id }, sessionCand1);
    if (test8Res.success && test8Res.attemptId === candidate1AttemptId && test8Res.resumed === true) {
      console.log("  [PASS] Duplicate start returned existing active attempt ID with resumed=true.");
    } else {
      console.error("  [FAIL] Duplicate start did not resume cleanly:", test8Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 9: Concurrent simultaneous start prevention
    // =============================================================
    console.log("\nTEST 9: Concurrent simultaneous start prevention");
    // Fire 3 simultaneous start requests for Candidate 2's Invitation 2
    const concurrentStarts = await Promise.all([
      startAssessmentAttempt({ invitationId: inv2Id }, sessionCand2),
      startAssessmentAttempt({ invitationId: inv2Id }, sessionCand2),
      startAssessmentAttempt({ invitationId: inv2Id }, sessionCand2),
    ]);

    // All should return success (either initiated or safely resumed) with the same attemptId
    const successfulAttempts = concurrentStarts.filter((r) => r.success && r.attemptId);
    const uniqueAttemptIds = new Set(successfulAttempts.map((r) => r.attemptId));

    const dbAttemptsCount = await prisma.assessmentAttempt.count({
      where: { invitationId: inv2Id },
    });

    if (uniqueAttemptIds.size === 1 && dbAttemptsCount === 1) {
      console.log("  [PASS] Concurrency guard verified: 3 simultaneous requests resolved to strictly 1 attempt.");
      console.log("  [PASS] Database integrity confirmed: Exactly 1 AssessmentAttempt in Neon DB.");
    } else {
      console.error(
        `  [FAIL] Concurrency issue: ${uniqueAttemptIds.size} unique IDs returned, ${dbAttemptsCount} records in DB`
      );
      allPassed = false;
    }

    // =============================================================
    // TEST 10: Strict Question Privacy on getAssessmentAttemptData
    // =============================================================
    console.log("\nTEST 10: Strict Question Privacy on getAssessmentAttemptData");
    const test10Res = await getAssessmentAttemptData(candidate1AttemptId, sessionCand1);
    if (test10Res.success && test10Res.data) {
      const { questions, timeRemainingSeconds, isExpired, isSubmitted } = test10Res.data;
      console.log(`  [PASS] Attempt data retrieved: ${questions.length} questions returned.`);
      console.log(`  [PASS] Server-authoritative timer: ${timeRemainingSeconds}s remaining, expired=${isExpired}, submitted=${isSubmitted}.`);

      // Verify that NO hidden test cases leaked
      let totalVisibleTestCases = 0;
      let hiddenCasesLeaked = 0;

      for (const q of questions) {
        totalVisibleTestCases += q.visibleTestCases.length;
        // Verify question starterCode is populated
        if (!q.starterCode?.python || !q.starterCode?.typescript) {
          console.error(`  [FAIL] Question ${q.title} missing starter code templates`);
          allPassed = false;
        }

        // Cross-check against database to make sure no hidden case IDs or texts are in visibleTestCases
        const dbHiddenCases = await prisma.testCase.findMany({
          where: { questionId: q.id, isHidden: true },
        });

        for (const hiddenCase of dbHiddenCases) {
          const leaked = q.visibleTestCases.find(
            (vtc) => vtc.id === hiddenCase.id || vtc.input === hiddenCase.input
          );
          if (leaked) {
            hiddenCasesLeaked++;
          }
        }
      }

      if (totalVisibleTestCases === 2 && hiddenCasesLeaked === 0) {
        console.log(`  [PASS] Anti-cheating guard verified! Exactly ${totalVisibleTestCases} visible sample cases returned.`);
        console.log("  [PASS] ZERO hidden evaluation test cases leaked in candidate API payload.");
      } else {
        console.error(`  [FAIL] Test cases leak detected! Visible: ${totalVisibleTestCases}, Hidden leaked: ${hiddenCasesLeaked}`);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] Failed to retrieve attempt data:", test10Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 11: Cross-Candidate Access & Guessed ID Protection
    // =============================================================
    console.log("\nTEST 11: Cross-Candidate Access & Guessed ID Protection");
    const test11aRes = await getAssessmentAttemptData(candidate1AttemptId, sessionCand2);
    if (!test11aRes.success && test11aRes.errorType === "FORBIDDEN") {
      console.log("  [PASS] 11a: Candidate 2 blocked from viewing Candidate 1's attempt data (403 FORBIDDEN).");
    } else {
      console.error("  [FAIL] Cross-candidate data access was not blocked:", test11aRes);
      allPassed = false;
    }

    const test11bRes = await getAssessmentAttemptData("00000000-0000-0000-0000-000000000000", sessionCand1);
    if (!test11bRes.success && test11bRes.errorType === "NOT_FOUND") {
      console.log("  [PASS] 11b: Guessed/non-existent attempt ID returned 404 NOT_FOUND.");
    } else {
      console.error("  [FAIL] Non-existent attempt ID handled incorrectly:", test11bRes);
      allPassed = false;
    }

    // =============================================================
    // TEST 12: Draft Autosave & Retrieval
    // =============================================================
    console.log("\nTEST 12: Draft Autosave & Retrieval");
    const sampleTsCode = `// Candidate 1 LRU Solution\nclass LRUCache {\n  private cap: number;\n  constructor(c: number) { this.cap = c; }\n}`;
    const samplePyCode = `# Candidate 1 Throttle Solution\ndef can_send(ts, limit):\n    return len(ts) <= limit\n`;

    const save1Res = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question1Id,
        code: sampleTsCode,
        language: "typescript",
      },
      sessionCand1
    );

    const save2Res = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question2Id,
        code: samplePyCode,
        language: "python",
      },
      sessionCand1
    );

    if (save1Res.success && save2Res.success) {
      console.log("  [PASS] Drafts saved for Question 1 (TS) and Question 2 (Python).");

      // Verify retrieval
      const reloadRes = await getAssessmentAttemptData(candidate1AttemptId, sessionCand1);
      const drafts = reloadRes.data?.savedDrafts || {};

      if (
        drafts[question1Id]?.code === sampleTsCode &&
        drafts[question1Id]?.language === "typescript" &&
        drafts[question2Id]?.code === samplePyCode &&
        drafts[question2Id]?.language === "python"
      ) {
        console.log("  [PASS] Drafts correctly persisted in Neon DB and restored upon attempt data reload.");
      } else {
        console.error("  [FAIL] Saved drafts did not match saved content:", drafts);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] Draft saves failed:", { save1Res, save2Res });
      allPassed = false;
    }

    // =============================================================
    // TEST 13: Payload Size, Language, and Question Validation
    // =============================================================
    console.log("\nTEST 13: Payload Size, Language, and Question Validation");
    // Oversized code (> 64KB)
    const oversizedCode = "a".repeat(70000);
    const test13aRes = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question1Id,
        code: oversizedCode,
        language: "typescript",
      },
      sessionCand1
    );
    if (!test13aRes.success && test13aRes.errorType === "PAYLOAD_TOO_LARGE") {
      console.log("  [PASS] 13a: Oversized code payload (>64KB) rejected with PAYLOAD_TOO_LARGE.");
    } else {
      console.error("  [FAIL] Oversized code was not rejected:", test13aRes);
      allPassed = false;
    }

    // Unsupported language
    const test13bRes = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question1Id,
        code: "test",
        language: "unsupported_lang",
      },
      sessionCand1
    );
    if (!test13bRes.success && test13bRes.errorType === "INVALID_LANGUAGE") {
      console.log("  [PASS] 13b: Unsupported language rejected with INVALID_LANGUAGE.");
    } else {
      console.error("  [FAIL] Unsupported language was not rejected:", test13bRes);
      allPassed = false;
    }

    // Invalid question ID (belongs to draft assessment)
    const draftQuestions = await prisma.question.findMany({
      where: { assessmentId: draftAssessmentId },
    });
    const foreignQuestionId = draftQuestions[0].id;

    const test13cRes = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: foreignQuestionId,
        code: "test",
        language: "python",
      },
      sessionCand1
    );
    if (!test13cRes.success && test13cRes.errorType === "INVALID_QUESTION") {
      console.log("  [PASS] 13c: Foreign question ID rejected with INVALID_QUESTION.");
    } else {
      console.error("  [FAIL] Foreign question ID was not rejected:", test13cRes);
      allPassed = false;
    }

    // =============================================================
    // TEST 14: Cross-Candidate Draft Save Isolation
    // =============================================================
    console.log("\nTEST 14: Cross-Candidate Draft Save Isolation");
    const test14Res = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question1Id,
        code: "malicious edit",
        language: "typescript",
      },
      sessionCand2
    );
    if (!test14Res.success && test14Res.errorType === "FORBIDDEN") {
      console.log("  [PASS] Candidate 2 blocked from saving drafts to Candidate 1's attempt (FORBIDDEN).");
    } else {
      console.error("  [FAIL] Cross-candidate draft save was not blocked:", test14Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 15: Server-Authoritative Timer & Expiration Enforcement
    // =============================================================
    console.log("\nTEST 15: Server-Authoritative Timer & Expiration Enforcement");
    // Temporarily fast-forward deadline to the past
    await prisma.assessmentAttempt.update({
      where: { id: candidate1AttemptId },
      data: { expiresAt: new Date(Date.now() - 5 * 60 * 1000) },
    });

    const test15Res = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question1Id,
        code: "after deadline edit",
        language: "typescript",
      },
      sessionCand1
    );

    if (!test15Res.success && test15Res.errorType === "ATTEMPT_EXPIRED") {
      console.log("  [PASS] Edits after server-authoritative deadline rejected with ATTEMPT_EXPIRED.");
    } else {
      console.error("  [FAIL] Edits after deadline were not rejected:", test15Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 15b: Grace period anti-tampering verification
    // (Cannot introduce new answers after expiry during 30s grace window)
    // =============================================================
    console.log("\nTEST 15b: Grace period anti-tampering verification");
    const candidate2Attempt = await prisma.assessmentAttempt.findFirst({
      where: { invitationId: inv2Id },
    });

    if (candidate2Attempt) {
      // 1. Candidate 2 saves legitimate draft before deadline
      const legitimateCode = "# Legitimate draft saved before deadline\ndef cand2(): pass\n";
      await saveQuestionDraft(
        {
          attemptId: candidate2Attempt.id,
          questionId: question1Id,
          code: legitimateCode,
          language: "python",
        },
        sessionCand2
      );

      // 2. Set deadline to 10 seconds in the past (within 30s grace period)
      await prisma.assessmentAttempt.update({
        where: { id: candidate2Attempt.id },
        data: {
          expiresAt: new Date(Date.now() - 10 * 1000),
          status: "IN_PROGRESS",
        },
      });

      // 3. Candidate 2 attempts to submit new answers during grace period
      const graceSubmitRes = await submitAssessmentAttempt(
        {
          attemptId: candidate2Attempt.id,
          answers: [
            {
              questionId: question1Id,
              code: "# Tampered code attempted during grace period",
              language: "python",
            },
          ],
        },
        sessionCand2
      );

      // Verify attempt is finalized as SUBMITTED, but code was NOT overwritten
      const cand2DbSub = await prisma.submission.findFirst({
        where: { attemptId: candidate2Attempt.id, questionId: question1Id },
      });

      if (
        graceSubmitRes.success &&
        cand2DbSub &&
        cand2DbSub.code === legitimateCode &&
        !cand2DbSub.code.includes("Tampered")
      ) {
        console.log("  [PASS] Anti-tampering guard verified! Grace period submission finalized without accepting new code.");
        console.log("  [PASS] Preserved legitimate pre-expiry draft; rejected post-expiry code injection.");
      } else {
        console.error("  [FAIL] Grace period allowed code tampering:", cand2DbSub);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] Candidate 2 attempt not found for Test 15b");
      allPassed = false;
    }

    // Restore active deadline for final submission test
    await prisma.assessmentAttempt.update({
      where: { id: candidate1AttemptId },
      data: {
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      },
    });

    // =============================================================
    // TEST 16: Final Submission
    // =============================================================
    console.log("\nTEST 16: Final Submission");
    const test16Res = await submitAssessmentAttempt(
      {
        attemptId: candidate1AttemptId,
        answers: [
          {
            questionId: question1Id,
            code: sampleTsCode,
            language: "typescript",
          },
          {
            questionId: question2Id,
            code: samplePyCode,
            language: "python",
          },
        ],
      },
      sessionCand1
    );

    if (test16Res.success) {
      console.log("  [PASS] Assessment attempt submitted successfully.");

      // Check DB statuses
      const dbAttempt = await prisma.assessmentAttempt.findUnique({
        where: { id: candidate1AttemptId },
        include: { invitation: true, application: true },
      });

      if (
        dbAttempt &&
        dbAttempt.status === "SUBMITTED" &&
        dbAttempt.submittedAt &&
        dbAttempt.invitation?.status === "COMPLETED" &&
        dbAttempt.application?.status === "ASSESSMENT_COMPLETED"
      ) {
        console.log("  [PASS] AssessmentAttempt status transitioned to SUBMITTED with submittedAt timestamp.");
        console.log("  [PASS] AssessmentInvitation status transitioned to COMPLETED.");
        console.log("  [PASS] Application status transitioned to ASSESSMENT_COMPLETED.");
      } else {
        console.error("  [FAIL] Database statuses not transitioned correctly:", dbAttempt);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] Final submission failed:", test16Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 17: Duplicate Final Submission Idempotency
    // =============================================================
    console.log("\nTEST 17: Duplicate Final Submission Idempotency");
    const test17Res = await submitAssessmentAttempt(
      { attemptId: candidate1AttemptId },
      sessionCand1
    );

    if (test17Res.success && test17Res.alreadySubmitted === true) {
      console.log("  [PASS] Duplicate submission handled idempotently with alreadySubmitted=true.");
    } else {
      console.error("  [FAIL] Duplicate submission did not return idempotent success:", test17Res);
      allPassed = false;
    }

    // =============================================================
    // TEST 18: Post-Submission Locked State
    // =============================================================
    console.log("\nTEST 18: Post-Submission Locked State");
    const test18Res = await saveQuestionDraft(
      {
        attemptId: candidate1AttemptId,
        questionId: question1Id,
        code: "post submit edit",
        language: "typescript",
      },
      sessionCand1
    );

    if (!test18Res.success && test18Res.errorType === "ATTEMPT_NOT_ACTIVE") {
      console.log("  [PASS] Post-submission draft save blocked with ATTEMPT_NOT_ACTIVE (read-only locked).");
    } else {
      console.error("  [FAIL] Post-submission draft save was not blocked:", test18Res);
      allPassed = false;
    }
  } catch (error) {
    console.error("FATAL TEST EXCEPTION:", error);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN: Clean up all test fixtures from Neon DB
    // -------------------------------------------------------------
    console.log("\n[Teardown] Purging test records from Neon PostgreSQL...");
    try {
      // 1. Delete submissions
      await prisma.submission.deleteMany({
        where: {
          candidateId: { in: [cand1UserId, cand2UserId].filter(Boolean) },
        },
      });

      // 2. Delete test cases
      await prisma.testCase.deleteMany({
        where: {
          question: {
            assessmentId: { in: [activeAssessmentId, draftAssessmentId].filter(Boolean) },
          },
        },
      });

      // 3. Delete questions
      await prisma.question.deleteMany({
        where: {
          assessmentId: { in: [activeAssessmentId, draftAssessmentId].filter(Boolean) },
        },
      });

      // 4. Delete attempts
      await prisma.assessmentAttempt.deleteMany({
        where: {
          candidateId: { in: [cand1UserId, cand2UserId].filter(Boolean) },
        },
      });

      // 5. Delete invitations
      await prisma.assessmentInvitation.deleteMany({
        where: {
          candidateId: { in: [cand1UserId, cand2UserId].filter(Boolean) },
        },
      });

      // 6. Delete applications
      await prisma.application.deleteMany({
        where: {
          candidateId: { in: [cand1UserId, cand2UserId].filter(Boolean) },
        },
      });

      // 7. Delete assessments
      await prisma.assessment.deleteMany({
        where: {
          creatorId: { in: [rec1UserId, rec2UserId].filter(Boolean) },
        },
      });

      // 8. Delete jobs
      await prisma.job.deleteMany({
        where: {
          recruiterId: { in: [rec1UserId, rec2UserId].filter(Boolean) },
        },
      });

      // 9. Delete users
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [rec1UserId, rec2UserId, cand1UserId, cand2UserId].filter(Boolean),
          },
        },
      });

      // 10. Delete companies
      await prisma.company.deleteMany({
        where: {
          id: { in: [company1Id, company2Id].filter(Boolean) },
        },
      });

      console.log("[Teardown] Successfully purged all test records from Neon PostgreSQL.");
    } catch (cleanupErr) {
      console.error("[Teardown Error]:", cleanupErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("  >>> ALL PHASE 4C ATTEMPT & CODING TESTS PASSED SUCCESSFULLY! <<<");
  } else {
    console.error("  >>> SOME PHASE 4C TESTS FAILED. CHECK LOGS ABOVE. <<<");
    process.exit(1);
  }
  console.log("==================================================================");
}

runAttemptTests().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
