import { prisma } from "../src/lib/prisma";
import { registerCandidate, registerRecruiter } from "../src/features/auth/actions/register";
import bcrypt from "bcryptjs";
import { rateLimit, resetRateLimit } from "../src/lib/rate-limit";

async function runAuthTests() {
  console.log("==================================================================");
  console.log("       DEVHIRE PHASE 2B: DATABASE AUTHENTICATION TEST SUITE       ");
  console.log("==================================================================");
  console.log("Database connected via Prisma 7 & @prisma/adapter-pg (Neon PostgreSQL)");
  console.log("");

  const TEST_CANDIDATE_EMAIL = "test.candidate@devhire.test";
  const TEST_RECRUITER_EMAIL = "test.recruiter@devhire.test";
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  try {
    // 0. Clean up any existing test remnants first
    console.log("[Setup] Cleaning any previous test records from Neon DB...");
    const existingRecruiter = await prisma.user.findUnique({
      where: { email: TEST_RECRUITER_EMAIL },
      select: { companyId: true },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_CANDIDATE_EMAIL, TEST_RECRUITER_EMAIL] } },
    });
    if (existingRecruiter?.companyId) {
      await prisma.company.deleteMany({ where: { id: existingRecruiter.companyId } });
    }
    console.log("  ✓ Previous test records cleared cleanly.\n");

    // TEST 1: Candidate Registration
    console.log("[Test 1] Testing Candidate Registration Flow...");
    const candidateFormData = new FormData();
    candidateFormData.append("name", "Test Candidate");
    candidateFormData.append("email", TEST_CANDIDATE_EMAIL);
    candidateFormData.append("password", TEST_PASSWORD);
    candidateFormData.append("confirmPassword", TEST_PASSWORD);

    const candResult = await registerCandidate(candidateFormData);
    if (!candResult.success) {
      console.error("  ✗ Candidate registration failed:", candResult.message);
      allPassed = false;
    } else {
      console.log("  ✓ Candidate registration action returned success: true");

      const dbUser = await prisma.user.findUnique({
        where: { email: TEST_CANDIDATE_EMAIL },
      });

      if (!dbUser) {
        console.error("  ✗ User not found in database!");
        allPassed = false;
      } else {
        const isBcrypt = dbUser.passwordHash.startsWith("$2a$") || dbUser.passwordHash.startsWith("$2b$");
        const isNotPlain = dbUser.passwordHash !== TEST_PASSWORD;
        const roleCorrect = dbUser.role === "CANDIDATE";
        const companyNull = dbUser.companyId === null;

        console.log(`  ✓ DB record created: id=${dbUser.id}, email=${dbUser.email}, name="${dbUser.name}"`);
        console.log(`  ✓ Password properly hashed (bcrypt ${dbUser.passwordHash.slice(0, 15)}...): ${isBcrypt && isNotPlain}`);
        console.log(`  ✓ Plaintext password NEVER stored: ${isNotPlain}`);
        console.log(`  ✓ Role is strictly CANDIDATE: ${roleCorrect}`);
        console.log(`  ✓ Company ID is null for candidate: ${companyNull}`);

        if (!isBcrypt || !isNotPlain || !roleCorrect || !companyNull) allPassed = false;
      }
    }
    console.log("");

    // TEST 2: Duplicate Candidate Registration Rejection
    console.log("[Test 2] Testing Duplicate Email Rejection (Candidate)...");
    const dupCandResult = await registerCandidate(candidateFormData);
    if (!dupCandResult.success && dupCandResult.message?.includes("already exists")) {
      console.log(`  ✓ Duplicate registration correctly rejected with message: "${dupCandResult.message}"`);
    } else {
      console.error("  ✗ Duplicate registration was not properly rejected:", dupCandResult);
      allPassed = false;
    }
    console.log("");

    // TEST 3: Recruiter Registration Flow
    console.log("[Test 3] Testing Recruiter Registration Flow (Transactional User + Company)...");
    const recruiterFormData = new FormData();
    recruiterFormData.append("name", "Test Recruiter");
    recruiterFormData.append("email", TEST_RECRUITER_EMAIL);
    recruiterFormData.append("companyName", "DevHire Test Labs Inc.");
    recruiterFormData.append("password", TEST_PASSWORD);
    recruiterFormData.append("confirmPassword", TEST_PASSWORD);

    const recResult = await registerRecruiter(recruiterFormData);
    if (!recResult.success) {
      console.error("  ✗ Recruiter registration failed:", recResult.message);
      allPassed = false;
    } else {
      console.log("  ✓ Recruiter registration action returned success: true");

      const dbRecUser = await prisma.user.findUnique({
        where: { email: TEST_RECRUITER_EMAIL },
        include: { company: true },
      });

      if (!dbRecUser) {
        console.error("  ✗ Recruiter not found in database!");
        allPassed = false;
      } else {
        const isBcrypt = dbRecUser.passwordHash.startsWith("$2a$") || dbRecUser.passwordHash.startsWith("$2b$");
        const roleCorrect = dbRecUser.role === "RECRUITER";
        const companyCreated = dbRecUser.company?.name === "DevHire Test Labs Inc.";

        console.log(`  ✓ DB record created: id=${dbRecUser.id}, email=${dbRecUser.email}`);
        console.log(`  ✓ Password properly hashed (bcrypt): ${isBcrypt}`);
        console.log(`  ✓ Role is strictly RECRUITER: ${roleCorrect}`);
        console.log(`  ✓ Associated Company created (${dbRecUser.company?.name}, slug=${dbRecUser.company?.slug}): ${companyCreated}`);

        if (!isBcrypt || !roleCorrect || !companyCreated) allPassed = false;
      }
    }
    console.log("");

    // TEST 4: Duplicate Recruiter Registration Rejection
    console.log("[Test 4] Testing Duplicate Email Rejection (Recruiter)...");
    const dupRecResult = await registerRecruiter(recruiterFormData);
    if (!dupRecResult.success && dupRecResult.message?.includes("already exists")) {
      console.log(`  ✓ Duplicate registration correctly rejected with message: "${dupRecResult.message}"`);
    } else {
      console.error("  ✗ Duplicate recruiter registration was not properly rejected:", dupRecResult);
      allPassed = false;
    }
    console.log("");

    // TEST 5: Password Comparison & Credential Verification (Credentials Provider simulation)
    console.log("[Test 5] Testing Password Hash Verification & Sensitive Field Sanitization...");
    const userForAuth = await prisma.user.findUnique({
      where: { email: TEST_CANDIDATE_EMAIL },
    });
    if (!userForAuth) {
      console.error("  ✗ Candidate user missing for auth test");
      allPassed = false;
    } else {
      const correctMatch = await bcrypt.compare(TEST_PASSWORD, userForAuth.passwordHash);
      const wrongMatch = await bcrypt.compare("WrongPassword123!", userForAuth.passwordHash);
      console.log(`  ✓ Correct password matches hash: ${correctMatch}`);
      console.log(`  ✓ Incorrect password rejected: ${!wrongMatch}`);

      // Verify nonexistent user
      const nonExistent = await prisma.user.findUnique({
        where: { email: "nonexistent.user@devhire.test" },
      });
      console.log(`  ✓ Nonexistent user yields null: ${nonExistent === null}`);

      if (!correctMatch || wrongMatch || nonExistent !== null) allPassed = false;
    }
    console.log("");

    // TEST 6: Rate Limiter Protection
    console.log("[Test 6] Testing Rate Limiting (5 attempts threshold)...");
    const testKey = "login:test.ratelimit@devhire.test";
    await resetRateLimit(testKey);

    for (let i = 1; i <= 5; i++) {
      const check = await rateLimit(testKey, 5, 60000);
      if (!check.success) {
        console.error(`  ✗ Rate limit failed prematurely at attempt ${i}`);
        allPassed = false;
      }
    }
    const blockedCheck = await rateLimit(testKey, 5, 60000);
    console.log(`  ✓ 6th attempt successfully blocked: ${!blockedCheck.success}`);
    await resetRateLimit(testKey);
    const resetCheck = await rateLimit(testKey, 5, 60000);
    console.log(`  ✓ Rate limit reset successfully: ${resetCheck.success}`);
    if (blockedCheck.success || !resetCheck.success) allPassed = false;
    console.log("");

    // TEST 7: Cleanup
    console.log("[Test 7] Cleaning up test records from Neon DB...");
    const recUser = await prisma.user.findUnique({
      where: { email: TEST_RECRUITER_EMAIL },
      select: { companyId: true },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_CANDIDATE_EMAIL, TEST_RECRUITER_EMAIL] } },
    });
    if (recUser?.companyId) {
      await prisma.company.deleteMany({ where: { id: recUser.companyId } });
    }
    console.log("  ✓ Database cleaned up cleanly. Zero test artifacts left in Neon DB.");
    console.log("");

    console.log("==================================================================");
    if (allPassed) {
      console.log("        ALL PHASE 2B DATABASE AUTHENTICATION TESTS PASSED!        ");
    } else {
      console.log("        ONE OR MORE TESTS FAILED - REVIEW LOGS ABOVE.             ");
    }
    console.log("==================================================================");
  } catch (error) {
    console.error("Test execution threw error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthTests();
