import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";

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
  console.log(`  Login HTTP status: ${res.status}, Location: ${res.headers.get("location")}`);
  console.log(`  Set-Cookies returned:`, setCookies);
  Object.assign(cookieJar, parseCookies(setCookies));
  return res;
}

async function runPhase6LocalVerification() {
  console.log("==================================================================");
  console.log("    DEVHIRE PHASE 6: ROLE-SPECIFIC DASHBOARD REDESIGN VERIFY     ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const CANDIDATE_EMAIL = `phase6.cand.${timestamp}@devhire.test`;
  const RECRUITER_EMAIL = `phase6.rec.${timestamp}@devhire.test`;
  const PASSWORD = "Password123!";
  const COMPANY_NAME = `Phase6 Technologies ${timestamp}`;

  try {
    // ---------------------------------------------------------------
    // TEST 1: Homepage Audit & Marketing Accuracy
    // ---------------------------------------------------------------
    console.log("\n[TEST 1] Verifying Homepage Marketing Copy & Claims...");
    const homeRes = await fetch(`${BASE_URL}/`, { cache: "no-store" });
    if (homeRes.status !== 200) {
      throw new Error(`Homepage returned status ${homeRes.status}`);
    }
    const homeHtml = await homeRes.text();

    // Check unsupported claims are removed
    if (homeHtml.includes("automated scoring") || homeHtml.includes("automated sandbox scoring")) {
      throw new Error("FAIL: Homepage still contains unsupported claims of automated sandbox scoring!");
    }
    if (homeHtml.includes("automated test suite") || homeHtml.includes("automated test validation")) {
      throw new Error("FAIL: Homepage still contains unsupported claims of automated test validation!");
    }
    if (homeHtml.includes("Judge0")) {
      throw new Error("FAIL: Homepage references Judge0!");
    }

    // Check accurate claims are present
    if (!homeHtml.includes("timed coding assessments") && !homeHtml.includes("Timed Coding Assessments")) {
      throw new Error("FAIL: Homepage missing timed coding assessments description!");
    }
    if (!homeHtml.toLowerCase().includes("rubric") || !homeHtml.toLowerCase().includes("manual")) {
      throw new Error("FAIL: Homepage missing manual rubric evaluation description!");
    }
    console.log("  PASS: Homepage marketing copy audited: Unsupported claims absent, accurate manual review claims present.");

    // ---------------------------------------------------------------
    // Setup Test Database Accounts
    // ---------------------------------------------------------------
    console.log("\n[SETUP] Creating test company and role accounts in database...");
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const company = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        slug: `phase6-tech-${timestamp}`,
        industry: "Enterprise Software",
        location: "San Francisco, CA",
        description: "Innovative engineering organization building high-scale developer tools.",
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
        headline: "Senior Full-Stack Engineer",
        bio: "Specializing in Next.js, TypeScript, and high-performance cloud architectures.",
        skills: ["TypeScript", "Next.js", "PostgreSQL", "Tailwind CSS"],
      },
    });
    console.log("  PASS: Database fixtures created successfully.");

    // ---------------------------------------------------------------
    // TEST 2: Candidate Login & Dashboard UI Identity
    // ---------------------------------------------------------------
    console.log("\n[TEST 2] Testing Candidate Login & Dashboard Console...");
    const candJar: CookieJar = {};
    const candLoginRes = await login(CANDIDATE_EMAIL, PASSWORD, candJar);
    console.log(`  Candidate login status: ${candLoginRes.status}`);

    const candDashRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      redirect: "manual",
    });

    console.log(`  Candidate dashboard response status: ${candDashRes.status}`);
    console.log(`  Redirect location: ${candDashRes.headers.get("location")}`);
    console.log(`  Cookie keys in jar: ${Object.keys(candJar).join(", ")}`);

    if (candDashRes.status !== 200) {
      throw new Error(`Expected candidate dashboard 200, got ${candDashRes.status}`);
    }
    const candHtml = await candDashRes.text();

    // Verify candidate identity & nav items
    const requiredCandNav = [
      "Overview",
      "Explore Jobs",
      "My Applications",
      "My Assessments",
      "Assessment History",
      "My Profile",
    ];
    for (const item of requiredCandNav) {
      if (!candHtml.includes(item)) {
        throw new Error(`Candidate dashboard missing required navigation item: "${item}"`);
      }
    }

    if (!candHtml.includes("Alex Candidate") && !candHtml.includes("Alex")) {
      throw new Error("Candidate dashboard missing candidate name in greeting or profile!");
    }
    console.log(`  candHtml length: ${candHtml.length}`);
    console.log(`  Contains "Candidate": ${candHtml.includes("Candidate")}`);
    console.log(`  Contains "Console": ${candHtml.includes("Console")}`);
    const consoleMatches = candHtml.match(/.{0,30}Console.{0,30}/gi);
    console.log(`  Console matches:`, consoleMatches);

    const cleanCandHtml = candHtml.replace(/<!--.*?-->/g, "");
    if (!cleanCandHtml.includes("Candidate Console")) {
      throw new Error("Candidate dashboard missing 'Candidate Console' branding!");
    }
    console.log("  PASS: Candidate dashboard verified with 6-item developer portal navigation & profile identity.");

    // ---------------------------------------------------------------
    // TEST 3: Recruiter Login & Dashboard UI Identity
    // ---------------------------------------------------------------
    console.log("\n[TEST 3] Testing Recruiter Login & Dashboard Console...");
    const recJar: CookieJar = {};
    const recLoginRes = await login(RECRUITER_EMAIL, PASSWORD, recJar);
    console.log(`  Recruiter login status: ${recLoginRes.status}`);

    const recDashRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      redirect: "manual",
    });

    if (recDashRes.status !== 200) {
      throw new Error(`Expected recruiter dashboard 200, got ${recDashRes.status}`);
    }
    const recHtml = await recDashRes.text();
    const cleanRecHtml = recHtml.replace(/<!--.*?-->/g, "");

    // Verify recruiter identity & 6 nav items
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
        throw new Error(`Recruiter dashboard missing required navigation item: "${item}"`);
      }
    }

    if (!cleanRecHtml.includes(COMPANY_NAME)) {
      throw new Error("Recruiter dashboard missing verified company name!");
    }
    if (!cleanRecHtml.includes("Hiring Pipeline") && !cleanRecHtml.includes("Pipeline")) {
      throw new Error("Recruiter dashboard missing hiring pipeline visualization!");
    }
    if (!cleanRecHtml.includes("Recruiter Console") && !cleanRecHtml.includes("Recruiter Suite")) {
      throw new Error("Recruiter dashboard missing 'Recruiter Console' or 'Recruiter Suite' branding!");
    }
    console.log("  PASS: Recruiter dashboard verified with 6-item enterprise navigation, hiring funnel, and company identity.");

    // ---------------------------------------------------------------
    // TEST 4: Cross-Role Route Isolation & Dynamic Redirects
    // ---------------------------------------------------------------
    console.log("\n[TEST 4] Testing Server-Side Cross-Role Route Enforcement...");

    // Candidate attempting to access /recruiter/dashboard
    const candToRecRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      redirect: "manual",
    });
    if (candToRecRes.status !== 307 && candToRecRes.status !== 308 && candToRecRes.status !== 302) {
      throw new Error(`Expected redirect (307/308/302) for candidate accessing /recruiter/dashboard, got ${candToRecRes.status}`);
    }
    const candRedirectLoc = candToRecRes.headers.get("location");
    console.log(`  Candidate accessing /recruiter/dashboard redirected to: ${candRedirectLoc}`);
    if (!candRedirectLoc?.includes("/candidate/dashboard")) {
      throw new Error(`Candidate redirected to wrong location: ${candRedirectLoc}`);
    }
    console.log("  PASS: Candidate blocked from recruiter suite and redirected to /candidate/dashboard.");

    // Recruiter attempting to access /candidate/dashboard
    const recToCandRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      redirect: "manual",
    });
    if (recToCandRes.status !== 307 && recToCandRes.status !== 308 && recToCandRes.status !== 302) {
      throw new Error(`Expected redirect (307/308/302) for recruiter accessing /candidate/dashboard, got ${recToCandRes.status}`);
    }
    const recRedirectLoc = recToCandRes.headers.get("location");
    console.log(`  Recruiter accessing /candidate/dashboard redirected to: ${recRedirectLoc}`);
    if (!recRedirectLoc?.includes("/recruiter/dashboard")) {
      throw new Error(`Recruiter redirected to wrong location: ${recRedirectLoc}`);
    }
    console.log("  PASS: Recruiter blocked from candidate console and redirected to /recruiter/dashboard.");

    // ---------------------------------------------------------------
    // Teardown
    // ---------------------------------------------------------------
    console.log("\n[TEARDOWN] Purging test records...");
    await prisma.user.deleteMany({
      where: { id: { in: [candidateUser.id, recruiterUser.id] } },
    });
    await prisma.company.delete({
      where: { id: company.id },
    });
    console.log("  PASS: Test data cleanly purged from PostgreSQL.");

    console.log("\n==================================================================");
    console.log("   >>> ALL PHASE 6 LOCAL VERIFICATION TESTS PASSED (100%)! <<<   ");
    console.log("==================================================================");
  } catch (err) {
    console.error("FAIL:", err);
    process.exit(1);
  }
}

runPhase6LocalVerification();
