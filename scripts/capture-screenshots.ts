import "./local-dns-preload.cjs";
import "dotenv/config";
import { chromium, Browser, Page } from "playwright-core";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.PRODUCTION_URL || "https://devhire-ten.vercel.app";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface PerformanceMetric {
  url: string;
  device: string;
  viewport: string;
  dnsMs: number;
  tcpMs: number;
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
}

const performanceMetrics: PerformanceMetric[] = [];

async function recordPerformance(page: Page, url: string, device: string, viewport: string) {
  try {
    const timing = await page.evaluate(() => {
      const perf = window.performance;
      const nav = perf.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav) {
        return {
          dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcpMs: Math.round(nav.connectEnd - nav.connectStart),
          ttfbMs: Math.round(nav.responseStart - nav.requestStart),
          domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          loadMs: Math.round(nav.loadEventEnd - nav.startTime),
        };
      }
      return null;
    });

    if (timing) {
      performanceMetrics.push({
        url,
        device,
        viewport,
        ...timing,
      });
    }
  } catch (err) {
    console.warn("Performance timing collection skipped:", err);
  }
}

async function captureAllScreenshots() {
  console.log("==================================================================");
  console.log("  DEVHIRE PHASE 8: AUTOMATED PRODUCTION SCREENSHOT CAPTURE        ");
  console.log("==================================================================");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output Directory: ${SCREENSHOT_DIR}\n`);

  const timestamp = Date.now();
  const DEMO_PASSWORD = "Password123!";
  const CANDIDATE_EMAIL = `alex.candidate.${timestamp}@devhire.test`;
  const RECRUITER_EMAIL = `sarah.recruiter.${timestamp}@devhire.test`;

  let companyId = "";
  let recruiterId = "";
  let candidateId = "";
  let jobId = "";
  let applicationId = "";
  let assessmentId = "";
  let questionId = "";
  let invitationId = "";
  let attemptId = "";

  let browser: Browser | null = null;

  try {
    // -------------------------------------------------------------
    // 1. SETUP SYNTHETIC DEMONSTRATION FIXTURES IN NEON POSTGRESQL
    // -------------------------------------------------------------
    console.log("[Setup] Creating synthetic demonstration accounts in Neon DB...");
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    const company = await prisma.company.create({
      data: {
        name: "Acme Cloud Systems",
        slug: `acme-cloud-${timestamp}`,
        industry: "Cloud Infrastructure & Distributed Systems",
        location: "San Francisco, CA (Hybrid)",
        website: "https://acmecloud.example",
        description: "Building next-generation distributed systems, event-driven streaming pipelines, and developer-first cloud infrastructure.",
      },
    });
    companyId = company.id;

    const recruiter = await prisma.user.create({
      data: {
        email: RECRUITER_EMAIL,
        name: "Sarah Jenkins",
        passwordHash: hashedPassword,
        role: "RECRUITER",
        companyId,
      },
    });
    recruiterId = recruiter.id;

    const candidate = await prisma.user.create({
      data: {
        email: CANDIDATE_EMAIL,
        name: "Alex Dev",
        passwordHash: hashedPassword,
        role: "CANDIDATE",
        headline: "Senior Distributed Systems & Backend Engineer",
        bio: "Specializing in high-concurrency Node.js and TypeScript backends, relational schema design, and microservices.",
        skills: ["TypeScript", "Distributed Systems", "PostgreSQL", "Node.js", "Redis"],
        githubUrl: "https://github.com/alex-dev",
        linkedinUrl: "https://linkedin.com/in/alex-dev",
      },
    });
    candidateId = candidate.id;

    const job = await prisma.job.create({
      data: {
        companyId,
        recruiterId,
        title: "Staff Distributed Systems Architect",
        slug: `staff-distributed-systems-${timestamp}`,
        description: "Design and implement resilient consensus engines, distributed caching microservices, and high-throughput messaging fabrics.",
        requirements: "8+ years in distributed systems, mastery of TypeScript/Go, PostgreSQL query optimization, Raft/Paxos consensus fundamentals.",
        location: "San Francisco, CA",
        locationType: "HYBRID",
        type: "FULL_TIME",
        experienceLevel: "SENIOR",
        salaryMin: 185000,
        salaryMax: 245000,
        currency: "USD",
        status: "PUBLISHED",
      },
    });
    jobId = job.id;

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId,
        status: "SHORTLISTED",
        coverLetter: "I have 7+ years of experience engineering high-throughput distributed caching microservices and event streaming architectures. Excited to contribute to Acme Cloud Systems!",
        notes: "Candidate scored 95/100 on coding assessment with optimal LRU Cache implementation. Recommended for final technical review.",
      },
    });
    applicationId = application.id;

    const assessment = await prisma.assessment.create({
      data: {
        companyId,
        creatorId: recruiterId,
        title: "Distributed Cache & Concurrency Benchmark",
        description: "Assess fundamental data structure mechanics, thread-safe memory management, and algorithmic eviction semantics.",
        durationMinutes: 60,
        passingScore: 70,
        status: "ACTIVE",
        jobs: { connect: { id: jobId } },
      },
    });
    assessmentId = assessment.id;

    const question = await prisma.question.create({
      data: {
        assessmentId,
        title: "Implement LRU Cache Eviction Strategy",
        description: "Design and implement a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) time complexity for get and put operations.",
        difficulty: "MEDIUM",
        points: 100,
        timeLimitMs: 2000,
        memoryLimitKb: 128000,
        starterCode: {
          typescript: "class LRUCache {\n  constructor(capacity: number) {\n    // Implement\n  }\n  get(key: number): number {\n    return -1;\n  }\n  put(key: number, value: number): void {\n    // Implement\n  }\n}",
        },
        orderIndex: 0,
      },
    });
    questionId = question.id;

    await prisma.testCase.createMany({
      data: [
        {
          questionId,
          input: "capacity=2, put(1,1), put(2,2), get(1)",
          expectedOutput: "1",
          isHidden: false,
          weight: 50,
        },
        {
          questionId,
          input: "put(3,3), get(2)",
          expectedOutput: "-1",
          isHidden: true,
          weight: 50,
        },
      ],
    });

    const invitation = await prisma.assessmentInvitation.create({
      data: {
        assessmentId,
        candidateId,
        applicationId,
        companyId,
        invitedById: recruiterId,
        status: "COMPLETED",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 3600 * 1000),
        completedAt: new Date(Date.now() - 1800 * 1000),
      },
    });
    invitationId = invitation.id;

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        candidateId,
        applicationId,
        invitationId,
        status: "EVALUATED",
        score: 95,
        startedAt: new Date(Date.now() - 3600 * 1000),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        submittedAt: new Date(Date.now() - 1800 * 1000),
      },
    });
    attemptId = attempt.id;

    const candidateCode = `class LRUCache {
  private capacity: number;
  private map: Map<number, number>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
  }
}`;

    await prisma.submission.create({
      data: {
        attemptId,
        questionId,
        candidateId,
        code: candidateCode,
        language: "typescript",
        status: "ACCEPTED",
        score: 95,
      },
    });

    const review = await prisma.assessmentReview.create({
      data: {
        attemptId,
        reviewerId: recruiterId,
        totalScore: 95,
        totalPoints: 95,
        pointsPossible: 100,
        passed: true,
        feedback: "Outstanding engineering execution. Idiomatic Map iterator usage demonstrates deep familiarity with JavaScript engine mechanics and optimal O(1) eviction semantics.",
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    await prisma.questionReview.create({
      data: {
        reviewId: review.id,
        questionId,
        pointsEarned: 95,
        feedback: "Clean, idiomatic TypeScript implementation. All test assertions satisfied.",
      },
    });

    console.log("  ✓ Synthetic fixtures ready for authentic screenshot capture.\n");

    // -------------------------------------------------------------
    // 2. LAUNCH PLAYWRIGHT BROWSER (CHROME)
    // -------------------------------------------------------------
    console.log("[Browser] Launching Chromium (channel: chrome)...");
    browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });

    // -------------------------------------------------------------
    // 3. CAPTURE HOMEPAGE & LOGIN (PUBLIC ROUTES)
    // -------------------------------------------------------------
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await desktopContext.newPage();

    console.log("[Capture 1/14] Homepage...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await recordPerformance(page, `${BASE_URL}/`, "Desktop", "1440x900");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-homepage.png"), fullPage: false });
    console.log("  ✓ Saved 01-homepage.png");

    console.log("[Capture 2/14] Login Page...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await recordPerformance(page, `${BASE_URL}/login`, "Desktop", "1440x900");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-login.png"), fullPage: false });
    console.log("  ✓ Saved 02-login.png");

    // -------------------------------------------------------------
    // 4. CANDIDATE WORKFLOW SCREENSHOTS
    // -------------------------------------------------------------
    console.log("[Candidate] Logging in as Alex Dev...");
    await page.fill('input[type="email"]', CANDIDATE_EMAIL);
    await page.fill('input[type="password"]', DEMO_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click('button[type="submit"]'),
    ]);

    console.log("[Capture 3/14] Candidate Dashboard Overview...");
    await recordPerformance(page, `${BASE_URL}/candidate/dashboard`, "Desktop", "1440x900");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-candidate-dashboard.png") });
    console.log("  ✓ Saved 03-candidate-dashboard.png");

    console.log("[Capture 4/14] Job Discovery View...");
    const jobsTab = page.locator('button:has-text("Job Directory"), button:has-text("Browse Jobs")').first();
    if (await jobsTab.isVisible()) {
      await jobsTab.click();
      await page.waitForTimeout(600);
    } else {
      await page.goto(`${BASE_URL}/candidate/dashboard?tab=jobs`, { waitUntil: "networkidle" });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-job-discovery.png") });
    console.log("  ✓ Saved 04-job-discovery.png");

    console.log("[Capture 5/14] Candidate Applications Tracker...");
    const appsTab = page.locator('button:has-text("My Applications")').first();
    if (await appsTab.isVisible()) {
      await appsTab.click();
      await page.waitForTimeout(600);
    } else {
      await page.goto(`${BASE_URL}/candidate/dashboard?tab=applications`, { waitUntil: "networkidle" });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-candidate-applications.png") });
    console.log("  ✓ Saved 05-candidate-applications.png");

    console.log("[Capture 6/14] Candidate Assessment Results & Feedback...");
    const resultsTab = page.locator('button:has-text("Assessments & Results"), button:has-text("Assessments")').first();
    if (await resultsTab.isVisible()) {
      await resultsTab.click();
      await page.waitForTimeout(600);
    } else {
      await page.goto(`${BASE_URL}/candidate/dashboard?tab=assessments`, { waitUntil: "networkidle" });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-candidate-results.png") });
    console.log("  ✓ Saved 07-candidate-results.png");

    console.log("[Capture 7/14] Timed Coding Workspace (Monaco)...");
    await page.goto(`${BASE_URL}/candidate/assessment/${attemptId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-coding-workspace.png") });
    console.log("  ✓ Saved 06-coding-workspace.png");

    await desktopContext.close();

    // -------------------------------------------------------------
    // 5. RECRUITER WORKFLOW SCREENSHOTS
    // -------------------------------------------------------------
    const recruiterContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const recPage = await recruiterContext.newPage();

    console.log("\n[Recruiter] Logging in as Sarah Jenkins (Acme Cloud Systems)...");
    await recPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await recPage.fill('input[type="email"]', RECRUITER_EMAIL);
    await recPage.fill('input[type="password"]', DEMO_PASSWORD);
    await Promise.all([
      recPage.waitForNavigation({ waitUntil: "networkidle" }),
      recPage.click('button[type="submit"]'),
    ]);

    console.log("[Capture 8/14] Recruiter Console Overview & Pipeline...");
    await recordPerformance(recPage, `${BASE_URL}/recruiter/dashboard`, "Desktop", "1440x900");
    await recPage.screenshot({ path: path.join(SCREENSHOT_DIR, "08-recruiter-dashboard.png") });
    console.log("  ✓ Saved 08-recruiter-dashboard.png");

    console.log("[Capture 9/14] Recruiter Job Requisition Management...");
    const recJobsTab = recPage.locator('button:has-text("Requisitions")').first();
    if (await recJobsTab.isVisible()) {
      await recJobsTab.click();
      await recPage.waitForTimeout(600);
    } else {
      await recPage.goto(`${BASE_URL}/recruiter/dashboard?view=jobs`, { waitUntil: "networkidle" });
    }
    await recPage.screenshot({ path: path.join(SCREENSHOT_DIR, "09-recruiter-job-management.png") });
    console.log("  ✓ Saved 09-recruiter-job-management.png");

    console.log("[Capture 10/14] Recruiter Applicant Pipeline...");
    const recAppsTab = recPage.locator('button:has-text("Candidates")').first();
    if (await recAppsTab.isVisible()) {
      await recAppsTab.click();
      await recPage.waitForTimeout(600);
    } else {
      await recPage.goto(`${BASE_URL}/recruiter/dashboard?view=applicants`, { waitUntil: "networkidle" });
    }
    await recPage.screenshot({ path: path.join(SCREENSHOT_DIR, "10-recruiter-applicant-management.png") });
    console.log("  ✓ Saved 10-recruiter-applicant-management.png");

    console.log("[Capture 11/14] Recruiter Assessment Authoring Suite...");
    const recAssessTab = recPage.locator('button:has-text("Assessments")').first();
    if (await recAssessTab.isVisible()) {
      await recAssessTab.click();
      await recPage.waitForTimeout(600);
    } else {
      await recPage.goto(`${BASE_URL}/recruiter/dashboard?view=assessments`, { waitUntil: "networkidle" });
    }
    await recPage.screenshot({ path: path.join(SCREENSHOT_DIR, "11-recruiter-assessment-management.png") });
    console.log("  ✓ Saved 11-recruiter-assessment-management.png");

    console.log("[Capture 12/14] Recruiter Manual Code Review & Rubric Interface...");
    const recReviewsTab = recPage.locator('button:has-text("Manual Reviews")').first();
    if (await recReviewsTab.isVisible()) {
      await recReviewsTab.click();
      await recPage.waitForTimeout(600);
    } else {
      await recPage.goto(`${BASE_URL}/recruiter/dashboard?view=reviews`, { waitUntil: "networkidle" });
    }
    await recPage.screenshot({ path: path.join(SCREENSHOT_DIR, "12-recruiter-manual-review.png") });
    console.log("  ✓ Saved 12-recruiter-manual-review.png");

    await recruiterContext.close();

    // -------------------------------------------------------------
    // 6. MOBILE RESPONSIVE LAYOUTS (390px Viewport)
    // -------------------------------------------------------------
    console.log("\n[Capture 13/14] Mobile Candidate Dashboard (390x844)...");
    const mobileCandContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const mobileCandPage = await mobileCandContext.newPage();
    await mobileCandPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await mobileCandPage.fill('input[type="email"]', CANDIDATE_EMAIL);
    await mobileCandPage.fill('input[type="password"]', DEMO_PASSWORD);
    await Promise.all([
      mobileCandPage.waitForNavigation({ waitUntil: "networkidle" }),
      mobileCandPage.click('button[type="submit"]'),
    ]);
    await recordPerformance(mobileCandPage, `${BASE_URL}/candidate/dashboard`, "Mobile (iPhone 14)", "390x844");
    await mobileCandPage.screenshot({ path: path.join(SCREENSHOT_DIR, "13-mobile-candidate.png") });
    console.log("  ✓ Saved 13-mobile-candidate.png");
    await mobileCandContext.close();

    console.log("[Capture 14/14] Mobile Recruiter Dashboard (390x844)...");
    const mobileRecContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const mobileRecPage = await mobileRecContext.newPage();
    await mobileRecPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await mobileRecPage.fill('input[type="email"]', RECRUITER_EMAIL);
    await mobileRecPage.fill('input[type="password"]', DEMO_PASSWORD);
    await Promise.all([
      mobileRecPage.waitForNavigation({ waitUntil: "networkidle" }),
      mobileRecPage.click('button[type="submit"]'),
    ]);
    await recordPerformance(mobileRecPage, `${BASE_URL}/recruiter/dashboard`, "Mobile (iPhone 14)", "390x844");
    await mobileRecPage.screenshot({ path: path.join(SCREENSHOT_DIR, "14-mobile-recruiter.png") });
    console.log("  ✓ Saved 14-mobile-recruiter.png");
    await mobileRecContext.close();

    console.log("\n==================================================================");
    console.log("   >>> ALL 14 APPLICATION SCREENSHOTS CAPTURED SUCCESSFULLY! <<< ");
    console.log("==================================================================");

    console.log("\n--- REAL MEASURED PERFORMANCE METRICS ---");
    console.table(performanceMetrics);

    // Write performance report to docs/
    fs.writeFileSync(
      path.resolve(process.cwd(), "docs/PERFORMANCE_METRICS.json"),
      JSON.stringify(performanceMetrics, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error("❌ Screenshot capture failed:", err);
  } finally {
    if (browser) {
      await browser.close();
    }

    console.log("\n[Teardown] Cleaning up synthetic test accounts from Neon DB...");
    try {
      if (attemptId) {
        await prisma.submission.deleteMany({ where: { attemptId } });
        await prisma.questionReview.deleteMany({ where: { review: { attemptId } } });
        await prisma.assessmentReview.deleteMany({ where: { attemptId } });
        await prisma.assessmentAttempt.deleteMany({ where: { id: attemptId } });
      }
      if (invitationId) {
        await prisma.assessmentInvitation.deleteMany({ where: { id: invitationId } });
      }
      if (companyId) {
        await prisma.testCase.deleteMany({ where: { question: { assessment: { companyId } } } });
        await prisma.question.deleteMany({ where: { assessment: { companyId } } });
        await prisma.assessment.deleteMany({ where: { companyId } });
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
      console.log("  ✓ Cleanup complete.");
    } catch (cleanupErr) {
      console.error("  Warning: Cleanup error:", cleanupErr);
    }
  }
}

captureAllScreenshots();
