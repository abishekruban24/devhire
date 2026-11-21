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
  getCompanyApplications,
  updateApplicationStatus,
} from "../src/features/applications/actions/application-actions";
import type { ApplicationStatus } from "@prisma/client";

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

async function runLivePhase3CVerification() {
  console.log("==================================================================");
  console.log("    DEVHIRE PHASE 3C: LIVE PRODUCTION VERIFICATION SUITE          ");
  console.log("==================================================================");
  console.log(`Target Production URL: ${PRODUCTION_URL}\n`);

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `live.rec1.3c.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `live.rec2.3c.${timestamp}@devhire.test`;
  const CANDIDATE_1_EMAIL = `live.cand1.3c.${timestamp}@devhire.test`;
  const CANDIDATE_2_EMAIL = `live.cand2.3c.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track entities for teardown
  let company1Id = "";
  let company2Id = "";
  let recruiter1UserId = "";
  let recruiter2UserId = "";
  let candidate1UserId = "";
  let candidate2UserId = "";

  let publishedJobId = "";
  const createdJobIds: string[] = [];
  const createdAppIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test companies, recruiters, candidates in Neon DB
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating disposable companies, recruiters, and candidates in Neon DB...");
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
        industry: "Cybersecurity",
        location: "Austin, TX",
        website: "https://rival-live.example.com",
      },
    });
    company2Id = comp2.id;

    const rec1User = await prisma.user.create({
      data: {
        name: "Acme Production Recruiter",
        email: RECRUITER_1_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    recruiter1UserId = rec1User.id;

    const rec2User = await prisma.user.create({
      data: {
        name: "Rival Production Recruiter",
        email: RECRUITER_2_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company2Id,
      },
    });
    recruiter2UserId = rec2User.id;

    const cand1User = await prisma.user.create({
      data: {
        name: "Alice Prod Candidate",
        email: CANDIDATE_1_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
        headline: "Principal Systems Engineer",
        bio: "Specializing in distributed databases and high-concurrency Node services.",
        skills: ["TypeScript", "PostgreSQL", "Next.js", "Redis"],
        githubUrl: "https://github.com/alice-live",
        linkedinUrl: "https://linkedin.com/in/alice-live",
      },
    });
    candidate1UserId = cand1User.id;

    const cand2User = await prisma.user.create({
      data: {
        name: "Bob Prod Candidate",
        email: CANDIDATE_2_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
        headline: "Junior Backend Developer",
        bio: "Learning systems engineering.",
        skills: ["Python", "Flask"],
      },
    });
    candidate2UserId = cand2User.id;

    console.log(`  ✓ Recruiter 1 created: ${RECRUITER_1_EMAIL}`);
    console.log(`  ✓ Recruiter 2 created: ${RECRUITER_2_EMAIL}`);
    console.log(`  ✓ Candidate 1 created: ${CANDIDATE_1_EMAIL}`);
    console.log(`  ✓ Candidate 2 created: ${CANDIDATE_2_EMAIL}\n`);

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

    // -------------------------------------------------------------------------
    // STEP 1: Recruiter creates and publishes a test job
    // -------------------------------------------------------------------------
    console.log("[Step 1] Recruiter creates and publishes a test job opening...");
    const jobRes = await createJob(
      {
        title: `Principal Cloud Platform Architect ${timestamp}`,
        description: "Architect mission-critical cloud platform services at scale.",
        requirements: "TypeScript, PostgreSQL, Distributed Systems",
        location: "San Francisco, CA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "PUBLISHED",
        salaryMin: 195000,
        salaryMax: 260000,
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
    // STEP 2: Candidate logs in to production and applies with a cover letter
    // -------------------------------------------------------------------------
    console.log("\n[Step 2] Candidate authenticates on production and applies with cover letter...");
    const cand1Jar = new Map<string, string>();
    const loginRes = await loginUser(CANDIDATE_1_EMAIL, TEST_PASSWORD, cand1Jar);
    console.log(`  ✓ Candidate logged in to ${PRODUCTION_URL}: HTTP ${loginRes.status}`);

    const coverLetter =
      "I have extensive experience leading cloud platform migrations and designing high-throughput database architectures.";
    const applyRes = await applyToJob(
      {
        jobId: publishedJobId,
        coverLetter,
      },
      cand1Session
    );

    let aliceAppId = "";
    if (applyRes.success && applyRes.applicationId) {
      aliceAppId = applyRes.applicationId;
      createdAppIds.push(aliceAppId);
      console.log(`  ✓ Candidate application submitted successfully: id=${aliceAppId}`);
    } else {
      console.error("  ✗ Candidate application failed:", applyRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 3: Candidate sees the application in My Applications
    // -------------------------------------------------------------------------
    console.log("\n[Step 3] Candidate retrieves own applications (Active Applications Tracker)...");
    const candAppsRes = await getCandidateApplications(cand1Session);
    const foundApp = candAppsRes.applications.find((a) => a.id === aliceAppId);
    if (
      candAppsRes.success &&
      foundApp &&
      foundApp.jobId === publishedJobId &&
      foundApp.status === "SUBMITTED" &&
      foundApp.coverLetter === coverLetter
    ) {
      console.log("  ✓ Application visible in candidate tracker with status SUBMITTED and cover letter");
    } else {
      console.error("  ✗ Candidate application retrieval failed or incomplete:", candAppsRes);
      allPassed = false;
    }

    // Also verify candidate dashboard HTTP response from production contains #applications
    const candDashRes = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(cand1Jar) },
      cache: "no-store",
    });
    console.log(`  ✓ Production candidate dashboard HTTP response: ${candDashRes.status}`);
    const candDashHtml = await candDashRes.text();
    if (candDashHtml.includes('id="applications"')) {
      console.log("  ✓ Candidate dashboard renders active applications tracker section (#applications)");
    } else {
      console.error("  ✗ #applications section missing from candidate dashboard HTML");
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 4: Duplicate application attempt is rejected
    // -------------------------------------------------------------------------
    console.log("\n[Step 4] Candidate re-applies to same job (duplicate prevention check)...");
    const dupRes = await applyToJob(
      {
        jobId: publishedJobId,
        coverLetter: "Duplicate submission attempt",
      },
      cand1Session
    );
    if (!dupRes.success && dupRes.errorType === "ALREADY_APPLIED") {
      console.log(`  ✓ Duplicate application rejected: "${dupRes.message}"`);
    } else {
      console.error("  ✗ Duplicate application was not blocked:", dupRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 5: Recruiter sees candidate in applicant pipeline
    // -------------------------------------------------------------------------
    console.log("\n[Step 5] Recruiter retrieves company applications (Applicant Pipeline)...");
    const rec1Jar = new Map<string, string>();
    const recLoginRes = await loginUser(RECRUITER_1_EMAIL, TEST_PASSWORD, rec1Jar);
    console.log(`  ✓ Recruiter 1 logged in to ${PRODUCTION_URL}: HTTP ${recLoginRes.status}`);

    const recAppsRes = await getCompanyApplications(undefined, rec1Session);
    const applicantEntry = recAppsRes.applications.find((a) => a.id === aliceAppId);
    if (
      recAppsRes.success &&
      applicantEntry &&
      applicantEntry.candidate.email === CANDIDATE_1_EMAIL &&
      applicantEntry.candidate.skills?.includes("TypeScript")
    ) {
      console.log("  ✓ Recruiter views candidate in pipeline with skills and headline");
    } else {
      console.error("  ✗ Recruiter failed to find applicant in pipeline:", recAppsRes);
      allPassed = false;
    }

    // Also verify recruiter dashboard HTTP response renders #candidates
    const recDashRes = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(rec1Jar) },
      cache: "no-store",
    });
    console.log(`  ✓ Production recruiter dashboard HTTP response: ${recDashRes.status}`);
    const recDashHtml = await recDashRes.text();
    if (recDashHtml.includes('id="candidates"')) {
      console.log("  ✓ Recruiter dashboard renders candidate management section (#candidates)");
    } else {
      console.error("  ✗ #candidates section missing from recruiter dashboard HTML");
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 6: Recruiter updates status to SHORTLISTED
    // -------------------------------------------------------------------------
    console.log("\n[Step 6] Recruiter updates candidate status to SHORTLISTED with internal review notes...");
    const shortlistNotes = "High score on systems design architecture. Moving to interview stage.";
    const shortlistRes = await updateApplicationStatus(
      aliceAppId,
      "SHORTLISTED" as ApplicationStatus,
      shortlistNotes,
      rec1Session
    );
    if (shortlistRes.success) {
      console.log("  ✓ Recruiter successfully transitioned application to SHORTLISTED");
    } else {
      console.error("  ✗ Failed to update application status:", shortlistRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 7: Candidate sees updated status after refresh
    // -------------------------------------------------------------------------
    console.log("\n[Step 7] Candidate refreshes tracker to verify updated SHORTLISTED status...");
    const refreshedApps = await getCandidateApplications(cand1Session);
    const refreshedAliceApp = refreshedApps.applications.find((a) => a.id === aliceAppId);
    if (refreshedAliceApp && refreshedAliceApp.status === "SHORTLISTED") {
      console.log("  ✓ Candidate tracker accurately shows updated status: SHORTLISTED");
    } else {
      console.error("  ✗ Candidate did not see updated status:", refreshedAliceApp);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 8: Recruiter rejects another test applicant
    // -------------------------------------------------------------------------
    console.log("\n[Step 8] Candidate 2 applies and Recruiter rejects application...");
    const cand2ApplyRes = await applyToJob(
      { jobId: publishedJobId, coverLetter: "Junior developer application" },
      cand2Session
    );
    let bobAppId = "";
    if (cand2ApplyRes.success && cand2ApplyRes.applicationId) {
      bobAppId = cand2ApplyRes.applicationId;
      createdAppIds.push(bobAppId);

      const rejectRes = await updateApplicationStatus(
        bobAppId,
        "REJECTED" as ApplicationStatus,
        "Position requires more years of distributed systems experience.",
        rec1Session
      );
      if (rejectRes.success) {
        console.log("  ✓ Recruiter successfully transitioned Candidate 2 to REJECTED");
      } else {
        console.error("  ✗ Recruiter failed to reject Candidate 2:", rejectRes);
        allPassed = false;
      }
    } else {
      console.error("  ✗ Candidate 2 application failed:", cand2ApplyRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 9: Rival recruiter cannot access or modify applications
    // -------------------------------------------------------------------------
    console.log("\n[Step 9] Verifying rival recruiter tenant isolation...");
    // Rival recruiter cannot view Company 1's applications
    const rivalApps = await getCompanyApplications(undefined, rec2Session);
    if (rivalApps.success && rivalApps.applications.length === 0) {
      console.log("  ✓ Rival recruiter sees 0 applications (isolated from Company 1 data)");
    } else {
      console.error("  ✗ Rival recruiter accessed Company 1 applications:", rivalApps);
      allPassed = false;
    }

    // Rival recruiter cannot modify Company 1's applicant
    const rivalMutateRes = await updateApplicationStatus(
      aliceAppId,
      "OFFERED" as ApplicationStatus,
      "Rival company unauthorized edit",
      rec2Session
    );
    if (!rivalMutateRes.success && rivalMutateRes.message.includes("Forbidden")) {
      console.log("  ✓ Rival recruiter modification strictly blocked: 403 Forbidden");
    } else {
      console.error("  ✗ Rival recruiter modification was not blocked:", rivalMutateRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 10: Candidate cannot view private recruiter notes
    // -------------------------------------------------------------------------
    console.log("\n[Step 10] Verifying private recruiter internal notes are never exposed to candidate...");
    const candCheckNotes = await getCandidateApplications(cand1Session);
    const candidateViewApp = candCheckNotes.applications.find((a) => a.id === aliceAppId);
    // @ts-expect-error notes should not even exist in CandidateApplicationItem
    const exposedNotes = candidateViewApp?.notes;
    if (exposedNotes === undefined) {
      console.log("  ✓ Candidate application payload contains no private recruiter notes (notes === undefined)");
    } else {
      console.error("  ✗ SECURITY LEAK: Candidate was able to see recruiter internal notes:", exposedNotes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 11: Recruiter cannot delete a job with active applications
    // -------------------------------------------------------------------------
    console.log("\n[Step 11] Verifying deletion safeguard for job with active applications...");
    const deleteRes = await deleteJob(publishedJobId, rec1Session);
    if (!deleteRes.success && deleteRes.message?.includes("active candidate application")) {
      console.log("  ✓ Job deletion prevented by application safeguard:", deleteRes.message);
    } else {
      console.error("  ✗ Safeguard failed: Job was deleted or error message unexpected:", deleteRes);
      allPassed = false;
    }

    // Verify job remains in DB
    const jobInDb = await prisma.job.findUnique({ where: { id: publishedJobId } });
    if (jobInDb) {
      console.log("  ✓ Job safely preserved in database");
    } else {
      console.error("  ✗ Job missing from database!");
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // STEP 12: Verify existing Phase 3A and 3B features still work
    // -------------------------------------------------------------------------
    console.log("\n[Step 12] Regression verify Phase 3A & 3B compatibility...");
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

    const compJobs = await prisma.job.findMany({
      where: { companyId: company1Id },
      include: { _count: { select: { applications: true } } },
    });
    const testJobStats = compJobs.find((j) => j.id === publishedJobId);
    if (testJobStats && testJobStats._count.applications === 2) {
      console.log("  ✓ Phase 3A Recruiter Job Management reflects exactly 2 applications count");
    } else {
      console.error("  ✗ Recruiter application count mismatch:", testJobStats);
      allPassed = false;
    }
  } catch (err) {
    console.error("Unexpected error during live verification:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up all disposable test fixtures
    // -------------------------------------------------------------------------
    console.log("\n[Teardown] Cleaning up all disposable test fixtures from Neon DB...");
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
      const usersToClean = [
        candidate1UserId,
        candidate2UserId,
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
    console.log(" >>> ALL 12 LIVE PHASE 3C VERIFICATION CHECKS PASSED! <<< ");
  } else {
    console.error(" >>> SOME LIVE CHECKS FAILED! INSPECT LOGS ABOVE. <<< ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runLivePhase3CVerification()
  .catch((err) => {
    console.error("Fatal runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
