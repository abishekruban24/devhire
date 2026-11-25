# DevHire — Quality Assurance & Testing Suite

This document outlines the testing strategy, test suite architecture, automated test scripts, and real performance benchmarks for DevHire.

---

## 1. Testing Strategy & Pyramid

DevHire employs an end-to-end integration and regression testing strategy executed directly against live database fixtures:

```mermaid
flowchart TD
    subgraph E2ELayer ["End-to-End System Tests"]
        Lifecycle["17-Step Complete Recruitment Lifecycle Test\n(scripts/test-full-lifecycle.ts)"]
        BrowserCapture["Playwright Automated Headless Browser Verification\n(scripts/capture-screenshots.ts)"]
    end

    subgraph IntegrationLayer ["Domain Integration Suites"]
        AuthIso["Auth & Role-Based Isolation Suite\n(scripts/test-auth-role-isolation.ts)"]
        AppPipeline["Application Pipeline & Funnel State Machine\n(scripts/test-applications.ts)"]
        AssessSuite["Assessments & Hidden Test Case Suite\n(scripts/test-assessments.ts)"]
        ReviewSuite["Manual Code Review & Rubric Suite\n(scripts/test-manual-reviews.ts)"]
        RateLimitSuite["Upstash Redis Sliding Window Rate Limit Suite\n(scripts/test-registration-rate-limit.ts)"]
    end

    subgraph BuildLayer ["Compile & Static Analysis"]
        TypeCheck["TypeScript Strict Mode (tsc --noEmit)"]
        LintCheck["ESLint Next.js Core Web Vitals (next lint)"]
        PrismaVal["Prisma Schema Validation (prisma validate)"]
        NextBuild["Production Compilation (next build)"]
    end

    E2ELayer --> IntegrationLayer
    IntegrationLayer --> BuildLayer
```

---

## 2. The 17-Step End-to-End Recruitment Lifecycle

The cornerstone of DevHire's test validation is `scripts/test-full-lifecycle.ts`. This comprehensive script tests every state transition across both Candidate and Recruiter personas in sequence using real database entities:

| Step | Operation | Tested Component | Success Criteria |
|---|---|---|---|
| **Step 1** | Recruiter Registration | `auth-actions.ts` / Prisma | Recruiter user created with hashed password and linked to new `Company` |
| **Step 2** | Company Profile Setup | `company-actions.ts` | Company overview, industry, and location updated successfully |
| **Step 3** | Job Requisition Creation | `job-actions.ts` | Job requisition created with `PUBLISHED` status and unique slug |
| **Step 4** | Candidate Registration | `auth-actions.ts` / Prisma | Candidate user created with `CANDIDATE` role and null `companyId` |
| **Step 5** | Candidate Profile Setup | `profile-actions.ts` | Headline, bio, and skills array populated |
| **Step 6** | Job Search & Discovery | `job-actions.ts` | Candidate queries published jobs; verifies requisition appears in directory |
| **Step 7** | Job Application Submission | `application-actions.ts` | Application created with `SUBMITTED` status; duplicates rejected |
| **Step 8** | Recruiter Pipeline Review | `application-actions.ts` | Recruiter queries company applications; advances status to `IN_REVIEW` |
| **Step 9** | Assessment Authoring | `assessment-actions.ts` | Assessment template created with coding problems and hidden/public test cases |
| **Step 10**| Issue Assessment Invitation | `invitation-actions.ts` | Invitation record created; application status updated to `ASSESSMENT_INVITED` |
| **Step 11**| Candidate Invitation Discovery| `invitation-actions.ts` | Candidate queries pending invitations and verifies assessment metadata |
| **Step 12**| Start Timed Assessment | `attempt-actions.ts` | Attempt initialized; strict `expiresAt` calculated on server clock |
| **Step 13**| Workspace Draft Autosave | `attempt-actions.ts` | Candidate code autosaves without mutating final submission status |
| **Step 14**| Final Assessment Submission | `attempt-actions.ts` | Attempt transitioned to `SUBMITTED`; code locked immutably |
| **Step 15**| Recruiter Manual Review | `review-actions.ts` | Recruiter inspects candidate code, problem description, and test cases |
| **Step 16**| Atomic Review Finalization | `review-actions.ts` | Prisma `$transaction` commits rubric score, feedback, and updates attempt |
| **Step 17**| Candidate Results & Status | `review-actions.ts` / Prisma | Candidate queries results; verifies passing score and `SHORTLISTED` status |

