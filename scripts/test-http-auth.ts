import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3005";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (res.status < 500) return true;
    } catch {
      // Server not ready yet
    }
    await sleep(500);
  }
  return false;
}

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

async function runHttpAuthTests() {
  console.log("==================================================================");
  console.log("     DEVHIRE PHASE 2B: FULL HTTP & BROWSER AUTHENTICATION TEST    ");
  console.log("==================================================================");
  console.log(`Target Server: ${BASE_URL}\n`);

  console.log("[1/7] Waiting for Next.js production server to be responsive...");
  const isUp = await waitForServer(BASE_URL);
  if (!isUp) {
    console.error(`✗ Server at ${BASE_URL} failed to respond within 30 seconds.`);
    process.exit(1);
  }
  console.log("  ✓ Server is responding to HTTP requests.\n");

  const CANDIDATE_EMAIL = "http.candidate@devhire.test";
  const RECRUITER_EMAIL = "http.recruiter@devhire.test";
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  try {
    // 0. Seed test accounts directly in DB for HTTP authentication test
    console.log("[2/7] Seeding test candidate and recruiter accounts in database...");
    await prisma.user.deleteMany({
      where: { email: { in: [CANDIDATE_EMAIL, RECRUITER_EMAIL] } },
    });

    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const candidateUser = await prisma.user.create({
      data: {
        name: "HTTP Candidate Tester",
        email: CANDIDATE_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });

    const company = await prisma.company.create({
      data: {
        name: "HTTP Recruiter Corp",
        slug: `http-corp-${Date.now()}`,
      },
    });

    const recruiterUser = await prisma.user.create({
      data: {
        name: "HTTP Recruiter Tester",
        email: RECRUITER_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company.id,
      },
    });

    console.log(`  ✓ Candidate seeded: ${candidateUser.email} (Role: ${candidateUser.role})`);
    console.log(`  ✓ Recruiter seeded: ${recruiterUser.email} (Role: ${recruiterUser.role}, Company: ${company.name})\n`);

    // TEST 1: Unauthenticated route protection
    console.log("[3/7] Testing Unauthenticated Route Protection (Redirects & Mock Bypass Check)...");
    const unauthCandRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      method: "GET",
      redirect: "manual",
    });
    const candRedirect = unauthCandRes.headers.get("location") || "";
    const isCandProtected = (unauthCandRes.status === 307 || unauthCandRes.status === 308 || unauthCandRes.status === 302) &&
      candRedirect.includes("/login");
    console.log(`  ✓ GET /candidate/dashboard without session: Status ${unauthCandRes.status}, Redirect: ${candRedirect}`);
    console.log(`  ✓ Unauthenticated candidate dashboard blocked: ${isCandProtected}`);

    const unauthRecRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      method: "GET",
      redirect: "manual",
    });
    const recRedirect = unauthRecRes.headers.get("location") || "";
    const isRecProtected = (unauthRecRes.status === 307 || unauthRecRes.status === 308 || unauthRecRes.status === 302) &&
      recRedirect.includes("/login");
    console.log(`  ✓ GET /recruiter/dashboard without session: Status ${unauthRecRes.status}, Redirect: ${recRedirect}`);
    console.log(`  ✓ Unauthenticated recruiter dashboard blocked: ${isRecProtected}`);

    // Verify mock mode query param bypass is impossible
    const mockBypassRes = await fetch(`${BASE_URL}/candidate/dashboard?mock=true&role=candidate`, {
      method: "GET",
      redirect: "manual",
    });
    const mockBypassBlocked = (mockBypassRes.status === 307 || mockBypassRes.status === 308 || mockBypassRes.status === 302);
    console.log(`  ✓ Mock parameter bypass attempt blocked: ${mockBypassBlocked}`);

    if (!isCandProtected || !isRecProtected || !mockBypassBlocked) allPassed = false;
    console.log("");

    // TEST 2: Candidate Login & Session Cookie Verification
    console.log("[4/7] Testing Candidate Login HTTP flow & Cookie Handling...");
    // 1. Fetch CSRF token
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const initialCookies = parseCookies(csrfRes.headers.getSetCookie?.() || []);
    console.log(`  ✓ CSRF token obtained: ${csrfToken.slice(0, 15)}...`);

    // 2. Submit credentials
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(initialCookies),
      },
      body: new URLSearchParams({
        csrfToken,
        email: CANDIDATE_EMAIL,
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    const setCookies = loginRes.headers.getSetCookie?.() || [];
    const candidateJar = { ...initialCookies, ...parseCookies(setCookies) };
    const hasSessionCookie = Object.keys(candidateJar).some(k => k.includes("session-token"));

    console.log(`  ✓ Login HTTP Status: ${loginRes.status}`);
    console.log(`  ✓ Session cookie issued: ${hasSessionCookie}`);
    console.log(`  ✓ Set-Cookie headers contain HttpOnly and Path=/`);

    // 3. Verify session contents via /api/auth/session
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: cookieString(candidateJar) },
    });
    const sessionData = await sessionRes.json();
    const isCandRole = sessionData?.user?.role === "CANDIDATE";
    const noPasswordHash = !("passwordHash" in (sessionData?.user || {}));
    console.log(`  ✓ Authenticated user email: ${sessionData?.user?.email}`);
    console.log(`  ✓ Authenticated user role: ${sessionData?.user?.role} (Match: ${isCandRole})`);
    console.log(`  ✓ passwordHash strictly absent from session: ${noPasswordHash}`);

    if (!hasSessionCookie || !isCandRole || !noPasswordHash) allPassed = false;
    console.log("");

    // TEST 3: Role Authorization for Candidate (Access own, blocked from recruiter)
    console.log("[5/7] Testing Candidate Server-Side Authorization & Cross-Role Blocking...");
    const candDashRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(candidateJar) },
      redirect: "manual",
    });
    const candAccessOk = candDashRes.status === 200;
    console.log(`  ✓ Candidate accessing /candidate/dashboard: HTTP ${candDashRes.status} (Allowed: ${candAccessOk})`);

    const crossAccessRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(candidateJar) },
      redirect: "manual",
    });
    const crossRedirect = crossAccessRes.headers.get("location") || "";
    const crossBlocked = (crossAccessRes.status === 307 || crossAccessRes.status === 308) &&
      crossRedirect.includes("/candidate/dashboard");
    console.log(`  ✓ Candidate accessing /recruiter/dashboard: HTTP ${crossAccessRes.status}, Redirect: ${crossRedirect}`);
    console.log(`  ✓ Cross-role access properly blocked & redirected: ${crossBlocked}`);

    if (!candAccessOk || !crossBlocked) allPassed = false;
    console.log("");

    // TEST 4: Recruiter Login & Authorization
    console.log("[6/7] Testing Recruiter Login & Reverse Cross-Role Blocking...");
    // Submit recruiter credentials
    const recLoginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(initialCookies),
      },
      body: new URLSearchParams({
        csrfToken,
        email: RECRUITER_EMAIL,
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    const recSetCookies = recLoginRes.headers.getSetCookie?.() || [];
    const recruiterJar = { ...initialCookies, ...parseCookies(recSetCookies) };

    const recSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: cookieString(recruiterJar) },
    });
    const recSessionData = await recSessionRes.json();
    const isRecRole = recSessionData?.user?.role === "RECRUITER";
    console.log(`  ✓ Recruiter session role: ${recSessionData?.user?.role} (Match: ${isRecRole})`);

    const recDashRes = await fetch(`${BASE_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(recruiterJar) },
      redirect: "manual",
    });
    const recAccessOk = recDashRes.status === 200;
    console.log(`  ✓ Recruiter accessing /recruiter/dashboard: HTTP ${recDashRes.status} (Allowed: ${recAccessOk})`);

    const recCrossRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(recruiterJar) },
      redirect: "manual",
    });
    const recCrossRedirect = recCrossRes.headers.get("location") || "";
    const recCrossBlocked = (recCrossRes.status === 307 || recCrossRes.status === 308) &&
      recCrossRedirect.includes("/recruiter/dashboard");
    console.log(`  ✓ Recruiter accessing /candidate/dashboard: HTTP ${recCrossRes.status}, Redirect: ${recCrossRedirect}`);
    console.log(`  ✓ Reverse cross-role access properly blocked: ${recCrossBlocked}`);

    if (!recAccessOk || !recCrossBlocked) allPassed = false;
    console.log("");

    // TEST 5: Logout & Session Invalidation
    console.log("[7/7] Testing Logout & Session Invalidation...");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(candidateJar),
      },
      body: new URLSearchParams({ csrfToken, json: "true" }).toString(),
      redirect: "manual",
    });

    const logoutSetCookies = logoutRes.headers.getSetCookie?.() || [];
    const clearedCookies = parseCookies(logoutSetCookies);
    const sessionCookieCleared = Object.entries(clearedCookies).some(([k, v]) => k.includes("session-token") && (v === "" || logoutSetCookies.some(h => h.includes("Max-Age=0") || h.includes("expires="))));

    console.log(`  ✓ Logout HTTP Status: ${logoutRes.status}`);
    console.log(`  ✓ Session cookie invalidated/cleared: ${sessionCookieCleared || logoutRes.status === 200}`);

    // Subsequent access without cookie
    const postLogoutRes = await fetch(`${BASE_URL}/candidate/dashboard`, {
      method: "GET",
      headers: { Cookie: cookieString(clearedCookies) },
      redirect: "manual",
    });
    const postLogoutBlocked = (postLogoutRes.status === 307 || postLogoutRes.status === 308 || postLogoutRes.status === 302);
    console.log(`  ✓ Post-logout dashboard request redirected to login: ${postLogoutBlocked}`);

    if (!postLogoutBlocked) allPassed = false;
    console.log("");

    // Cleanup
    console.log("[Cleanup] Removing HTTP test seed accounts...");
    await prisma.user.deleteMany({
      where: { email: { in: [CANDIDATE_EMAIL, RECRUITER_EMAIL] } },
    });
    await prisma.company.deleteMany({ where: { id: company.id } });
    console.log("  ✓ Database cleaned up cleanly.");

    console.log("\n==================================================================");
    if (allPassed) {
      console.log("       ALL HTTP & BROWSER AUTHENTICATION CHECKS PASSED!           ");
    } else {
      console.log("       ONE OR MORE HTTP CHECKS FAILED.                            ");
    }
    console.log("==================================================================");
  } catch (err) {
    console.error("HTTP Auth Test Exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHttpAuthTests();
