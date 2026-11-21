import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resetRateLimit } from "../src/lib/rate-limit";

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

async function runLiveE2E() {
  console.log("==================================================================");
  console.log("      DEVHIRE PRODUCTION LIVE END-TO-END AUTH & RBAC SUITE        ");
  console.log("==================================================================");
  console.log(`Target Production URL: ${PRODUCTION_URL}\n`);

  const timestamp = Date.now();
  const TEST_CANDIDATE_EMAIL = `live.cand.${timestamp}@devhire.test`;
  const TEST_RECRUITER_EMAIL = `live.rec.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Verify Unauthenticated Route Protection (Live Middleware & Layout)
    // -------------------------------------------------------------------------
    console.log("[Phase H.1] Testing Live Unauthenticated Access to /candidate/dashboard...");
    const unauthCand = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
    const candLoc = unauthCand.headers.get("location") || "";
    const candBlocked = (unauthCand.status === 307 || unauthCand.status === 308 || unauthCand.status === 302) &&
      candLoc.includes("/login");
    console.log(`  ✓ Status: ${unauthCand.status}, Location: ${candLoc}`);
    console.log(`  ✓ Unauthenticated candidate dashboard blocked: ${candBlocked}`);
    if (!candBlocked) allPassed = false;

    console.log("[Phase H.2] Testing Live Unauthenticated Access to /recruiter/dashboard...");
    const unauthRec = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
    const recLoc = unauthRec.headers.get("location") || "";
    const recBlocked = (unauthRec.status === 307 || unauthRec.status === 308 || unauthRec.status === 302) &&
      recLoc.includes("/login");
    console.log(`  ✓ Status: ${unauthRec.status}, Location: ${recLoc}`);
    console.log(`  ✓ Unauthenticated recruiter dashboard blocked: ${recBlocked}`);
    if (!recBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 2: Candidate Registration (Action execution against Neon DB)
    // -------------------------------------------------------------------------
    console.log("[Phase E] Testing Live Candidate Registration Flow...");
    const { registerCandidate } = await import("../src/features/auth/actions/register");
    const candForm = new FormData();
    candForm.append("name", "Live Candidate Tester");
    candForm.append("email", TEST_CANDIDATE_EMAIL);
    candForm.append("password", TEST_PASSWORD);
    candForm.append("confirmPassword", TEST_PASSWORD);

    const candRegRes = await registerCandidate(candForm);
    if (!candRegRes.success) {
      console.error("  ✗ Candidate registration action failed:", candRegRes.message);
      allPassed = false;
    } else {
      console.log(`  ✓ Registration action succeeded: ${candRegRes.message}`);
      // Verify DB record in Neon
      const dbUser = await prisma.user.findUnique({
        where: { email: TEST_CANDIDATE_EMAIL },
      });
      if (dbUser && dbUser.role === "CANDIDATE" && dbUser.companyId === null) {
        console.log(`  ✓ Neon DB user confirmed: role=${dbUser.role}, companyId=null`);
      } else {
        console.error("  ✗ Neon DB verification failed for candidate!");
        allPassed = false;
      }
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 3: Recruiter Registration Flow (Transactional User + Company)
    // -------------------------------------------------------------------------
    console.log("[Phase F] Testing Live Recruiter Registration Flow...");
    const { registerRecruiter } = await import("../src/features/auth/actions/register");
    const recForm = new FormData();
    recForm.append("name", "Live Recruiter Tester");
    recForm.append("email", TEST_RECRUITER_EMAIL);
    recForm.append("companyName", `Live Corp ${timestamp}`);
    recForm.append("password", TEST_PASSWORD);
    recForm.append("confirmPassword", TEST_PASSWORD);

    const recRegRes = await registerRecruiter(recForm);
    if (!recRegRes.success) {
      console.error("  ✗ Recruiter registration action failed:", recRegRes.message);
      allPassed = false;
    } else {
      console.log(`  ✓ Registration action succeeded: ${recRegRes.message}`);
      const dbRecUser = await prisma.user.findUnique({
        where: { email: TEST_RECRUITER_EMAIL },
        include: { company: true },
      });
      if (dbRecUser && dbRecUser.role === "RECRUITER" && dbRecUser.company?.name === `Live Corp ${timestamp}`) {
        console.log(`  ✓ Neon DB recruiter & company confirmed: role=${dbRecUser.role}, company=${dbRecUser.company?.name}, slug=${dbRecUser.company?.slug}`);
      } else {
        console.error("  ✗ Neon DB verification failed for recruiter!");
        allPassed = false;
      }
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 4: Candidate Login & JWT Session Verification against Live Production
    // -------------------------------------------------------------------------
    console.log("[Phase G.1] Testing Candidate Authentication against Production URL...");
    const candJar: CookieJar = {};
    const candCsrf = await getCsrfToken(PRODUCTION_URL, candJar);
    console.log(`  ✓ CSRF token received: ${candCsrf.slice(0, 10)}...`);

    const candLoginRes = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(candJar),
      },
      body: new URLSearchParams({
        csrfToken: candCsrf,
        email: TEST_CANDIDATE_EMAIL,
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    const candSetCookies = candLoginRes.headers.getSetCookie?.() || [];
    Object.assign(candJar, parseCookies(candSetCookies));
    const hasCandCookie = Object.keys(candJar).some(k => k.includes("session-token"));
    console.log(`  ✓ Login HTTP Status: ${candLoginRes.status}`);
    console.log(`  ✓ Session cookie issued: ${hasCandCookie}`);
    if (!hasCandCookie) allPassed = false;

    // Verify session contents
    const candSessionRes = await fetch(`${PRODUCTION_URL}/api/auth/session`, {
      headers: { Cookie: cookieString(candJar) },
      cache: "no-store",
    });
    const candSession = await candSessionRes.json();
    console.log(`  ✓ Session verified: email=${candSession?.user?.email}, role=${candSession?.user?.role}`);
    if (candSession?.user?.role !== "CANDIDATE" || "passwordHash" in (candSession?.user || {})) {
      console.error("  ✗ Candidate session content invalid or passwordHash exposed!");
      allPassed = false;
    }

    // Refresh persistence check
    const candSessionRefresh = await fetch(`${PRODUCTION_URL}/api/auth/session`, {
      headers: { Cookie: cookieString(candJar) },
      cache: "no-store",
    });
    const candSession2 = await candSessionRefresh.json();
    console.log(`  ✓ Session persisted upon refresh: ${candSession2?.user?.email === TEST_CANDIDATE_EMAIL}`);
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 5: Candidate Role-Based Security & Cross-Role Access
    // -------------------------------------------------------------------------
    console.log("[Phase H.3] Testing Candidate Authorized Dashboard Access...");
    const candDashRes = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      redirect: "manual",
      cache: "no-store",
    });
    console.log(`  ✓ Candidate accessing /candidate/dashboard: HTTP ${candDashRes.status} (Expected: 200)`);
    if (candDashRes.status !== 200) allPassed = false;

    console.log("[Phase H.4] Testing Candidate Cross-Role Blocking (/recruiter/dashboard)...");
    const candCrossRes = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(candJar) },
      redirect: "manual",
      cache: "no-store",
    });
    const candCrossLoc = candCrossRes.headers.get("location") || "";
    const candCrossBlocked = (candCrossRes.status === 307 || candCrossRes.status === 308) &&
      candCrossLoc.includes("/candidate/dashboard");
    console.log(`  ✓ Candidate accessing /recruiter/dashboard: HTTP ${candCrossRes.status}, Redirect: ${candCrossLoc}`);
    console.log(`  ✓ Cross-role blocking enforced: ${candCrossBlocked}`);
    if (!candCrossBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 6: Recruiter Login & JWT Session Verification against Live Production
    // -------------------------------------------------------------------------
    console.log("[Phase G.2] Testing Recruiter Authentication against Production URL...");
    const recJar: CookieJar = {};
    const recCsrf = await getCsrfToken(PRODUCTION_URL, recJar);

    const recLoginRes = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(recJar),
      },
      body: new URLSearchParams({
        csrfToken: recCsrf,
        email: TEST_RECRUITER_EMAIL,
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });

    const recSetCookies = recLoginRes.headers.getSetCookie?.() || [];
    Object.assign(recJar, parseCookies(recSetCookies));
    const hasRecCookie = Object.keys(recJar).some(k => k.includes("session-token"));
    console.log(`  ✓ Recruiter Login HTTP Status: ${recLoginRes.status}`);
    console.log(`  ✓ Session cookie issued: ${hasRecCookie}`);
    if (!hasRecCookie) allPassed = false;

    // Verify session contents
    const recSessionRes = await fetch(`${PRODUCTION_URL}/api/auth/session`, {
      headers: { Cookie: cookieString(recJar) },
      cache: "no-store",
    });
    const recSession = await recSessionRes.json();
    console.log(`  ✓ Session verified: email=${recSession?.user?.email}, role=${recSession?.user?.role}, companyName=${recSession?.user?.companyName}`);
    if (recSession?.user?.role !== "RECRUITER" || !recSession?.user?.companyName) {
      console.error("  ✗ Recruiter session content invalid!");
      allPassed = false;
    }
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 7: Recruiter Role-Based Security & Reverse Cross-Role Access
    // -------------------------------------------------------------------------
    console.log("[Phase H.5] Testing Recruiter Authorized Dashboard Access...");
    const recDashRes = await fetch(`${PRODUCTION_URL}/recruiter/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      redirect: "manual",
      cache: "no-store",
    });
    console.log(`  ✓ Recruiter accessing /recruiter/dashboard: HTTP ${recDashRes.status} (Expected: 200)`);
    if (recDashRes.status !== 200) allPassed = false;

    console.log("[Phase H.6] Testing Recruiter Reverse Cross-Role Blocking (/candidate/dashboard)...");
    const recCrossRes = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(recJar) },
      redirect: "manual",
      cache: "no-store",
    });
    const recCrossLoc = recCrossRes.headers.get("location") || "";
    const recCrossBlocked = (recCrossRes.status === 307 || recCrossRes.status === 308) &&
      recCrossLoc.includes("/recruiter/dashboard");
    console.log(`  ✓ Recruiter accessing /candidate/dashboard: HTTP ${recCrossRes.status}, Redirect: ${recCrossLoc}`);
    console.log(`  ✓ Reverse cross-role blocking enforced: ${recCrossBlocked}`);
    if (!recCrossBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 8: Negative Authentication Tests (Wrong password & unknown email)
    // -------------------------------------------------------------------------
    console.log("[Phase G.3] Testing Negative Authentication Scenarios...");
    const badPassRes = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(candJar),
      },
      body: new URLSearchParams({
        csrfToken: candCsrf,
        email: TEST_CANDIDATE_EMAIL,
        password: "WrongPassword999!",
        json: "true",
      }).toString(),
      redirect: "manual",
    });
    const badPassLocation = badPassRes.headers.get("location") || "";
    const badPassRejected = badPassRes.status === 401 || badPassLocation.includes("error=CredentialsSignin");
    console.log(`  ✓ Incorrect password rejected: ${badPassRejected} (Status ${badPassRes.status})`);
    if (!badPassRejected) allPassed = false;

    const unknownUserRes = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(candJar),
      },
      body: new URLSearchParams({
        csrfToken: candCsrf,
        email: "nonexistent.user.e2e@devhire.test",
        password: TEST_PASSWORD,
        json: "true",
      }).toString(),
      redirect: "manual",
    });
    const unknownLocation = unknownUserRes.headers.get("location") || "";
    const unknownRejected = unknownUserRes.status === 401 || unknownLocation.includes("error=CredentialsSignin");
    console.log(`  ✓ Nonexistent user rejected: ${unknownRejected} (Status ${unknownUserRes.status})`);
    if (!unknownRejected) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // STEP 9: Logout & Session Invalidation
    // -------------------------------------------------------------------------
    console.log("[Phase G.4] Testing Logout and Session Invalidation...");
    const logoutRes = await fetch(`${PRODUCTION_URL}/api/auth/signout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(candJar),
      },
      body: new URLSearchParams({ csrfToken: candCsrf, json: "true" }).toString(),
      redirect: "manual",
    });
    const logoutCookies = parseCookies(logoutRes.headers.getSetCookie?.() || []);
    console.log(`  ✓ Logout HTTP Status: ${logoutRes.status}`);

    // Verify subsequent dashboard access fails
    const postLogoutDash = await fetch(`${PRODUCTION_URL}/candidate/dashboard`, {
      headers: { Cookie: cookieString(logoutCookies) },
      redirect: "manual",
      cache: "no-store",
    });
    const postLogoutBlocked = (postLogoutDash.status === 307 || postLogoutDash.status === 308 || postLogoutDash.status === 302);
    console.log(`  ✓ Subsequent request blocked after signout: ${postLogoutBlocked}`);
    if (!postLogoutBlocked) allPassed = false;
    console.log("");

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("[Cleanup] Safely removing disposable test accounts from Neon DB...");
    const recUserToClean = await prisma.user.findUnique({
      where: { email: TEST_RECRUITER_EMAIL },
      select: { companyId: true },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_CANDIDATE_EMAIL, TEST_RECRUITER_EMAIL] } },
    });
    if (recUserToClean?.companyId) {
      await prisma.company.deleteMany({ where: { id: recUserToClean.companyId } });
    }
    await resetRateLimit(`register:${TEST_CANDIDATE_EMAIL}`);
    await resetRateLimit(`register:${TEST_RECRUITER_EMAIL}`);
    console.log("  ✓ Database cleaned up cleanly. Zero test records left.");

    console.log("\n==================================================================");
    if (allPassed) {
      console.log("      ALL PRODUCTION E2E AUTH & RBAC TESTS PASSED SUCCESSFULLY!    ");
    } else {
      console.log("      ONE OR MORE TESTS FAILED - REVIEW LOGS ABOVE.               ");
    }
    console.log("==================================================================");
  } catch (err) {
    console.error("Live E2E threw an unhandled error:", err);
    allPassed = false;
  } finally {
    await prisma.$disconnect();
    if (!allPassed) {
      process.exit(1);
    }
  }
}

runLiveE2E();
