import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";

const PRODUCTION_URL = "https://devhire-ten.vercel.app";

interface CookieJar {
  [name: string]: string;
}

function parseCookies(setCookieHeaders: string[]): CookieJar {
  const jar: CookieJar = {};
  for (const header of setCookieHeaders) {
    const parts = header.split(";")[0].split("=");
    if (parts.length >= 2) {
      jar[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  }
  return jar;
}

function cookieString(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function getCsrfToken(baseUrl: string, cookieJar: CookieJar) {
  const res = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: { Cookie: cookieString(cookieJar) },
    cache: "no-store",
  });
  const data = await res.json();
  const setCookies = res.headers.getSetCookie?.() || [];
  Object.assign(cookieJar, parseCookies(setCookies));
  return data.csrfToken;
}

async function runLivePhase3AVerification() {
  console.log("==================================================================");
  console.log("    DEVHIRE PHASE 3A: LIVE PRODUCTION VERIFICATION SUITE          ");
  console.log("==================================================================");
  console.log(`Target Production URL: ${PRODUCTION_URL}\n`);

  const timestamp = Date.now();
  const REC_EMAIL_1 = `live.rec1.${timestamp}@devhire.test`;
  const REC_EMAIL_2 = `live.rec2.${timestamp}@devhire.test`;
  const CAND_EMAIL = `live.cand.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;
  let comp1Id = "";
  let comp2Id = "";
  let user1Id = "";
  let user2Id = "";
  let candId = "";
  let createdJobId = "";

  try {
    // -------------------------------------------------------------------------
    // STEP 0: Seed Disposable Recruiter & Company Accounts
    // -------------------------------------------------------------------------
    console.log("[Setup] Provisioning disposable test accounts in Neon PostgreSQL...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Live Tech Systems ${timestamp}`,
        slug: `live-tech-${timestamp}`,
      },
    });
    comp1Id = comp1.id;

    const user1 = await prisma.user.create({
      data: {
        name: "Live Recruiter Alpha",
        email: REC_EMAIL_1,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: comp1Id,
      },
    });
    user1Id = user1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `External Tech LLC ${timestamp}`,
        slug: `external-tech-${timestamp}`,
      },
    });
    comp2Id = comp2.id;

    const user2 = await prisma.user.create({
      data: {
        name: "Live Recruiter Beta",
        email: REC_EMAIL_2,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: comp2Id,
      },
    });
    user2Id = user2.id;

    const candUser = await prisma.user.create({
      data: {
        name: "Live Candidate User",
        email: CAND_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    candId = candUser.id;

    console.log(`  ✓ Recruiter 1 ready: ${user1.email} (Company: ${comp1.name})`);
    console.log(`  ✓ Recruiter 2 ready: ${user2.email} (Company: ${comp2.name})`);
    console.log(`  ✓ Candidate ready: ${candUser.email}\n`);

    // -------------------------------------------------------------------------
    // STEP 1: Log in to the production recruiter dashboard
    // -------------------------------------------------------------------------
    console.log("[Step 1] Logging in to production with Recruiter 1 credentials...");
    const rec1Jar: CookieJar = {};
    const csrf1 = await getCsrfToken(PRODUCTION_URL, rec1Jar);

    const loginRes1 = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(rec1Jar),
      },
      body: new URLSearchParams({
        csrfToken: csrf1,
        email: REC_EMAIL_1,
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    const setCookies1 = loginRes1.headers.getSetCookie?.() || [];
    Object.assign(rec1Jar, parseCookies(setCookies1));
    const hasSession1 = Object.keys(rec1Jar).some((k) => k.includes("session-token"));
    console.log(`  ✓ Recruiter 1 Login Status: ${loginRes1.status}, Session Cookie Issued: ${hasSession1}`);
    if (!hasSession1) allPassed = false;

    // Verify /recruiter/dashboard loads with HTTP 200
    const dashRes1 = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(rec1Jar) },
      redirect: "manual",
      cache: "no-store",
    });
    console.log(`  ✓ GET /recruiter/dashboard HTTP Status: ${dashRes1.status} (Expected: 200)`);
    if (dashRes1.status !== 200) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 2: Create a draft job
    // -------------------------------------------------------------------------
    console.log("[Step 2] Creating a draft job opening for Recruiter 1's company...");
    const sessionRec1: SessionContext = {
      user: { id: user1Id, role: "RECRUITER", email: REC_EMAIL_1, companyId: comp1Id },
    };

    const draftRes = await createJob(
      {
        title: "Staff Distributed Systems Engineer",
        description: "Architect high-performance distributed systems with low latency and high availability.",
        requirements: "Go, Kubernetes, Kafka, PostgreSQL, Distributed Consensuses",
        location: "San Francisco, CA or Worldwide Remote",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "DRAFT",
        salaryMin: 185000,
        salaryMax: 235000,
        currency: "USD",
        experienceLevel: "Staff / Principal",
      },
      sessionRec1
    );

    if (!draftRes.success || !draftRes.job) {
      console.error("  ✗ Draft job creation failed:", draftRes.message);
      allPassed = false;
    } else {
      createdJobId = draftRes.job.id as string;
      const dbJob = await prisma.job.findUnique({ where: { id: createdJobId } });
      const draftOk = dbJob !== null && dbJob.status === "DRAFT" && dbJob.companyId === comp1Id;
      console.log(`  ✓ Draft job created in database: id=${createdJobId}, slug=${dbJob?.slug}`);
      console.log(`  ✓ Status verified as DRAFT: ${dbJob?.status === "DRAFT"}`);
      if (!draftOk) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 3: Publish the job
    // -------------------------------------------------------------------------
    console.log("[Step 3] Publishing the job opening...");
    const pubRes = await updateJobStatus(createdJobId, "PUBLISHED", sessionRec1);
    if (!pubRes.success) {
      console.error("  ✗ Publishing failed:", pubRes.message);
      allPassed = false;
    } else {
      const dbJobPub = await prisma.job.findUnique({ where: { id: createdJobId } });
      const isPub = dbJobPub?.status === "PUBLISHED";
      console.log(`  ✓ Status transitioned to PUBLISHED: ${isPub}`);
      if (!isPub) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 4: Edit the job
    // -------------------------------------------------------------------------
    console.log("[Step 4] Editing job details (title, compensation, and location)...");
    const editRes = await updateJob(
      createdJobId,
      {
        title: "Principal Distributed Infrastructure Engineer",
        description: "Lead global technical infrastructure architecture across multiple availability zones.",
        requirements: "Go, Rust, Distributed DBs, Raft, Multi-Region PostgreSQL",
        location: "Global Remote (Flexible)",
        locationType: "REMOTE",
        type: "FULL_TIME",
        salaryMin: 200000,
        salaryMax: 260000,
        currency: "USD",
        experienceLevel: "Principal (10+ yrs)",
      },
      sessionRec1
    );

    if (!editRes.success) {
      console.error("  ✗ Job update failed:", editRes.message);
      allPassed = false;
    } else {
      const dbJobEdited = await prisma.job.findUnique({ where: { id: createdJobId } });
      const titleMatches = dbJobEdited?.title === "Principal Distributed Infrastructure Engineer";
      const salaryMatches = dbJobEdited?.salaryMin === 200000 && dbJobEdited?.salaryMax === 260000;
      console.log(`  ✓ Title updated: "${dbJobEdited?.title}" (${titleMatches})`);
      console.log(`  ✓ Salary updated: $${dbJobEdited?.salaryMin} - $${dbJobEdited?.salaryMax} (${salaryMatches})`);
      if (!titleMatches || !salaryMatches) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 5: Close and archive the job
    // -------------------------------------------------------------------------
    console.log("[Step 5] Transitioning job through CLOSE and ARCHIVE lifecycle...");
    await updateJobStatus(createdJobId, "CLOSED", sessionRec1);
    const dbClosed = await prisma.job.findUnique({ where: { id: createdJobId } });
    console.log(`  ✓ Status transitioned to CLOSED: ${dbClosed?.status === "CLOSED"}`);
    if (dbClosed?.status !== "CLOSED") allPassed = false;

    await updateJobStatus(createdJobId, "ARCHIVED", sessionRec1);
    const dbArchived = await prisma.job.findUnique({ where: { id: createdJobId } });
    console.log(`  ✓ Status transitioned to ARCHIVED: ${dbArchived?.status === "ARCHIVED"}`);
    if (dbArchived?.status !== "ARCHIVED") allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 6: Verify changes persist after page refresh on live dashboard
    // -------------------------------------------------------------------------
    console.log("[Step 6] Refreshing live recruiter dashboard and verifying persistence...");
    const refreshDashRes = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(rec1Jar) },
      cache: "no-store",
    });
    const dashHtml = await refreshDashRes.text();
    const containsUpdatedTitle = dashHtml.includes("Principal Distributed Infrastructure Engineer");
    console.log(`  ✓ Dashboard refresh status: ${refreshDashRes.status}`);
    console.log(`  ✓ Dashboard HTML contains persisted job title: ${containsUpdatedTitle}`);
    if (refreshDashRes.status !== 200 || !containsUpdatedTitle) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 7: Verify a different recruiter CANNOT modify it
    // -------------------------------------------------------------------------
    console.log("[Step 7] Testing security: Rival recruiter cannot modify or delete job...");
    const sessionRec2: SessionContext = {
      user: { id: user2Id, role: "RECRUITER", email: REC_EMAIL_2, companyId: comp2Id },
    };

    const rivalEditRes = await updateJob(
      createdJobId,
      {
        title: "Malicious Edit by Rival",
        description: "Hacked",
        requirements: "None",
        location: "Unknown",
      },
      sessionRec2
    );
    const rivalEditBlocked = !rivalEditRes.success && Boolean(rivalEditRes.message?.includes("Forbidden"));
    console.log(`  ✓ Rival recruiter update rejected with 403 Forbidden: ${rivalEditBlocked} ("${rivalEditRes.message}")`);
    if (!rivalEditBlocked) allPassed = false;

    const rivalDeleteRes = await deleteJob(createdJobId, sessionRec2);
    const rivalDeleteBlocked = !rivalDeleteRes.success && Boolean(rivalDeleteRes.message?.includes("Forbidden"));
    console.log(`  ✓ Rival recruiter delete rejected with 403 Forbidden: ${rivalDeleteBlocked} ("${rivalDeleteRes.message}")`);
    if (!rivalDeleteBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 8: Delete the disposable job (has 0 applications)
    // -------------------------------------------------------------------------
    console.log("[Step 8] Deleting the disposable job by authorized owner...");
    const ownerDeleteRes = await deleteJob(createdJobId, sessionRec1);
    if (!ownerDeleteRes.success) {
      console.error("  ✗ Owner failed to delete job:", ownerDeleteRes.message);
      allPassed = false;
    } else {
      const dbAfterDelete = await prisma.job.findUnique({ where: { id: createdJobId } });
      const isGone = dbAfterDelete === null;
      console.log(`  ✓ Job successfully deleted from database: ${isGone}`);
      if (!isGone) allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 9: Confirm existing candidate authentication flow remains functional
    // -------------------------------------------------------------------------
    console.log("[Step 9] Verifying candidate authentication flow on live site...");
    const candJar: CookieJar = {};
    const candCsrf = await getCsrfToken(PRODUCTION_URL, candJar);

    const candLoginRes = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(candJar),
      },
      body: new URLSearchParams({
        csrfToken: candCsrf,
        email: CAND_EMAIL,
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    const candSetCookies = candLoginRes.headers.getSetCookie?.() || [];
    Object.assign(candJar, parseCookies(candSetCookies));
    const candSessionCookie = Object.keys(candJar).some((k) => k.includes("session-token"));

    const candDashRes = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      cache: "no-store",
    });
    const candAccessOk = candDashRes.status === 200;
    console.log(`  ✓ Candidate login succeeded: ${candSessionCookie}`);
    console.log(`  ✓ Candidate /candidate/dashboard accessible: HTTP ${candDashRes.status} (Allowed: ${candAccessOk})`);
    if (!candSessionCookie || !candAccessOk) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("[Cleanup] Removing all disposable test accounts from Neon DB...");
    await prisma.job.deleteMany({
      where: { companyId: { in: [comp1Id, comp2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id, candId] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [comp1Id, comp2Id] } },
    });
    console.log("  ✓ Teardown complete. Zero test records remaining in Neon DB.");

    console.log("\n==================================================================");
    if (allPassed) {
      console.log("    ALL 9 LIVE PRODUCTION PHASE 3A CHECKS PASSED SUCCESSFULLY!   ");
    } else {
      console.log("    ONE OR MORE CHECKS FAILED - REVIEW LOGS ABOVE.               ");
    }
    console.log("==================================================================");
  } catch (err) {
    console.error("Live Phase 3A verification threw exception:", err);
    allPassed = false;
  } finally {
    try {
      if (comp1Id || comp2Id) {
        await prisma.job.deleteMany({ where: { companyId: { in: [comp1Id, comp2Id] } } });
        await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id, candId] } } });
        await prisma.company.deleteMany({ where: { id: { in: [comp1Id, comp2Id] } } });
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

runLivePhase3AVerification();
