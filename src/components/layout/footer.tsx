import React from "react";
import Link from "next/link";
import { Terminal, Layers, Database, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#060910] text-slate-400 text-sm">
      <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 xl:gap-16">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg text-white">DevHire</span>
            </Link>
            <p className="max-w-md text-sm text-slate-400 leading-relaxed">
              A high-precision technical recruitment and coding assessment platform.
              Bridging top engineering talent and forward-thinking hiring teams through
              automated coding sandboxes, proctored benchmarks, and merit-based shortlisting.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Phase 1 Foundation Active
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">Vercel & Next.js 16 Ready</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Platform Views
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="hover:text-blue-400 transition-colors"
                >
                  Landing Page
                </Link>
              </li>
              <li>
                <Link
                  href="/candidate/dashboard"
                  className="hover:text-blue-400 transition-colors"
                >
                  Candidate Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/recruiter/dashboard"
                  className="hover:text-violet-400 transition-colors"
                >
                  Recruiter Dashboard
                </Link>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-slate-200 transition-colors"
                >
                  Assessment Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* Architecture / Tech Stack */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Architecture
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                Next.js App Router (v16)
              </li>
              <li className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                PostgreSQL & Prisma 7
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Strict TypeScript 5
              </li>
              <li className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-violet-400" />
                Tailwind CSS v4 & Lucide
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 DevHire Platform. Engineered for placement portfolio & high-scale hiring.</p>
          <p className="flex items-center gap-1.5">
            Designed with dark navy & charcoal aesthetics for modern engineering teams.
          </p>
        </div>
      </div>
    </footer>
  );
}
