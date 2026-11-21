import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createAssessmentInvitation,
  revokeAssessmentInvitation,
  getCompanyInvitations,
  getCandidateInvitations,
} from "../src/features/assessments/actions/invitation-actions";
import {
  createAssessment,
  getCandidateAssessmentPreview,
} from "../src/features/assessments/actions/assessment-actions";
import {
  createJob,
  type SessionContext,
} from "../src/features/jobs/actions/job-actions";

async function runInvitationTests() {
  console.log("==================================================================");
  console.log("  DEVHIRE PHASE 4B: ASSESSMENT INVITATIONS TEST SUITE            ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_1_EMAIL = `rec1.invtest.${timestamp}@devhire.test`;
  const RECRUITER_2_EMAIL = `rec2.invtest.${timestamp}@devhire.test`;
  const CANDIDATE_1_EMAIL = `cand1.invtest.${timestamp}@devhire.test`;
  const CANDIDATE_2_EMAIL = `cand2.invtest.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let allPassed = true;

  // Track entities for teardown
  let company1Id = "";
  let company2Id = "";
  let rec1UserId = "";
  let rec2UserId = "";
  let cand1UserId = "";
  let cand2UserId = "";

  let job1Id = "";
  let job2Id = "";
  let activeAssessment1Id = "";
  let activeAssessment2Id = "";
  let draftAssessmentId = "";
  let emptyAssessmentId = "";
  let jobBoundAssessmentId = "";

  let application1Id = "";
  let application2Id = "";
  const createdInvitationIds: string[] = [];
  const createdAssessmentIds: string[] = [];
  const createdJobIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test companies and users in Neon DB
    // -------------------------------------------------------------------------
    console.log("[Setup] Creating test companies and users in Neon DB...");
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    const comp1 = await prisma.company.create({
      data: {
        name: `Acme Robotics ${timestamp}`,
        slug: `acme-robotics-${timestamp}`,
        industry: "Robotics",
        location: "Boston, MA",
      },
    });
    company1Id = comp1.id;

    const comp2 = await prisma.company.create({
      data: {
        name: `Rival Automations ${timestamp}`,
        slug: `rival-auto-${timestamp}`,
        industry: "Automation",
        location: "Austin, TX",
      },
    });
    company2Id = comp2.id;

    const rec1User = await prisma.user.create({
      data: {
        name: "Acme Lead Recruiter",
        email: RECRUITER_1_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company1Id,
      },
    });
    rec1UserId = rec1User.id;

    const rec2User = await prisma.user.create({
      data: {
        name: "Rival Recruiter",
        email: RECRUITER_2_EMAIL,
        passwordHash: hash,
        role: "RECRUITER",
        companyId: company2Id,
      },
    });
    rec2UserId = rec2User.id;

    const cand1User = await prisma.user.create({
      data: {
        name: "Alice Candidate",
        email: CANDIDATE_1_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    cand1UserId = cand1User.id;

    const cand2User = await prisma.user.create({
      data: {
        name: "Bob Candidate",
        email: CANDIDATE_2_EMAIL,
        passwordHash: hash,
        role: "CANDIDATE",
      },
    });
    cand2UserId = cand2User.id;

    // Session Contexts
    const rec1Session: SessionContext = {
      user: {
        id: rec1UserId,
        email: RECRUITER_1_EMAIL,
        role: "RECRUITER",
        companyId: company1Id,
      },
    };

    const rec2Session: SessionContext = {
      user: {
        id: rec2UserId,
        email: RECRUITER_2_EMAIL,
        role: "RECRUITER",
        companyId: company2Id,
      },
    };

    const cand1Session: SessionContext = {
      user: {
        id: cand1UserId,
        email: CANDIDATE_1_EMAIL,
        role: "CANDIDATE",
      },
    };

    const cand2Session: SessionContext = {
      user: {
        id: cand2UserId,
        email: CANDIDATE_2_EMAIL,
        role: "CANDIDATE",
      },
    };

    // Create Jobs for Company 1 using createJob server action
    console.log("[Setup] Creating jobs for Company 1...");
    const job1Res = await createJob(
      {
        title: `Full Stack Engineer ${timestamp}`,
        description: "Looking for an experienced engineer",
        requirements: "TypeScript, React, Node.js, Next.js",
        location: "Boston, MA",
        locationType: "REMOTE",
        type: "FULL_TIME",
        status: "PUBLISHED",
      },
      rec1Session
    );
    if (!job1Res.success || !job1Res.job) throw new Error("Failed to create Job 1: " + job1Res.message);
    job1Id = (job1Res.job as { id: string }).id;
    createdJobIds.push(job1Id);

    const job2Res = await createJob(
      {
        title: `DevOps Specialist ${timestamp}`,
        description: "Looking for a cloud infrastructure wizard",
        requirements: "Kubernetes, Docker, Terraform, AWS",
        location: "Boston, MA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        status: "PUBLISHED",
      },
      rec1Session
    );
    if (!job2Res.success || !job2Res.job) throw new Error("Failed to create Job 2: " + job2Res.message);
    job2Id = (job2Res.job as { id: string }).id;
    createdJobIds.push(job2Id);

    // Create Applications
    console.log("[Setup] Creating applications...");
    const app1 = await prisma.application.create({
      data: {
        jobId: job1Id,
        candidateId: cand1UserId,
        status: "SUBMITTED",
      },
    });
    application1Id = app1.id;

    const app2 = await prisma.application.create({
      data: {
        jobId: job1Id,
        candidateId: cand2UserId,
        status: "SUBMITTED",
      },
    });
    application2Id = app2.id;

    // Create Assessments using createAssessment server action
    console.log("[Setup] Creating assessments...");

    // 1. Active general assessment (with questions)
    const asmt1Res = await createAssessment(
      {
        title: "Acme General Algorithms Assessment",
        description: "Tests core data structures and algorithmic thinking",
        durationMinutes: 60,
        passingScore: 70,
        status: "ACTIVE",
        questions: [
          {
            title: "Reverse a Linked List",
            description: "Given the head of a singly linked list, reverse the list.",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            starterCode: { javascript: "function reverse(head) { return null; }" },
            testCases: [
              {
                input: "[1,2,3]",
                expectedOutput: "[3,2,1]",
                isHidden: false,
              },
              {
                input: "[10,20]",
                expectedOutput: "[20,10]",
                isHidden: true,
              },
            ],
          },
        ],
      },
      rec1Session
    );
    if (!asmt1Res.success || !asmt1Res.assessmentId) throw new Error("Failed to create Assessment 1: " + asmt1Res.message);
    activeAssessment1Id = asmt1Res.assessmentId;
    createdAssessmentIds.push(activeAssessment1Id);

    // 2. Draft assessment (cannot invite)
    const asmtDraftRes = await createAssessment(
      {
        title: "Draft React Assessment",
        description: "Under development",
        durationMinutes: 45,
        passingScore: 70,
        status: "DRAFT",
        questions: [
          {
            title: "Custom Hook",
            description: "Build useCounter hook.",
            difficulty: "EASY",
            points: 50,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
          },
        ],
      },
      rec1Session
    );
    if (!asmtDraftRes.success || !asmtDraftRes.assessmentId) throw new Error("Failed to create Draft Assessment: " + asmtDraftRes.message);
    draftAssessmentId = asmtDraftRes.assessmentId;
    createdAssessmentIds.push(draftAssessmentId);

    // 3. Active assessment with 0 questions (cannot invite)
    const asmtEmpty = await prisma.assessment.create({
      data: {
        companyId: company1Id,
        creatorId: rec1UserId,
        title: "Empty Cloud Assessment",
        description: "No questions added yet",
        durationMinutes: 30,
        passingScore: 70,
        status: "ACTIVE",
      },
    });
    emptyAssessmentId = asmtEmpty.id;
    createdAssessmentIds.push(emptyAssessmentId);

    // 4. Job-bound assessment linked ONLY to Job 2 (DevOps)
    const asmtBoundRes = await createAssessment(
      {
        title: "DevOps Practical Exam",
        description: "Bound specifically to DevOps job",
        durationMinutes: 90,
        passingScore: 80,
        status: "ACTIVE",
        jobId: job2Id,
        questions: [
          {
            title: "Parse Terraform Output",
            description: "Parse state JSON.",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
          },
        ],
      },
      rec1Session
    );
    if (!asmtBoundRes.success || !asmtBoundRes.assessmentId) throw new Error("Failed to create Job Bound Assessment: " + asmtBoundRes.message);
    jobBoundAssessmentId = asmtBoundRes.assessmentId;
    createdAssessmentIds.push(jobBoundAssessmentId);

    // 5. Active assessment for Company 2 (Rival)
    const asmtRivalRes = await createAssessment(
      {
        title: "Rival Cloud Challenge",
        description: "Rival test",
        durationMinutes: 60,
        passingScore: 70,
        status: "ACTIVE",
        questions: [
          {
            title: "Rival Question",
            description: "Solve rival issue.",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
          },
        ],
      },
      rec2Session
    );
    if (!asmtRivalRes.success || !asmtRivalRes.assessmentId) throw new Error("Failed to create Rival Assessment: " + asmtRivalRes.message);
    activeAssessment2Id = asmtRivalRes.assessmentId;
    createdAssessmentIds.push(activeAssessment2Id);

    console.log("[Setup] Database fixtures successfully seeded.\n");

    // =========================================================================
    // TEST 1: Unauthenticated user rejected
    // =========================================================================
    console.log("TEST 1: Unauthenticated recruiter cannot create invitation");
    const unauthRes = await createAssessmentInvitation(
      {
        applicationId: application1Id,
        assessmentId: activeAssessment1Id,
        expiresInDays: 7,
      },
      null
    );
    if (!unauthRes.success && unauthRes.errorType === "UNAUTHENTICATED") {
      console.log("  [PASS] Unauthenticated access blocked correctly with UNAUTHENTICATED.");
    } else {
      console.error("  [FAIL] Expected UNAUTHENTICATED, got:", unauthRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 2: Cross-company applicant isolation (Recruiter 2 cannot invite Company 1 applicant)
    // =========================================================================
    console.log("\nTEST 2: Cross-company access rejected");
    const crossRes = await createAssessmentInvitation(
      {
        applicationId: application1Id, // Belongs to Company 1
        assessmentId: activeAssessment2Id, // Belongs to Company 2
        expiresInDays: 7,
      },
      rec2Session
    );
    if (!crossRes.success && crossRes.errorType === "FORBIDDEN") {
      console.log("  [PASS] Cross-company application access blocked with FORBIDDEN.");
    } else {
      console.error("  [FAIL] Expected FORBIDDEN isolation rejection, got:", crossRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 3: Cannot invite using DRAFT assessment
    // =========================================================================
    console.log("\nTEST 3: Cannot invite with DRAFT assessment");
    const draftRes = await createAssessmentInvitation(
      {
        applicationId: application1Id,
        assessmentId: draftAssessmentId,
        expiresInDays: 7,
      },
      rec1Session
    );
    if (!draftRes.success && draftRes.message.includes("ACTIVE")) {
      console.log("  [PASS] DRAFT assessment invitation blocked.");
    } else {
      console.error("  [FAIL] Expected ACTIVE requirement error, got:", draftRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 4: Cannot invite using assessment with 0 questions
    // =========================================================================
    console.log("\nTEST 4: Cannot invite with 0-question assessment");
    const emptyRes = await createAssessmentInvitation(
      {
        applicationId: application1Id,
        assessmentId: emptyAssessmentId,
        expiresInDays: 7,
      },
      rec1Session
    );
    if (!emptyRes.success && emptyRes.message.includes("coding challenge")) {
      console.log("  [PASS] 0-question assessment invitation blocked.");
    } else {
      console.error("  [FAIL] Expected question count guard error, got:", emptyRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 5: Job-assessment binding enforcement
    // =========================================================================
    console.log("\nTEST 5: Job-assessment binding guard");
    // app1 is for job1 (Full Stack), but jobBoundAssessment is bound to job2 (DevOps)
    const boundRes = await createAssessmentInvitation(
      {
        applicationId: application1Id,
        assessmentId: jobBoundAssessmentId,
        expiresInDays: 7,
      },
      rec1Session
    );
    if (!boundRes.success && boundRes.message.includes("assigned exclusively")) {
      console.log("  [PASS] Job-mismatched assessment invitation blocked.");
    } else {
      console.error("  [FAIL] Expected job-binding error, got:", boundRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 6: Successful invitation creation
    // =========================================================================
    console.log("\nTEST 6: Successful invitation creation");
    const inviteRes = await createAssessmentInvitation(
      {
        applicationId: application1Id,
        assessmentId: activeAssessment1Id,
        expiresInDays: 7,
      },
      rec1Session
    );
    let invitation1Id = "";
    if (inviteRes.success && inviteRes.invitationId) {
      invitation1Id = inviteRes.invitationId;
      createdInvitationIds.push(invitation1Id);
      console.log("  [PASS] Invitation created with ID:", invitation1Id);

      // Check DB record status is PENDING
      const dbInv = await prisma.assessmentInvitation.findUnique({
        where: { id: invitation1Id },
      });
      if (dbInv?.status === "PENDING") {
        console.log("  [PASS] Status is PENDING in database.");
      } else {
        console.error("  [FAIL] Expected PENDING status, got:", dbInv?.status);
        allPassed = false;
      }

      // Check application status was updated to ASSESSMENT_INVITED
      const updatedApp = await prisma.application.findUnique({
        where: { id: application1Id },
      });
      if (updatedApp?.status === "ASSESSMENT_INVITED") {
        console.log("  [PASS] Application status transitioned to ASSESSMENT_INVITED.");
      } else {
        console.error("  [FAIL] Expected ASSESSMENT_INVITED, got:", updatedApp?.status);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] Failed to create invitation:", inviteRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 7: Duplicate active invitation prevention
    // =========================================================================
    console.log("\nTEST 7: Duplicate active invitation rejection");
    const dupRes = await createAssessmentInvitation(
      {
        applicationId: application1Id,
        assessmentId: activeAssessment1Id,
        expiresInDays: 7,
      },
      rec1Session
    );
    if (!dupRes.success && dupRes.errorType === "DUPLICATE_INVITATION") {
      console.log("  [PASS] Duplicate active invitation prevented with DUPLICATE_INVITATION.");
    } else {
      console.error("  [FAIL] Expected duplicate prevention error, got:", dupRes);
      allPassed = false;
    }

    // =========================================================================
    // TEST 7b: Concurrency: Simultaneous duplicate requests must produce strictly 1 active invitation
    // =========================================================================
    console.log("\nTEST 7b: Simultaneous concurrent invitation creation");
    const concurrentResults = await Promise.all([
      createAssessmentInvitation(
        { applicationId: application2Id, assessmentId: activeAssessment1Id, expiresInDays: 7 },
        rec1Session
      ),
      createAssessmentInvitation(
        { applicationId: application2Id, assessmentId: activeAssessment1Id, expiresInDays: 7 },
        rec1Session
      ),
      createAssessmentInvitation(
        { applicationId: application2Id, assessmentId: activeAssessment1Id, expiresInDays: 7 },
        rec1Session
      ),
    ]);

    const successfulConcurrent = concurrentResults.filter((r) => r.success);
    const rejectedConcurrent = concurrentResults.filter((r) => !r.success && r.errorType === "DUPLICATE_INVITATION");

    let concurrentInv2Id = "";
    if (successfulConcurrent.length === 1 && rejectedConcurrent.length === 2) {
      console.log("  [PASS] Concurrency guard verified: Exactly 1 concurrent request succeeded, 2 rejected as duplicates.");
      concurrentInv2Id = successfulConcurrent[0].invitationId!;
      createdInvitationIds.push(concurrentInv2Id);
    } else {
      console.error("  [FAIL] Concurrency violation: Results:", concurrentResults);
      allPassed = false;
      for (const r of successfulConcurrent) {
        if (r.invitationId) createdInvitationIds.push(r.invitationId);
      }
    }

    // Verify DB state: strictly 1 active invitation exists for app2
    const activeApp2Invs = await prisma.assessmentInvitation.count({
      where: {
        applicationId: application2Id,
        assessmentId: activeAssessment1Id,
        status: { in: ["PENDING", "STARTED"] },
      },
    });
    if (activeApp2Invs === 1) {
      console.log("  [PASS] Database integrity confirmed: Strictly 1 active invitation record in Neon DB.");
    } else {
      console.error("  [FAIL] Database constraint failed: Found active invitations count:", activeApp2Invs);
      allPassed = false;
    }

    // =========================================================================
    // TEST 8: Recruiter view company invitations
    // =========================================================================
    console.log("\nTEST 8: Recruiter retrieves company invitations");
    const compInvites = await getCompanyInvitations("ALL", rec1Session);
    if (compInvites.success && compInvites.invitations.some((inv) => inv.id === invitation1Id)) {
      console.log("  [PASS] Company 1 recruiter sees the created invitation.");
    } else {
      console.error("  [FAIL] Invitation not found in company invitations list:", compInvites);
      allPassed = false;
    }

    // Recruiter 2 should NOT see Company 1's invitations
    const rivalInvites = await getCompanyInvitations("ALL", rec2Session);
    if (rivalInvites.success && !rivalInvites.invitations.some((inv) => inv.id === invitation1Id)) {
      console.log("  [PASS] Rival recruiter cannot see Company 1 invitations.");
    } else {
      console.error("  [FAIL] Rival recruiter saw Company 1 invitation!");
      allPassed = false;
    }

    // =========================================================================
    // TEST 9: Candidate retrieves invitations & candidate isolation
    // =========================================================================
    console.log("\nTEST 9: Candidate invitation access & isolation");
    const cand1Invites = await getCandidateInvitations(cand1Session);
    if (cand1Invites.success && cand1Invites.invitations.some((inv) => inv.id === invitation1Id)) {
      console.log("  [PASS] Candidate 1 sees their invitation.");
    } else {
      console.error("  [FAIL] Candidate 1 could not see their invitation:", cand1Invites);
      allPassed = false;
    }

    const cand2Invites = await getCandidateInvitations(cand2Session);
    if (cand2Invites.success && !cand2Invites.invitations.some((inv) => inv.id === invitation1Id)) {
      console.log("  [PASS] Candidate 2 cannot see Candidate 1's invitation.");
    } else {
      console.error("  [FAIL] Candidate 2 saw Candidate 1's invitation!");
      allPassed = false;
    }

    // =========================================================================
    // TEST 10: Critical Security Invariant on getCandidateAssessmentPreview
    // =========================================================================
    console.log("\nTEST 10: Critical Security Invariant on getCandidateAssessmentPreview");

    // 10a: Candidate with NO invitation (Candidate 2 on assessment 2) guessing assessment ID is rejected
    const guessRes = await getCandidateAssessmentPreview(activeAssessment2Id, cand2Session);
    const fakeIdRes = await getCandidateAssessmentPreview("11111111-2222-3333-4444-555555555555", cand2Session);
    if (
      !guessRes.success &&
      guessRes.message?.includes("Access Denied") &&
      !fakeIdRes.success &&
      fakeIdRes.message?.includes("Access Denied")
    ) {
      console.log("  [PASS] 10a: Uninvited candidate / guessed ID rejected with Access Denied.");
    } else {
      console.error("  [FAIL] 10a: Expected Access Denied for uninvited candidate, got:", { guessRes, fakeIdRes });
      allPassed = false;
    }

    // 10b: Valid invited candidate receives assessment metadata, but NO full problem descriptions/starter code/test cases
    const authorizedPreview = await getCandidateAssessmentPreview(activeAssessment1Id, cand1Session);
    if (authorizedPreview.success && authorizedPreview.preview) {
      console.log("  [PASS] 10b: Authorized candidate retrieved assessment metadata.");
      const preview = authorizedPreview.preview;
      console.log(`  [INFO] Title: "${preview.title}", Questions Count: ${preview.questionsCount}, Duration: ${preview.durationMinutes}m`);

      // Complete coding questions and test cases are strictly withheld until proctored attempt initiation
      if (preview.questions.length === 0 && preview.questionsCount > 0) {
        console.log("  [PASS] 10b: Anti-cheating guard verified! Question details array is empty until session starts.");
      } else {
        console.error("  [FAIL] 10b: Sensitive question data leaked in candidate preview:", preview.questions);
        allPassed = false;
      }
    } else {
      console.error("  [FAIL] 10b: Expected authorized candidate preview success, got:", authorizedPreview);
      allPassed = false;
    }

    // =========================================================================
    // TEST 11: Revoke Invitation & Security Verification
    // =========================================================================
    console.log("\nTEST 11: Revoke invitation and verify access cutoff");

    // 11a: Recruiter 2 cannot revoke Company 1 invitation
    const crossRevoke = await revokeAssessmentInvitation(invitation1Id, rec2Session);
    if (!crossRevoke.success && crossRevoke.message.includes("Forbidden")) {
      console.log("  [PASS] 11a: Cross-company revocation prevented with Forbidden.");
    } else {
      console.error("  [FAIL] 11a: Expected cross-company revocation failure, got:", crossRevoke);
      allPassed = false;
    }

    // 11b: Recruiter 1 revokes invitation
    const validRevoke = await revokeAssessmentInvitation(invitation1Id, rec1Session);
    if (validRevoke.success) {
      console.log("  [PASS] 11b: Recruiter 1 successfully revoked invitation.");
    } else {
      console.error("  [FAIL] 11b: Failed to revoke invitation:", validRevoke);
      allPassed = false;
    }

    // 11c: Candidate preview on revoked invitation is now REJECTED
    const revokedPreview = await getCandidateAssessmentPreview(activeAssessment1Id, cand1Session);
    if (!revokedPreview.success && revokedPreview.message?.includes("revoked")) {
      console.log("  [PASS] 11c: Revoked invitation candidate preview rejected with Access Denied (revoked).");
    } else {
      console.error("  [FAIL] 11c: Candidate could still preview revoked assessment! Got:", revokedPreview);
      allPassed = false;
    }

    // 11d: Duplicate revocation on already revoked invitation is rejected
    const dupRevoke = await revokeAssessmentInvitation(invitation1Id, rec1Session);
    if (!dupRevoke.success && dupRevoke.message?.includes("REVOKED")) {
      console.log("  [PASS] 11d: Duplicate revocation rejected: Cannot revoke already revoked invitation.");
    } else {
      console.error("  [FAIL] 11d: Expected duplicate revocation failure, got:", dupRevoke);
      allPassed = false;
    }

    // =========================================================================
    // TEST 12: Expiration logic
    // =========================================================================
    console.log("\nTEST 12: Expiration handling");
    const expiredInvId = concurrentInv2Id;
    // Set expiresAt to 1 day in the past to simulate expiration
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.assessmentInvitation.update({
      where: { id: expiredInvId },
      data: {
        expiresAt: pastDate,
      },
    });

    // Candidate 2 retrieves invitations - should be lazily marked EXPIRED
    const cand2Retrieved = await getCandidateInvitations(cand2Session);
    const targetInv = cand2Retrieved.invitations.find((i) => i.id === expiredInvId);
    if (targetInv && targetInv.status === "EXPIRED") {
      console.log("  [PASS] Past expiration date lazily transitioned to EXPIRED.");
    } else {
      console.error("  [FAIL] Expected EXPIRED status, got:", targetInv?.status);
      allPassed = false;
    }

    // Preview for expired invitation is REJECTED
    const expiredPreview = await getCandidateAssessmentPreview(activeAssessment1Id, cand2Session);
    if (!expiredPreview.success && expiredPreview.message?.includes("expired")) {
      console.log("  [PASS] Expired invitation preview rejected with Access Denied (expired).");
    } else {
      console.error("  [FAIL] Candidate could preview expired assessment! Got:", expiredPreview);
      allPassed = false;
    }
  } catch (err) {
    console.error("\n[CRITICAL RUNNER ERROR]:", err);
    allPassed = false;
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up all test fixtures from Neon DB
    // -------------------------------------------------------------------------
    console.log("\n[Teardown] Purging test invitations, assessments, applications, jobs, users, and companies...");
    try {
      if (createdInvitationIds.length > 0) {
        await prisma.assessmentInvitation.deleteMany({
          where: { id: { in: createdInvitationIds } },
        });
      }
      const appIds = [application1Id, application2Id].filter(Boolean);
      if (appIds.length > 0) {
        await prisma.application.deleteMany({
          where: { id: { in: appIds } },
        });
      }
      if (createdAssessmentIds.length > 0) {
        await prisma.assessment.deleteMany({
          where: { id: { in: createdAssessmentIds } },
        });
      }
      // Guarantee any assessments tied to the test companies/creators are removed
      const compIds = [company1Id, company2Id].filter(Boolean);
      const userIds = [rec1UserId, rec2UserId, cand1UserId, cand2UserId].filter(Boolean);
      if (compIds.length > 0) {
        await prisma.assessment.deleteMany({
          where: { companyId: { in: compIds } },
        });
      }
      if (createdJobIds.length > 0) {
        await prisma.job.deleteMany({
          where: { id: { in: createdJobIds } },
        });
      }
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
      if (compIds.length > 0) {
        await prisma.company.deleteMany({
          where: { id: { in: compIds } },
        });
      }
      console.log("[Teardown] Successfully purged all test records from Neon PostgreSQL.");
    } catch (cleanErr) {
      console.error("[Teardown Error]: Failed to clean up test fixtures:", cleanErr);
    }
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("  >>> ALL PHASE 4B INVITATION TESTS PASSED SUCCESSFULLY! <<<    ");
  } else {
    console.error("  >>> SOME PHASE 4B TESTS FAILED! INSPECT LOGS ABOVE. <<<     ");
    process.exit(1);
  }
  console.log("==================================================================");
}

runInvitationTests()
  .catch((err) => {
    console.error("Fatal runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
