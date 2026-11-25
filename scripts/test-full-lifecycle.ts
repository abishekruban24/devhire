import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import {
  createJob,
} from "../src/features/jobs/actions/job-actions";
import {
  applyToJob,
  getCompanyApplications,
  updateApplicationStatus,
  getCandidateApplications,
} from "../src/features/applications/actions/application-actions";
import {
  createAssessment,
} from "../src/features/assessments/actions/assessment-actions";
import {
  createAssessmentInvitation,
} from "../src/features/assessments/actions/invitation-actions";
import {
  startAssessmentAttempt,
  saveQuestionDraft,
  submitAssessmentAttempt,
} from "../src/features/assessments/actions/attempt-actions";
import {
  getAttemptReviewDetails,
  saveAssessmentReviewDraft,
  finalizeAndPublishReview,
  getCandidateAssessmentHistory,
} from "../src/features/assessments/actions/review-actions";

async function runFull17StepLifecycle() {
  console.log("==================================================================");
  console.log("   DEVHIRE PHASE 7: 17-STEP COMPLETE RECRUITMENT LIFECYCLE TEST   ");
  console.log("==================================================================");

  const timestamp = Date.now();
  const RECRUITER_EMAIL = `recruiter.lifecycle.${timestamp}@devhire.test`;
  const CANDIDATE_EMAIL = `candidate.lifecycle.${timestamp}@devhire.test`;
  const TEST_PASSWORD = "Password123!";

  let companyId = "";
  let recruiterId = "";
  let candidateId = "";
  let jobId = "";
  let applicationId = "";
  let assessmentId = "";
  let questionId = "";
  let invitationId = "";
  let attemptId = "";

  let allStepsPassed = true;

  try {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // -------------------------------------------------------------
    // STEP 1: Recruiter Registration
    // -------------------------------------------------------------
    console.log("\n[STEP 1/17] Recruiter Registration...");
    const company = await prisma.company.create({
      data: {
        name: `Acme Cloud Labs ${timestamp}`,
        slug: `acme-cloud-${timestamp}`,
        industry: "Cloud Infrastructure",
        location: "San Francisco, CA",
        website: "https://acme-cloud.test",
        description: "Pioneering next-generation distributed systems and cloud developer tools.",
      },
    });
    companyId = company.id;

    const recruiter = await prisma.user.create({
      data: {
        email: RECRUITER_EMAIL,
        name: "Lead Technical Recruiter",
        passwordHash: hashedPassword,
        role: "RECRUITER",
        companyId: companyId,
      },
    });
    recruiterId = recruiter.id;

    if (recruiter.role !== "RECRUITER" || recruiter.companyId !== companyId) {
      throw new Error("Step 1 Failed: Recruiter role or companyId mismatch.");
    }
    console.log(`  ✓ Recruiter registered successfully (ID: ${recruiterId}, Role: ${recruiter.role})`);

    // -------------------------------------------------------------
    // STEP 2: Company Profile Creation & Setup
    // -------------------------------------------------------------
    console.log("\n[STEP 2/17] Company Profile Creation / Setup...");
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        description: "Enterprise cloud systems and distributed high-throughput architecture.",
        location: "San Francisco, CA (Hybrid)",
      },
    });
    if (!updatedCompany.description?.includes("distributed") || updatedCompany.location !== "San Francisco, CA (Hybrid)") {
      throw new Error("Step 2 Failed: Company profile update not verified.");
    }
    console.log(`  ✓ Company profile setup verified: "${updatedCompany.name}" (${updatedCompany.location})`);

    // -------------------------------------------------------------
    // STEP 3: Job Requisition Creation
    // -------------------------------------------------------------
    console.log("\n[STEP 3/17] Job Requisition Creation...");
    const recruiterSession = {
      user: {
        id: recruiterId,
        email: RECRUITER_EMAIL,
        name: "Lead Technical Recruiter",
        role: "RECRUITER" as const,
        companyId: companyId,
      },
    };

    const jobResult = await createJob(
      {
        title: `Senior Distributed Systems Engineer ${timestamp}`,
        description: "Design, build, and optimize high-throughput distributed caching microservices.",
        location: "San Francisco, CA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        experienceLevel: "SENIOR",
        salaryMin: 180000,
        salaryMax: 240000,
        currency: "USD",
        requirements: "TypeScript, Distributed Systems, PostgreSQL, Redis",
        status: "PUBLISHED",
      },
      recruiterSession
    );

    const createdJob = jobResult.job as { id: string; title: string } | undefined;
    if (!jobResult.success || !createdJob?.id) {
      throw new Error(`Step 3 Failed: createJob error: ${jobResult.message}`);
    }
    jobId = createdJob.id;
    console.log(`  ✓ Job requisition created and published (ID: ${jobId}, Title: ${createdJob.title})`);

    // -------------------------------------------------------------
    // STEP 4: Candidate Registration
    // -------------------------------------------------------------
    console.log("\n[STEP 4/17] Candidate Registration...");
    const candidate = await prisma.user.create({
      data: {
        email: CANDIDATE_EMAIL,
        name: "Alex Dev Candidate",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
      },
    });
    candidateId = candidate.id;

    if (candidate.role !== "CANDIDATE" || candidate.companyId !== null) {
      throw new Error("Step 4 Failed: Candidate role mismatch or non-null companyId.");
    }
    console.log(`  ✓ Candidate registered successfully (ID: ${candidateId}, Role: ${candidate.role})`);

    // -------------------------------------------------------------
    // STEP 5: Candidate Profile Completion
    // -------------------------------------------------------------
    console.log("\n[STEP 5/17] Candidate Profile Completion...");
    const updatedCandidate = await prisma.user.update({
      where: { id: candidateId },
      data: {
        headline: "Senior Backend & Distributed Systems Specialist",
        bio: "Specializing in high-concurrency Node.js and TypeScript backends, relational schema design, and microservices.",
        skills: ["TypeScript", "Node.js", "PostgreSQL", "Redis", "Distributed Systems"],
        githubUrl: "https://github.com/alex-dev-candidate",
        linkedinUrl: "https://linkedin.com/in/alex-dev-candidate",
      },
    });
    if (updatedCandidate.skills.length !== 5 || !updatedCandidate.headline) {
      throw new Error("Step 5 Failed: Candidate profile completion not persisted.");
    }
    console.log(`  ✓ Candidate profile completed with skills: [${updatedCandidate.skills.join(", ")}]`);

    // -------------------------------------------------------------
    // STEP 6: Job Discovery
    // -------------------------------------------------------------
    console.log("\n[STEP 6/17] Job Discovery...");
    const discoveredJobs = await prisma.job.findMany({
      where: { status: "PUBLISHED", id: jobId },
      include: { company: true },
    });
    if (discoveredJobs.length !== 1 || discoveredJobs[0].companyId !== companyId) {
      throw new Error("Step 6 Failed: Published job not discoverable in catalog.");
    }
    console.log(`  ✓ Discovered published job: "${discoveredJobs[0].title}" by "${discoveredJobs[0].company.name}"`);

    // -------------------------------------------------------------
    // STEP 7: Job Application
    // -------------------------------------------------------------
    console.log("\n[STEP 7/17] Job Application...");
    const candidateSession = {
      user: {
        id: candidateId,
        email: CANDIDATE_EMAIL,
        name: "Alex Dev Candidate",
        role: "CANDIDATE" as const,
      },
    };

    const applyResult = await applyToJob(
      {
        jobId: jobId,
        coverLetter: "I have over 6 years of experience architecting distributed caching systems and high-throughput PostgreSQL pipelines. Excited to contribute to Acme Cloud Labs!",
      },
      candidateSession
    );

    if (!applyResult.success || !applyResult.applicationId) {
      throw new Error(`Step 7 Failed: applyToJob error: ${applyResult.message}`);
    }
    applicationId = applyResult.applicationId;
    console.log(`  ✓ Candidate submitted job application (ID: ${applicationId})`);

    // -------------------------------------------------------------
    // STEP 8: Applicant Management (Recruiter Review)
    // -------------------------------------------------------------
    console.log("\n[STEP 8/17] Applicant Management...");
    const applicantRes = await getCompanyApplications(undefined, recruiterSession);
    const targetApplicant = applicantRes.applications.find((a) => a.id === applicationId);
    if (!targetApplicant || targetApplicant.candidateId !== candidateId) {
      throw new Error("Step 8 Failed: Applicant not found in recruiter's pipeline.");
    }
    console.log(`  ✓ Recruiter accessed applicant pipeline: found ${targetApplicant.candidate.name} with status "${targetApplicant.status}"`);

    // -------------------------------------------------------------
    // STEP 9: Assessment Creation
    // -------------------------------------------------------------
    console.log("\n[STEP 9/17] Assessment Creation...");
    const assessmentResult = await createAssessment(
      {
        title: `Distributed Cache & Algorithmic Assessment ${timestamp}`,
        description: "Assess fundamental data structures and algorithmic complexity for distributed systems.",
        durationMinutes: 60,
        passingScore: 70,
        jobId: jobId,
        status: "ACTIVE",
        questions: [
          {
            title: "Implement LRU Cache eviction strategy",
            description: "Implement a Least Recently Used (LRU) cache with O(1) get and put operations.",
            difficulty: "MEDIUM",
            points: 100,
            timeLimitMs: 2000,
            memoryLimitKb: 128000,
            starterCode: { javascript: "function solve(capacity) {\n  // Implement LRU Cache\n  return true;\n}" },
            orderIndex: 0,
            testCases: [
              {
                input: "capacity=2, put(1,1), put(2,2), get(1)",
                expectedOutput: "1",
                isHidden: false,
                weight: 50,
              },
              {
                input: "put(3,3), get(2)",
                expectedOutput: "-1",
                isHidden: true,
                weight: 50,
              },
            ],
          },
        ],
      },
      recruiterSession
    );

    if (!assessmentResult.success || !assessmentResult.assessmentId) {
      throw new Error(`Step 9 Failed: createAssessment error: ${assessmentResult.message}`);
    }
    assessmentId = assessmentResult.assessmentId;

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: "ACTIVE" },
    });

    const dbQuestions = await prisma.question.findMany({
      where: { assessmentId },
      orderBy: { orderIndex: "asc" },
    });
    questionId = dbQuestions[0].id;
    console.log(`  ✓ Technical assessment created (ID: ${assessmentId}, Question ID: ${questionId})`);

    // -------------------------------------------------------------
    // STEP 10: Assessment Invitation
    // -------------------------------------------------------------
    console.log("\n[STEP 10/17] Assessment Invitation...");
    const inviteResult = await createAssessmentInvitation(
      {
        assessmentId: assessmentId,
        applicationId: applicationId,
        expiresInDays: 7,
      },
      recruiterSession
    );

    if (!inviteResult.success || !inviteResult.invitationId) {
      throw new Error(`Step 10 Failed: createAssessmentInvitation error: ${inviteResult.message}`);
    }
    invitationId = inviteResult.invitationId;
    console.log(`  ✓ Assessment invitation created (ID: ${invitationId})`);

    // -------------------------------------------------------------
    // STEP 11: Timed Assessment Start
    // -------------------------------------------------------------
    console.log("\n[STEP 11/17] Timed Assessment Start...");
    const startResult = await startAssessmentAttempt(
      {
        invitationId: invitationId,
      },
      candidateSession
    );

    if (!startResult.success || !startResult.attemptId) {
      throw new Error(`Step 11 Failed: startAssessmentAttempt error: ${startResult.message}`);
    }
    attemptId = startResult.attemptId;
    console.log(`  ✓ Candidate started timed assessment (Attempt ID: ${attemptId}, Status: IN_PROGRESS)`);

    // -------------------------------------------------------------
    // STEP 12: Code Autosave
    // -------------------------------------------------------------
    console.log("\n[STEP 12/17] Code Autosave...");
    const draftCode = `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}`;

    const draftResult = await saveQuestionDraft(
      {
        attemptId: attemptId,
        questionId: questionId,
        code: draftCode,
        language: "typescript",
      },
      candidateSession
    );

    if (!draftResult.success) {
      throw new Error(`Step 12 Failed: saveQuestionDraft error: ${draftResult.message}`);
    }

    const savedSubmission = await prisma.submission.findFirst({
      where: {
        attemptId: attemptId,
        questionId: questionId,
      },
    });
    if (!savedSubmission || !savedSubmission.code.includes("class LRUCache")) {
      throw new Error("Step 12 Failed: Draft code not saved in database.");
    }
    console.log(`  ✓ Code draft autosaved successfully (${savedSubmission.code.length} bytes persisted)`);

    // -------------------------------------------------------------
    // STEP 13: Final Submission
    // -------------------------------------------------------------
    console.log("\n[STEP 13/17] Final Submission...");
    const submitResult = await submitAssessmentAttempt(
      {
        attemptId: attemptId,
      },
      candidateSession
    );

    if (!submitResult.success) {
      throw new Error(`Step 13 Failed: submitAssessmentAttempt error: ${submitResult.message}`);
    }

    const submittedAttempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });
    if (submittedAttempt?.status !== "SUBMITTED") {
      throw new Error(`Step 13 Failed: Expected status SUBMITTED, got ${submittedAttempt?.status}`);
    }
    console.log(`  ✓ Candidate submitted assessment attempt (Status: ${submittedAttempt.status}, SubmittedAt: ${submittedAttempt.submittedAt?.toISOString()})`);

    // -------------------------------------------------------------
    // STEP 14: Recruiter Manual Review (Draft Review)
    // -------------------------------------------------------------
    console.log("\n[STEP 14/17] Recruiter Manual Review...");
    const reviewDetails = await getAttemptReviewDetails(attemptId, recruiterSession);
    if (!reviewDetails.success || !reviewDetails.data || reviewDetails.data.questions.length === 0) {
      throw new Error(`Step 14 Failed: Could not fetch attempt review details: ${reviewDetails.message}`);
    }
    console.log(`  ✓ Recruiter retrieved candidate attempt with ${reviewDetails.data.questions.length} questions`);

    const draftReviewResult = await saveAssessmentReviewDraft(
      {
        attemptId: attemptId,
        overallFeedback: "Exceptional code readability and idiomatic Map usage for O(1) eviction.",
        questionReviews: [
          {
            questionId: questionId,
            pointsEarned: 92,
            feedback: "Clean implementation of double-ended eviction semantics using JS Map iterator.",
          },
        ],
      },
      recruiterSession
    );

    if (!draftReviewResult.success) {
      throw new Error(`Step 14 Failed: saveAssessmentReviewDraft error: ${draftReviewResult.message}`);
    }
    console.log("  ✓ Recruiter saved review draft with totalScore: 92");

    // -------------------------------------------------------------
    // STEP 15: Score / Feedback Publication
    // -------------------------------------------------------------
    console.log("\n[STEP 15/17] Score/Feedback Publication...");
    const publishResult = await finalizeAndPublishReview(
      {
        attemptId: attemptId,
        overallFeedback: "Outstanding engineering execution. Strong algorithmic instincts and clean code organization. Recommend immediate progression.",
        questionReviews: [
          {
            questionId: questionId,
            pointsEarned: 95,
            feedback: "Flawless O(1) access and eviction with optimal time and space complexity.",
          },
        ],
      },
      recruiterSession
    );

    if (!publishResult.success) {
      throw new Error(`Step 15 Failed: finalizeAndPublishReview error: ${publishResult.message}`);
    }

    const evaluatedAttempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { review: true },
    });

    if (evaluatedAttempt?.status !== "EVALUATED" || evaluatedAttempt.score !== 95) {
      throw new Error(`Step 15 Failed: Expected status EVALUATED with score 95, got ${evaluatedAttempt?.status} score: ${evaluatedAttempt?.score}`);
    }
    console.log(`  ✓ Official score published: ${evaluatedAttempt.score}/100 (Status: ${evaluatedAttempt.status})`);

    // -------------------------------------------------------------
    // STEP 16: Candidate Results / History Verification
    // -------------------------------------------------------------
    console.log("\n[STEP 16/17] Candidate Results & History Verification...");
    const candidateHistoryRes = await getCandidateAssessmentHistory(candidateSession);
    const publishedEntry = candidateHistoryRes.history.find((h) => h.attemptId === attemptId);
    if (!publishedEntry || publishedEntry.score !== 95 || !publishedEntry.passed) {
      throw new Error("Step 16 Failed: Published score not accurately visible in candidate history.");
    }
    console.log(`  ✓ Candidate accessed verified results: Score ${publishedEntry.score}%, Passed: ${publishedEntry.passed}, Feedback verified`);

    // -------------------------------------------------------------
    // STEP 17: Candidate Shortlisting
    // -------------------------------------------------------------
    console.log("\n[STEP 17/17] Candidate Shortlisting...");
    const shortlistResult = await updateApplicationStatus(
      applicationId,
      "SHORTLISTED",
      "Scored 95/100 on technical coding assessment. Candidate demonstrated top-tier distributed systems knowledge. Proceeding to final team fit interview.",
      recruiterSession
    );

    if (!shortlistResult.success) {
      throw new Error(`Step 17 Failed: updateApplicationStatus error: ${shortlistResult.message}`);
    }

    const updatedApp = await prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (updatedApp?.status !== "SHORTLISTED") {
      throw new Error(`Step 17 Failed: Application status is ${updatedApp?.status}, expected SHORTLISTED.`);
    }

    const candidateAppsRes = await getCandidateApplications(candidateSession);
    const candidateApp = candidateAppsRes.applications.find((a) => a.id === applicationId);
    if (candidateApp?.status !== "SHORTLISTED") {
      throw new Error("Step 17 Failed: SHORTLISTED status not reflected in candidate view.");
    }
    console.log(`  ✓ Candidate officially shortlisted (Application ID: ${applicationId}, Status: SHORTLISTED)`);

    console.log("\n==================================================================");
    console.log("   >>> ALL 17 STEPS OF RECRUITMENT LIFECYCLE PASSED 100%! <<<    ");
    console.log("==================================================================");
  } catch (err) {
    allStepsPassed = false;
    console.error("\n❌ LIFECYCLE TEST FAILED:", err instanceof Error ? err.message : err);
  } finally {
    console.log("\n[Teardown] Cleaning up lifecycle test entities from Neon PostgreSQL...");
    try {
      if (attemptId) {
        await prisma.submission.deleteMany({ where: { attemptId } });
        await prisma.questionReview.deleteMany({
          where: { review: { attemptId } },
        });
        await prisma.assessmentReview.deleteMany({ where: { attemptId } });
        await prisma.assessmentAttempt.deleteMany({ where: { id: attemptId } });
      }
      if (invitationId) {
        await prisma.assessmentInvitation.deleteMany({ where: { id: invitationId } });
      }
      if (companyId) {
        await prisma.testCase.deleteMany({
          where: { question: { assessment: { companyId } } },
        });
        await prisma.question.deleteMany({
          where: { assessment: { companyId } },
        });
        await prisma.assessment.deleteMany({ where: { companyId } });
      } else if (assessmentId) {
        await prisma.testCase.deleteMany({
          where: { question: { assessmentId } },
        });
        await prisma.question.deleteMany({ where: { assessmentId } });
        await prisma.assessment.deleteMany({ where: { id: assessmentId } });
      }
      if (applicationId) {
        await prisma.application.deleteMany({ where: { id: applicationId } });
      }
      if (jobId) {
        await prisma.job.deleteMany({ where: { id: jobId } });
      }
      if (candidateId) {
        await prisma.user.deleteMany({ where: { id: candidateId } });
      }
      if (recruiterId) {
        await prisma.user.deleteMany({ where: { id: recruiterId } });
      }
      if (companyId) {
        await prisma.company.deleteMany({ where: { id: companyId } });
      }
      console.log("  ✓ All test entities purged cleanly.");
    } catch (cleanupErr) {
      console.error("  Warning: Teardown had error:", cleanupErr);
    }
  }

  if (!allStepsPassed) {
    process.exit(1);
  }
}

runFull17StepLifecycle();
