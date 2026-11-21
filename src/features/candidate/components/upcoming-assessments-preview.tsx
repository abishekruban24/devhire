"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Trophy,
  ArrowRight,
  Code2,
  Briefcase,
  ShieldCheck,
  X,
  Target,
  FileCode,
  Calendar,
  Ban,
  Layers,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateInvitationItem } from "@/features/assessments/actions/invitation-actions";
import { startAssessmentAttempt } from "@/features/assessments/actions/attempt-actions";
import { formatDate } from "@/lib/utils";

interface UpcomingAssessmentsPreviewProps {
  initialInvitations: CandidateInvitationItem[];
}

export function UpcomingAssessmentsPreview({
  initialInvitations = [],
}: UpcomingAssessmentsPreviewProps) {
  const router = useRouter();
  const [invitations] = useState<CandidateInvitationItem[]>(initialInvitations);
  const [selectedInvitation, setSelectedInvitation] = useState<CandidateInvitationItem | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleLaunchAttempt = async (invitation: CandidateInvitationItem) => {
    setIsStarting(true);
    setStartError(null);
    try {
      const res = await startAssessmentAttempt({ invitationId: invitation.id });
      if (res.success && res.attemptId) {
        router.push(`/candidate/assessment/${res.attemptId}`);
      } else {
        setStartError(res.message || "Failed to start assessment attempt.");
      }
    } catch {
      setStartError("An unexpected error occurred while starting the assessment.");
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusBadge = (status: string, expiresAt?: string | null) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();

    if (isExpired || status === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
          <Clock className="h-3 w-3 text-slate-500" />
          Expired
        </span>
      );
    }

    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/70 text-blue-300 border border-blue-800/50">
            <Clock className="h-3 w-3 text-blue-400" />
            Ready to Start
          </span>
        );
      case "STARTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/50 animate-pulse">
            <AlertCircle className="h-3 w-3 text-amber-400" />
            In Progress
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Completed
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/70 text-rose-300 border border-rose-800/50">
            <Ban className="h-3 w-3 text-rose-400" />
            Revoked
          </span>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4" id="assessments">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Technical Assessment Invitations
            </h2>
            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              Live Database
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Authorized coding benchmarks assigned by partner companies for your active job applications
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Active Benchmarks: <strong className="text-white">{invitations.length}</strong>
        </div>
      </div>

      {invitations.length === 0 ? (
        <Card className="p-8 border-slate-800/80 bg-[#0D1424] text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Code2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">No Pending Assessment Invitations</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
            You currently have no pending coding assessments. When recruiters review your applications and send a technical benchmark, your invitation will appear here with instructions, duration, and time limits.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-lg border border-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Apply to open job openings below to qualify for company technical screenings.</span>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => {
            const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
            const isRevoked = inv.status === "REVOKED";
            const canStart = inv.status === "PENDING" && !isExpired && !isRevoked;
            const canResume = inv.status === "STARTED" && !isExpired && !isRevoked;

            return (
              <Card
                key={inv.id}
                className="p-5 border-slate-800/80 hover:border-slate-700 transition-all bg-[#0D1424] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {inv.companyName}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-blue-300 font-medium inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-blue-400" />
                        Target: {inv.jobTitle}
                      </span>
                      {getStatusBadge(inv.status, inv.expiresAt)}
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">
                      {inv.assessmentTitle}
                    </h3>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {inv.assessmentDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {inv.durationMinutes} Minutes
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-slate-500" />
                        {inv.questionsCount} Coding Challenges
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-slate-500" />
                        Pass Mark: {inv.passingScore}% ({inv.totalPoints} pts)
                      </span>
                      {inv.expiresAt && (
                        <>
                          <span>•</span>
                          <span
                            className={`flex items-center gap-1.5 ${
                              isExpired ? "text-rose-400 font-medium" : "text-slate-400"
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {isExpired ? "Expired: " : "Deadline: "}
                            {formatDate(inv.expiresAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {canStart ? (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => setSelectedInvitation(inv)}
                        className="text-xs gap-1.5 font-medium shadow-sm"
                      >
                        Start Assessment
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : canResume ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSelectedInvitation(inv)}
                        className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Resume Challenge
                      </Button>
                    ) : inv.status === "COMPLETED" ? (
                      <Button variant="outline" size="sm" disabled className="text-xs text-emerald-400 border-emerald-800/40 bg-emerald-950/30">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Submitted
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="text-xs text-slate-500 border-slate-800 bg-slate-900">
                        Unavailable
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANDIDATE ASSESSMENT OVERVIEW & READINESS MODAL                            */}
      {/* ========================================================================= */}
      {selectedInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B101D] text-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 bg-[#0E1526]/90 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Code2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white tracking-tight truncate">
                    {selectedInvitation.assessmentTitle}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedInvitation.companyName} • {selectedInvitation.jobTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvitation(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-slate-800/80 bg-[#0E1526]/60 p-4 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assessment Specifications
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span>Duration: <strong>{selectedInvitation.durationMinutes} Minutes</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span>Challenges: <strong>{selectedInvitation.questionsCount} Problems</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Target className="h-4 w-4 text-emerald-400" />
                    <span>Passing Score: <strong>{selectedInvitation.passingScore}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>Total Points: <strong>{selectedInvitation.totalPoints} pts</strong></span>
                  </div>
                </div>
              </div>

              {/* Assessment Description */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Evaluation Scope
                </span>
                <p className="text-slate-300 leading-relaxed bg-[#0E1526]/30 p-3.5 rounded-xl border border-slate-800/50">
                  {selectedInvitation.assessmentDescription}
                </p>
              </div>

              {/* Error message */}
              {startError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200 flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{startError}</span>
                </div>
              )}

              {/* Ground Rules & Guidelines */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-blue-300">
                  <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Timed Assessment Ground Rules</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  <li>Your official countdown starts immediately upon clicking Begin Assessment and cannot be paused.</li>
                  <li>Coding problems, Monaco code editor, Python/TypeScript templates, and visible sample test cases are active.</li>
                  <li>Your draft code autosaves continuously to the server database as you type.</li>
                  <li>Hidden evaluation test cases remain private until official recruiter evaluation.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#0E1526]/90 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedInvitation(null);
                  setStartError(null);
                }}
                disabled={isStarting}
                className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Close
              </Button>
              {selectedInvitation.status === "STARTED" ? (
                <Button
                  size="sm"
                  onClick={() => handleLaunchAttempt(selectedInvitation)}
                  disabled={isStarting}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading Workspace...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-3.5 w-3.5" />
                      Resume Challenge
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleLaunchAttempt(selectedInvitation)}
                  disabled={isStarting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Starting Attempt...
                    </>
                  ) : (
                    <>
                      <span>Begin Timed Assessment</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
