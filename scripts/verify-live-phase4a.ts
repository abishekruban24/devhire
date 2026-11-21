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
import {
  applyToJob,
  updateApplicationStatus,
} from "../src/features/applications/actions/application-actions";

const PRODUCTION_URL = "https://devhire-ten.vercel.app";

function extractCookies(response: Response): Map<string, string> {
  const jar = new Map<string, string>();
  const setCookieHeaders: string[] = [];

  const rawHeaders = response.headers as unknown as { raw?: () => Record<string, string[]> };
  if (typeof rawHeaders.raw === "function") {
    const raw = rawHeaders.raw();
    if (raw["set-cookie"]) {
      setCookieHeaders.push(...raw["set-cookie"]);
    }
  }

  if (setCookieHeaders.length === 0) {
    const single = response.headers.get("set-cookie");
    if (single) {
      setCookieHeaders.push(...single.split(/,(?=\s*[^;]+=)/));
    }
  }

  for (const header of setCookieHeaders) {
    const parts = header.split(";");
    const nameVal = parts[0]?.trim();
    if (nameVal) {
      const eqIdx = nameVal.indexOf("=");
      if (eqIdx !== -1) {
        const name = nameVal.substring(0, eqIdx).trim();
        const val = nameVal.substring(eqIdx + 1).trim();
        jar.set(name, val);
      }
    }
  }
  return jar;
}

function mergeCookies(target: Map<string, string>, source: Map<string, string>) {
  for (const [k, v] of source.entries()) {
    target.set(k, v);
  }
}

