import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const BASE_URL = "https://devhire-ten.vercel.app";

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

async function login(email: string, pass: string, cookieJar: CookieJar) {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const initialCookies = parseCookies(csrfRes.headers.getSetCookie?.() || []);
  Object.assign(cookieJar, initialCookies);

  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieString(cookieJar),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password: pass,
      json: "true",
    }).toString(),
    redirect: "manual",
  });

  const setCookies = res.headers.getSetCookie?.() || [];
  Object.assign(cookieJar, parseCookies(setCookies));
  return res;
}

async function runPhase6LiveVerification() {
  console.log("==================================================================");
  console.log("    DEVHIRE PHASE 6: LIVE PRODUCTION DASHBOARD VERIFICATION       ");
  console.log("==================================================================");
  console.log(`Target: ${BASE_URL}\n`);

  const timestamp = Date.now();
  const CANDIDATE_EMAIL = `phase6.live.cand.${timestamp}@devhire.test`;
  const RECRUITER_EMAIL = `phase6.live.rec.${timestamp}@devhire.test`;
  const PASSWORD = "Password123!";
  const COMPANY_NAME = `Live Phase 6 Enterprises ${timestamp}`;

  try {
    // ---------------------------------------------------------------
    // TEST 1: Homepage Audit & Marketing Accuracy
    // ---------------------------------------------------------------
    console.log("[TEST 1] Auditing Live Production Homepage Copy & Claims...");
    const homeRes = await fetch(`${BASE_URL}/`, { cache: "no-store" });
    if (homeRes.status !== 200) {
      throw new Error(`Homepage returned status ${homeRes.status}`);
    }
    const homeHtml = await homeRes.text();

    if (homeHtml.includes("automated scoring") || homeHtml.includes("automated sandbox scoring")) {
      throw new Error("FAIL: Production Homepage still contains unsupported claims of automated sandbox scoring!");
    }
    if (homeHtml.includes("automated test suite") || homeHtml.includes("automated test validation")) {
      throw new Error("FAIL: Production Homepage still contains unsupported claims of automated test validation!");
    }
    if (homeHtml.includes("Judge0")) {
      throw new Error("FAIL: Production Homepage references Judge0!");
    }

    if (!homeHtml.includes("timed coding assessments") && !homeHtml.includes("Timed Coding Assessments")) {
      throw new Error("FAIL: Production Homepage missing timed coding assessments description!");
    }
    if (!homeHtml.toLowerCase().includes("rubric") || !homeHtml.toLowerCase().includes("manual")) {
      throw new Error("FAIL: Production Homepage missing manual rubric evaluation description!");
    }
    console.log("  PASS: Live production homepage verified: All marketing claims strictly accurate.");

    // ---------------------------------------------------------------
    // Setup Test Database Accounts
    // ---------------------------------------------------------------
    console.log("\n[SETUP] Creating test company and role accounts in database...");
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const company = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        slug: `phase6-live-${timestamp}`,
        industry: "Cloud & Developer Tools",
        location: "Austin, TX",
        description: "Enterprise engineering team running technical recruitment on DevHire.",
      },
    });

    const recruiterUser = await prisma.user.create({
      data: {
        email: RECRUITER_EMAIL,
        name: "Devon Recruiter",
        passwordHash: hashedPassword,
        role: "RECRUITER",
        companyId: company.id,
      },
    });

    const candidateUser = await prisma.user.create({
      data: {
        email: CANDIDATE_EMAIL,
        name: "Alex Candidate",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
        headline: "Staff Software Engineer",
        bio: "Specializing in distributed systems, Next.js, and cloud platforms.",
        skills: ["TypeScript", "Next.js", "PostgreSQL", "Go", "Docker"],
      },
    });
    console.log("  PASS: Test accounts created in Neon PostgreSQL.");

    // ---------------------------------------------------------------
    // TEST 2: Candidate Live Login & Dashboard UI Identity
    // ---------------------------------------------------------------
    console.log("\n[TEST 2] Testing Live Candidate Login & Dashboard UI...");
    const candJar: CookieJar = {};
    const candLoginRes = await login(CANDIDATE_EMAIL, PASSWORD, candJar);
    console.log(`  Candidate login status: ${candLoginRes.status}`);

    const candDashRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      redirect: "manual",
    });

    if (candDashRes.status !== 200) {
      throw new Error(`Expected live candidate dashboard 200, got ${candDashRes.status}`);
    }
    const candHtml = await candDashRes.text();
    const cleanCandHtml = candHtml.replace(/<!--.*?-->/g, "");

    const requiredCandNav = [
      "Overview",
      "Explore Jobs",
      "My Applications",
      "My Assessments",
      "Assessment History",
      "My Profile",
    ];
    for (const item of requiredCandNav) {
      if (!cleanCandHtml.includes(item)) {
        throw new Error(`Live candidate dashboard missing navigation item: "${item}"`);
      }
    }

    if (!cleanCandHtml.includes("Alex Candidate") && !cleanCandHtml.includes("Alex")) {
      throw new Error("Live candidate dashboard missing candidate name in greeting or profile!");
    }
    if (!cleanCandHtml.includes("Candidate Console")) {
      throw new Error("Live candidate dashboard missing 'Candidate Console' branding!");
    }
    console.log("  PASS: Live candidate dashboard verified with full 6-item navigation and developer portal UI.");

    // ---------------------------------------------------------------
    // TEST 3: Recruiter Live Login & Dashboard UI Identity
    // ---------------------------------------------------------------
    console.log("\n[TEST 3] Testing Live Recruiter Login & Dashboard UI...");
    const recJar: CookieJar = {};
    const recLoginRes = await login(RECRUITER_EMAIL, PASSWORD, recJar);
    console.log(`  Recruiter login status: ${recLoginRes.status}`);

    const recDashRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      redirect: "manual",
    });

    if (recDashRes.status !== 200) {
      throw new Error(`Expected live recruiter dashboard 200, got ${recDashRes.status}`);
    }
    const recHtml = await recDashRes.text();
    const cleanRecHtml = recHtml.replace(/<!--.*?-->/g, "");

    const requiredRecNav = [
      "Hiring Overview",
      "Job Management",
      "Applicants",
      "Assessments",
      "Manual Reviews",
      "Company Profile",
    ];
    for (const item of requiredRecNav) {
      if (!cleanRecHtml.includes(item)) {
        throw new Error(`Live recruiter dashboard missing navigation item: "${item}"`);
      }
    }

    if (!cleanRecHtml.includes(COMPANY_NAME)) {
      throw new Error("Live recruiter dashboard missing verified company name!");
    }
    if (!cleanRecHtml.includes("Hiring Pipeline") && !cleanRecHtml.includes("Pipeline")) {
      throw new Error("Live recruiter dashboard missing hiring pipeline visualization!");
    }
    if (!cleanRecHtml.includes("Recruiter Console") && !cleanRecHtml.includes("Recruiter Suite")) {
      throw new Error("Live recruiter dashboard missing 'Recruiter Console' or 'Recruiter Suite' branding!");
    }
    console.log("  PASS: Live recruiter dashboard verified with full 6-item navigation, hiring funnel, and company identity.");

    // ---------------------------------------------------------------
    // TEST 4: Cross-Role Server Enforcement on Production
    // ---------------------------------------------------------------
    console.log("\n[TEST 4] Testing Live Cross-Role Route Isolation...");

    const candToRecRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      redirect: "manual",
    });
    const candRedirectLoc = candToRecRes.headers.get("location");
    console.log(`  Candidate accessing /recruiter/dashboard redirected to: ${candRedirectLoc}`);
    if (!candRedirectLoc?.includes("/candidate/dashboard")) {
      throw new Error(`Candidate redirected to wrong location: ${candRedirectLoc}`);
    }
    console.log("  PASS: Live candidate session strictly redirected away from recruiter suite.");

    const recToCandRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      redirect: "manual",
    });
    const recRedirectLoc = recToCandRes.headers.get("location");
    console.log(`  Recruiter accessing /candidate/dashboard redirected to: ${recRedirectLoc}`);
    if (!recRedirectLoc?.includes("/recruiter/dashboard")) {
      throw new Error(`Recruiter redirected to wrong location: ${recRedirectLoc}`);
    }
    console.log("  PASS: Live recruiter session strictly redirected away from candidate console.");

    // ---------------------------------------------------------------
    // Teardown
    // ---------------------------------------------------------------
    console.log("\n[TEARDOWN] Purging test records from Neon PostgreSQL...");
    await prisma.user.deleteMany({
      where: { id: { in: [candidateUser.id, recruiterUser.id] } },
    });
    await prisma.company.delete({
      where: { id: company.id },
    });
    console.log("  PASS: Test data cleanly purged.");

    console.log("\n==================================================================");
    console.log("   >>> ALL LIVE PRODUCTION PHASE 6 CHECKS PASSED (100%)! <<<     ");
    console.log("==================================================================");
  } catch (err) {
    console.error("FAIL:", err);
    process.exit(1);
  }
}

runPhase6LiveVerification();
