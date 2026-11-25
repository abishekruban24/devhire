# DevHire — Smart Technical Recruitment & Assessment Platform

[![Production](https://img.shields.io/badge/Production-Live-success?style=for-the-badge&logo=vercel)](https://devhire-ten.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM_7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Neon-Serverless_PostgreSQL-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Upstash-Serverless_Redis-FF4438?style=for-the-badge&logo=redis)](https://upstash.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4_SaaS_Theme-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

DevHire is an enterprise-grade technical recruitment and skills assessment SaaS platform designed to modernize software engineering hiring. By unifying job discovery, application tracking, timed in-browser coding workspaces with Monaco Editor, and recruiter-driven rubric evaluations, DevHire provides an end-to-end recruitment solution with defense-in-depth security and role-isolated dashboards.

**Live Production Application**: [https://devhire-ten.vercel.app](https://devhire-ten.vercel.app)  
**Source Repository**: [https://github.com/abishekruban24/devhire](https://github.com/abishekruban24/devhire)

---

## 1. System Architecture

DevHire operates on a decoupled serverless architecture utilizing React Server Components (RSC) for initial page loads, Next.js 16 Server Actions for type-safe state mutations, Auth.js v5 for stateless JWT authentication, and Neon Serverless PostgreSQL with PgBouncer connection pooling.

```mermaid
flowchart TD
    subgraph Clients ["Client Layer"]
        Desktop["Desktop Browser (1440x900+)"]
        Mobile["Mobile Browser (360px - 768px)"]
    end

    subgraph EdgeLayer ["Vercel Edge & Security Layer"]
        Edge["Vercel Edge Network / Global CDN"]
        SecHeaders["Security Headers Middleware\n(CSP, HSTS, X-Frame-Options, nosniff)"]
    end

    subgraph AppLayer ["Next.js 16 Application Runtime"]
        subgraph Routes ["Server Components (Dynamic Rendering)"]
            Landing["/ (Landing Page)"]
            LoginRoute["/login & /register"]
            CandHub["/candidate/dashboard (Candidate Hub)"]
            RecSuite["/recruiter/dashboard (Recruiter Suite)"]
            Workspace["/candidate/assessment/[id] (Monaco Workspace)"]
        end

        subgraph ServerActions ["Server Action Mutations & Auth"]
            AuthEngine["Auth.js v5 (NextAuth)\nJWT & Database Role Verification"]
            RateLimitEngine["Upstash Redis Rate Limiter\n(Sliding Window + Memory Fallback)"]
            DomainActions["Domain Actions:\njob-actions, application-actions,\nassessment-actions, review-actions"]
        end
    end

    subgraph StorageLayer ["Persistence & Database Layer"]
        PrismaORM["Prisma 7 ORM (@prisma/adapter-pg)"]
        NeonDB["Neon Serverless PostgreSQL (strict sslmode=verify-full)"]
        UpstashRedis["Upstash Serverless Redis (Rate Limiting)"]
    end

    Clients --> Edge
    Edge --> SecHeaders
    SecHeaders --> AppLayer
    Routes --> ServerActions
    ServerActions --> PrismaORM
    ServerActions --> UpstashRedis
    PrismaORM --> NeonDB
```

---

## 2. Relational Database Schema

The relational schema is defined in Prisma 7 and deployed on Neon PostgreSQL across 14 models with referential integrity, foreign key indexes, and cascade delete semantics.

```mermaid
erDiagram
    Company ||--o{ User : "employs recruiters"
    Company ||--o{ Job : "publishes"
    Company ||--o{ Assessment : "owns"
    Company ||--o{ AssessmentInvitation : "issues"

    User ||--o{ Job : "recruiter creates"
    User ||--o{ Assessment : "recruiter authors"
    User ||--o{ Application : "candidate submits"
    User ||--o{ AssessmentInvitation : "candidate receives"
    User ||--o{ AssessmentAttempt : "candidate executes"
    User ||--o{ Submission : "candidate codes"
    User ||--o{ AssessmentReview : "recruiter reviews"

    Job ||--o{ Application : "receives"
    Job |o--o| Assessment : "attaches to"

    Application ||--o{ AssessmentInvitation : "triggers"
    Application ||--o{ AssessmentAttempt : "links to"

    Assessment ||--o{ Question : "contains"
    Assessment ||--o{ AssessmentInvitation : "sends"
    Assessment ||--o{ AssessmentAttempt : "instantiates"

    Question ||--o{ TestCase : "validates with"
    Question ||--o{ Submission : "receives solutions for"
    Question ||--o{ QuestionReview : "evaluated by"

    AssessmentInvitation ||--o{ AssessmentAttempt : "activates"

    AssessmentAttempt ||--o{ Submission : "contains"
    AssessmentAttempt ||--o| EvaluationJob : "queues"
    AssessmentAttempt ||--o| AssessmentReview : "receives"

    Submission ||--o{ SubmissionResult : "generates"

    AssessmentReview ||--o{ QuestionReview : "details"
```

For complete field specifications, cascade delete rules, and composite indexes, refer to [DATABASE.md](docs/DATABASE.md).

---

## 3. The 17-Step Recruitment Lifecycle

DevHire supports the complete hiring funnel from initial recruiter registration to final candidate shortlisting:

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Lead Recruiter
    participant System as DevHire Engine
    actor Candidate as Alex Dev (Candidate)

    Note over Recruiter, System: 1. Requisition & Setup
    Recruiter->>System: 1. Register Recruiter Account
    Recruiter->>System: 2. Set Up Company Profile & Branding
    Recruiter->>System: 3. Create & Publish Job Requisition

    Note over Candidate, System: 2. Discovery & Application
    Candidate->>System: 4. Register Candidate Account
    Candidate->>System: 5. Complete Candidate Profile & Skills
    Candidate->>System: 6. Search & Browse Job Directory
    Candidate->>System: 7. Submit Application for Job

    Note over Recruiter, System: 3. Screening & Assessment
    Recruiter->>System: 8. Review Applicant Pipeline (IN_REVIEW)
    Recruiter->>System: 9. Author Coding Assessment & Unit Tests
    Recruiter->>System: 10. Issue Assessment Invitation to Candidate

    Note over Candidate, System: 4. Timed Coding Execution
    Candidate->>System: 11. Accept Invitation & View Instructions
    Candidate->>System: 12. Start Timed Session (Server sets expiresAt)
    Candidate->>System: 13. Code in Monaco Workspace (Autosave every 30s)
    Candidate->>System: 14. Finalize & Submit Code (Attempt locked immutably)

    Note over Recruiter, Candidate: 5. Rubric Evaluation & Outcome
    Recruiter->>System: 15. Inspect Submitted Code & Problem Criteria
    Recruiter->>System: 16. Publish Manual Rubric Review ($transaction)
    System->>Candidate: 17. Results Published: Candidate SHORTLISTED!
```

---

## 4. Feature Highlights

### Candidate Hub (`/candidate/dashboard`)
- **Hiring Funnel Tracker**: Real-time visualization of applications across `Submitted`, `In Review`, `Assessment Invited`, `Shortlisted`, and `Rejected`.
- **Job Directory**: Real-time searchable and filterable database of published job requisitions.
- **Application History**: Detailed history of applied roles with live company notes and stage badges.
- **Timed Coding Workspace**: Monaco Editor integrated with language selection (TypeScript, JavaScript, Python), public test assertions, and 30-second autosave polling.
- **Assessment Results & Feedback**: Detailed breakdown of points earned, passing score thresholds, and qualitative recruiter feedback.

### Recruiter Suite (`/recruiter/dashboard`)
- **Command Center Metrics**: Live pipeline metrics (active requisitions, total applicants, pending reviews, shortlisted candidates) computed directly from Neon PostgreSQL.
- **Job Management**: Create, edit, publish, and close job requisitions with compensation ranges, seniority tags, and location preferences.
- **Applicant Pipeline**: View applicant resumes, cover letters, and statuses, with one-click transitions and assessment invitation triggers.
- **Assessment Authoring**: Create multi-question coding challenges with point allocations, time/memory constraints, and public/hidden unit test cases.
- **Manual Rubric Review**: Review candidate code submissions, enter per-question rubric scores, provide feedback, and publish decisions atomically via `$transaction`.

---

## 5. Visual Tour

| Public Landing Page | Authentication Gateway |
|:---:|:---:|
| ![Landing Page](docs/screenshots/01-homepage.png) | ![Login Page](docs/screenshots/02-login.png) |
| *Modern dark-themed SaaS landing page* | *Auth.js v5 credentials authentication* |

| Candidate Dashboard Overview | Job Discovery Directory |
|:---:|:---:|
| ![Candidate Dashboard](docs/screenshots/03-candidate-dashboard.png) | ![Job Discovery](docs/screenshots/04-job-discovery.png) |
| *Real-time application funnel & invites* | *Searchable job requisitions* |

| Candidate Applications Tracker | Timed Coding Workspace (Monaco) |
|:---:|:---:|
| ![Applications Tracker](docs/screenshots/05-candidate-applications.png) | ![Monaco Workspace](docs/screenshots/06-coding-workspace.png) |
| *Status tracking across all applied jobs* | *In-browser editor with live countdown timer* |

| Candidate Assessment Results | Recruiter Command Center |
|:---:|:---:|
| ![Candidate Results](docs/screenshots/07-candidate-results.png) | ![Recruiter Dashboard](docs/screenshots/08-recruiter-dashboard.png) |
| *Rubric points breakdown & recruiter feedback* | *Hiring funnel metrics & pipeline overview* |

| Recruiter Job Requisition Management | Recruiter Candidate Pipeline |
|:---:|:---:|
| ![Job Management](docs/screenshots/09-recruiter-job-management.png) | ![Applicant Management](docs/screenshots/10-recruiter-applicant-management.png) |
| *Requisition authoring and publishing* | *Applicant review and invitation dispatch* |

| Recruiter Assessment Authoring | Recruiter Manual Rubric Review |
|:---:|:---:|
| ![Assessment Management](docs/screenshots/11-recruiter-assessment-management.png) | ![Manual Review](docs/screenshots/12-recruiter-manual-review.png) |
| *Benchmark creation with hidden test cases* | *Atomic rubric grading and feedback publishing* |

| Mobile Candidate Experience (390px) | Mobile Recruiter Experience (390px) |
|:---:|:---:|
| ![Mobile Candidate](docs/screenshots/13-mobile-candidate.png) | ![Mobile Recruiter](docs/screenshots/14-mobile-recruiter.png) |
| *Fully responsive mobile candidate hub* | *Touch-optimized mobile recruiter command* |

---

## 6. Real Production Performance Benchmarks

Performance metrics captured directly from the live Vercel production deployment (`https://devhire-ten.vercel.app`) using headless Chrome (`PerformanceNavigationTiming` API):

| Route / View | Device | Viewport | DNS (ms) | TCP (ms) | TTFB (ms) | DOM Ready (ms) | Total Load (ms) |
|---|---|---|---|---|---|---|---|
| **Landing Page (`/`)** | Desktop | 1440x900 | 10 | 120 | 72 | 562 | 562 |
| **Login (`/login`)** | Desktop | 1440x900 | 0 (cached) | 0 (cached) | 56 | 608 | 608 |
| **Candidate Dashboard** | Desktop | 1440x900 | 0 | 0 | 114 | 1,536 | 1,988 |
| **Recruiter Dashboard** | Desktop | 1440x900 | 0 | 0 | 50 | 689 | 1,393 |
| **Candidate Dashboard** | Mobile (iPhone 14) | 390x844 | 0 | 0 | 61 | 759 | 913 |
| **Recruiter Dashboard** | Mobile (iPhone 14) | 390x844 | 0 | 0 | 70 | 806 | 912 |

*Full JSON metrics report available at [`docs/PERFORMANCE_METRICS.json`](docs/PERFORMANCE_METRICS.json).*

---

## 7. Technology Stack

| Layer | Technology | Version | Architectural Rationale |
|---|---|---|---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) | 16 (App Router) | React Server Components for zero-bundle data fetching; Server Actions for type-safe mutations |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | 5 (Strict) | End-to-end type safety across database schemas, server actions, and UI components |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | v4 | Modern utility-first CSS with dark navy & slate SaaS design system |
| **Code Editor** | [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) | 4.7 | Desktop-grade VS Code editor experience inside browser assessments |
| **Authentication** | [Auth.js (NextAuth)](https://authjs.dev/) | 5.0 (Beta) | Stateless JWT tokens, `HttpOnly` secure cookies, and database-authoritative role verification |
| **Password Hashing** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.0 | Industry-standard salted password hashing (10 rounds) |
| **ORM** | [Prisma](https://www.prisma.io/) | 7.10 | Typed ORM with `@prisma/adapter-pg` driver adapter for serverless pooling |
| **Database** | [Neon PostgreSQL](https://neon.tech/) | Serverless | Serverless PostgreSQL with PgBouncer connection pooling and strict TLS certificate verification |
| **Rate Limiter** | [Upstash Redis](https://upstash.com/) | REST API | Sliding-window IP rate limiting with in-memory token-bucket fallback |
| **Deployment** | [Vercel](https://vercel.com/) | Edge & Serverless | Global CDN edge network with automatic GitHub deployment pipelines |

---

## 8. Project Structure

```
devhire/
├── docs/                               # Comprehensive Technical Documentation
│   ├── ARCHITECTURE.md                 # System, SSR/client boundaries, and request lifecycles
│   ├── DATABASE.md                     # Data dictionary, Prisma models, and ER diagram
│   ├── API.md                          # Server Actions, input schemas, and authorization rules
│   ├── SECURITY.md                     # Defense-in-depth, RBAC, TLS verification, and audit findings
│   ├── TESTING.md                      # QA strategy, 17-step lifecycle test, and performance benchmarks
│   ├── PLACEMENT_GUIDE.md              # Interview guide, 50 technical Q&As, and portfolio pitches
│   ├── PERFORMANCE_METRICS.json        # Real browser performance benchmark records
│   └── screenshots/                    # 14 authentic production browser screenshots
├── prisma/
│   ├── schema.prisma                   # 14 relational PostgreSQL models, indexes, and enums
│   └── migrations/                     # Complete historical database migration records
├── scripts/
│   ├── capture-screenshots.ts          # Playwright headless Chrome screenshot & metrics benchmark
│   ├── test-full-lifecycle.ts          # 17-step end-to-end integration test
│   ├── test-auth-role-isolation.ts     # Role isolation and route protection regression test
│   ├── test-applications.ts            # Application funnel state machine regression test
│   ├── test-assessments.ts             # Assessment authoring & hidden test case regression test
│   ├── test-manual-reviews.ts          # Rubric scoring & atomic transaction regression test
│   └── test-registration-rate-limit.ts # Upstash Redis rate limit concurrency test
├── src/
│   ├── app/                            # Next.js 16 App Router pages, layouts, and error boundaries
│   │   ├── (public)/                   # Landing page, public job directory
│   │   ├── candidate/                  # Candidate Hub and Monaco assessment workspace
│   │   ├── recruiter/                  # Recruiter Command Suite and review interfaces
│   │   ├── login/ & register/          # Authentication pages
│   │   └── api/auth/                   # Auth.js route handlers
│   ├── components/                     # Reusable UI primitives (Button, Card, Badge, Modal, Navbar)
│   ├── features/                       # Domain-driven feature modules
│   │   ├── auth/                       # Auth actions, credentials validation, rate limiting
│   │   ├── candidate/                  # Candidate profiles and dashboard views
│   │   ├── recruiter/                  # Recruiter pipeline, requisitions, and metrics views
│   │   ├── jobs/                       # Job requisition actions and filtering
│   │   ├── applications/               # Application pipeline state machine
│   │   └── assessments/                # Assessment authoring, attempt timers, and rubric reviews
│   ├── lib/                            # Shared utilities (Prisma singleton, rate limiter, logger)
│   ├── auth.ts & auth.config.ts        # Auth.js v5 configuration and JWT callbacks
│   └── middleware.ts                   # Edge route protection and security headers
├── .env.example                        # Safe environment variable template (zero secrets)
└── package.json                        # Project dependencies and script declarations
```

---

## 9. Local Development Setup

### 9.1 Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL Database**: Local PostgreSQL or [Neon](https://neon.tech/) serverless instance
- **Upstash Redis** (Optional): [Upstash Redis](https://upstash.com/) for distributed rate limiting (falls back to in-memory store if omitted)

### 9.2 Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/abishekruban24/devhire.git
   cd devhire
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the project root based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Populate the following variables:
   ```env
   # PostgreSQL connection string (Neon or local)
   DATABASE_URL="postgresql://user:password@neon-host/devhire?sslmode=require"

   # Auth.js secret (generate using `openssl rand -base64 32` or `npx auth secret`)
   AUTH_SECRET="your-32-byte-base64-auth-secret"
   NEXTAUTH_URL="http://localhost:3000"

   # Optional: Upstash Redis for rate limiting (falls back to memory if omitted)
   UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
   ```

4. **Initialize database schema**:
   ```bash
   npx prisma migrate dev
   ```

5. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 10. Verification & Test Commands

DevHire includes comprehensive static analysis and automated integration suites:

```bash
# 1. Strict TypeScript compilation check
npm run type-check

# 2. Next.js ESLint linting check
npm run lint

# 3. Prisma schema verification
npx prisma validate

# 4. Production build check
npm run build

# 5. Execute 17-Step End-to-End Recruitment Lifecycle test
npx tsx scripts/test-full-lifecycle.ts

# 6. Execute Role Isolation & Authorization regression suite
npx tsx scripts/test-auth-role-isolation.ts

# 7. Execute Application Funnel State Machine regression suite
npx tsx scripts/test-applications.ts

# 8. Execute Manual Review & Rubric regression suite
npx tsx scripts/test-manual-reviews.ts

# 9. Execute Upstash Redis Rate Limiting concurrency suite
npx tsx scripts/test-registration-rate-limit.ts
```

---

## 11. Known Limitations & Future Roadmap

In the interest of full technical transparency:
- **Assessment Review Model**: DevHire uses a structured manual review rubric with candidate code diff inspection. Automated untrusted sandbox code execution (e.g. Judge0 integration) is intentionally not active in the current release to prevent security risks and third-party rate limit dependencies.
- **Future Enhancements**:
  - Sandboxed code execution runner (Judge0) in isolated containerized worker environments.
  - WebSocket notifications for real-time recruiter alerts on candidate test submissions.
  - LLM-assisted code summarization to highlight algorithmic complexity and edge-case handling.
  - Automated interview scheduling integration with Google Calendar and Outlook.

---

## 12. Documentation Sitemap

- [System Architecture Specification](docs/ARCHITECTURE.md)
- [Database Data Dictionary & ER Diagram](docs/DATABASE.md)
- [API & Server Actions Reference](docs/API.md)
- [Application Security & Audit Report](docs/SECURITY.md)
- [Quality Assurance & Testing Suite](docs/TESTING.md)
- [Placement, Interview & Portfolio Guide](docs/PLACEMENT_GUIDE.md)

---

## 13. License

This project is licensed under the [MIT License](LICENSE).
