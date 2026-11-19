import React from "react";
import Link from "next/link";
import {
  Code2,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Briefcase,
  UserCheck,
  Database,
  BarChart,
  Lock,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

import { Suspense } from "react";
import { connection } from "next/server";
import { auth } from "@/auth";

async function AuthNavbar() {
  await connection();
  let user = null;
  try {
    const session = await auth();
    user = session?.user ?? null;
  } catch (error) {
    // Next.js internal prerendering and redirect signals must be re-thrown
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: string }).digest === "string"
    ) {
      throw error;
    }
    console.error(
      "[Homepage AuthNavbar]: Session resolution encountered an error, falling back to guest view:",
      error instanceof Error ? error.message : "Authentication error"
    );
  }
  return <Navbar user={user} />;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col selection:bg-blue-600/30 selection:text-white overflow-x-clip">
      {/* Navigation with partial prerendering stream */}
      <Suspense fallback={<Navbar user={null} />}>
        <AuthNavbar />
      </Suspense>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] sm:w-[1000px] xl:w-[1200px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-violet-600/15 blur-[120px] pointer-events-none rounded-full" />

          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 relative z-10">
            <div className="text-center max-w-4xl xl:max-w-5xl mx-auto space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                DevHire Platform • Phase 1 Project Foundation
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-[1.12]">
                Hire Smarter.{" "}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                  Prove Your Skills.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
                The technical recruitment platform engineered for high-signal engineering evaluations.
                Replace resume guesswork with sandboxed coding benchmarks, automated test validation,
                and merit-first talent discovery.
              </p>

              {/* Primary Dual CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/candidate/dashboard" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="default"
                    className="w-full sm:w-auto text-sm font-semibold gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <UserCheck className="h-4 w-4" />
                    For Candidates: Preview Hub
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/recruiter/dashboard" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="accent"
                    className="w-full sm:w-auto text-sm font-semibold gap-2 shadow-lg shadow-violet-600/20"
                  >
                    <Briefcase className="h-4 w-4" />
                    For Recruiters: Preview Suite
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Key Trust Highlights */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Standardized Benchmarks
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-blue-400" />
                  Hidden Server-Side Test Cases
                </span>
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-violet-400" />
                  Automated Sandbox Scoring
                </span>
              </div>
            </div>

            {/* HERO CODE & ASSESSMENT TERMINAL PREVIEW */}
            <div className="mt-14 max-w-5xl xl:max-w-6xl mx-auto rounded-2xl border border-slate-800 bg-[#0A0F1D]/90 shadow-2xl shadow-black/60 overflow-hidden">
              {/* Window Title Bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0E1526] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400">
                    devhire://assessment/token-bucket-rate-limiter.ts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="mock">UI Showcase</Badge>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                    Passed 12/12 Tests
                  </span>
                </div>
              </div>

              {/* Mock Code Editor Body */}
              <div className="p-6 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto bg-[#070B14]">
                <div className="text-slate-500 pb-2">
                  {"// DevHire Assessment Challenge: High-Throughput Token Bucket Limiter"}
                </div>
                <div className="text-slate-400">
                  <span className="text-violet-400">export class</span>{" "}
                  <span className="text-blue-300">TokenBucketLimiter</span> &#123;
                </div>
                <div className="pl-4 text-slate-400">
                  <span className="text-blue-400">private</span> capacity:{" "}
                  <span className="text-amber-300">number</span>;
                  <br />
                  <span className="text-blue-400">private</span> refillRatePerSecond:{" "}
                  <span className="text-amber-300">number</span>;
                  <br />
                  <span className="text-blue-400">private</span> currentTokens:{" "}
                  <span className="text-amber-300">number</span>;
                </div>
                <div className="pl-4 pt-2 text-slate-400">
                  <span className="text-violet-400">public</span>{" "}
                  <span className="text-blue-300">tryConsume</span>(tokens:{" "}
                  <span className="text-amber-300">number</span> = 1):{" "}
                  <span className="text-amber-300">boolean</span> &#123;
                </div>
                <div className="pl-8 text-slate-400">
                  <span className="text-violet-400">this</span>.refill();
                  <br />
                  <span className="text-violet-400">if</span> (this.currentTokens &gt;= tokens) &#123;
                  <br />
                  &nbsp;&nbsp;<span className="text-violet-400">this</span>.currentTokens -= tokens;
                  <br />
                  &nbsp;&nbsp;<span className="text-emerald-400">return true</span>; {"// Approved"}
                  <br />
                  &#125;
                  <br />
                  <span className="text-rose-400">return false</span>; {"// Rate limit exceeded"}
                </div>
                <div className="pl-4 text-slate-400">&#125;</div>
                <div className="text-slate-400">&#125;</div>

                {/* Test results banner */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 4 Public Test Cases Passed
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-blue-400 flex items-center gap-1 font-semibold">
                      <Lock className="h-3.5 w-3.5" /> 8 Hidden Server-Side Cases Verified
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Execution: <span className="text-white font-medium">18ms</span> | Memory:{" "}
                    <span className="text-white font-medium">2.4 MB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES OVERVIEW SECTION */}
        <section id="features" className="py-20 border-t border-slate-800/80 bg-[#0A0F1D]/50">
          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <Badge variant="secondary">Engineered For Accuracy</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Comprehensive Technical Hiring Features
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Purpose-built tools to test genuine engineering depth, eliminate false positives,
                and accelerate high-conviction hiring decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              {/* Feature 1 */}
              <Card className="p-6 border-slate-800 bg-[#0E1526] hover:border-blue-500/40 transition-all">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <Code2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-white mb-2">
                  Multi-Language Assessment Sandbox
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  Support for TypeScript, Python, Go, and SQL challenges with customizable time
                  and memory constraints, starter code, and sample test suites.
                </CardDescription>
              </Card>

              {/* Feature 2 */}
              <Card className="p-6 border-slate-800 bg-[#0E1526] hover:border-violet-500/40 transition-all">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-white mb-2">
                  Hidden Server-Side Test Cases
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  Protect against solution overfitting. Edge-case and stress tests are securely
                  retained on the server to ensure genuine algorithmic correctness.
                </CardDescription>
              </Card>

              {/* Feature 3 */}
              <Card className="p-6 border-slate-800 bg-[#0E1526] hover:border-emerald-500/40 transition-all">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <BarChart className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-white mb-2">
                  Objective Score Benchmarking
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  Compare submissions across cohorts with percentile breakdowns, execution time
                  benchmarks, and domain-specific competency scores.
                </CardDescription>
              </Card>

              {/* Feature 4 */}
              <Card className="p-6 border-slate-800 bg-[#0E1526] hover:border-indigo-500/40 transition-all">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Briefcase className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-white mb-2">
                  Direct Assessment-to-Job Attachment
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  Recruiters can bind technical assessments directly to published roles,
                  automating screening invitations upon candidate application.
                </CardDescription>
              </Card>

              {/* Feature 5 */}
              <Card className="p-6 border-slate-800 bg-[#0E1526] hover:border-amber-500/40 transition-all">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <UserCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-white mb-2">
                  Verified Candidate Profile
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  Candidates build a verifiable technical passport showing proven assessment scores,
                  code quality percentiles, and validated skill tags.
                </CardDescription>
              </Card>

              {/* Feature 6 */}
              <Card className="p-6 border-slate-800 bg-[#0E1526] hover:border-sky-500/40 transition-all">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                  <Database className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-white mb-2">
                  High-Integrity Data Architecture
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  Powered by Prisma ORM and PostgreSQL with strict relational foreign keys,
                  unique constraints, and indexed audit timestamps.
                </CardDescription>
              </Card>
            </div>
          </div>
        </section>

        {/* HOW DEVHIRE WORKS SECTION */}
        <section id="how-it-works" className="py-20 border-t border-slate-800/80">
          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <Badge variant="violet">Recruitment Workflow</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                How DevHire Works
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                A seamless, merit-driven recruitment lifecycle connecting candidates and hiring managers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 relative">
              {/* Step 1 */}
              <div className="relative rounded-xl border border-slate-800 bg-[#0E1526] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2.5 py-1 rounded">
                    01
                  </span>
                  <Briefcase className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Post & Attach Assessment
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Recruiters create technical job postings and select or author targeted coding benchmarks with pass thresholds.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-xl border border-slate-800 bg-[#0E1526] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-1 rounded">
                    02
                  </span>
                  <UserCheck className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Candidate Applies
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Developers discover roles matching their stack, review requirements, and initiate verified applications.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-xl border border-slate-800 bg-[#0E1526] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/60 border border-violet-800/40 px-2.5 py-1 rounded">
                    03
                  </span>
                  <Code2 className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Solve Coding Challenges
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Candidates code solutions in an interactive sandbox against public tests and hidden server test suites.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative rounded-xl border border-slate-800 bg-[#0E1526] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded">
                    04
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Rank & Shortlist
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Submissions are graded objectively. Top percentile candidates are automatically shortlisted for final interviews.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DUAL PORTAL PREVIEW CARDS */}
        <section className="py-20 border-t border-slate-800/80 bg-[#080C14]">
          <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-10">
              {/* Candidate Hub Card */}
              <Card className="relative overflow-hidden p-8 xl:p-10 border-blue-500/30 bg-gradient-to-br from-[#0E1629] to-[#0A101E] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">
                    <UserCheck className="h-3.5 w-3.5" />
                    For Developers & Job Seekers
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Candidate Dashboard
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    View verified technical skills, browse curated engineering openings, monitor active application stages, and complete assigned coding benchmarks.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400 pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                      Verified skill badges and percentiles
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                      Available technical roles with transparent compensation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                      Upcoming assessment schedules with deadlines
                    </li>
                  </ul>
                </div>
                <div className="pt-8">
                  <Link href="/candidate/dashboard">
                    <Button variant="default" className="w-full justify-between">
                      <span>Launch Candidate Preview</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Recruiter Suite Card */}
              <Card className="relative overflow-hidden p-8 xl:p-10 border-violet-500/30 bg-gradient-to-br from-[#121129] to-[#0D0B1C] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md">
                    <Briefcase className="h-3.5 w-3.5" />
                    For Engineering Leaders & Recruiters
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Recruiter Dashboard
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Manage active job listings, review applicant pipelines scored by algorithmic benchmarks, inspect topic pass rates, and shortlist top talent.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400 pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                      Pipeline health metrics and shortlist ratios
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                      Candidate submissions table with match percentages
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                      Domain pass rates across TypeScript, Go, and SQL
                    </li>
                  </ul>
                </div>
                <div className="pt-8">
                  <Link href="/recruiter/dashboard">
                    <Button variant="accent" className="w-full justify-between">
                      <span>Launch Recruiter Preview</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
