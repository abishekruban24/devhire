# DevHire — API & Server Actions Specification

This document details the complete API and Server Action surface for DevHire. The platform leverages type-safe Next.js 16 Server Actions for state mutations and data operations, alongside Auth.js v5 route handlers for session authentication.

---

## 1. Architecture & Design Principles

- **Type-Safe RPC**: Rather than maintaining separate REST endpoints and manual client-side serialization layers, DevHire uses Next.js 16 Server Actions. Each action is an async server-side function with complete TypeScript end-to-end type safety.
- **Server-Side Authorization**: Every Server Action validates the authenticated session (`await auth()`) and re-verifies role and tenant permissions before querying the database.
- **Uniform Response Format**: All Server Actions return structured result objects conforming to:
  ```typescript
  type ActionResponse<T = unknown> = 
    | { success: true; message?: string; data?: T; [key: string]: unknown }
    | { success: false; error: string };
  ```

---

## 2. Authentication API & Endpoints

### 2.1 NextAuth Handlers
- **Endpoint**: `/api/auth/[...nextauth]`
- **Methods**: `GET`, `POST`
- **Description**: Handles session generation, CSRF tokens, provider discovery, and credential verification via Auth.js v5.

### 2.2 Auth Server Actions (`src/features/auth/actions/auth-actions.ts`)

#### `registerCandidate(data: RegisterCandidateInput)`
Registers a new candidate account.
- **Authorization**: Public (Enforces Upstash Redis rate limiting: 5 req / 15 min per IP)
- **Input**:
  ```typescript
  {
    name: string;        // Min 2 characters
    email: string;       // Valid RFC 5322 email
    password: string;    // Min 8 characters
    skills?: string[];
  }
  ```
- **Returns**: `{ success: true, message: string }` or `{ success: false, error: string }`

#### `registerRecruiter(data: RegisterRecruiterInput)`
Atomically creates an employer `Company` and a `RECRUITER` user account.
- **Authorization**: Public (Enforces Upstash Redis rate limiting: 5 req / 15 min per IP)
- **Input**:
  ```typescript
  {
    name: string;
    email: string;
    password: string;
    companyName: string;
    industry?: string;
    website?: string;
  }
  ```
- **Returns**: `{ success: true, message: string }` or `{ success: false, error: string }`

#### `loginUser(data: LoginInput)`
Verifies credentials, signs in via Auth.js, and issues a secure `HttpOnly` session cookie.
- **Authorization**: Public (Enforces rate limiting: 10 req / 15 min per IP)
- **Input**: `{ email: string; password: string }`
- **Returns**: `{ success: true, role: "CANDIDATE" | "RECRUITER", redirectUrl: string }`

#### `getVerifiedUserRole()`
Database-authoritative helper that retrieves the verified user role from PostgreSQL.
- **Authorization**: Authenticated session required.
- **Returns**: `{ success: true, role: "CANDIDATE" | "RECRUITER" | "ADMIN", companyId: string | null }`

---

## 3. Job Requisitions API (`src/features/jobs/actions/job-actions.ts`)

#### `createJob(data: CreateJobInput, sessionOverride?)`
Creates and optionally publishes a new job requisition.
- **Authorization**: `RECRUITER` role required; scopes to `session.user.companyId`.
- **Input**:
  ```typescript
  {
    title: string;
    description: string;
    requirements: string;
    location: string;
    locationType: "REMOTE" | "HYBRID" | "ON_SITE";
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    assessmentId?: string;
    status: "DRAFT" | "PUBLISHED";
  }
  ```

#### `updateJob(jobId: string, data: UpdateJobInput)`
Updates an existing job requisition owned by the recruiter's company.
- **Authorization**: `RECRUITER` role required; verifies company ownership.

#### `deleteJob(jobId: string)`
Deletes or archives a job requisition.
- **Authorization**: `RECRUITER` role required; verifies company ownership.

#### `getJobs(filters?: JobFilterParams)`
Retrieves published jobs with pagination, search queries, location filters, and seniority tiers.
- **Authorization**: Public / Candidate

---

## 4. Job Applications API (`src/features/applications/actions/application-actions.ts`)

#### `applyToJob(data: ApplyJobInput)`
Submits a candidate application for an active job requisition.
- **Authorization**: `CANDIDATE` role required.
- **Constraints**:
  - Enforces uniqueness via `@@unique([jobId, candidateId])`.
  - Prevents applying to closed or draft jobs.
- **Input**:
  ```typescript
  {
    jobId: string;
    coverLetter?: string;
    resumeUrl?: string;
  }
  ```

#### `getCandidateApplications()`
Retrieves all applications submitted by the currently logged-in candidate with real-time status and invitation badges.
- **Authorization**: `CANDIDATE` role required.

