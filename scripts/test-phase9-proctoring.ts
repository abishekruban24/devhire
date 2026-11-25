import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { createJob } from "../src/features/jobs/actions/job-actions";
import { applyToJob } from "../src/features/applications/actions/application-actions";
import {
  createAssessment,
  getCandidateAssessmentPreview,
} from "../src/features/assessments/actions/assessment-actions";
import {
  createAssessmentInvitation,
  retestAssessmentCandidate,
} from "../src/features/assessments/actions/invitation-actions";
import {
  startAssessmentAttempt,
  confirmAssessmentOnboarding,
  logIntegrityEvent,
  saveAssessmentRecording,
  submitAssessmentAttempt,
  getAssessmentAttemptData,
} from "../src/features/assessments/actions/attempt-actions";
import {
  getAttemptReviewDetails,
} from "../src/features/assessments/actions/review-actions";

async function runPhase9Verification() {
  console.log("==================================================================");
  console.log("   DEVHIRE PHASE 9: ASSESSMENT INTEGRITY & PROCTORING TEST SUITE  ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_EMAIL = `recruiter.proctoring.${timestamp}@devhire.test`;
  const CANDIDATE_EMAIL = `candidate.proctoring.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let recruiterUser: any = null;
  let candidateUser: any = null;
  let company: any = null;
  let job: any = null;
  let application: any = null;
  let assessment: any = null;
  let invitation: any = null;
  let attemptId: string | null = null;

  let passedChecks = 0;
  let totalChecks = 0;

  function assertCheck(name: string, condition: boolean, detail?: string) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  [PASS] #${totalChecks} ${name}`);
    } else {
      console.error(`  [FAIL] #${totalChecks} ${name} - ${detail || "Condition not met"}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  }

  try {
    // ---------------------------------------------------------------
    // 1. SETUP TEST USERS & COMPANY
    // ---------------------------------------------------------------
    console.log("\n[1/7] Provisioning Test Recruiter, Candidate & Company...");
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    company = await prisma.company.create({
      data: {
        name: `Proctoring Test Corp ${timestamp}`,
        slug: `proctoring-corp-${timestamp}`,
      },
    });

    recruiterUser = await prisma.user.create({
      data: {
        email: RECRUITER_EMAIL,
        name: "Proctoring Lead Recruiter",
        role: "RECRUITER",
        passwordHash: hashedPassword,
        companyId: company.id,
      },
    });

    candidateUser = await prisma.user.create({
      data: {
        email: CANDIDATE_EMAIL,
        name: "Proctored Candidate",
        role: "CANDIDATE",
        passwordHash: hashedPassword,
      },
    });

    const recruiterSession = {
      user: {
        id: recruiterUser.id,
        role: recruiterUser.role,
        email: recruiterUser.email,
        companyId: company.id,
        name: recruiterUser.name,
      },
    };

    const candidateSession = {
      user: {
        id: candidateUser.id,
        role: candidateUser.role,
        email: candidateUser.email,
        name: candidateUser.name,
      },
    };

    assertCheck("Recruiter & Candidate Accounts Initialized", !!recruiterUser.id && !!candidateUser.id);

    // ---------------------------------------------------------------
    // 2. CREATE JOB & APPLICATION
    // ---------------------------------------------------------------
    console.log("\n[2/7] Creating Benchmark Job & Application...");
    const jobRes = await createJob(
      {
        title: "Senior Security Systems Engineer",
        description: "DevHire integrity test position requiring proctored coding assessments.",
        requirements: "TypeScript, Algorithms, Application Security, Data Structures",
        type: "FULL_TIME",
        locationType: "REMOTE",
        location: "San Francisco, CA",
        status: "PUBLISHED",
      },
      recruiterSession
    );
    assertCheck("Job Created Successfully", jobRes.success && !!jobRes.job?.id, jobRes.message);
    job = jobRes.job;

    const applyRes = await applyToJob(
      {
        jobId: job.id,
        coverLetter: "Excited to demonstrate integrity and technical proficiency.",
      },
      candidateSession
    );
    assertCheck("Application Submitted", applyRes.success && !!applyRes.applicationId, applyRes.message);
    application = { id: applyRes.applicationId };

    // ---------------------------------------------------------------
    // 3. PHASE 9B/9C/9D: CREATE ASSESSMENT WITH SMART PROCTORING SETTINGS
    // ---------------------------------------------------------------
    console.log("\n[3/7] Creating Assessment with Full Proctoring Suite...");
    const assessRes = await createAssessment(
      {
        title: "High-Integrity Algorithmic Evaluation",
        description: "Proctored assessment with webcam face detection, tab switch blocking, and incident recording.",
        durationMinutes: 45,
        passingScore: 75,
        jobId: job.id,
        enableProctoring: true,
        requireFullscreen: true,
        trackTabSwitches: true,
        trackFocusLoss: true,
        restrictPaste: true,
        restrictCopy: true,
        maxViolations: 3,
        autoSubmitOnViolations: true,
        webcamProctoring: true,
        recordingMode: "INCIDENT_ONLY",
        questions: [
          {
            title: "Cryptographic Subarray Signature",
            description: "Compute the hash of continuous subarray elements in O(N).",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 262144,
            starterCode: {
              python: "def solution(arr):\n    return []\n",
              typescript: "export function solution(arr: number[]): number[] {\n  return [];\n}\n",
            },
            orderIndex: 0,
            testCases: [
              {
                input: "[1, 2, 3]",
                expectedOutput: "[6]",
                isHidden: false,
                weight: 1.0,
              },
            ],
          },
        ],
      },
      recruiterSession
    );

    assertCheck("Assessment Created with Proctoring Config", assessRes.success && !!assessRes.assessmentId, assessRes.message);
    assessment = await prisma.assessment.findUnique({
      where: { id: assessRes.assessmentId! },
      include: { questions: true },
    });

    assertCheck(
      "Proctoring Fields Correctly Persisted",
      assessment.enableProctoring === true &&
        assessment.requireFullscreen === true &&
        assessment.trackTabSwitches === true &&
        assessment.webcamProctoring === true &&
        assessment.recordingMode === "INCIDENT_ONLY" &&
        assessment.maxViolations === 3
    );

    // Activate assessment to ACTIVE status so invitations can be dispatched
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: "ACTIVE" },
    });

    // ---------------------------------------------------------------
    // 4. PHASE 9A: INVITATION LIFECYCLE & DUPLICATE PREVENTION
    // ---------------------------------------------------------------
    console.log("\n[4/7] Testing Assessment Invitation Lifecycle & Duplicate Guards...");
    const inviteRes = await createAssessmentInvitation(
      {
        applicationId: application.id,
        assessmentId: assessment.id,
        expiresInDays: 7,
      },
      recruiterSession
    );
    assertCheck("Assessment Invitation Created", inviteRes.success && !!inviteRes.invitationId, inviteRes.message);
    invitation = await prisma.assessmentInvitation.findUnique({
      where: { id: inviteRes.invitationId! },
    });

    // Test duplicate prevention
    const dupInviteRes = await createAssessmentInvitation(
      {
        applicationId: application.id,
        assessmentId: assessment.id,
        expiresInDays: 7,
      },
      recruiterSession
    );
    assertCheck(
      "Duplicate Active Invitation Rejected with DUPLICATE_INVITATION Error",
      !dupInviteRes.success && dupInviteRes.errorType === "DUPLICATE_INVITATION"
    );

    // Verify candidate assessment preview exposes proctoring rules
    const previewRes = await getCandidateAssessmentPreview(assessment.id, candidateSession);
    assertCheck("Candidate Assessment Preview Loaded", previewRes.success && !!previewRes.preview, previewRes.message);
    assertCheck(
      "Preview Contains Proctoring Rules for Onboarding Screen",
      previewRes.preview?.enableProctoring === true &&
        previewRes.preview?.webcamProctoring === true &&
        previewRes.preview?.requireFullscreen === true
    );

    // ---------------------------------------------------------------
    // 5. PHASE 9B/9C: ONBOARDING GATE, CONSENT & TIMER ENFORCEMENT
    // ---------------------------------------------------------------
    console.log("\n[5/7] Testing Pre-Assessment Onboarding Screen & Delayed Timer Start...");
    const startRes = await startAssessmentAttempt(
      { invitationId: invitation.id },
      candidateSession
    );
    assertCheck("Assessment Attempt Started", startRes.success && !!startRes.attemptId);
    attemptId = startRes.attemptId!;

    // Query attempt state before onboarding
    const preOnboardingData = await getAssessmentAttemptData(attemptId, candidateSession);
    assertCheck("Attempt Loaded", preOnboardingData.success && !!preOnboardingData.data);
    assertCheck(
      "Timer Does NOT Decrement Before Onboarding Consent",
      preOnboardingData.data?.integrity?.consentGivenAt === null &&
        preOnboardingData.data?.timeRemainingSeconds === 45 * 60
    );

    // Candidate acknowledges rules, requests accommodation, and confirms onboarding
    const consentRes = await confirmAssessmentOnboarding(
      {
        attemptId,
        cameraConsent: true,
        recordingConsent: true,
        accommodationNotes: "Candidate requires higher font contrast and keyboard navigation.",
      },
      candidateSession
    );
    assertCheck("Onboarding Consent Confirmed", consentRes.success);

    // Verify timer is now active and expiresAt is set
    const postOnboardingData = await getAssessmentAttemptData(attemptId, candidateSession);
    assertCheck(
      "Attempt Has Recorded Consent Timestamp",
      !!postOnboardingData.data?.integrity?.consentGivenAt
    );
    assertCheck(
      "Accommodation Request Persisted in Ledger",
      postOnboardingData.data?.integrity?.accommodationNotes?.includes("higher font contrast") === true
    );

    // ---------------------------------------------------------------
    // 6. PHASE 9B/9C/9D: TELEMETRY, INCIDENTS, VIOLATIONS & AUTO-SUBMIT
    // ---------------------------------------------------------------
    console.log("\n[6/7] Testing Real-time Integrity Event Telemetry & Auto-Termination...");
    
    // Violation 1: Tab switch
    const evt1 = await logIntegrityEvent(
      {
        attemptId,
        eventType: "TAB_SWITCH",
        metadata: { clientTimestamp: new Date().toISOString() },
      },
      candidateSession
    );
    assertCheck("Event 1 Logged (TAB_SWITCH)", evt1.success && evt1.violationCount === 1);

    // Violation 2: Fullscreen exit
    const evt2 = await logIntegrityEvent(
      {
        attemptId,
        eventType: "FULLSCREEN_EXIT",
        metadata: { clientTimestamp: new Date().toISOString() },
      },
      candidateSession
    );
    assertCheck("Event 2 Logged (FULLSCREEN_EXIT)", evt2.success && evt2.violationCount === 2);

    // Non-punitive telemetry: Face absence (>15s)
    const faceEvt = await logIntegrityEvent(
      {
        attemptId,
        eventType: "FACE_ABSENT",
        metadata: { absentDurationSeconds: 18 },
      },
      candidateSession
    );
    assertCheck("Face Absence Telemetry Logged", faceEvt.success);

    // Violation 3: Paste attempt (reaches maxViolations = 3)
    const evt3 = await logIntegrityEvent(
      {
        attemptId,
        eventType: "PASTE_ATTEMPT",
        metadata: { payloadLength: 120 },
      },
      candidateSession
    );
    assertCheck(
      "Event 3 Logged (PASTE_ATTEMPT) & Triggers Policy Auto-Submit",
      evt3.success && evt3.violationCount === 3 && evt3.shouldAutoSubmit === true
    );

    // Incident Video Recording Persistence
    const recRes = await saveAssessmentRecording(
      {
        attemptId,
        recordingType: "INCIDENT",
        storageKey: "data:video/webm;base64,GkXfo59ChoEBQveBAULygQ8USA...",
        fileSize: 45200,
        durationSeconds: 15,
        incidentEventType: "TAB_SWITCH",
      },
      candidateSession
    );
    assertCheck("Incident Video Recording Persisted", recRes.success && !!recRes.recordingId);

    // Candidate finalizes submission via POLICY_VIOLATION
    const submitRes = await submitAssessmentAttempt(
      {
        attemptId,
        submissionReason: "POLICY_VIOLATION",
        answers: [
          {
            questionId: assessment.questions[0].id,
            code: "def solution(arr):\n    return [sum(arr)]\n",
            language: "python",
          },
        ],
      },
      candidateSession
    );
    assertCheck(
      "Assessment Auto-Submitted with POLICY_VIOLATION Reason",
      submitRes.success
    );

    // ---------------------------------------------------------------
    // 7. PHASE 9A/9D: RECRUITER AUDIT TIMELINE & RETEST AUTHORIZATION
    // ---------------------------------------------------------------
    console.log("\n[7/7] Testing Recruiter Review Telemetry & Intentional Retest Authorization...");

    // Recruiter fetches attempt review details
    const reviewDetailsRes = await getAttemptReviewDetails(attemptId, recruiterSession);
    assertCheck("Recruiter Review Details Retrieved", reviewDetailsRes.success && !!reviewDetailsRes.data);

    const integrityAudit = reviewDetailsRes.data?.integrity;
    assertCheck("Integrity Telemetry Present in Review", !!integrityAudit);
    assertCheck(
      "Submission Reason Correctly Displayed to Recruiter",
      integrityAudit?.submissionReason === "POLICY_VIOLATION"
    );
    assertCheck(
      "Violation Count Accurately Aggregated",
      integrityAudit?.violationCount === 3
    );
    assertCheck(
      "Specific Event Counts Broken Down (Tab Switch, Fullscreen, Copy/Paste, Face)",
      integrityAudit?.tabSwitchCount === 1 &&
        integrityAudit?.fullscreenExitCount === 1 &&
        integrityAudit?.copyPasteAttempts === 1 &&
        integrityAudit?.faceAbsenceCount === 1
    );
    assertCheck(
      "Incident Video Recordings Accessible in Recruiter Review",
      integrityAudit?.recordings?.length === 1 &&
        integrityAudit.recordings[0].incidentEventType === "TAB_SWITCH"
    );

    // Retest Authorization (Phase 9A)
    console.log("\nAuthorizing Retest for Candidate...");
    const retestRes = await retestAssessmentCandidate(
      {
        applicationId: application.id,
        assessmentId: assessment.id,
        reason: "Candidate experienced connection issues and requested authorized second attempt.",
        expiresInDays: 5,
      },
      recruiterSession
    );
    assertCheck("Retest Authorized & New Invitation Generated", retestRes.success && !!retestRes.invitationId);

    const appInvites = await prisma.assessmentInvitation.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
    });
    assertCheck("Application Invitation History Tracks Both Attempts", appInvites.length === 2);
    assertCheck(
      "Latest Invitation Active for Retest",
      appInvites[0].status === "PENDING"
    );

    console.log("\n==================================================================");
    console.log(`   PHASE 9 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log("==================================================================");
  } finally {
    // Clean up test data
    console.log("\nCleaning up test records from database...");
    try {
      if (attemptId) {
        await prisma.assessmentRecording.deleteMany({ where: { attemptId } });
        await prisma.integrityEvent.deleteMany({ where: { attemptId } });
        await prisma.submission.deleteMany({ where: { attemptId } });
        await prisma.assessmentAttempt.deleteMany({ where: { id: attemptId } });
      }
      if (application?.id) {
        await prisma.assessmentInvitation.deleteMany({ where: { applicationId: application.id } });
        await prisma.application.deleteMany({ where: { id: application.id } });
      }
      if (recruiterUser?.id) {
        await prisma.testCase.deleteMany({ where: { question: { assessment: { creatorId: recruiterUser.id } } } });
        await prisma.question.deleteMany({ where: { assessment: { creatorId: recruiterUser.id } } });
        await prisma.assessment.deleteMany({ where: { creatorId: recruiterUser.id } });
      }
      if (job?.id) {
        await prisma.job.deleteMany({ where: { id: job.id } });
      }
      if (recruiterUser?.id) {
        await prisma.user.deleteMany({ where: { id: recruiterUser.id } });
      }
      if (candidateUser?.id) {
        await prisma.user.deleteMany({ where: { id: candidateUser.id } });
      }
      if (company?.id) {
        await prisma.company.deleteMany({ where: { id: company.id } });
      }
      console.log("Cleanup completed.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }
}

runPhase9Verification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  });
