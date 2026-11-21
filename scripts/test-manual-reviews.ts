import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  getCompanySubmissionsForReview,
  getAttemptReviewDetails,
  saveAssessmentReviewDraft,
  finalizeAndPublishReview,
  getCandidateAssessmentHistory,
} from "../src/features/assessments/actions/review-actions";
import {
  createAssessment,
} from "../src/features/assessments/actions/assessment-actions";
import {
  createAssessmentInvitation,
} from "../src/features/assessments/actions/invitation-actions";
import {
  startAssessmentAttempt,
  saveQuestionDraft,
  submitAssessmentAttempt,
} from "../src/features/assessments/actions/attempt-actions";
import {
  createJob,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";

async function runManualReviewTests() {
  console.log("==================================================================");
  console.log("   DEVHIRE PHASE 5: MANUAL TECHNICAL CODE REVIEW TEST SUITE       ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `rec1.revtest.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `rec2.revtest.${timestamp}@devhire.test`;
  const CANDIDATE_1_EMAIL = `cand1.revtest.${timestamp}@devhire.test`;
  const CANDIDATE_2_EMAIL = `cand2.revtest.${timestamp}@devhire.test`;
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
  let assessmentId = "";
  let question1Id = "";
  let question2Id = "";
  let invitationId = "";
  let attemptId = "";

  try {
    // -------------------------------------------------------------
    // SETUP: Create companies, recruiters, candidates, job, assessment
    // -------------------------------------------------------------
    console.log("\n[Setup 1/4] Creating test companies and users in Neon DB...");
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const company1 = await prisma.company.create({
      data: {
        name: `Acme Engineering Labs ${timestamp}`,
        slug: `acme-rev-${timestamp}`,
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
      },
    });
    company1Id = company1.id;

    const company2 = await prisma.company.create({
      data: {
        name: `Rival Tech Labs ${timestamp}`,
        slug: `rival-rev-${timestamp}`,
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
        name: "Alice Reviewee",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
      },
    });
    cand1UserId = cand1User.id;

    const cand2User = await prisma.user.create({
      data: {
        email: CANDIDATE_2_EMAIL,
        name: "Bob Unrelated",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
      },
    });
    cand2UserId = cand2User.id;

    const sessionRec1: SessionContext = {
      user: { id: rec1UserId, role: "RECRUITER", email: RECRUITER_1_EMAIL, companyId: company1Id },
    };
    const sessionRec2: SessionContext = {
      user: { id: rec2UserId, role: "RECRUITER", email: RECRUITER_2_EMAIL, companyId: company2Id },
    };
    const sessionCand1: SessionContext = {
      user: { id: cand1UserId, role: "CANDIDATE", email: CANDIDATE_1_EMAIL },
    };
    const sessionCand2: SessionContext = {
      user: { id: cand2UserId, role: "CANDIDATE", email: CANDIDATE_2_EMAIL },
    };

    console.log("[Setup 2/4] Creating job and application...");
    const job1Res = await createJob(
      {
        title: "Staff Distributed Systems Engineer",
        description: "Build fault-tolerant consensus systems.",
        requirements: "Go, Rust, Raft",
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
        coverLetter: "Excited to demonstrate distributed consensus architecture.",
      },
    });
    app1Id = app1.id;

    console.log("[Setup 3/4] Creating assessment with 2 questions and test cases...");
    const assessRes = await createAssessment(
      {
        title: "Distributed Systems Algorithmic Benchmark",
        description: "Evaluate concurrency primitives and tree algorithms.",
        durationMinutes: 45,
        passingScore: 70,
        jobId: job1Id,
        questions: [
          {
            title: "Question 1: Invert Binary Search Tree",
            description: "Given root, invert the tree and return root.",
            difficulty: "MEDIUM",
            points: 50,
            timeLimitMs: 2000,
            memoryLimitKb: 128000,
            starterCode: { javascript: "function invertTree(root) {\n  // Code here\n}" },
            orderIndex: 0,
            testCases: [
              { input: "[4,2,7,1,3,6,9]", expectedOutput: "[4,7,2,9,6,3,1]", isHidden: false, weight: 50 },
              { input: "[2,1,3]", expectedOutput: "[2,3,1]", isHidden: true, weight: 50 },
            ],
          },
          {
            title: "Question 2: Token Bucket Rate Limiter",
            description: "Implement a thread-safe token bucket rate limiter.",
            difficulty: "HARD",
            points: 50,
            timeLimitMs: 3000,
            memoryLimitKb: 256000,
            starterCode: { javascript: "class TokenBucket {\n  // Implementation\n}" },
            orderIndex: 1,
            testCases: [
              { input: "10, 1", expectedOutput: "true", isHidden: false, weight: 50 },
              { input: "0, 1", expectedOutput: "false", isHidden: true, weight: 50 },
            ],
          },
        ],
      },
      sessionRec1
    );

    if (!assessRes.success || !assessRes.assessmentId) {
      throw new Error(`Assessment creation failed: ${assessRes.message}`);
    }
    assessmentId = assessRes.assessmentId;

    // Activate assessment
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: "ACTIVE" },
    });

    const dbQuestions = await prisma.question.findMany({
      where: { assessmentId },
      orderBy: { orderIndex: "asc" },
    });
    question1Id = dbQuestions[0].id;
    question2Id = dbQuestions[1].id;

    console.log("[Setup 4/4] Inviting candidate and submitting real coding attempt...");
    const invRes = await createAssessmentInvitation(
      {
        assessmentId,
        applicationId: app1Id,
        expiresInDays: 7,
      },
      sessionRec1
    );

    if (!invRes.success || !invRes.invitationId) {
      throw new Error(`Invitation creation failed: ${invRes.message}`);
    }
    invitationId = invRes.invitationId;

    // Candidate starts attempt
    const startRes = await startAssessmentAttempt({ invitationId }, sessionCand1);
    if (!startRes.success || !startRes.attemptId) {
      throw new Error(`Attempt start failed: ${startRes.message}`);
    }
    attemptId = startRes.attemptId;

    // Candidate saves code drafts
    const candidateCodeQ1 = "function invertTree(root) {\n  if (!root) return null;\n  const temp = root.left;\n  root.left = invertTree(root.right);\n  root.right = invertTree(temp);\n  return root;\n}";
    const candidateCodeQ2 = "class TokenBucket {\n  constructor(capacity, refillRate) {\n    this.capacity = capacity;\n    this.tokens = capacity;\n    this.refillRate = refillRate;\n    this.lastRefill = Date.now();\n  }\n  allow() {\n    this.refill();\n    if (this.tokens >= 1) {\n      this.tokens -= 1;\n      return true;\n    }\n    return false;\n  }\n  refill() {\n    const now = Date.now();\n    const elapsed = (now - this.lastRefill) / 1000;\n    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);\n    this.lastRefill = now;\n  }\n}";

    await saveQuestionDraft(
      {
        attemptId,
        questionId: question1Id,
        code: candidateCodeQ1,
        language: "javascript",
      },
      sessionCand1
    );

    await saveQuestionDraft(
      {
        attemptId,
        questionId: question2Id,
        code: candidateCodeQ2,
        language: "javascript",
      },
      sessionCand1
    );

    // Candidate submits attempt
    const submitRes = await submitAssessmentAttempt({ attemptId }, sessionCand1);
    if (!submitRes.success) {
      throw new Error(`Candidate submission failed: ${submitRes.message}`);
    }
    console.log(`[Setup Complete] Candidate submitted attempt ${attemptId}. Total points available: 100.`);

    // =============================================================
    // TEST 1: Recruiter Submissions Retrieval & Status Counters
    // =============================================================
    console.log("\n[TEST 1] Testing recruiter submission retrieval & status counters...");
    const subListRes = await getCompanySubmissionsForReview("ALL", sessionRec1);
    if (!subListRes.success || !subListRes.submissions) {
      console.error("FAIL: Recruiter 1 failed to retrieve submissions:", subListRes.message);
      allPassed = false;
    } else {
      const targetSub = subListRes.submissions.find((s) => s.attemptId === attemptId);
      if (!targetSub) {
        console.error("FAIL: Submitted attempt not found in recruiter's review queue.");
        allPassed = false;
      } else if (targetSub.reviewStatus !== "AWAITING_REVIEW") {
        console.error(`FAIL: Expected reviewStatus to be 'AWAITING_REVIEW', got '${targetSub.reviewStatus}'`);
        allPassed = false;
      } else if (subListRes.counts.awaitingReview < 1) {
        console.error("FAIL: awaitingReview count should be at least 1.");
        allPassed = false;
      } else {
        console.log("PASS: Submissions retrieved successfully with reviewStatus='AWAITING_REVIEW' and accurate counts.");
      }
    }

    // =============================================================
    // TEST 2: Recruiter Attempt Review Details Fetch
    // =============================================================
    console.log("\n[TEST 2] Testing getAttemptReviewDetails for recruiter...");
    const detailRes = await getAttemptReviewDetails(attemptId, sessionRec1);
    if (!detailRes.success || !detailRes.data) {
      console.error("FAIL: Recruiter 1 failed to fetch attempt review details:", detailRes.message);
      allPassed = false;
    } else {
      const data = detailRes.data;
      if (data.questions.length !== 2) {
        console.error(`FAIL: Expected 2 questions in review detail, found ${data.questions.length}`);
        allPassed = false;
      } else if (data.questions[0].candidateCode !== candidateCodeQ1) {
        console.error("FAIL: Question 1 candidate code mismatch.");
        allPassed = false;
      } else if (data.review !== null) {
        console.error("FAIL: Review should be null before any draft is created.");
        allPassed = false;
      } else {
        console.log("PASS: Recruiter successfully retrieved complete attempt review details with accurate question code.");
      }
    }

    // =============================================================
    // TEST 3: Score Validation (Negative points and Exceeding points)
    // =============================================================
    console.log("\n[TEST 3] Testing review score boundary validation...");

    // 3a. Negative points
    const negScoreRes = await saveAssessmentReviewDraft(
      {
        attemptId,
        overallFeedback: "Great effort overall.",
        questionReviews: [
          { questionId: question1Id, pointsEarned: -10, feedback: "Negative score invalid" },
          { questionId: question2Id, pointsEarned: 40, feedback: "Solid" },
        ],
      },
      sessionRec1
    );
    if (negScoreRes.success) {
      console.error("FAIL: saveAssessmentReviewDraft allowed negative points (-10).");
      allPassed = false;
    } else {
      console.log("PASS: Correctly rejected negative points with message:", negScoreRes.message);
    }

    // 3b. Exceeding max points
    const exceedScoreRes = await saveAssessmentReviewDraft(
      {
        attemptId,
        overallFeedback: "Great effort overall.",
        questionReviews: [
          { questionId: question1Id, pointsEarned: 999, feedback: "Points exceed maxPoints" },
          { questionId: question2Id, pointsEarned: 40, feedback: "Solid" },
        ],
      },
      sessionRec1
    );
    if (exceedScoreRes.success) {
      console.error("FAIL: saveAssessmentReviewDraft allowed score exceeding max points (999 > 50).");
      allPassed = false;
    } else {
      console.log("PASS: Correctly rejected score exceeding question max points with message:", exceedScoreRes.message);
    }

    // =============================================================
    // TEST 4: Save Review Draft & Candidate Privacy Isolation
    // =============================================================
    console.log("\n[TEST 4] Testing save review draft & draft privacy from candidate...");
    const draftSaveRes = await saveAssessmentReviewDraft(
      {
        attemptId,
        overallFeedback: "Draft evaluation: Strong recursion skills, minor concurrency consideration.",
        questionReviews: [
          { questionId: question1Id, pointsEarned: 48, feedback: "Clean recursive solution, optimal time O(N)." },
          { questionId: question2Id, pointsEarned: 42, feedback: "Good token bucket implementation, consider monotonic clock." },
        ],
      },
      sessionRec1
    );

    if (!draftSaveRes.success) {
      console.error("FAIL: Failed to save review draft:", draftSaveRes.message);
      allPassed = false;
    } else {
      console.log("PASS: Review draft saved successfully.");

      // Check DB state for draft
      const dbReview = await prisma.assessmentReview.findUnique({
        where: { attemptId },
        include: { questionReviews: true },
      });

      if (!dbReview) {
        console.error("FAIL: AssessmentReview record not found in database.");
        allPassed = false;
      } else if (dbReview.status !== "DRAFT") {
        console.error(`FAIL: Expected review status 'DRAFT', got '${dbReview.status}'`);
        allPassed = false;
      } else if (dbReview.totalScore !== 90) {
        console.error(`FAIL: Expected totalScore 90 (48+42), got ${dbReview.totalScore}`);
        allPassed = false;
      } else {
        console.log(`PASS: DB AssessmentReview verified in DRAFT status with totalScore=${dbReview.totalScore}.`);
      }

      // Verify AssessmentAttempt status is STILL SUBMITTED (NOT EVALUATED) and score is NOT set
      const dbAttempt = await prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
      });
      if (dbAttempt?.status === "EVALUATED") {
        console.error("FAIL: AssessmentAttempt.status prematurely changed to EVALUATED while review is in DRAFT.");
        allPassed = false;
      } else if (dbAttempt?.score !== null) {
        console.error("FAIL: AssessmentAttempt.score prematurely populated while review is in DRAFT.");
        allPassed = false;
      } else {
        console.log("PASS: AssessmentAttempt status remains SUBMITTED and score is null during draft review.");
      }

      // Check Candidate Assessment History - Draft MUST be hidden
      const candHistoryRes = await getCandidateAssessmentHistory(sessionCand1);
      if (!candHistoryRes.success || !candHistoryRes.history) {
        console.error("FAIL: Candidate failed to fetch assessment history:", candHistoryRes.message);
        allPassed = false;
      } else {
        const historyItem = candHistoryRes.history.find((h) => h.attemptId === attemptId);
        if (!historyItem) {
          console.error("FAIL: Candidate history missing submitted attempt.");
          allPassed = false;
        } else if (historyItem.lifecycleState !== "SUBMITTED_AWAITING_REVIEW") {
          console.error(`FAIL: Expected candidate lifecycleState 'SUBMITTED_AWAITING_REVIEW', got '${historyItem.lifecycleState}'`);
          allPassed = false;
        } else if (historyItem.score !== null) {
          console.error("FAIL: Candidate leaked score while review is DRAFT!");
          allPassed = false;
        } else if (historyItem.feedback !== null) {
          console.error("FAIL: Candidate leaked reviewer feedback while review is DRAFT!");
          allPassed = false;
        } else {
          console.log("PASS: Candidate assessment history strictly hides draft scores and draft feedback.");
        }
      }

      // Candidate attempting to fetch attempt review details for draft must NOT see the draft review
      const candDetailRes = await getAttemptReviewDetails(attemptId, sessionCand1);
      if (!candDetailRes.success || !candDetailRes.data) {
        console.error("FAIL: Candidate failed to fetch attempt details:", candDetailRes.message);
        allPassed = false;
      } else if (candDetailRes.data.review !== null) {
        console.error("FAIL: Candidate getAttemptReviewDetails leaked unpublished draft review!");
        allPassed = false;
      } else {
        console.log("PASS: Candidate getAttemptReviewDetails returns null review while in DRAFT status.");
      }
    }

    // =============================================================
    // TEST 5: Atomic Concurrency & Simultaneous Publication Protection
    // =============================================================
    console.log("\n[TEST 5] Testing atomic concurrency & simultaneous publication protection...");
    const [pubA, pubB] = await Promise.all([
      finalizeAndPublishReview(
        {
          attemptId,
          overallFeedback: "Final evaluation A: Exceptional problem solving, production-grade clean code.",
          questionReviews: [
            { questionId: question1Id, pointsEarned: 50, feedback: "Flawless recursion, optimal memory and time." },
            { questionId: question2Id, pointsEarned: 45, feedback: "Very strong token bucket implementation. Clean and idiomatic." },
          ],
        },
        sessionRec1
      ),
      finalizeAndPublishReview(
        {
          attemptId,
          overallFeedback: "Final evaluation B: Exceptional problem solving, concurrent simultaneous attempt.",
          questionReviews: [
            { questionId: question1Id, pointsEarned: 50, feedback: "Concurrent attempt." },
            { questionId: question2Id, pointsEarned: 45, feedback: "Concurrent attempt." },
          ],
        },
        sessionRec1
      ),
    ]);

    const successes = [pubA, pubB].filter((r) => r.success);
    const failures = [pubA, pubB].filter((r) => !r.success);

    if (successes.length !== 1 || failures.length !== 1) {
      console.error(
        `FAIL: Expected exactly 1 success and 1 failure for simultaneous publications. Got ${successes.length} successes, ${failures.length} failures.`
      );
      allPassed = false;
    } else if (!failures[0].message.includes("already been published")) {
      console.error("FAIL: Simultaneous loser did not receive already-published error:", failures[0].message);
      allPassed = false;
    } else {
      console.log(
        `PASS: Simultaneous publication handled atomically: exactly 1 succeeded and 1 rejected with: "${failures[0].message}"`
      );

      // Verify Neon DB state after publishing
      const dbReviewPub = await prisma.assessmentReview.findUnique({
        where: { attemptId },
        include: { questionReviews: true },
      });

      const dbAttemptPub = await prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
      });

      if (dbReviewPub?.status !== "PUBLISHED") {
        console.error(`FAIL: AssessmentReview.status is not PUBLISHED, got '${dbReviewPub?.status}'`);
        allPassed = false;
      } else if (!dbReviewPub.publishedAt) {
        console.error("FAIL: AssessmentReview.publishedAt was not set.");
        allPassed = false;
      } else if (dbReviewPub.totalScore !== 95) {
        console.error(`FAIL: Expected totalScore 95 (50+45), got ${dbReviewPub.totalScore}`);
        allPassed = false;
      } else if (dbAttemptPub?.status !== "EVALUATED") {
        console.error(`FAIL: AssessmentAttempt.status should be 'EVALUATED', got '${dbAttemptPub?.status}'`);
        allPassed = false;
      } else if (dbAttemptPub?.score !== 95) {
        console.error(`FAIL: AssessmentAttempt.score should be 95, got ${dbAttemptPub?.score}`);
        allPassed = false;
      } else {
        console.log(
          `PASS: AssessmentReview published with totalScore=95, publishedAt set, and AssessmentAttempt updated to EVALUATED with score=95.`
        );
      }
    }

    // =============================================================
    // TEST 6: Candidate Visibility of Published Review
    // =============================================================
    console.log("\n[TEST 6] Testing candidate visibility of published review & scores...");
    const candHistoryPub = await getCandidateAssessmentHistory(sessionCand1);
    if (!candHistoryPub.success || !candHistoryPub.history) {
      console.error("FAIL: Candidate failed to fetch history after publish:", candHistoryPub.message);
      allPassed = false;
    } else {
      const historyItem = candHistoryPub.history.find((h) => h.attemptId === attemptId);
      if (!historyItem) {
        console.error("FAIL: Attempt not found in candidate history.");
        allPassed = false;
      } else if (historyItem.lifecycleState !== "RESULTS_PUBLISHED") {
        console.error(`FAIL: Expected lifecycleState 'RESULTS_PUBLISHED', got '${historyItem.lifecycleState}'`);
        allPassed = false;
      } else if (historyItem.score !== 95) {
        console.error(`FAIL: Expected candidate score to be 95, got ${historyItem.score}`);
        allPassed = false;
      } else if (!historyItem.passed) {
        console.error("FAIL: Expected passed=true since 95 >= 70 passing score.");
        allPassed = false;
      } else if (!historyItem.feedback?.includes("Exceptional problem solving")) {
        console.error("FAIL: Expected published feedback in candidate history, got:", historyItem.feedback);
        allPassed = false;
      } else {
        console.log("PASS: Candidate successfully observes published score (95/100), passed=true, and recruiter feedback.");
      }
    }

    // Candidate inspects detailed review breakdown
    const candDetailPub = await getAttemptReviewDetails(attemptId, sessionCand1);
    if (!candDetailPub.success || !candDetailPub.data) {
      console.error("FAIL: Candidate failed to fetch review details after publish:", candDetailPub.message);
      allPassed = false;
    } else {
      const rev = candDetailPub.data.review;
      if (!rev) {
        console.error("FAIL: Candidate getAttemptReviewDetails returned null review after publishing!");
        allPassed = false;
      } else if (rev.status !== "PUBLISHED") {
        console.error(`FAIL: Expected review status 'PUBLISHED', got '${rev.status}'`);
        allPassed = false;
      } else if (rev.totalScore !== 95) {
        console.error(`FAIL: Expected totalScore 95, got ${rev.totalScore}`);
        allPassed = false;
      } else if (candDetailPub.data.questions.length !== 2) {
        console.error(`FAIL: Expected 2 question details, got ${candDetailPub.data.questions.length}`);
        allPassed = false;
      } else if (candDetailPub.data.questions[0].pointsEarned !== 50) {
        console.error(`FAIL: Expected question 1 pointsEarned=50, got ${candDetailPub.data.questions[0].pointsEarned}`);
        allPassed = false;
      } else {
        console.log("PASS: Candidate can inspect question-level breakdown, pointsEarned (50/50), and comments on published review.");
      }
    }

    // =============================================================
    // TEST 7: Cross-Company Tenant Isolation
    // =============================================================
    console.log("\n[TEST 7] Testing cross-company recruiter isolation...");

    // 7a. Recruiter 2 tries to fetch review details of Company 1's candidate attempt
    const rec2DetailRes = await getAttemptReviewDetails(attemptId, sessionRec2);
    if (rec2DetailRes.success) {
      console.error("FAIL: Rival Recruiter 2 was able to view Company 1's candidate attempt review details!");
      allPassed = false;
    } else {
      console.log("PASS: Cross-company attempt view blocked with error:", rec2DetailRes.message);
    }

    // 7b. Recruiter 2 tries to save draft review on Company 1's candidate attempt
    const rec2SaveDraftRes = await saveAssessmentReviewDraft(
      {
        attemptId,
        overallFeedback: "Rival tampering",
        questionReviews: [{ questionId: question1Id, pointsEarned: 0, feedback: "Tampered" }],
      },
      sessionRec2
    );
    if (rec2SaveDraftRes.success) {
      console.error("FAIL: Rival Recruiter 2 was able to save draft on Company 1's candidate attempt!");
      allPassed = false;
    } else {
      console.log("PASS: Cross-company review draft saving blocked with error:", rec2SaveDraftRes.message);
    }

    // 7c. Recruiter 2 tries to publish review on Company 1's candidate attempt
    const rec2PublishRes = await finalizeAndPublishReview(
      {
        attemptId,
        overallFeedback: "Rival publish tampering",
        questionReviews: [{ questionId: question1Id, pointsEarned: 0, feedback: "Tampered" }],
      },
      sessionRec2
    );
    if (rec2PublishRes.success) {
      console.error("FAIL: Rival Recruiter 2 was able to publish review on Company 1's candidate attempt!");
      allPassed = false;
    } else {
      console.log("PASS: Cross-company review publishing blocked with error:", rec2PublishRes.message);
    }

    // 7d. Recruiter 2's submission queue should NOT contain Company 1's attempt
    const rec2SubList = await getCompanySubmissionsForReview("ALL", sessionRec2);
    if (rec2SubList.success && rec2SubList.submissions.some((s) => s.attemptId === attemptId)) {
      console.error("FAIL: Company 1's attempt leaked into Rival Recruiter 2's review queue!");
      allPassed = false;
    } else {
      console.log("PASS: Rival recruiter's submission queue is strictly isolated.");
    }

    // =============================================================
    // TEST 8: Cross-Candidate Isolation
    // =============================================================
    console.log("\n[TEST 8] Testing cross-candidate privacy isolation...");

    // Candidate 2 attempts to fetch Candidate 1's review details
    const cand2DetailRes = await getAttemptReviewDetails(attemptId, sessionCand2);
    if (cand2DetailRes.success) {
      console.error("FAIL: Candidate 2 accessed Candidate 1's assessment attempt review details!");
      allPassed = false;
    } else {
      console.log("PASS: Cross-candidate attempt inspection blocked with error:", cand2DetailRes.message);
    }

    // Candidate 2's assessment history does not leak Candidate 1's attempt
    const cand2History = await getCandidateAssessmentHistory(sessionCand2);
    if (cand2History.success && cand2History.history.some((h) => h.attemptId === attemptId)) {
      console.error("FAIL: Candidate 1's assessment leaked into Candidate 2's history!");
      allPassed = false;
    } else {
      console.log("PASS: Candidate history is strictly scoped to the authenticated candidate.");
    }

    // =============================================================
    // TEST 9: Candidate Submission Code Immutability
    // =============================================================
    console.log("\n[TEST 9] Verifying candidate submission code immutability...");
    const dbSubmissions = await prisma.submission.findMany({
      where: { attemptId },
      orderBy: { question: { orderIndex: "asc" } },
    });

    if (dbSubmissions.length !== 2) {
      console.error(`FAIL: Expected 2 submissions, found ${dbSubmissions.length}`);
      allPassed = false;
    } else if (dbSubmissions[0].code !== candidateCodeQ1) {
      console.error("FAIL: Question 1 candidate code was modified during review!");
      allPassed = false;
    } else if (dbSubmissions[1].code !== candidateCodeQ2) {
      console.error("FAIL: Question 2 candidate code was modified during review!");
      allPassed = false;
    } else {
      console.log("PASS: Candidate code in Submission table is strictly immutable and unaltered.");
    }

    // =============================================================
    // TEST 10: Immutability of Published Reviews (Cannot Be Republished or Overwritten)
    // =============================================================
    console.log("\n[TEST 10] Testing double-publish rejection and draft overwrite prevention...");
    
    // 10a. Attempting to republish an already-evaluated attempt must be rejected
    const secondPubRes = await finalizeAndPublishReview(
      {
        attemptId,
        overallFeedback: "Attempted secondary publish: Should be rejected.",
        questionReviews: [
          { questionId: question1Id, pointsEarned: 50, feedback: "Attempted overwrite." },
          { questionId: question2Id, pointsEarned: 50, feedback: "Attempted overwrite." },
        ],
      },
      sessionRec1
    );

    if (secondPubRes.success) {
      console.error("FAIL: finalizeAndPublishReview allowed re-publishing an already-finalized review!");
      allPassed = false;
    } else if (!secondPubRes.message.includes("already been published")) {
      console.error("FAIL: Expected 'already been published' message on republish, got:", secondPubRes.message);
      allPassed = false;
    } else {
      console.log("PASS: Double-publish correctly rejected:", secondPubRes.message);
    }

    // 10b. Attempting to save draft on an already-evaluated attempt must also be rejected
    const draftOnPubRes = await saveAssessmentReviewDraft(
      {
        attemptId,
        overallFeedback: "Attempted draft save on published review.",
        questionReviews: [
          { questionId: question1Id, pointsEarned: 10, feedback: "Should not save." },
        ],
      },
      sessionRec1
    );

    if (draftOnPubRes.success) {
      console.error("FAIL: saveAssessmentReviewDraft allowed saving draft on an already-evaluated review!");
      allPassed = false;
    } else if (!draftOnPubRes.message.includes("already been published")) {
      console.error("FAIL: Expected 'already been published' message on draft save, got:", draftOnPubRes.message);
      allPassed = false;
    } else {
      console.log("PASS: Draft save on published review correctly rejected:", draftOnPubRes.message);
    }

    // 10c. Verify DB score remains untouched at 95
    const dbAttemptFinal = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });
    if (dbAttemptFinal?.score !== 95 || dbAttemptFinal?.status !== "EVALUATED") {
      console.error(`FAIL: Attempt state corrupted! status=${dbAttemptFinal?.status}, score=${dbAttemptFinal?.score}`);
      allPassed = false;
    } else {
      console.log("PASS: AssessmentAttempt status and score remain uncorrupted (status: EVALUATED, score: 95).");
    }

  } catch (err) {
    console.error("UNHANDLED TEST EXCEPTION:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN: Purge test records from Neon PostgreSQL
    // -------------------------------------------------------------
    console.log("\n[Teardown] Purging test entities from Neon PostgreSQL...");
    try {
      // 1. Delete QuestionReviews & AssessmentReviews
      if (attemptId) {
        await prisma.questionReview.deleteMany({
          where: { review: { attemptId } },
        });
        await prisma.assessmentReview.deleteMany({
          where: { attemptId },
        });
      }

      // 2. Delete Submissions
      if (attemptId) {
        await prisma.submission.deleteMany({
          where: { attemptId },
        });
      }

      // 3. Delete AssessmentAttempts
      if (invitationId || attemptId) {
        await prisma.assessmentAttempt.deleteMany({
          where: {
            OR: [
              { id: attemptId },
              { invitationId: invitationId },
            ].filter((c) => Boolean(c.id || c.invitationId)),
          },
        });
      }

      // 4. Delete AssessmentInvitations
      if (assessmentId) {
        await prisma.assessmentInvitation.deleteMany({
          where: { assessmentId },
        });
      }

      // 5. Delete TestCases & Questions
      if (assessmentId) {
        await prisma.testCase.deleteMany({
          where: { question: { assessmentId } },
        });
        await prisma.question.deleteMany({
          where: { assessmentId },
        });
      }

      // 6. Delete Assessments
      await prisma.assessment.deleteMany({
        where: {
          creatorId: { in: [rec1UserId, rec2UserId].filter(Boolean) },
        },
      });

      // 7. Delete Applications
      await prisma.application.deleteMany({
        where: {
          candidateId: { in: [cand1UserId, cand2UserId].filter(Boolean) },
        },
      });

      // 8. Delete Jobs
      await prisma.job.deleteMany({
        where: {
          recruiterId: { in: [rec1UserId, rec2UserId].filter(Boolean) },
        },
      });

      // 9. Delete Users
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [rec1UserId, rec2UserId, cand1UserId, cand2UserId].filter(Boolean),
          },
        },
      });

      // 10. Delete Companies
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
    console.log("  >>> ALL PHASE 5 MANUAL REVIEW TESTS PASSED SUCCESSFULLY! <<<   ");
  } else {
    console.error("  >>> SOME PHASE 5 TESTS FAILED. CHECK LOGS ABOVE. <<<          ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runManualReviewTests().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
