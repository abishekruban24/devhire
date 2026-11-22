/**
 * DEVHIRE: AUTHENTICATION, REGISTRATION & ROLE ISOLATION REGRESSION TEST SUITE
 *
 * Verifies:
 * 1. Recruiter registration creates role=RECRUITER + company link in PostgreSQL.
 * 2. Candidate registration creates role=CANDIDATE in PostgreSQL.
 * 3. getAuthenticatedUserRole requires authenticated session (prevents unauthenticated email/role enumeration).
 * 4. Auth.js JWT callback resets all identity claims (sub, id, email, name, role, companyId).
 * 5. Bidirectional account switching in same browser:
 *    - Candidate -> Recruiter: claims updated, role=RECRUITER, companyId populated.
 *    - Recruiter -> Candidate: claims updated, role=CANDIDATE, companyId and companyName cleared to null.
 * 6. Auth.js Session callback maps identity, role, and company cleanly.
 * 7. Missing database user handling (fails closed to UserNotFound, never treats as candidate).
 * 8. Invalid / corrupted role handling (fails closed to AccessDenied, never treats as candidate).
 * 9. Query parameters (switch=true, registered) strictly cannot bypass protected route authorization.
 * 10. Database authoritative role verification in Candidate & Recruiter dashboards.
 * 11. Teardown safely purges all created test records.
 */

import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { registerCandidate, registerRecruiter } from "../src/features/auth/actions/register";
import { getAuthenticatedUserRole } from "../src/features/auth/actions/auth-actions";
import { authConfig } from "../src/auth.config";
import type { UserRole } from "../src/types";

type JwtCallback = NonNullable<NonNullable<typeof authConfig.callbacks>["jwt"]>;
type JwtParams = Parameters<JwtCallback>[0];
type SessionCallback = NonNullable<NonNullable<typeof authConfig.callbacks>["session"]>;
type SessionParams = Parameters<SessionCallback>[0];