function cookieString(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function getCsrfToken(cookieJar: Map<string, string>): Promise<string> {
  const res = await fetch(`${PRODUCTION_URL}/api/auth/csrf`, {
    headers: { Cookie: cookieString(cookieJar) },
    cache: "no-store",
  });
  const jar = extractCookies(res);
  mergeCookies(cookieJar, jar);
  const data = (await res.json()) as { csrfToken?: string };
  return data.csrfToken || "";
}

async function loginUser(
  email: string,
  password: string,
  jar: Map<string, string>
): Promise<{ status: number; location: string | null; cookies: Map<string, string> }> {
  const csrfToken = await getCsrfToken(jar);
  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    redirect: "false",
    callbackUrl: `${PRODUCTION_URL}/login`,
  });

  const res = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials?`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieString(jar),
    },
    body: body.toString(),
    redirect: "manual",
  });

  const newJar = extractCookies(res);
  mergeCookies(jar, newJar);

  return {
    status: res.status,
    location: res.headers.get("location"),
    cookies: jar,
  };
}

async function runLivePhase4AVerification() {
  console.log("==================================================================");
  console.log("    DEVHIRE PHASE 4A: LIVE PRODUCTION VERIFICATION SUITE          ");
  console.log("==================================================================");
  console.log(`Target Production URL: ${PRODUCTION_URL}\n`);

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `live.rec1.4a.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `live.rec2.4a.${timestamp}@devhire.test`;
  const CANDIDATE_EMAIL = `live.cand.4a.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track entities for teardown
  let company1Id = "";
  let company2Id = "";
  let recruiter1UserId = "";
  let recruiter2UserId = "";
  let candidateUserId = "";

  let publishedJobId = "";
  let assessmentId = "";
  let question1Id = "";
  let question2Id = "";
  let attemptId = "";
  let submissionId = "";

  const createdJobIds: string[] = [];
  const createdAssessmentIds: string[] = [];
  const createdAppIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // CLEANUP: Purge any remnants of prior partial test executions
    // -------------------------------------------------------------------------
    await prisma.job.updateMany({
      where: { title: { contains: "1795256377500" } },
      data: { assessmentId: null },
    });
    await prisma.assessment.deleteMany({
      where: { title: { contains: "1795256377500" } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: "1795256377500" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "1795256377500" } },
    });
    await prisma.company.deleteMany({
      where: { slug: { contains: "1795256377500" } },
    });

    // -------------------------------------------------------------------------
    // SETUP: Seed test companies, recruiters, candidate in Neon DB
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating disposable companies, recruiters, and candidate in Neon DB...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Live Prod Acme Labs ${timestamp}`,
        slug: `live-prod-acme-${timestamp}`,
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
        website: "https://acme-live.example.com",
      },
    });
    company1Id = comp1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `Live Prod Rival Corp ${timestamp}`,
        slug: `live-prod-rival-${timestamp}`,
        industry: "Enterprise Security",
        location: "New York, NY",
        website: "https://rival-live.example.com",
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
        headline: "Senior Backend Engineer",
        skills: ["TypeScript", "PostgreSQL", "Next.js"],
      },
    });
    candidateUserId = candUser.id;

    console.log(`  ✓ Recruiter 1 created: ${RECRUITER_1_EMAIL}`);
    console.log(`  ✓ Recruiter 2 created: ${RECRUITER_2_EMAIL}`);
    console.log(`  ✓ Candidate created: ${CANDIDATE_EMAIL}\n`);

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

    // -------------------------------------------------------------------------
    // STEP 1: Recruiter creates and publishes a test job
    // -------------------------------------------------------------------------
    console.log("[Step 1] Recruiter creates and publishes a test job opening...");
    const jobRes = await createJob(
      {
        title: `Principal Platform Engineer ${timestamp}`,
        description: "Design and implement scalable distributed services.",
        requirements: "TypeScript, PostgreSQL, Distributed Systems",
        location: "San Francisco, CA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "PUBLISHED",
        salaryMin: 180000,
        salaryMax: 240000,
        currency: "USD",
        experienceLevel: "Principal / Lead",
      },
      rec1Session
    );

    if (jobRes.success && jobRes.job) {
      publishedJobId = (jobRes.job as { id: string }).id;
      createdJobIds.push(publishedJobId);
      console.log(`  ✓ Test job created and published: id=${publishedJobId}`);
    } else {
      console.error("  ✗ Failed to create test job:", jobRes);
      allPassed = false;
      throw new Error("Cannot proceed without published test job");
    }

    // -------------------------------------------------------------------------
    // STEP 2: Recruiter creates assessment in DRAFT status with 2 coding questions
    // -------------------------------------------------------------------------
    console.log("\n[Step 2] Recruiter creates draft assessment with 2 coding questions and test cases...");
    const assessmentTitle = `Production Platform Assessment ${timestamp}`;
    const createRes = await createAssessment(
      {
        title: assessmentTitle,
        description: "Comprehensive technical evaluation covering algorithms and concurrency.",
        durationMinutes: 60,
        passingScore: 75,
        status: "DRAFT",
        jobId: publishedJobId,
        questions: [
          {
            title: "LRU Cache Implementation",
            description: "Implement a Least Recently Used (LRU) Cache with get and put methods running in O(1) time.",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            starterCode: {
              typescript: "class LRUCache {\n  constructor(capacity: number) {}\n  get(key: number): number { return -1; }\n  put(key: number, value: number): void {}\n}",
              python: "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        return -1\n    def put(self, key: int, value: int) -> None:\n        pass",
            },
            orderIndex: 0,
            testCases: [
              {
                input: '["LRUCache", [2], "put", [1, 1], "get", [1]]',
                expectedOutput: "[null, 1]",
                isHidden: false,
                explanation: "Basic put and get verification",
              },
              {
                input: '["LRUCache", [1], "put", [1, 1], "put", [2, 2], "get", [1]]',
                expectedOutput: "[null, null, -1]",
                isHidden: false,
                explanation: "Capacity eviction test",
              },
              {
                input: '["LRUCache", [3], "put", [1, 10], "put", [2, 20], "put", [3, 30], "get", [2]]',
                expectedOutput: "[null, null, null, 20]",
                isHidden: true,
                explanation: "Hidden test: 3-item capacity check",
              },
              {
                input: '["LRUCache", [2], "put", [2, 1], "put", [1, 1], "put", [2, 3], "put", [4, 1], "get", [1], "get", [2]]',
                expectedOutput: "[null, null, null, null, -1, 3]",
                isHidden: true,
                explanation: "Hidden evaluation: multiple overwrites",
              },
            ],
          },
          {
            title: "Sliding Window Rate Limiter",
            description: "Implement a sliding log rate limiter that allows up to maxRequests within windowMs.",
            difficulty: "HARD",
            points: 150,
            timeLimitMs: 1500,
            memoryLimitKb: 262144,
            starterCode: {
              typescript: "function rateLimiter(maxRequests: number, windowMs: number, timestamps: number[]): boolean[] {\n  return [];\n}",
              python: "def rate_limiter(max_requests: int, window_ms: int, timestamps: list[int]) -> list[bool]:\n    return []",
            },
            orderIndex: 1,
            testCases: [
              {
                input: '{"maxRequests": 5, "windowMs": 1000, "timestamps": [100, 200, 500]}',
                expectedOutput: "[true, true, true]",
                isHidden: false,
                explanation: "Under burst limit",
              },
              {
                input: '{"maxRequests": 2, "windowMs": 1000, "timestamps": [100, 200, 300]}',
                expectedOutput: "[true, true, false]",
                isHidden: true,
                explanation: "Exceeds burst limit in window",
              },
              {
                input: '{"maxRequests": 1, "windowMs": 500, "timestamps": [0, 500, 1000]}',
                expectedOutput: "[true, true, true]",
                isHidden: true,
                explanation: "Window sliding boundary reset",
              },
            ],
          },
        ],
      },
      rec1Session
    );

    if (createRes.success && createRes.assessmentId) {
      assessmentId = createRes.assessmentId;
      createdAssessmentIds.push(assessmentId);
      console.log(`  ✓ Assessment created in DRAFT: id=${assessmentId}`);
    } else {
      console.error("  ✗ Failed to create assessment:", createRes);
      allPassed = false;
      throw new Error("Cannot proceed without created assessment");
    }

    // -------------------------------------------------------------------------
    // STEP 3: Verify persistence directly in Neon PostgreSQL
    // -------------------------------------------------------------------------
    console.log("\n[Step 3] Direct Neon PostgreSQL persistence verification...");
    const dbAssessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: { testCases: true },
          orderBy: { orderIndex: "asc" },
        },
        jobs: true,
      },
    });

    if (
      dbAssessment &&
      dbAssessment.title === assessmentTitle &&
      dbAssessment.status === "DRAFT" &&
      dbAssessment.durationMinutes === 60 &&
      dbAssessment.passingScore === 75 &&
      dbAssessment.questions.length === 2 &&
      dbAssessment.jobs.some((j) => j.id === publishedJobId)
    ) {
      question1Id = dbAssessment.questions[0].id;
      question2Id = dbAssessment.questions[1].id;
      const q1TestCases = dbAssessment.questions[0].testCases;
      const q2TestCases = dbAssessment.questions[1].testCases;

      const q1Visible = q1TestCases.filter((tc) => !tc.isHidden).length;
      const q1Hidden = q1TestCases.filter((tc) => tc.isHidden).length;
      const q2Visible = q2TestCases.filter((tc) => !tc.isHidden).length;
      const q2Hidden = q2TestCases.filter((tc) => tc.isHidden).length;

      if (q1Visible === 2 && q1Hidden === 2 && q2Visible === 1 && q2Hidden === 2) {
        console.log("  ✓ Direct DB check: Assessment, questions, sample & hidden test cases, and job link fully verified");
      } else {
        console.error("  ✗ Test case count mismatch:", { q1Visible, q1Hidden, q2Visible, q2Hidden });
        allPassed = false;
      }
    } else {
      console.error("  ✗ DB verification failed:", dbAssessment);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 4: Activate assessment (DRAFT -> ACTIVE)
    // -------------------------------------------------------------------------
    console.log("\n[Step 4] Activating assessment (DRAFT -> ACTIVE)...");
    const activateRes = await updateAssessmentStatus(assessmentId, "ACTIVE", rec1Session);
    if (activateRes.success) {
      const activeDb = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { status: true },
      });
      if (activeDb?.status === "ACTIVE") {
        console.log("  ✓ Assessment status updated to ACTIVE in Neon PostgreSQL");
      } else {
        console.error("  ✗ Status in DB does not reflect ACTIVE:", activeDb);
        allPassed = false;
      }
    } else {
      console.error("  ✗ Failed to activate assessment:", activateRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 5: Live Production HTTP Request
    // -------------------------------------------------------------------------
    console.log("\n[Step 5] Recruiter authenticates on production and loads recruiter dashboard...");
    const rec1Jar = new Map<string, string>();
    const recLoginRes = await loginUser(RECRUITER_1_EMAIL, TEST_PASSWORD, rec1Jar);
    console.log(`  ✓ Recruiter 1 logged in to ${PRODUCTION_URL}: HTTP ${recLoginRes.status}`);

    const recDashRes = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(rec1Jar) },
      cache: "no-store",
    });
    console.log(`  ✓ Production recruiter dashboard response: HTTP ${recDashRes.status}`);

    if (recDashRes.status === 200) {
      const dashHtml = await recDashRes.text();
      const hasAssessmentSection = dashHtml.includes('id="assessments"');
      const hasAssessmentTitle = dashHtml.includes(assessmentTitle);

      if (hasAssessmentSection) {
        console.log("  ✓ Dashboard HTML contains #assessments Technical Assessment Library section");
      } else {
        console.error("  ✗ #assessments section missing from recruiter dashboard HTML");
        allPassed = false;
      }

      if (hasAssessmentTitle) {
        console.log("  ✓ Dashboard renders newly created assessment title in server-rendered output");
      } else {
        console.error("  ✗ Assessment title not found in recruiter dashboard HTML");
        allPassed = false;
      }
    } else {
      console.error("  ✗ Recruiter dashboard request failed with status:", recDashRes.status);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 6: Recruiter edits assessment metadata and question
    // -------------------------------------------------------------------------
    console.log("\n[Step 6] Recruiter edits assessment metadata and question points...");
    const updateMetaRes = await updateAssessment(
      assessmentId,
      {
        durationMinutes: 75,
        passingScore: 80,
      },
      rec1Session
    );
    if (updateMetaRes.success) {
      console.log("  ✓ Assessment metadata updated (duration: 75min, passingScore: 80%)");
    } else {
      console.error("  ✗ Failed to update assessment metadata:", updateMetaRes);
      allPassed = false;
    }

    const updateQRes = await upsertQuestion(
      assessmentId,
      {
        id: question1Id,
        title: "LRU Cache Implementation (Optimized)",
        description: "Implement an LRU Cache with O(1) get/put operations and optimal cache line utilization.",
        difficulty: "MEDIUM",
        points: 120,
        timeLimitMs: 2500,
        memoryLimitKb: 262144,
      },
      rec1Session
    );
    if (updateQRes.success) {
      console.log("  ✓ Question 1 updated: points=120, timeLimitMs=2500");
    } else {
      console.error("  ✗ Failed to update question:", updateQRes);
      allPassed = false;
    }

    // Verify updates in DB
    const updatedDbAssessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: { where: { id: question1Id } } },
    });
    if (
      updatedDbAssessment &&
      updatedDbAssessment.durationMinutes === 75 &&
      updatedDbAssessment.passingScore === 80 &&
      updatedDbAssessment.questions[0].points === 120
    ) {
      console.log("  ✓ Database reflects all updated metadata and question modifications");
    } else {
      console.error("  ✗ Metadata update did not persist properly:", updatedDbAssessment);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 7: Multi-tenant boundary & authorization checks (Rival Recruiter)
    // -------------------------------------------------------------------------
    console.log("\n[Step 7] Verifying multi-tenant security and rival recruiter isolation...");

    // 1. Rival recruiter cannot retrieve assessment
    const rivalFetchRes = await getAssessmentById(assessmentId, rec2Session);
    if (!rivalFetchRes.success && rivalFetchRes.assessment === undefined) {
      console.log("  ✓ Rival recruiter cannot view Company 1 assessment (403 Forbidden / Not Found)");
    } else {
      console.error("  ✗ SECURITY BREACH: Rival recruiter viewed Company 1 assessment:", rivalFetchRes);
      allPassed = false;
    }

    // 2. Rival recruiter cannot update status
    const rivalStatusRes = await updateAssessmentStatus(assessmentId, "ARCHIVED", rec2Session);
    if (!rivalStatusRes.success && rivalStatusRes.message.includes("Forbidden")) {
      console.log("  ✓ Rival recruiter status modification strictly blocked: 403 Forbidden");
    } else {
      console.error("  ✗ Rival recruiter status modification was not blocked:", rivalStatusRes);
      allPassed = false;
    }

    // 3. Rival recruiter cannot modify questions
    const rivalQRes = await upsertQuestion(
      assessmentId,
      {
        id: question1Id,
        title: "Malicious Tamper Title",
        description: "Attempting unauthorized question edit.",
        points: 10,
      },
      rec2Session
    );
    if (!rivalQRes.success && rivalQRes.message.includes("Forbidden")) {
      console.log("  ✓ Rival recruiter question edit strictly blocked: 403 Forbidden");
    } else {
      console.error("  ✗ Rival recruiter question edit was not blocked:", rivalQRes);
      allPassed = false;
    }

    // 4. Rival recruiter cannot delete assessment
    const rivalDeleteRes = await deleteAssessment(assessmentId, rec2Session);
    if (!rivalDeleteRes.success && rivalDeleteRes.message.includes("Forbidden")) {
      console.log("  ✓ Rival recruiter delete strictly blocked: 403 Forbidden");
    } else {
      console.error("  ✗ Rival recruiter delete was not blocked:", rivalDeleteRes);
      allPassed = false;
    }

    // 5. Rival company assessments query returns 0
    const rivalCompanyAssessments = await getCompanyAssessments(rec2Session);
    if (rivalCompanyAssessments.success && rivalCompanyAssessments.assessments.length === 0) {
      console.log("  ✓ Rival recruiter sees 0 assessments in their company library");
    } else {
      console.error("  ✗ Rival company assessments leaked data:", rivalCompanyAssessments);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 8: Candidate Anti-Cheating & Hidden Test Case Privacy
    // -------------------------------------------------------------------------
    console.log("\n[Step 8] Verifying candidate anti-cheating guard and hidden test case filtering...");
    const candPreviewRes = await getCandidateAssessmentPreview(assessmentId, candSession);

    if (candPreviewRes.success && candPreviewRes.preview) {
      const preview = candPreviewRes.preview;
      console.log(`  ✓ Candidate retrieved active assessment preview: "${preview.title}"`);

      // Verify questions are returned
      if (preview.questions.length === 2) {
        console.log("  ✓ Candidate preview includes both coding questions");
      } else {
        console.error("  ✗ Unexpected question count in preview:", preview.questions.length);
        allPassed = false;
      }

      // Check question 1 test cases: MUST be exactly 2 visible, 0 hidden
      const q1Preview = preview.questions.find((q) => q.id === question1Id);
      if (q1Preview) {
        const visibleCases = q1Preview.visibleTestCases;
        // @ts-expect-error Checking runtime property to make sure hidden cases aren't leaked
        const hasHiddenField = visibleCases.some((tc) => tc.isHidden !== undefined);
        const countMatch = visibleCases.length === 2;

        if (countMatch && !hasHiddenField) {
          console.log("  ✓ Question 1 exposes exactly 2 visible sample test cases (0 hidden evaluation cases leaked)");
        } else {
          console.error("  ✗ SECURITY LEAK in Question 1 test cases:", visibleCases);
          allPassed = false;
        }
      }

      // Check question 2 test cases: MUST be exactly 1 visible, 0 hidden
      const q2Preview = preview.questions.find((q) => q.id === question2Id);
      if (q2Preview) {
        const visibleCases = q2Preview.visibleTestCases;
        const countMatch = visibleCases.length === 1;

        if (countMatch) {
          console.log("  ✓ Question 2 exposes exactly 1 visible sample test case (2 hidden evaluation cases withheld)");
        } else {
          console.error("  ✗ SECURITY LEAK in Question 2 test cases:", visibleCases);
          allPassed = false;
        }
      }
    } else {
      console.error("  ✗ Candidate preview retrieval failed:", candPreviewRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 9: Candidate Access Guard for Inactive Assessments
    // -------------------------------------------------------------------------
    console.log("\n[Step 9] Candidate cannot access DRAFT or ARCHIVED assessments...");
    // 1. Set to DRAFT
    await updateAssessmentStatus(assessmentId, "DRAFT", rec1Session);
    const draftPreviewRes = await getCandidateAssessmentPreview(assessmentId, candSession);
    if (!draftPreviewRes.success && draftPreviewRes.message?.includes("not currently active")) {
      console.log("  ✓ Candidate access blocked for DRAFT assessment");
    } else {
      console.error("  ✗ Candidate was able to access DRAFT assessment:", draftPreviewRes);
      allPassed = false;
    }

    // 2. Set to ARCHIVED
    await updateAssessmentStatus(assessmentId, "ARCHIVED", rec1Session);
    const archivedPreviewRes = await getCandidateAssessmentPreview(assessmentId, candSession);
    if (!archivedPreviewRes.success && archivedPreviewRes.message?.includes("not currently active")) {
      console.log("  ✓ Candidate access blocked for ARCHIVED assessment");
    } else {
      console.error("  ✗ Candidate was able to access ARCHIVED assessment:", archivedPreviewRes);
      allPassed = false;
    }

    // Restore to ACTIVE for deletion safeguard testing
    await updateAssessmentStatus(assessmentId, "ACTIVE", rec1Session);

    // -------------------------------------------------------------------------
    // STEP 10: Deletion Safeguards (Assessment with Attempts & Question with Submissions)
    // -------------------------------------------------------------------------
    console.log("\n[Step 10] Verifying deletion safeguards when attempts and submissions exist...");

    // Create an assessment attempt directly in DB to test safeguard
    const testAttempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        candidateId: candidateUserId,
        status: "IN_PROGRESS",
      },
    });
    attemptId = testAttempt.id;
    console.log(`  ✓ Simulated candidate assessment attempt created: id=${attemptId}`);

    // Try deleting assessment with attempt -> MUST BE BLOCKED
    const blockedDeleteRes = await deleteAssessment(assessmentId, rec1Session);
    if (!blockedDeleteRes.success && blockedDeleteRes.message.includes("candidate attempt(s) are already linked")) {
      console.log("  ✓ Assessment deletion prevented by active attempts safeguard: " + blockedDeleteRes.message);
    } else {
      console.error("  ✗ Assessment deletion safeguard failed:", blockedDeleteRes);
      allPassed = false;
    }

    // Create a submission for Question 1 directly in DB
    const testSubmission = await prisma.submission.create({
      data: {
        attemptId: testAttempt.id,
        questionId: question1Id,
        candidateId: candidateUserId,
        code: "class LRUCache {}",
        language: "typescript",
        status: "ACCEPTED",
        score: 100,
      },
    });
    submissionId = testSubmission.id;
    console.log(`  ✓ Simulated submission created: id=${submissionId}`);

    // Try deleting Question 1 with submission -> MUST BE BLOCKED
    const blockedQDeleteRes = await deleteQuestion(assessmentId, question1Id, rec1Session);
    if (!blockedQDeleteRes.success && blockedQDeleteRes.message.includes("candidate submission(s) recorded")) {
      console.log("  ✓ Question deletion prevented by submissions safeguard: " + blockedQDeleteRes.message);
    } else {
      console.error("  ✗ Question deletion safeguard failed:", blockedQDeleteRes);
      allPassed = false;
    }

    // Clean up submission
    await prisma.submission.delete({ where: { id: submissionId } });
    submissionId = "";
    console.log("  ✓ Cleared test submission");

    // Clean up attempt to test clean question deletion
    await prisma.assessmentAttempt.delete({ where: { id: attemptId } });
    attemptId = "";
    console.log("  ✓ Cleared test attempt");

    // Now test valid deletion of Question 2 (which has no submissions)
    const validQDeleteRes = await deleteQuestion(assessmentId, question2Id, rec1Session);
    if (validQDeleteRes.success) {
      console.log("  ✓ Clean question deletion succeeded for Question 2");
      question2Id = "";
    } else {
      console.error("  ✗ Clean question deletion failed:", validQDeleteRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 11: Phase 3A, 3B, 3C Regression Verification
    // -------------------------------------------------------------------------
    console.log("\n[Step 11] Regression verify Phase 3A, 3B, and 3C features...");

    // Phase 3B: Candidate can discover published job
    const pubJobs = await prisma.job.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, company: { select: { name: true } } },
    });
    if (pubJobs.some((j) => j.id === publishedJobId)) {
      console.log("  ✓ Phase 3B Candidate Job Discovery query successfully resolves published test job");
    } else {
      console.error("  ✗ Published job not visible in Phase 3B query");
      allPassed = false;
    }

    // Phase 3C: Candidate applies to job
    const applyRes = await applyToJob(
      {
        jobId: publishedJobId,
        coverLetter: "Regression verification for Phase 3C application flow alongside assessments.",
      },
      candSession
    );
    if (applyRes.success && applyRes.applicationId) {
      createdAppIds.push(applyRes.applicationId);
      console.log("  ✓ Phase 3C Candidate application successfully submitted: id=" + applyRes.applicationId);

      // Phase 3C: Recruiter reviews and shortlists candidate
      const shortlistRes = await updateApplicationStatus(
        applyRes.applicationId,
        "SHORTLISTED",
        "Candidate qualified for assessment stage.",
        rec1Session
      );
      if (shortlistRes.success) {
        console.log("  ✓ Phase 3C Recruiter successfully transitioned application to SHORTLISTED");
      } else {
        console.error("  ✗ Failed to update application status:", shortlistRes);
        allPassed = false;
      }
    } else {
      console.error("  ✗ Phase 3C application failed:", applyRes);
      allPassed = false;
    }

    // Phase 3A: Recruiter job management includes application counts
    const compJobs = await prisma.job.findMany({
      where: { companyId: company1Id },
      include: { _count: { select: { applications: true } } },
    });
    const jobStats = compJobs.find((j) => j.id === publishedJobId);
    if (jobStats && jobStats._count.applications === 1) {
      console.log("  ✓ Phase 3A Recruiter Job Management reflects accurate application count (1)");
    } else {
      console.error("  ✗ Recruiter application count mismatch:", jobStats);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 12: Clean Assessment Deletion
    // -------------------------------------------------------------------------
    console.log("\n[Step 12] Cleanly deleting assessment without attempts...");
    const cleanDeleteRes = await deleteAssessment(assessmentId, rec1Session);
    if (cleanDeleteRes.success) {
      console.log("  ✓ Assessment permanently deleted: " + cleanDeleteRes.message);
      assessmentId = "";
    } else {
      console.error("  ✗ Clean assessment deletion failed:", cleanDeleteRes);
      allPassed = false;
    }

    // Verify job unlinked
    const unlinkedJob = await prisma.job.findUnique({
      where: { id: publishedJobId },
      select: { assessmentId: true },
    });
    if (unlinkedJob?.assessmentId === null) {
      console.log("  ✓ Linked job automatically disassociated (assessmentId is null)");
    } else {
      console.error("  ✗ Job was not properly unlinked:", unlinkedJob);
      allPassed = false;
    }
  } catch (err) {
    console.error("Unexpected error during live verification:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up all disposable test fixtures from Neon DB
    // -------------------------------------------------------------------------
    console.log("\n[Teardown] Cleaning up all disposable test fixtures from Neon DB...");
    try {
      if (submissionId) {
        await prisma.submission.deleteMany({ where: { id: submissionId } });
      }
      if (attemptId) {
        await prisma.assessmentAttempt.deleteMany({ where: { id: attemptId } });
      }
      // Unlink jobs from any assessments
      await prisma.job.updateMany({
        where: {
          OR: [
            { assessmentId: { in: createdAssessmentIds } },
            { companyId: { in: [company1Id, company2Id].filter(Boolean) } },
          ],
        },
        data: { assessmentId: null },
      });
      // Delete assessments
      await prisma.assessment.deleteMany({
        where: {
          OR: [
            { id: { in: createdAssessmentIds } },
            { companyId: { in: [company1Id, company2Id].filter(Boolean) } },
          ],
        },
      });
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
      const usersToClean = [
        candidateUserId,
        recruiter1UserId,
        recruiter2UserId,
      ].filter((id): id is string => Boolean(id));

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
      console.log("[Teardown] Teardown complete. All disposable test records purged.");
    } catch (cleanErr) {
      console.error("[Teardown Error]: Failed to clean up disposable records:", cleanErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log(" >>> ALL LIVE PHASE 4A VERIFICATION CHECKS PASSED! <<< ");
  } else {
    console.error(" >>> SOME LIVE CHECKS FAILED! INSPECT LOGS ABOVE. <<< ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runLivePhase4AVerification()
  .catch((err) => {
    console.error("Fatal runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
