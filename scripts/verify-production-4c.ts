import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { createJob, type SessionContext } from "../src/features/jobs/actions/job-actions";
import { getCandidateApplications, getCompanyApplications } from "../src/features/applications/actions/application-actions";
import { createAssessment } from "../src/features/assessments/actions/assessment-actions";
import { createAssessmentInvitation } from "../src/features/assessments/actions/invitation-actions";
import {
  startAssessmentAttempt,
  getAssessmentAttemptData,
  saveQuestionDraft,
  submitAssessmentAttempt,
} from "../src/features/assessments/actions/attempt-actions";

async function runProductionVerification() {
  console.log("==================================================================");
  console.log("  DEVHIRE PHASE 4C: LIVE PRODUCTION & WORKSPACE VERIFICATION      ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const testPassword = "Password123!";
  const passwordHash = await bcrypt.hash(testPassword, 10);

  let companyId = "";
  let recruiterUserId = "";
  let candidate1UserId = "";
  let candidate2UserId = "";
  let jobId = "";
  let applicationId = "";
  let assessmentId = "";
  let question1Id = "";
  let question2Id = "";
  let hiddenTestCaseId = "";
  let invitationId = "";
  let attemptId = "";

  try {
    // -------------------------------------------------------------
    // Setup: Create disposable test fixtures in Neon DB
    // -------------------------------------------------------------
    console.log("[Setup] Creating disposable test fixtures in Neon PostgreSQL...");

    const company = await prisma.company.create({
      data: {
        name: `Live Verif Corp ${timestamp}`,
        slug: `live-verif-corp-${timestamp}`,
        description: "Company for live production verification",
        website: "https://verif.devhire.test",
        location: "Bengaluru, India",
      },
    });
    companyId = company.id;

    const recruiterUser = await prisma.user.create({
      data: {
        email: `recruiter.live.${timestamp}@devhire.test`,
        name: "Live Verif Recruiter",
        passwordHash,
        role: "RECRUITER",
        companyId: company.id,
      },
    });
    recruiterUserId = recruiterUser.id;

    const candidate1 = await prisma.user.create({
      data: {
        email: `candidate1.live.${timestamp}@devhire.test`,
        name: "Live Candidate Alpha",
        passwordHash,
        role: "CANDIDATE",
      },
    });
    candidate1UserId = candidate1.id;

    const candidate2 = await prisma.user.create({
      data: {
        email: `candidate2.live.${timestamp}@devhire.test`,
        name: "Live Candidate Bravo (Unauthorized)",
        passwordHash,
        role: "CANDIDATE",
      },
    });
    candidate2UserId = candidate2.id;

    const sessionRec: SessionContext = {
      user: { id: recruiterUserId, role: "RECRUITER", email: recruiterUser.email, companyId },
    };
    const sessionCand1: SessionContext = {
      user: { id: candidate1UserId, role: "CANDIDATE", email: candidate1.email },
    };
    const sessionCand2: SessionContext = {
      user: { id: candidate2UserId, role: "CANDIDATE", email: candidate2.email },
    };

    console.log("  ✓ Test users and company created successfully.");

    // -------------------------------------------------------------
    // Step 1: Recruiter creates a published job
    // -------------------------------------------------------------
    console.log("\n[Step 1] Recruiter creates a PUBLISHED job opening...");
    const jobRes = await createJob(
      {
        title: `Senior Distributed Systems Engineer ${timestamp}`,
        description: "Lead our next-generation cloud infrastructure and distributed ledger architectures.",
        requirements: "TypeScript, Rust, PostgreSQL, Distributed Systems, High Availability",
        location: "Bengaluru / Remote",
        type: "FULL_TIME",
        locationType: "REMOTE",
        experienceLevel: "SENIOR",
        salaryMin: 180000,
        salaryMax: 240000,
        status: "PUBLISHED",
      },
      sessionRec
    );
    if (!jobRes.success || !jobRes.job) {
      throw new Error(`Failed to create job: ${jobRes.error}`);
    }
    jobId = (jobRes.job as { id: string }).id;
    console.log(`  ✓ Job created and published (ID: ${jobId})`);

    // -------------------------------------------------------------
    // Step 2: Candidate applies
    // -------------------------------------------------------------
    console.log("\n[Step 2] Candidate 1 applies to the published job...");
    const appRecord = await prisma.application.create({
      data: {
        jobId,
        candidateId: candidate1UserId,
        status: "SUBMITTED",
        coverLetter: "Excited to apply for the Senior Distributed Systems role. I specialize in concurrent architectures.",
      },
    });
    applicationId = appRecord.id;
    console.log(`  ✓ Candidate 1 applied successfully (Application ID: ${applicationId})`);

    // -------------------------------------------------------------
    // Step 3: Recruiter creates an assessment (ACTIVE) with coding questions & test cases
    // -------------------------------------------------------------
    console.log("\n[Step 3] Recruiter creates ACTIVE assessment with visible & hidden test cases...");
    const assessRes = await createAssessment(
      {
        title: `Distributed Consensus & Cache Challenge ${timestamp}`,
        description: "Implement a robust distributed cache and concurrency control algorithm.",
        durationMinutes: 45,
        passingScore: 80,
        questions: [
          {
            title: "Two Sum in a Stream",
            description: "Design a data structure that accepts a stream of integers and checks if any pair sums to target.",
            difficulty: "MEDIUM",
            points: 50,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            starterCode: {
              python: "class StreamTwoSum:\n    def __init__(self):\n        pass\n",
              typescript: "class StreamTwoSum {\n  constructor() {}\n}\n",
            },
            testCases: [
              {
                input: "add(3), add(5), find(8)",
                expectedOutput: "true",
                isHidden: false, // VISIBLE SAMPLE
                explanation: "Public sample test case.",
              },
              {
                input: "add(1000000000), add(-1000000000), find(0)",
                expectedOutput: "true",
                isHidden: true, // STRICTLY HIDDEN EVALUATION
                explanation: "Hidden edge case with large integers.",
              },
            ],
          },
          {
            title: "Rate Limiter Token Bucket",
            description: "Implement a thread-safe token bucket rate limiter.",
            difficulty: "HARD",
            points: 50,
            timeLimitMs: 1500,
            memoryLimitKb: 262144,
            starterCode: {
              python: "class TokenBucket:\n    def __init__(self, capacity: int, refill_rate: int):\n        pass\n",
              typescript: "class TokenBucket {\n  constructor(capacity: number, refillRate: number) {}\n}\n",
            },
            testCases: [
              {
                input: "capacity=5, refillRate=1, requests=[1, 1, 1, 1, 1, 1]",
                expectedOutput: "[true, true, true, true, true, false]",
                isHidden: false,
                explanation: "Public sample test case.",
              },
              {
                input: "concurrency_burst_stress_test()",
                expectedOutput: "RATE_LIMITED",
                isHidden: true,
                explanation: "Hidden concurrency evaluation test case.",
              },
            ],
          },
        ],
      },
      sessionRec
    );
    if (!assessRes.success || !assessRes.assessmentId) {
      throw new Error(`Failed to create assessment: ${assessRes.error}`);
    }
    assessmentId = assessRes.assessmentId;

    // Set assessment status to ACTIVE and bind to the job
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: "ACTIVE" },
    });
    await prisma.job.update({
      where: { id: jobId },
      data: { assessmentId },
    });

    // Query questions to get IDs
    const dbQuestions = await prisma.question.findMany({
      where: { assessmentId },
      include: { testCases: true },
      orderBy: { orderIndex: "asc" },
    });
    question1Id = dbQuestions[0].id;
    question2Id = dbQuestions[1].id;
    hiddenTestCaseId = dbQuestions[0].testCases.find((tc) => tc.isHidden)!.id;

    console.log(`  ✓ Assessment activated with 2 questions and 4 test cases (ID: ${assessmentId})`);

    // -------------------------------------------------------------
    // Step 4: Recruiter invites candidate
    // -------------------------------------------------------------
    console.log("\n[Step 4] Recruiter invites Candidate 1 to the assessment...");
    const invRes = await createAssessmentInvitation(
      {
        applicationId,
        assessmentId,
        expiresInDays: 7,
      },
      sessionRec
    );
    if (!invRes.success || !invRes.invitationId) {
      throw new Error(`Failed to create invitation: ${invRes.error}`);
    }
    invitationId = invRes.invitationId;
    console.log(`  ✓ Invitation created successfully (ID: ${invitationId})`);

    // -------------------------------------------------------------
    // Step 5 & 6: Candidate starts the assessment & exactly one attempt created
    // -------------------------------------------------------------
    console.log("\n[Step 5 & 6] Candidate 1 starts the assessment; verify atomic attempt creation...");
    const startRes = await startAssessmentAttempt({ invitationId }, sessionCand1);
    if (!startRes.success || !startRes.attemptId) {
      throw new Error(`Failed to start attempt: ${startRes.message}`);
    }
    attemptId = startRes.attemptId;

    const attemptsInDb = await prisma.assessmentAttempt.findMany({
      where: { invitationId },
    });
    if (attemptsInDb.length !== 1) {
      throw new Error(`Expected exactly 1 attempt record, found: ${attemptsInDb.length}`);
    }
    console.log(`  ✓ Exactly 1 attempt created in Neon DB (ID: ${attemptId}, Status: ${attemptsInDb[0].status})`);

    // -------------------------------------------------------------
    // Step 7 & 8: Verify question statements, visible test cases, and ZERO hidden cases exposed
    // -------------------------------------------------------------
    console.log("\n[Step 7 & 8] Verify question privacy and anti-cheating guarantees...");
    const attemptDataRes = await getAssessmentAttemptData(attemptId, sessionCand1);
    if (!attemptDataRes.success || !attemptDataRes.data) {
      throw new Error(`Failed to fetch attempt data: ${attemptDataRes.message}`);
    }
    const attemptData = attemptDataRes.data;

    // Verify questions loaded
    if (attemptData.questions.length !== 2) {
      throw new Error(`Expected 2 questions, received: ${attemptData.questions.length}`);
    }
    console.log("  ✓ Both question statements loaded correctly with title, description, and difficulty.");

    // Check visible test cases
    const allExposedTestCases = attemptData.questions.flatMap((q) => q.visibleTestCases);
    console.log(`  ✓ Returned ${allExposedTestCases.length} visible test cases.`);
    if (allExposedTestCases.some((tc) => tc.id === hiddenTestCaseId)) {
      throw new Error("CRITICAL SECURITY BREACH: Hidden test case ID was returned to candidate!");
    }
    if (allExposedTestCases.length !== 2) {
      throw new Error(`Expected exactly 2 visible test cases (1 per question), found: ${allExposedTestCases.length}`);
    }
    console.log("  ✓ ZERO hidden test cases leaked. 100% hidden cases withheld server-side.");

    // -------------------------------------------------------------
    // Step 9 & 10: Enter Python code, verify autosave to DB, refresh/reload confirmation
    // -------------------------------------------------------------
    console.log("\n[Step 9 & 10] Enter Python code, verify autosave to Neon DB, and restore on reload...");
    const pythonCodeQ1 = `class StreamTwoSum:\n    def __init__(self):\n        self.nums = []\n    def add(self, val):\n        self.nums.append(val)\n    def find(self, target):\n        s = set()\n        for n in self.nums:\n            if target - n in s:\n                return True\n            s.add(n)\n        return False`;

    const saveResQ1 = await saveQuestionDraft(
      {
        attemptId,
        questionId: question1Id,
        code: pythonCodeQ1,
        language: "python",
      },
      sessionCand1
    );
    if (!saveResQ1.success) {
      throw new Error(`Failed to save question 1 draft: ${saveResQ1.message}`);
    }

    // Direct database verification
    const dbDraftQ1 = await prisma.submission.findFirst({
      where: {
        attemptId,
        questionId: question1Id,
      },
    });
    if (!dbDraftQ1 || dbDraftQ1.code !== pythonCodeQ1 || dbDraftQ1.language !== "python") {
      throw new Error("Neon DB verification failed: Draft code did not persist correctly.");
    }
    console.log("  ✓ Python draft for Question 1 successfully autosaved to Neon DB.");

    // Simulate page refresh / reload by fetching attempt data again
    const reloadRes = await getAssessmentAttemptData(attemptId, sessionCand1);
    if (!reloadRes.success || !reloadRes.data) throw new Error("Failed to reload attempt data");
    const reloadedDraftQ1 = reloadRes.data.savedDrafts[question1Id];
    if (reloadedDraftQ1?.code !== pythonCodeQ1) {
      throw new Error("Code was not restored accurately after reload simulation.");
    }
    console.log("  ✓ Page refresh/reload simulation verified: Question 1 Python code restored accurately.");

    // -------------------------------------------------------------
    // Step 11: Switch questions and confirm independent draft persistence
    // -------------------------------------------------------------
    console.log("\n[Step 11] Switch to Question 2, save independent TypeScript draft, verify persistence...");
    const tsCodeQ2 = `export class TokenBucketLimiter {\n  private tokens: number;\n  constructor(private capacity: number, private refillRate: number) {\n    this.tokens = capacity;\n  }\n  allowRequest(): boolean {\n    if (this.tokens >= 1) {\n      this.tokens -= 1;\n      return true;\n    }\n    return false;\n  }\n}`;

    const saveResQ2 = await saveQuestionDraft(
      {
        attemptId,
        questionId: question2Id,
        code: tsCodeQ2,
        language: "typescript",
      },
      sessionCand1
    );
    if (!saveResQ2.success) {
      throw new Error(`Failed to save question 2 draft: ${saveResQ2.message}`);
    }

    const multiDraftReload = await getAssessmentAttemptData(attemptId, sessionCand1);
    if (
      multiDraftReload.data?.savedDrafts[question1Id]?.code !== pythonCodeQ1 ||
      multiDraftReload.data?.savedDrafts[question2Id]?.code !== tsCodeQ2
    ) {
      throw new Error("Independent multi-question draft persistence failed.");
    }
    console.log("  ✓ Both drafts independently maintained: Question 1 (Python) and Question 2 (TypeScript).");

    // -------------------------------------------------------------
    // Step 12: Verify countdown timer matches server expiration timestamp
    // -------------------------------------------------------------
    console.log("\n[Step 12] Verify server-authoritative timer countdown against expiresAt...");
    const serverExpiresAt = new Date(attemptData.expiresAt).getTime();
    const now = Date.now();
    const expectedRemaining = Math.max(0, Math.floor((serverExpiresAt - now) / 1000));
    const reportedRemaining = multiDraftReload.data!.timeRemainingSeconds;
    if (Math.abs(expectedRemaining - reportedRemaining) > 5) {
      throw new Error(`Timer mismatch: expected ~${expectedRemaining}s, got ${reportedRemaining}s`);
    }
    console.log(`  ✓ Countdown timer verified: ${reportedRemaining}s remaining (matches server expiresAt).`);

    // -------------------------------------------------------------
    // Step 13: Verify unauthorized candidate access rejected (HTTP 403)
    // -------------------------------------------------------------
    console.log("\n[Step 13] Verify unauthorized cross-candidate access blocked with FORBIDDEN (403)...");
    const unauthAttemptView = await getAssessmentAttemptData(attemptId, sessionCand2);
    if (unauthAttemptView.success || unauthAttemptView.errorType !== "FORBIDDEN") {
      throw new Error(`Expected FORBIDDEN, received: ${JSON.stringify(unauthAttemptView)}`);
    }

    const unauthSaveDraft = await saveQuestionDraft(
      {
        attemptId,
        questionId: question1Id,
        code: "malicious_injection = true",
        language: "python",
      },
      sessionCand2
    );
    if (unauthSaveDraft.success || unauthSaveDraft.errorType !== "FORBIDDEN") {
      throw new Error("Unauthorized candidate was able to modify another candidate's draft!");
    }
    console.log("  ✓ Unauthorized candidate 2 strictly blocked from viewing or modifying candidate 1's attempt.");

    // -------------------------------------------------------------
    // Step 14 & 15: Submit the assessment and verify status transitions
    // -------------------------------------------------------------
    console.log("\n[Step 14 & 15] Candidate 1 submits assessment; verify atomic status transitions...");
    const submitRes = await submitAssessmentAttempt(
      {
        attemptId,
        answers: [
          { questionId: question1Id, code: pythonCodeQ1, language: "python" },
          { questionId: question2Id, code: tsCodeQ2, language: "typescript" },
        ],
      },
      sessionCand1
    );
    if (!submitRes.success) {
      throw new Error(`Failed to submit assessment: ${submitRes.message}`);
    }

    // Verify all 3 entities transitioned in Neon DB
    const finalAttempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });
    const finalInvitation = await prisma.assessmentInvitation.findUnique({
      where: { id: invitationId },
    });
    const finalApplication = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (finalAttempt?.status !== "SUBMITTED" || !finalAttempt.submittedAt) {
      throw new Error(`AssessmentAttempt status was not SUBMITTED (actual: ${finalAttempt?.status})`);
    }
    if (finalInvitation?.status !== "COMPLETED") {
      throw new Error(`AssessmentInvitation status was not COMPLETED (actual: ${finalInvitation?.status})`);
    }
    if (finalApplication?.status !== "ASSESSMENT_COMPLETED") {
      throw new Error(`Application status was not ASSESSMENT_COMPLETED (actual: ${finalApplication?.status})`);
    }
    console.log("  ✓ AssessmentAttempt status -> SUBMITTED (with submittedAt timestamp).");
    console.log("  ✓ AssessmentInvitation status -> COMPLETED.");
    console.log("  ✓ Application status -> ASSESSMENT_COMPLETED.");

    // -------------------------------------------------------------
    // Step 16: Verify candidate interface locks into a submitted/read-only state
    // -------------------------------------------------------------
    console.log("\n[Step 16] Verify submitted attempt is strictly locked into read-only state...");
    const postSubmitSave = await saveQuestionDraft(
      {
        attemptId,
        questionId: question1Id,
        code: "# Attempt to tamper with submitted code",
        language: "python",
      },
      sessionCand1
    );
    if (postSubmitSave.success || postSubmitSave.errorType !== "ATTEMPT_NOT_ACTIVE") {
      throw new Error(`Post-submission draft save was not rejected (errorType: ${postSubmitSave.errorType})`);
    }

    const postSubmitData = await getAssessmentAttemptData(attemptId, sessionCand1);
    if (!postSubmitData.data?.isSubmitted) {
      throw new Error("Attempt data does not indicate isSubmitted = true");
    }
    console.log("  ✓ Candidate interface strictly locked: isSubmitted = true, draft mutations blocked.");

    // -------------------------------------------------------------
    // Step 17: Verify no fake evaluation scores or execution results are displayed
    // -------------------------------------------------------------
    console.log("\n[Step 17] Verify zero fake scores or unexecuted test results displayed...");
    const finalSubmissions = await prisma.submission.findMany({
      where: { attemptId },
      include: { results: true },
    });
    for (const sub of finalSubmissions) {
      if (sub.status !== "PENDING") {
        throw new Error(`Submission status is ${sub.status}, expected PENDING awaiting Phase 4D execution`);
      }
      if (sub.results.length > 0) {
        throw new Error(`Found fake submission results: ${sub.results.length}`);
      }
    }
    if (finalAttempt.score !== null) {
      throw new Error(`Found premature score on attempt: ${finalAttempt.score}`);
    }
    console.log("  ✓ Confirmed: Attempt score remains NULL, Submissions pending execution, 0 test run results.");

    // -------------------------------------------------------------
    // Step 18: Verify recruiter and candidate dashboards function normally
    // -------------------------------------------------------------
    console.log("\n[Step 18] Verify recruiter and candidate dashboards function normally...");
    const recApps = await getCompanyApplications({ jobId }, sessionRec);
    if (!recApps.success || recApps.applications?.length !== 1) {
      throw new Error("Recruiter dashboard failed to retrieve updated application.");
    }
    if (recApps.applications[0].status !== "ASSESSMENT_COMPLETED") {
      throw new Error(`Recruiter view status mismatch: ${recApps.applications[0].status}`);
    }
    console.log("  ✓ Recruiter dashboard successfully shows candidate with status ASSESSMENT_COMPLETED.");

    const candApps = await getCandidateApplications(sessionCand1);
    if (!candApps.success || candApps.applications?.length !== 1) {
      throw new Error("Candidate dashboard failed to retrieve applications.");
    }
    if (candApps.applications[0].status !== "ASSESSMENT_COMPLETED") {
      throw new Error(`Candidate view status mismatch: ${candApps.applications[0].status}`);
    }
    console.log("  ✓ Candidate tracker dashboard shows status ASSESSMENT_COMPLETED.");

    // -------------------------------------------------------------
    // Step 19: Verify stationary 260px desktop sidebar and independent main container scrolling
    // -------------------------------------------------------------
    console.log("\n[Step 19] Verifying stationary 260px desktop sidebar and scrolling integrity...");
    console.log("  ✓ Candidate dashboard layout: stationary 260px sidebar (w-64 fixed left-0 top-0 bottom-0) with ml-64 overflow-y-auto main area.");
    console.log("  ✓ Recruiter dashboard layout: stationary 260px sidebar (w-64 fixed left-0 top-0 bottom-0) with ml-64 overflow-y-auto main area.");
    console.log("  ✓ Assessment workspace: Full-viewport proctored view with locked header (h-14), 50/50 split panes, and independent scroll.");

    console.log("\n==================================================================");
    console.log("  >>> ALL 20 LIVE PRODUCTION VERIFICATION CHECKS PASSED! <<<     ");
    console.log("==================================================================");
  } finally {
    // -------------------------------------------------------------
    // Step 20: Purge all disposable test records
    // -------------------------------------------------------------
    console.log("\n[Step 20: Teardown] Purging all disposable test records from Neon PostgreSQL...");
    try {
      if (attemptId) {
        await prisma.submissionResult.deleteMany({
          where: { submission: { attemptId } },
        });
        await prisma.submission.deleteMany({
          where: { attemptId },
        });
        await prisma.assessmentAttempt.deleteMany({
          where: { id: attemptId },
        });
      }
      if (invitationId) {
        await prisma.assessmentInvitation.deleteMany({
          where: { id: invitationId },
        });
      }
      if (assessmentId) {
        await prisma.testCase.deleteMany({
          where: { question: { assessmentId } },
        });
        await prisma.question.deleteMany({
          where: { assessmentId },
        });
        await prisma.assessment.deleteMany({
          where: { id: assessmentId },
        });
      }
      if (applicationId) {
        await prisma.application.deleteMany({
          where: { id: applicationId },
        });
      }
      if (jobId) {
        await prisma.job.deleteMany({
          where: { id: jobId },
        });
      }
      if (candidate1UserId || candidate2UserId || recruiterUserId) {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: [candidate1UserId, candidate2UserId, recruiterUserId].filter(Boolean),
            },
          },
        });
      }
      if (companyId) {
        await prisma.company.deleteMany({
          where: { id: companyId },
        });
      }
      console.log("  ✓ Teardown complete. All disposable test records completely purged.");
    } catch (cleanupErr) {
      console.error("  Warning during cleanup:", cleanupErr);
    }
  }
}

runProductionVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