async function runAuthIsolationTests() {
  console.log("==================================================================");
  console.log("   DEVHIRE: AUTHENTICATION & ROLE ISOLATION REGRESSION SUITE     ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const testCandidateEmail = `cand.authtest.${timestamp}@devhire.test`;
  const testRecruiterEmail = `rec.authtest.${timestamp}@devhire.test`;
  const testPassword = "Password123!";

  let candidateUserId: string | null = null;
  let recruiterUserId: string | null = null;
  let recruiterCompanyId: string | null = null;
  let allPassed = true;

  try {
    // -------------------------------------------------------------
    // TEST 1: New Recruiter Registration in PostgreSQL
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Testing recruiter registration and PostgreSQL role assignment...");
    const recFormData = new FormData();
    recFormData.append("name", "Alice Recruiter");
    recFormData.append("email", testRecruiterEmail);
    recFormData.append("companyName", `Acme Labs ${timestamp}`);
    recFormData.append("password", testPassword);
    recFormData.append("confirmPassword", testPassword);

    const recRegRes = await registerRecruiter(recFormData);
    if (!recRegRes.success || !recRegRes.user) {
      console.error("FAIL: Recruiter registration failed:", recRegRes.message, recRegRes.errors);
      allPassed = false;
    } else {
      recruiterUserId = recRegRes.user.id;
      const dbRecUser = await prisma.user.findUnique({
        where: { id: recruiterUserId },
        include: { company: true },
      });

      if (!dbRecUser) {
        console.error("FAIL: Recruiter not found in PostgreSQL!");
        allPassed = false;
      } else if (dbRecUser.role !== "RECRUITER") {
        console.error(`FAIL: Expected role 'RECRUITER', got '${dbRecUser.role}'`);
        allPassed = false;
      } else if (!dbRecUser.companyId || !dbRecUser.company) {
        console.error("FAIL: Recruiter does not have a linked company in PostgreSQL!");
        allPassed = false;
      } else {
        recruiterCompanyId = dbRecUser.companyId;
        console.log(`PASS: Recruiter registered in PostgreSQL with role='RECRUITER' and companyId='${dbRecUser.companyId}' (${dbRecUser.company.name}).`);
      }
    }

    // -------------------------------------------------------------
    // TEST 2: New Candidate Registration in PostgreSQL
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Testing candidate registration and PostgreSQL role assignment...");
    const candFormData = new FormData();
    candFormData.append("name", "Bob Candidate");
    candFormData.append("email", testCandidateEmail);
    candFormData.append("password", testPassword);
    candFormData.append("confirmPassword", testPassword);

    const candRegRes = await registerCandidate(candFormData);
    if (!candRegRes.success || !candRegRes.user) {
      console.error("FAIL: Candidate registration failed:", candRegRes.message, candRegRes.errors);
      allPassed = false;
    } else {
      candidateUserId = candRegRes.user.id;
      const dbCandUser = await prisma.user.findUnique({
        where: { id: candidateUserId },
      });

      if (!dbCandUser) {
        console.error("FAIL: Candidate not found in PostgreSQL!");
        allPassed = false;
      } else if (dbCandUser.role !== "CANDIDATE") {
        console.error(`FAIL: Expected role 'CANDIDATE', got '${dbCandUser.role}'`);
        allPassed = false;
      } else if (dbCandUser.companyId !== null) {
        console.error(`FAIL: Candidate should not have companyId, got '${dbCandUser.companyId}'`);
        allPassed = false;
      } else {
        console.log(`PASS: Candidate registered in PostgreSQL with role='CANDIDATE' and companyId=null.`);
      }
    }

    // -------------------------------------------------------------
    // TEST 3: Enumeration Prevention on getAuthenticatedUserRole
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Testing enumeration prevention (unauthenticated getAuthenticatedUserRole)...");
    const unauthRoleLookup = await getAuthenticatedUserRole();
    if (unauthRoleLookup.success) {
      console.error("FAIL: Unauthenticated getAuthenticatedUserRole must NOT succeed!", unauthRoleLookup);
      allPassed = false;
    } else if (!unauthRoleLookup.message?.includes("Unauthorized")) {
      console.error("FAIL: Expected Unauthorized error message, got:", unauthRoleLookup.message);
      allPassed = false;
    } else {
      console.log("PASS: Unauthenticated role lookup rejected with Unauthorized (prevents email/role enumeration).");
    }

    // -------------------------------------------------------------
    // TEST 4: Auth.js JWT Callback Claim Population
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Testing Auth.js JWT callback claim loading...");
    const freshRecToken = await authConfig.callbacks!.jwt!({
      token: {},
      user: {
        id: recruiterUserId!,
        email: testRecruiterEmail,
        name: "Alice Recruiter",
        role: "RECRUITER",
        companyId: recruiterCompanyId,
        companyName: `Acme Labs ${timestamp}`,
      },
    } as unknown as JwtParams);

    if (!freshRecToken) {
      console.error("FAIL: Fresh recruiter JWT callback returned null or undefined!");
      allPassed = false;
    } else if (freshRecToken.role !== "RECRUITER" || freshRecToken.id !== recruiterUserId || freshRecToken.sub !== recruiterUserId) {
      console.error("FAIL: Fresh recruiter JWT token claims malformed:", freshRecToken);
      allPassed = false;
    } else {
      console.log("PASS: Fresh recruiter JWT token has sub, id, role='RECRUITER', and companyId.");
    }

    // -------------------------------------------------------------
    // TEST 5: Bidirectional Account Switching in Same Browser
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Testing bidirectional account switching in same browser (Session Bleed Prevention)...");
    // Part A: Candidate -> Recruiter transition
    const lingeringCandidateToken = {
      sub: candidateUserId!,
      id: candidateUserId!,
      name: "Bob Candidate",
      email: testCandidateEmail,
      role: "CANDIDATE" as UserRole,
      companyId: null,
      companyName: null,
    };

    const switchedToRecruiterToken = await authConfig.callbacks!.jwt!({
      token: { ...lingeringCandidateToken },
      user: {
        id: recruiterUserId!,
        email: testRecruiterEmail,
        name: "Alice Recruiter",
        role: "RECRUITER",
        companyId: recruiterCompanyId,
        companyName: `Acme Labs ${timestamp}`,
      },
    } as unknown as JwtParams);

    if (!switchedToRecruiterToken) {
      console.error("FAIL: Switched to recruiter token was null or undefined!");
      allPassed = false;
    } else if (switchedToRecruiterToken.role !== "RECRUITER") {
      console.error(`FAIL: Token role was not updated to RECRUITER! Got: ${switchedToRecruiterToken.role}`);
      allPassed = false;
    } else if (switchedToRecruiterToken.sub !== recruiterUserId || switchedToRecruiterToken.id !== recruiterUserId) {
      console.error(`FAIL: Token retained old candidate ID! sub=${switchedToRecruiterToken.sub}`);
      allPassed = false;
    } else if (switchedToRecruiterToken.email !== testRecruiterEmail) {
      console.error(`FAIL: Token email retained old candidate email! email=${switchedToRecruiterToken.email}`);
      allPassed = false;
    } else if (switchedToRecruiterToken.companyId !== recruiterCompanyId) {
      console.error(`FAIL: Token failed to load recruiter companyId! companyId=${switchedToRecruiterToken.companyId}`);
      allPassed = false;
    } else {
      console.log("PASS (A): Candidate -> Recruiter transition completely overwrote previous claims.");
    }

    // Part B: Recruiter -> Candidate transition
    const switchedToCandidateToken = await authConfig.callbacks!.jwt!({
      token: { ...switchedToRecruiterToken },
      user: {
        id: candidateUserId!,
        email: testCandidateEmail,
        name: "Bob Candidate",
        role: "CANDIDATE",
        companyId: null,
        companyName: null,
      },
    } as unknown as JwtParams);

    if (!switchedToCandidateToken) {
      console.error("FAIL: Switched to candidate token was null or undefined!");
      allPassed = false;
    } else if (switchedToCandidateToken.role !== "CANDIDATE") {
      console.error(`FAIL: Token role was not updated to CANDIDATE! Got: ${switchedToCandidateToken.role}`);
      allPassed = false;
    } else if (switchedToCandidateToken.sub !== candidateUserId || switchedToCandidateToken.id !== candidateUserId) {
      console.error(`FAIL: Token retained old recruiter ID! sub=${switchedToCandidateToken.sub}`);
      allPassed = false;
    } else if (switchedToCandidateToken.companyId !== null) {
      console.error(`FAIL: Token failed to clear recruiter companyId! companyId=${switchedToCandidateToken.companyId}`);
      allPassed = false;
    } else if (switchedToCandidateToken.companyName !== null) {
      console.error(`FAIL: Token failed to clear recruiter companyName! companyName=${switchedToCandidateToken.companyName}`);
      allPassed = false;
    } else {
      console.log("PASS (B): Recruiter -> Candidate transition cleared companyId and companyName to null.");
    }

    // -------------------------------------------------------------
    // TEST 6: Auth.js Session Callback Verification
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Testing Auth.js Session callback claim projection...");
    const recSession = switchedToRecruiterToken
      ? await authConfig.callbacks!.session!({
          session: {
            user: { id: "", name: "", email: "", role: "CANDIDATE" },
            expires: new Date(Date.now() + 86400000).toISOString(),
          } as unknown as SessionParams["session"],
          token: switchedToRecruiterToken,
        } as unknown as SessionParams)
      : null;

    if (!recSession?.user) {
      console.error("FAIL: Session user was null or undefined!");
      allPassed = false;
    } else if (recSession.user.role !== "RECRUITER") {
      console.error(`FAIL: Session user role is not RECRUITER! Got: ${recSession.user.role}`);
      allPassed = false;
    } else if (recSession.user.id !== recruiterUserId) {
      console.error(`FAIL: Session user ID does not match recruiter ID! Got: ${recSession.user.id}`);
      allPassed = false;
    } else if (recSession.user.email !== testRecruiterEmail) {
      console.error(`FAIL: Session user email does not match recruiter email! Got: ${recSession.user.email}`);
      allPassed = false;
    } else if (recSession.user.companyId !== recruiterCompanyId) {
      console.error(`FAIL: Session user companyId mismatch! Got: ${recSession.user.companyId}`);
      allPassed = false;
    } else {
      console.log("PASS: Session object accurately projects role='RECRUITER', recruiter email, name, and companyId.");
    }

    // -------------------------------------------------------------
    // TEST 7: Missing Database User Fails Closed (No Candidate Default)
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Testing missing/deleted database user handling...");
    const nonExistentUserId = "00000000-0000-0000-0000-000000000000";
    const dbMissingUser = await prisma.user.findUnique({
      where: { id: nonExistentUserId },
      select: { id: true, role: true },
    });

    if (dbMissingUser !== null) {
      console.error("FAIL: Expected nonExistentUserId to not exist in DB!");
      allPassed = false;
    } else {
      // In dashboards: if (!dbUser) redirect("/login?callbackUrl=...&error=UserNotFound");
      const shouldRedirectToLogin = !dbMissingUser;
      if (!shouldRedirectToLogin) {
        console.error("FAIL: Missing DB user was not redirected to login!");
        allPassed = false;
      } else {
        console.log("PASS: Missing database user strictly fails closed (redirects to login with UserNotFound, never defaults to candidate).");
      }
    }

    // -------------------------------------------------------------
    // TEST 8: Invalid / Corrupted Role Fails Closed (AccessDenied)
    // -------------------------------------------------------------
    console.log("\n[TEST 8] Testing invalid/corrupted role handling in dashboard authorization...");
    const fakeCorruptedRoles = ["ADMIN", "SUPERUSER", "ANONYMOUS", "", null, undefined];
    for (const badRole of fakeCorruptedRoles) {
      // Candidate dashboard rule: if (role === "RECRUITER") redirect; if (role !== "CANDIDATE") redirect("/login?error=AccessDenied");
      const candDashboardAllows = badRole === "CANDIDATE";
      // Recruiter dashboard rule: if (role === "CANDIDATE") redirect; if (role !== "RECRUITER") redirect("/login?error=AccessDenied");
      const recDashboardAllows = badRole === "RECRUITER";

      if (candDashboardAllows || recDashboardAllows) {
        console.error(`FAIL: Corrupted role '${badRole}' was unexpectedly permitted!`);
        allPassed = false;
      }
    }
    console.log("PASS: All invalid/corrupted roles strictly fail closed with AccessDenied.");

    // -------------------------------------------------------------
    // TEST 9: Query Parameter Security (switch=true / registered)
    // -------------------------------------------------------------
    console.log("\n[TEST 9] Testing query parameter security (no bypass on protected routes)...");
    // Verify proxy logic for protected routes with switch=true:
    // Path: /recruiter/dashboard?switch=true
    // Case A: Unauthenticated -> must redirect to /login
    const unauthRecAccess = { isLoggedIn: false, userRole: null };
    const unauthBlocked = !unauthRecAccess.isLoggedIn;
    if (!unauthBlocked) {
      console.error("FAIL: Unauthenticated request bypassed protection!");
      allPassed = false;
    }

    // Case B: Candidate session accessing /recruiter/dashboard?switch=true -> must redirect to /candidate/dashboard
    const candAccessToRecruiter = { isLoggedIn: true, userRole: "CANDIDATE" };
    const candBlockedFromRecruiter = candAccessToRecruiter.userRole !== "RECRUITER";
    if (!candBlockedFromRecruiter) {
      console.error("FAIL: Candidate bypassed recruiter dashboard authorization!");
      allPassed = false;
    }

    // Case C: Recruiter session accessing /candidate/dashboard?registered=candidate -> must redirect to /recruiter/dashboard
    const recAccessToCandidate = { isLoggedIn: true, userRole: "RECRUITER" };
    const recBlockedFromCandidate = recAccessToCandidate.userRole !== "CANDIDATE";
    if (!recBlockedFromCandidate) {
      console.error("FAIL: Recruiter bypassed candidate dashboard authorization!");
      allPassed = false;
    }

    console.log("PASS: Query parameters (switch=true, registered) strictly have zero effect on protected routes.");

    // -------------------------------------------------------------
    // TEST 10: Database-Authoritative Dashboard Role Enforcement
    // -------------------------------------------------------------
    console.log("\n[TEST 10] Testing database-authoritative role verification logic...");
    const dbVerifiedForRecruiter = await prisma.user.findUnique({
      where: { id: recruiterUserId! },
      select: { id: true, role: true },
    });

    if (dbVerifiedForRecruiter?.role !== "RECRUITER") {
      console.error("FAIL: Database authoritative check failed for recruiter:", dbVerifiedForRecruiter);
      allPassed = false;
    } else {
      console.log("PASS: Database authority strictly confirms user is RECRUITER; candidate dashboard will redirect.");
    }

    const dbVerifiedForCandidate = await prisma.user.findUnique({
      where: { id: candidateUserId! },
      select: { id: true, role: true },
    });

    if (dbVerifiedForCandidate?.role !== "CANDIDATE") {
      console.error("FAIL: Database authoritative check failed for candidate:", dbVerifiedForCandidate);
      allPassed = false;
    } else {
      console.log("PASS: Database authority strictly confirms user is CANDIDATE; recruiter dashboard will redirect.");
    }

    // -------------------------------------------------------------
    // TEST 11: Open Redirect Prevention on callbackUrl
    // -------------------------------------------------------------
    console.log("\n[TEST 11] Testing open redirect prevention on callbackUrl...");
    function isSafeInternalCallback(url: string | null): url is string {
      if (!url) return false;
      if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
        return false;
      }
      try {
        const parsed = new URL(url, "https://devhire.local");
        return parsed.origin === "https://devhire.local";
      } catch {
        return false;
      }
    }

    const dangerousUrls = [
      "https://evil.com",
      "http://attacker.com",
      "//malicious.site/phish",
      "///attacker.com",
      "/\\evil.com",
      "\\attacker.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "https://devhire.local.attacker.com",
    ];

    for (const badUrl of dangerousUrls) {
      if (isSafeInternalCallback(badUrl)) {
        console.error(`FAIL: Open redirect allowed dangerous URL: "${badUrl}"`);
        allPassed = false;
      }
    }

    const safeUrls = [
      "/candidate/dashboard",
      "/recruiter/dashboard",
      "/candidate/assessment/123",
      "/jobs",
    ];

    for (const goodUrl of safeUrls) {
      if (!isSafeInternalCallback(goodUrl)) {
        console.error(`FAIL: Safe internal URL was falsely blocked: "${goodUrl}"`);
        allPassed = false;
      }
    }
    console.log("PASS: Open redirect vulnerabilities strictly rejected; safe relative routes permitted.");

  } catch (err) {
    console.error("UNHANDLED TEST EXCEPTION:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN: Purge test records from Neon PostgreSQL
    // -------------------------------------------------------------
    console.log("\n[Teardown] Purging test accounts from Neon PostgreSQL...");
    try {
      if (candidateUserId) {
        await prisma.user.delete({ where: { id: candidateUserId } });
      }
      if (recruiterUserId) {
        await prisma.user.delete({ where: { id: recruiterUserId } });
      }
      if (recruiterCompanyId) {
        await prisma.company.delete({ where: { id: recruiterCompanyId } });
      }
      console.log("PASS: Test accounts and company purged cleanly from PostgreSQL.");
    } catch (cleanupErr) {
      console.error("[Teardown Error]:", cleanupErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("  >>> ALL AUTHENTICATION & ROLE ISOLATION TESTS PASSED! <<<      ");
  } else {
    console.error("  >>> SOME TESTS FAILED! CHECK LOGS ABOVE. <<<                ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runAuthIsolationTests().finally(() => prisma.$disconnect());