---

## 3. Dedicated Regression Suites

### 3.1 Role Isolation & Multi-Tenancy (`scripts/test-auth-role-isolation.ts`)
- Confirms candidates cannot invoke recruiter Server Actions.
- Confirms recruiters cannot access or modify requisitions owned by competing organizations.
- Confirms unauthenticated callers are rejected with `Unauthorized`.

### 3.2 Application State Machine (`scripts/test-applications.ts`)
- Verifies all legal state transitions: `SUBMITTED` -> `IN_REVIEW` -> `ASSESSMENT_INVITED` -> `ASSESSMENT_COMPLETED` -> `SHORTLISTED` / `REJECTED` -> `OFFERED`.
- Enforces uniqueness: duplicate applications from the same candidate to the same job trigger constraint violations.

### 3.3 Assessment Authoring & Hidden Tests (`scripts/test-assessments.ts`)
- Verifies question point allocations and time limit validations.
- Verifies that hidden unit test cases (`isHidden: true`) are stripped before transmitting assessment workspaces to candidates.

### 3.4 Manual Reviews & Rubrics (`scripts/test-manual-reviews.ts`)
- Tests rubric scoring calculations: `(pointsEarned / pointsPossible) * 100`.
- Verifies that scores above or equal to `assessment.passingScore` mark `passed = true`.
- Tests transaction atomicity: simulating a database constraint error rolls back all review rows without leaving corrupted state.

### 3.5 Rate Limiting Under Concurrency (`scripts/test-registration-rate-limit.ts`)
- Fires 10 concurrent registration requests against Upstash Redis.
- Validates that the first 5 succeed while requests 6-10 receive `429 Too Many Requests`.

---

## 4. Real Measured Production Performance Benchmarks

Performance metrics captured directly from the live Vercel production deployment (`https://devhire-ten.vercel.app`) using Google Chrome (`PerformanceNavigationTiming` API):

| Page / Route | Viewport | Device | DNS (ms) | TCP (ms) | TTFB (ms) | DOM Ready (ms) | Load (ms) |
|---|---|---|---|---|---|---|---|
| **Landing Page (`/`)** | 1440x900 | Desktop | 10 | 120 | 72 | 562 | 562 |
| **Login (`/login`)** | 1440x900 | Desktop | 0 (cached) | 0 (cached) | 56 | 608 | 608 |
| **Candidate Dashboard** | 1440x900 | Desktop | 0 | 0 | 114 | 1,536 | 1,988 |
| **Recruiter Dashboard** | 1440x900 | Desktop | 0 | 0 | 50 | 689 | 1,393 |
| **Candidate Dashboard** | 390x844 | Mobile (iPhone 14) | 0 | 0 | 61 | 759 | 913 |
| **Recruiter Dashboard** | 390x844 | Mobile (iPhone 14) | 0 | 0 | 70 | 806 | 912 |

*Source: `docs/PERFORMANCE_METRICS.json` recorded on production build via automated headless browser.*

---

## 5. Running the Test Suite Locally

### Prerequisites
Ensure `.env` contains valid test credentials and database connectivity:
```bash
DATABASE_URL="postgresql://user:password@neon-host/dbname?sslmode=require"
AUTH_SECRET="your-development-auth-secret"
```

### Execution Commands

```bash
# 1. Static Verification
npm run type-check       # Strict TypeScript check
npm run lint             # ESLint validation
npx prisma validate      # Prisma schema verification

# 2. Production Build
npm run build            # Next.js production compilation

# 3. Complete 17-Step Recruitment Lifecycle Test
npx tsx scripts/test-full-lifecycle.ts

# 4. Role Isolation & Security Regression Test
npx tsx scripts/test-auth-role-isolation.ts

# 5. Application Funnel Test
npx tsx scripts/test-applications.ts

# 6. Manual Review Rubric Test
npx tsx scripts/test-manual-reviews.ts

# 7. Upstash Redis Rate Limit Test
npx tsx scripts/test-registration-rate-limit.ts

# 8. Headless Browser Screenshot & Performance Benchmark
npx tsx scripts/capture-screenshots.ts
```