#### `getCompanyApplications(filterStatus?: ApplicationStatus)`
Retrieves all candidate applications for jobs owned by the recruiter's company.
- **Authorization**: `RECRUITER` role required; scoped to `session.user.companyId`.

#### `updateApplicationStatus(applicationId: string, status: ApplicationStatus)`
Transitions an application through the hiring funnel state machine (`IN_REVIEW`, `ASSESSMENT_INVITED`, `SHORTLISTED`, `REJECTED`, `OFFERED`).
- **Authorization**: `RECRUITER` role required; verifies company ownership of the requisition.

---

## 5. Assessments & Authoring API (`src/features/assessments/actions/assessment-actions.ts`)

#### `createAssessment(data: CreateAssessmentInput)`
Creates a benchmark technical assessment containing coding challenges and unit test cases.
- **Authorization**: `RECRUITER` role required; bound to `companyId`.
- **Input**:
  ```typescript
  {
    title: string;
    description: string;
    durationMinutes: number;
    passingScore: number;
    questions: Array<{
      title: string;
      description: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      points: number;
      timeLimitMs: number;
      memoryLimitKb: number;
      starterCode: Record<string, string>;
      testCases: Array<{
        input: string;
        expectedOutput: string;
        isHidden: boolean;
        weight: number;
      }>;
    }>;
  }
  ```

#### `getCompanyAssessments()`
Lists all assessments created within the recruiter's company.
- **Authorization**: `RECRUITER` role required.

---

## 6. Assessment Invitations API (`src/features/assessments/actions/invitation-actions.ts`)

#### `createAssessmentInvitation(applicationId: string, assessmentId: string, expiresInDays?: number)`
Invites a candidate to take a timed coding assessment linked to their job application.
- **Authorization**: `RECRUITER` role required; verifies applicant belongs to recruiter's company.
- **State Transition**: Updates `application.status` to `ASSESSMENT_INVITED`.

#### `getCandidateInvitations()`
Retrieves all pending and completed assessment invitations for the authenticated candidate.
- **Authorization**: `CANDIDATE` role required.

---

## 7. Timed Coding Workspace API (`src/features/assessments/actions/attempt-actions.ts`)

#### `startAssessmentAttempt(invitationId: string)`
Initializes the candidate's timed session. Computes strict deadline: `expiresAt = NOW() + durationMinutes`.
- **Authorization**: `CANDIDATE` role required; must be the recipient of `invitationId`.
- **State Transition**: Sets `invitation.status = "STARTED"` and `attempt.status = "IN_PROGRESS"`.

#### `getAttemptWorkspace(attemptId: string)`
Retrieves assessment problems, starter code, and **public** test cases.
- **Security**: Strips all `testCases` where `isHidden === true`. Hidden test assertions are never returned to candidate clients.

#### `saveQuestionDraft(attemptId: string, questionId: string, code: string, language: string)`
Autosaves candidate code every 30 seconds to prevent data loss.
- **Authorization**: `CANDIDATE` role required; must own attempt; validates `NOW() < expiresAt`.

#### `submitAssessmentAttempt(attemptId: string)`
Finalizes and locks the candidate's assessment attempt.
- **Authorization**: `CANDIDATE` role required; must own attempt.
- **Security**: Transitions `attempt.status = "SUBMITTED"`. The submission record becomes strictly immutable. Further edits are rejected.

---

## 8. Manual Review & Rubric API (`src/features/assessments/actions/review-actions.ts`)

#### `getAttemptReviewDetails(attemptId: string)`
Retrieves candidate code, questions, and test cases for recruiter manual grading.
- **Authorization**: `RECRUITER` role required; verified against company ownership.

#### `finalizeAndPublishReview(attemptId: string, reviewData: FinalizeReviewInput)`
Commits the recruiter's qualitative feedback, per-question points, and hiring decision.
- **Authorization**: `RECRUITER` role required.
- **Atomic Transaction**:
  1. Computes `totalScore = (totalPoints / pointsPossible) * 100`.
  2. Compares `totalScore >= assessment.passingScore` to determine `passed`.
  3. Creates or updates `AssessmentReview` with `status = "PUBLISHED"`.
  4. Upserts `QuestionReview` records for each question.
  5. Updates `AssessmentAttempt.status = "EVALUATED"`.
  6. Automatically updates linked `Application.status` to `SHORTLISTED` (if passed) or `REJECTED` (if failed).

#### `getCandidateAssessmentHistory()`
Retrieves evaluated assessments, breakdown of points earned, and recruiter qualitative feedback.
- **Authorization**: `CANDIDATE` role required.

---

## 9. Profile Management API

- `updateCandidateProfile(data: UpdateProfileInput)`: Updates headline, bio, skills array, and GitHub/LinkedIn links (`CANDIDATE` role).
- `updateCompanyProfile(data: UpdateCompanyInput)`: Updates company overview, headquarters, and web domain (`RECRUITER` role).
