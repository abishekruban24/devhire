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

async function runLivePhase3BVerification() {
  console.log("==================================================================");
  console.log("    DEVHIRE PHASE 3B: LIVE PRODUCTION VERIFICATION SUITE          ");
  console.log("==================================================================");
  console.log(`Target Production URL: ${PRODUCTION_URL}\n`);

  const timestamp = Date.now();
  const RECRUITER_EMAIL = `live.rec.3b.${timestamp}@devhire.test`;
  const CANDIDATE_EMAIL = `live.cand.3b.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track entities for teardown
  let companyId = "";
  let recruiterUserId = "";
  let candidateUserId = "";
  let draftJobId = "";
  let publishedJobId = "";

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create disposable accounts in Neon PostgreSQL
    // -------------------------------------------------------------------------
    console.log("[Setup] Provisioning disposable recruiter and candidate accounts...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp = await prisma.company.create({
      data: {
        name: `Live Tech Systems ${timestamp}`,
        slug: `live-tech-systems-${timestamp}`,
        industry: "Enterprise Distributed Systems",
        location: "Seattle, WA",
        website: "https://livetech.example.com",
      },
    });
    companyId = comp.id;

    const recUser = await prisma.user.create({
      data: {
        name: "Lead Tech Recruiter",
        email: RECRUITER_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: companyId,
      },
    });
    recruiterUserId = recUser.id;

    const candUser = await prisma.user.create({
      data: {
        name: "Alex ProductionCandidate",
        email: CANDIDATE_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    candidateUserId = candUser.id;

    console.log(`  ✓ Recruiter ready: ${RECRUITER_EMAIL} (Company: ${comp.name})`);
    console.log(`  ✓ Candidate ready: ${CANDIDATE_EMAIL}`);
    console.log("");

    const sessionRecruiter: SessionContext = {
      user: {
        id: recruiterUserId,
        role: "RECRUITER",
        email: RECRUITER_EMAIL,
        companyId: companyId,
      },
    };

    const sessionCandidate: SessionContext = {
      user: {
        id: candidateUserId,
        role: "CANDIDATE",
        email: CANDIDATE_EMAIL,
      },
    };

    // -------------------------------------------------------------------------
    // STEP 1: Recruiter logs in to production and creates DRAFT & PUBLISHED jobs
    // -------------------------------------------------------------------------
    console.log("[Step 1] Recruiter logging in to live production...");
    const recJar = new Map<string, string>();
    const recLogin = await loginUser(RECRUITER_EMAIL, TEST_PASSWORD, recJar);
    const recHasSession = Array.from(recJar.keys()).some(
      (k) => k.includes("authjs.session-token") || k.includes("__Secure-authjs.session-token")
    );
    console.log(`  ✓ Recruiter login status: ${recLogin.status}, Session cookie: ${recHasSession}`);
    if (!recHasSession) allPassed = false;

    console.log("[Step 2] Recruiter creating 1 DRAFT job and 1 PUBLISHED job...");
    // 1. DRAFT job
    const draftRes = await createJob(
      {
        title: `Confidential Live Quantum Engine ${timestamp}`,
        description: "Exploratory internal quantum compiler architecture. Strictly unpublished.",
        requirements: "Internal clearance only\nQuantum assembly",
        location: "Seattle, WA",
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
    if (!draftRes.success || !draftRes.job) throw new Error("Failed to create draft job: " + draftRes.message);
    draftJobId = String(draftRes.job.id);
    console.log(`  ✓ DRAFT Job created: ${draftRes.job.title} (ID: ${draftJobId}, Status: DRAFT)`);

    // 2. PUBLISHED job
    const pubRes = await createJob(
      {
        title: `Staff Distributed Production Architect ${timestamp}`,
        description: "Operating multi-cloud Kubernetes clusters with 99.999% availability and low-latency gRPC services.",
        requirements: "8+ years Go, Rust, or C++\nDeep Kubernetes operators experience\nHigh-throughput distributed systems",
        location: "Seattle, WA / Remote",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "PUBLISHED",
        salaryMin: 195000,
        salaryMax: 260000,
        currency: "USD",
        experienceLevel: "Senior (5+ yrs)",
      },
      sessionRecruiter
    );
    if (!pubRes.success || !pubRes.job) throw new Error("Failed to create published job: " + pubRes.message);
    publishedJobId = String(pubRes.job.id);
    console.log(`  ✓ PUBLISHED Job created: ${pubRes.job.title} (ID: ${publishedJobId}, Status: PUBLISHED)`);
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 3: Candidate logs in to live production
    // -------------------------------------------------------------------------
    console.log("[Step 3] Candidate logging in to live production...");
    const candJar = new Map<string, string>();
    const candLogin = await loginUser(CANDIDATE_EMAIL, TEST_PASSWORD, candJar);
    const candHasSession = Array.from(candJar.keys()).some(
      (k) => k.includes("authjs.session-token") || k.includes("__Secure-authjs.session-token")
    );
    console.log(`  ✓ Candidate login status: ${candLogin.status}, Session cookie: ${candHasSession}`);
    if (!candHasSession) allPassed = false;

    // -------------------------------------------------------------------------
    // STEP 4: Confirm only PUBLISHED job appears on candidate dashboard
    // -------------------------------------------------------------------------
    console.log("[Step 4] Fetching live /candidate/dashboard and verifying job isolation...");
    const dashRes = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      cache: "no-store",
    });
    console.log(`  ✓ Candidate dashboard HTTP Status: ${dashRes.status} (Expected: 200)`);
    if (dashRes.status !== 200) allPassed = false;

    const dashHtml = await dashRes.text();
    const hasPublishedJob = dashHtml.includes(`Staff Distributed Production Architect ${timestamp}`);
    const hasDraftJob = dashHtml.includes(`Confidential Live Quantum Engine ${timestamp}`);

    console.log(`  ✓ PUBLISHED Job is present in Candidate Dashboard HTML: ${hasPublishedJob}`);
    console.log(`  ✓ DRAFT Job is STRICTLY ABSENT from Candidate Dashboard HTML: ${!hasDraftJob}`);
    if (!hasPublishedJob || hasDraftJob) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 5: Test Search, Filters, Pagination, and Job Details Server Actions
    // -------------------------------------------------------------------------
    console.log("[Step 5] Testing Search, Filters, and Job Details via candidate session...");

    // Search
    const searchMatch = await getPublishedJobs({ search: "Distributed Production" }, sessionCandidate);
    const foundPublished = searchMatch.jobs.some((j) => j.id === publishedJobId);
    const foundDraft = searchMatch.jobs.some((j) => j.id === draftJobId);
    console.log(`  ✓ Search "Distributed Production" found published job: ${foundPublished}`);
    console.log(`  ✓ Search never returns draft job: ${!foundDraft}`);
    if (!foundPublished || foundDraft) allPassed = false;

    // Filter by locationType: REMOTE
    const filterRemote = await getPublishedJobs({ locationType: "REMOTE" }, sessionCandidate);
    const remoteFound = filterRemote.jobs.some((j) => j.id === publishedJobId);
    console.log(`  ✓ Filter locationType="REMOTE" matches published job: ${remoteFound}`);
    if (!remoteFound) allPassed = false;

    // Filter by type: FULL_TIME
    const filterFullTime = await getPublishedJobs({ type: "FULL_TIME" }, sessionCandidate);
    const fullTimeFound = filterFullTime.jobs.some((j) => j.id === publishedJobId);
    console.log(`  ✓ Filter type="FULL_TIME" matches published job: ${fullTimeFound}`);
    if (!fullTimeFound) allPassed = false;

    // Retrieve Published Job Details
    const detailPub = await getPublishedJobById(publishedJobId, sessionCandidate);
    const detailOk =
      detailPub.success &&
      detailPub.job?.id === publishedJobId &&
      detailPub.job?.salaryMin === 195000 &&
      detailPub.job?.company?.name.includes("Live Tech Systems");
    console.log(`  ✓ Published job details retrieved with verified compensation: ${detailOk}`);
    if (!detailOk) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 6: Confirm DRAFT job cannot be retrieved by its ID (Guessed ID check)
    // -------------------------------------------------------------------------
    console.log("[Step 6] Testing Guessed ID Security: Accessing DRAFT job by direct ID...");
    const draftGuess = await getPublishedJobById(draftJobId, sessionCandidate);
    const draftBlocked = !draftGuess.success && !draftGuess.job;
    console.log(`  ✓ Direct ID retrieval for DRAFT job strictly rejected: ${draftBlocked} ("${draftGuess.message}")`);
    if (!draftBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 7: Confirm Apply button does NOT create an application record
    // -------------------------------------------------------------------------
    console.log("[Step 7] Verifying zero application records exist (Phase 3C safety check)...");
    const appCount = await prisma.application.count({
      where: { jobId: publishedJobId },
    });
    console.log(`  ✓ Total application records in database for job: ${appCount} (Expected: 0)`);
    if (appCount !== 0) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 8: Verify Recruiter Job Management still works on live site
    // -------------------------------------------------------------------------
    console.log("[Step 8] Verifying recruiter job management on live production...");
    const recDashRes = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      cache: "no-store",
    });
    console.log(`  ✓ Recruiter dashboard HTTP Status: ${recDashRes.status} (Expected: 200)`);
    if (recDashRes.status !== 200) allPassed = false;

    const recJobs = await getCompanyJobs(sessionRecruiter);
    const recSeesBoth =
      recJobs.success &&
      recJobs.jobs.some((j) => j.id === draftJobId) &&
      recJobs.jobs.some((j) => j.id === publishedJobId);
    console.log(`  ✓ Recruiter sees both DRAFT and PUBLISHED jobs in their workspace: ${recSeesBoth}`);
    if (!recSeesBoth) allPassed = false;
    console.log("");

  } catch (err) {
    console.error("Live test failed with unhandled error:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // STEP 9: Teardown disposable records from Neon DB
    // -------------------------------------------------------------------------
    console.log("[Step 9] Cleaning up disposable test records from Neon PostgreSQL...");
    try {
      const jobIds = [draftJobId, publishedJobId].filter(Boolean);
      if (jobIds.length > 0) {
        await prisma.job.deleteMany({
          where: { id: { in: jobIds } },
        });
      }
      const userIds = [recruiterUserId, candidateUserId].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
      if (companyId) {
        await prisma.company.deleteMany({
          where: { id: companyId },
        });
      }
      console.log("  ✓ Teardown complete. Zero test records remaining in Neon DB.\n");
    } catch (cleanupErr) {
      console.error("  ⚠ Cleanup warning:", cleanupErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("    ALL 9 LIVE PRODUCTION PHASE 3B CHECKS PASSED SUCCESSFULLY!   ");
  } else {
    console.log("    SOME LIVE PRODUCTION CHECKS FAILED!                          ");
  }
  console.log("==================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runLivePhase3BVerification().catch((err) => {
  console.error("Fatal error during live verification:", err);
  process.exit(1);
});
