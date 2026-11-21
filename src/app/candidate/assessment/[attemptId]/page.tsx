import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAssessmentAttemptData } from "@/features/assessments/actions/attempt-actions";
import { CandidateAssessmentWorkspace } from "@/features/candidate/components/coding-workspace/candidate-assessment-workspace";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const instant = false;

interface AssessmentPageProps {
  params: Promise<{
    attemptId: string;
  }>;
}

export default async function CandidateAssessmentPage({ params }: AssessmentPageProps) {
  const { attemptId } = await params;

  // 1. Session and Role Authentication Guard
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string"
    ) {
      throw err;
    }
    redirect(`/login?callbackUrl=/candidate/assessment/${attemptId}`);
  }

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/candidate/assessment/${attemptId}`);
  }

  if (session.user.role === "RECRUITER") {
    redirect("/recruiter/dashboard");
  }

  // 2. Fetch server-authoritative attempt data
  const res = await getAssessmentAttemptData(attemptId, session);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-[#080C14] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B101D] p-6 text-center space-y-5 shadow-2xl">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            {res.errorType === "FORBIDDEN" ? (
              <ShieldAlert className="h-8 w-8" />
            ) : (
              <AlertCircle className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {res.errorType === "FORBIDDEN" ? "Access Denied" : "Assessment Unavailable"}
            </h2>
            <p className="text-xs text-slate-400">
              {res.message || "The requested assessment attempt could not be accessed."}
            </p>
          </div>

          <div className="pt-2">
            <Link href="/candidate/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Candidate Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CandidateAssessmentWorkspace initialData={res.data} />;
}
