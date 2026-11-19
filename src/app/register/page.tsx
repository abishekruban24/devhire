import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Terminal, Code2, Users2, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Create an Account | DevHire",
  description: "Join DevHire as a Software Engineer Candidate or Technical Recruiter.",
};

export default function RegisterHubPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0A0F1D]/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">DevHire</span>
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 hidden sm:inline">Already registered?</span>
          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Choice Section */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="default" className="text-xs px-3 py-1">
              Phase 2: Account Creation
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Choose Your DevHire Path
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Select your role to access tailored assessments, verified developer benchmarks, or recruiter pipeline management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Candidate Role Card */}
            <Card className="relative flex flex-col justify-between border-slate-800 bg-[#0E1526] hover:border-blue-500/50 transition-all duration-200 group hover:shadow-xl hover:shadow-blue-500/10">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-600/20 transition-colors">
                    <Code2 className="h-6 w-6" />
                  </div>
                  <Badge variant="default">Candidate</Badge>
                </div>
                <div>
                  <CardTitle className="text-xl text-white">I am a Developer</CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-1">
                    For software engineers, algorithm specialists, and technical candidates.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Complete sandboxed coding assessments across algorithms and systems.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Build a verified technical skill passport backed by objective pass rates.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Apply directly to top hiring engineering teams without resume gatekeeping.</span>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-800/60">
                <Link href="/register/candidate" className="w-full">
                  <Button variant="default" className="w-full flex items-center justify-center gap-2">
                    <span>Register as Candidate</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Recruiter Role Card */}
            <Card className="relative flex flex-col justify-between border-slate-800 bg-[#0E1526] hover:border-violet-500/50 transition-all duration-200 group hover:shadow-xl hover:shadow-violet-500/10">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20 group-hover:bg-violet-600/20 transition-colors">
                    <Users2 className="h-6 w-6" />
                  </div>
                  <Badge variant="violet">Recruiter</Badge>
                </div>
                <div>
                  <CardTitle className="text-xl text-white">I am a Recruiter</CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-1">
                    For technical talent teams, CTOs, and engineering hiring managers.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Publish open vacancies linked directly to custom technical challenges.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Evaluate candidate submissions with hidden test cases and execution telemetry.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Benchmark applicants with objective score percentiles across engineering tiers.</span>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-slate-800/60">
                <Link href="/register/recruiter" className="w-full">
                  <Button variant="accent" className="w-full flex items-center justify-center gap-2">
                    <span>Register as Recruiter</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Passwords securely hashed with bcrypt. No plaintext credentials ever stored.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 p-4 text-center text-xs text-slate-500">
        &copy; 2026 DevHire Platform &bull; Smart Technical Recruitment
      </footer>
    </div>
  );
}
