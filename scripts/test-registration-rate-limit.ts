import "dotenv/config";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import { prisma } from "../src/lib/prisma";
import { registerCandidate, registerRecruiter } from "../src/features/auth/actions/register";
import { rateLimit, resetRateLimit } from "../src/lib/rate-limit";

async function runRegistrationRateLimitTests() {
  console.log("==================================================================");
  console.log("    DEVHIRE: REGISTRATION RATE LIMIT & ERROR HANDLING TEST SUITE   ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const TEST_CANDIDATE_EMAIL = `probe.cand.${timestamp}@devhire.test`;
  const TEST_RECRUITER_EMAIL = `probe.rec.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  // Save real env vars so we can restore them
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  let allPassed = true;

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Normal Candidate Registration Succeeds
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 1] Testing Normal Candidate Registration...");
    const candForm = new FormData();
    candForm.append("name", "Probe Candidate");
    candForm.append("email", TEST_CANDIDATE_EMAIL);
    candForm.append("password", TEST_PASSWORD);
    candForm.append("confirmPassword", TEST_PASSWORD);

    const candRes = await registerCandidate(candForm);
    if (!candRes.success) {
      console.error("  ✗ Candidate registration failed:", candRes.message);
      allPassed = false;
    } else {
      console.log("  ✓ Candidate registration succeeded:", candRes.message);
      const user = await prisma.user.findUnique({ where: { email: TEST_CANDIDATE_EMAIL } });
      if (user && user.role === "CANDIDATE" && user.passwordHash !== TEST_PASSWORD) {
        console.log("  ✓ Database user verified with CANDIDATE role and hashed password.");
      } else {
        console.error("  ✗ User database record verification failed!");
        allPassed = false;
      }
    }

    // -------------------------------------------------------------------------
    // SCENARIO 2: Normal Recruiter Registration Succeeds
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 2] Testing Normal Recruiter Registration...");
    const recForm = new FormData();
    recForm.append("name", "Probe Recruiter");
    recForm.append("email", TEST_RECRUITER_EMAIL);
    recForm.append("companyName", `Probe Labs ${timestamp}`);
    recForm.append("password", TEST_PASSWORD);
    recForm.append("confirmPassword", TEST_PASSWORD);

    const recRes = await registerRecruiter(recForm);
    if (!recRes.success) {
      console.error("  ✗ Recruiter registration failed:", recRes.message);
      allPassed = false;
    } else {
      console.log("  ✓ Recruiter registration succeeded:", recRes.message);
      const recUser = await prisma.user.findUnique({
        where: { email: TEST_RECRUITER_EMAIL },
        include: { company: true },
      });
      if (recUser && recUser.role === "RECRUITER" && recUser.company?.name === `Probe Labs ${timestamp}`) {
        console.log("  ✓ Database recruiter and company transactionally verified.");
      } else {
        console.error("  ✗ Recruiter database record verification failed!");
        allPassed = false;
      }
    }

    // -------------------------------------------------------------------------
    // SCENARIO 3: Repeated Attempts Trigger Rate Limiting
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 3] Testing Repeated Attempts Trigger Rate Limiting (threshold: 5)...");
    const rateLimitTestEmail = `spam.target.${timestamp}@devhire.test`;
    const rateLimitKey = `register:${rateLimitTestEmail}`;
    await resetRateLimit(rateLimitKey);

    // Consume 5 attempts directly or via rateLimit
    for (let i = 1; i <= 5; i++) {
      const check = await rateLimit(rateLimitKey, 5, 15 * 60 * 1000);
      if (!check.success) {
        console.error(`  ✗ Prematurely blocked on attempt ${i}`);
        allPassed = false;
      }
    }

    // 6th attempt via registration action should be blocked
    const spamForm = new FormData();
    spamForm.append("name", "Spam User");
    spamForm.append("email", rateLimitTestEmail);
    spamForm.append("password", TEST_PASSWORD);
    spamForm.append("confirmPassword", TEST_PASSWORD);

    const spamRes = await registerCandidate(spamForm);
    console.log("  Attempt 6 response:", spamRes);

    if (!spamRes.success && spamRes.message?.includes("Too many registration attempts")) {
      console.log("  ✓ 6th attempt successfully blocked with rate limit message!");
    } else {
      console.error("  ✗ 6th attempt was not blocked with expected rate limit message:", spamRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // SCENARIO 4: Expired Rate Limits Permit New Attempts
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 4] Testing Expired / Reset Rate Limits Permit New Attempts...");
    // Simulate expiration by resetting key
    await resetRateLimit(rateLimitKey);

    const postResetForm = new FormData();
    postResetForm.append("name", "Spam User");
    postResetForm.append("email", rateLimitTestEmail);
    postResetForm.append("password", TEST_PASSWORD);
    postResetForm.append("confirmPassword", TEST_PASSWORD);

    const postResetRes = await registerCandidate(postResetForm);
    if (postResetRes.success) {
      console.log("  ✓ Post-reset registration succeeded, proving expiration permits new attempts!");
    } else {
      console.error("  ✗ Post-reset registration failed:", postResetRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // SCENARIO 5: Missing Redis Credentials Produce Appropriate Service Error
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 5] Testing Missing Redis Credentials in Production Mode...");
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const noCredsEmail = `no.creds.${timestamp}@devhire.test`;
    const noCredsForm = new FormData();
    noCredsForm.append("name", "No Creds User");
    noCredsForm.append("email", noCredsEmail);
    noCredsForm.append("password", TEST_PASSWORD);
    noCredsForm.append("confirmPassword", TEST_PASSWORD);

    const noCredsRes = await registerCandidate(noCredsForm);
    console.log("  Missing creds response:", noCredsRes);

    if (
      !noCredsRes.success &&
      noCredsRes.message?.includes("temporarily unavailable") &&
      !noCredsRes.message?.includes("Too many")
    ) {
      console.log("  ✓ Correct service unavailable error returned (never misleadingly claims 'Too many attempts')!");
    } else {
      console.error("  ✗ Incorrect error response when Redis credentials missing:", noCredsRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // SCENARIO 6: Invalid Redis Credentials Fail Securely
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 6] Testing Invalid Redis Credentials Fail Securely (Upstash 401)...");
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = "invalid_token_xyz_401";

    const badCredsEmail = `bad.creds.${timestamp}@devhire.test`;
    const badCredsForm = new FormData();
    badCredsForm.append("name", "Bad Creds User");
    badCredsForm.append("email", badCredsEmail);
    badCredsForm.append("password", TEST_PASSWORD);
    badCredsForm.append("confirmPassword", TEST_PASSWORD);

    const badCredsRes = await registerCandidate(badCredsForm);
    console.log("  Invalid token response:", badCredsRes);

    if (
      !badCredsRes.success &&
      badCredsRes.message?.includes("temporarily unavailable") &&
      !badCredsRes.message?.includes("Too many")
    ) {
      console.log("  ✓ Secure service unavailable error returned on HTTP 401 without exposing internals!");
    } else {
      console.error("  ✗ Incorrect error response when Redis token is invalid:", badCredsRes);
      allPassed = false;
    }

    // Restore real env vars for remaining steps
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv.NODE_ENV;
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.UPSTASH_REDIS_REST_TOKEN;

    // -------------------------------------------------------------------------
    // SCENARIO 7: Database Failures Are Reported Appropriately
    // -------------------------------------------------------------------------
    console.log("\n[Scenario 7] Testing Database Duplicate & Failure Reporting...");
    // 7A: Duplicate registration
    const dupForm = new FormData();
    dupForm.append("name", "Duplicate Candidate");
    dupForm.append("email", TEST_CANDIDATE_EMAIL); // already created in Scenario 1
    dupForm.append("password", TEST_PASSWORD);
    dupForm.append("confirmPassword", TEST_PASSWORD);

    const dupRes = await registerCandidate(dupForm);
    if (!dupRes.success && dupRes.message?.includes("already exists")) {
      console.log("  ✓ Duplicate registration rejected with clear message:", dupRes.message);
    } else {
      console.error("  ✗ Duplicate registration not properly handled:", dupRes);
      allPassed = false;
    }

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n[Cleanup] Cleaning disposable test users and companies from database...");
    const cleanupEmails = [
      TEST_CANDIDATE_EMAIL,
      TEST_RECRUITER_EMAIL,
      rateLimitTestEmail,
      noCredsEmail,
      badCredsEmail,
    ];

    const recUserCleanup = await prisma.user.findUnique({
      where: { email: TEST_RECRUITER_EMAIL },
      select: { companyId: true },
    });

    await prisma.user.deleteMany({
      where: { email: { in: cleanupEmails } },
    });

    if (recUserCleanup?.companyId) {
      await prisma.company.deleteMany({
        where: { id: recUserCleanup.companyId },
      });
    }

    // Clean up any test Redis keys
    for (const em of cleanupEmails) {
      await resetRateLimit(`register:${em}`);
    }

    console.log("  ✓ All test records and rate limit keys cleaned up cleanly.");

    console.log("\n==================================================================");
    if (allPassed) {
      console.log("     ALL 7 REGISTRATION RATE LIMIT & ERROR TESTS PASSED!         ");
    } else {
      console.log("     ONE OR MORE TESTS FAILED - REVIEW LOGS ABOVE.               ");
    }
    console.log("==================================================================");
  } catch (err) {
    console.error("Fatal test runner error:", err);
    allPassed = false;
  } finally {
    // Ensure env is restored even on error
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv.NODE_ENV;
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.UPSTASH_REDIS_REST_TOKEN;
    await prisma.$disconnect();
    if (!allPassed) {
      process.exit(1);
    }
  }
}

runRegistrationRateLimitTests();
