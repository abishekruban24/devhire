"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Clock,
  Target,
  Camera,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Accessibility,
  ArrowRight,
  Loader2,
  Video,
  Monitor,
  Ban,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssessmentAttemptData } from "@/features/assessments/actions/attempt-actions";
import { confirmAssessmentOnboarding } from "@/features/assessments/actions/attempt-actions";

interface CandidatePreAssessmentOnboardingProps {
  data: AssessmentAttemptData;
  onComplete: (updatedData?: Partial<AssessmentAttemptData>) => void;
}

export function CandidatePreAssessmentOnboarding({
  data,
  onComplete,
}: CandidatePreAssessmentOnboardingProps) {
  const [hasAcknowledgedRules, setHasAcknowledgedRules] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [accommodationNotes, setAccommodationNotes] = useState("");
  const [isRequestingAccommodation, setIsRequestingAccommodation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const proctoring = data.proctoring;

  // Initialize camera preview if webcam proctoring is enabled
  useEffect(() => {
    if (!proctoring.webcamProctoring) return;

    let mounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false, // Strict privacy: audio NEVER requested or recorded
        });

        if (mounted) {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraActive(true);
          setCameraError(null);
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        if (mounted) {
          setCameraActive(false);
          setCameraError(
            "Camera access was denied or is unavailable. If you have a hardware issue, please submit an accommodation note below."
          );
        }
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [proctoring.webcamProctoring]);

  const handleStartAssessment = async () => {
    if (!hasAcknowledgedRules) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Request fullscreen if required
    if (proctoring.requireFullscreen && typeof document !== "undefined") {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Continue even if browser blocks automated fullscreen request
      }
    }

    try {
      const res = await confirmAssessmentOnboarding({
        attemptId: data.attemptId,
        cameraConsent: cameraActive,
        recordingConsent: proctoring.recordingMode !== "NONE",
        accommodationNotes: accommodationNotes.trim() || undefined,
      });

      if (res.success) {
        onComplete({
          startedAt: res.startedAt || new Date().toISOString(),
          expiresAt: res.expiresAt || new Date(Date.now() + data.durationMinutes * 60000).toISOString(),
          timeRemainingSeconds: data.durationMinutes * 60,
          integrity: {
            ...data.integrity,
            consentGivenAt: res.startedAt || new Date().toISOString(),
            cameraConsentGiven: cameraActive,
            recordingConsentGiven: proctoring.recordingMode !== "NONE",
            accommodationNotes: accommodationNotes.trim() || null,
            accommodationGranted: !!accommodationNotes.trim(),
          },
        });
      } else {
        setSubmitError(res.message || "Failed to confirm onboarding.");
      }
    } catch {
      setSubmitError("An unexpected error occurred while entering the assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B101D] p-6 sm:p-8 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  {data.companyName}
                </span>
                {data.jobTitle && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">{data.jobTitle}</span>
                  </>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {data.assessmentTitle}
              </h1>
            </div>

            <Badge
              variant="outline"
              className={
                proctoring.enableProctoring
                  ? "bg-purple-950/60 text-purple-300 border-purple-800/60 px-3 py-1 text-xs shrink-0 self-start sm:self-center flex items-center gap-1.5"
                  : "bg-blue-950/60 text-blue-300 border-blue-800/60 px-3 py-1 text-xs shrink-0 self-start sm:self-center"
              }
            >
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              {proctoring.enableProctoring ? "Smart Proctored Assessment" : "Standard Evaluation"}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {data.assessmentDescription}
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-[#0E1526]/60 p-3.5 text-center">
              <Clock className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <div className="text-xs text-slate-400">Duration</div>
              <strong className="text-sm font-bold text-white">
                {data.durationMinutes} Minutes
              </strong>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0E1526]/60 p-3.5 text-center">
              <FileText className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <div className="text-xs text-slate-400">Challenges</div>
              <strong className="text-sm font-bold text-white">
                {data.questions.length} Problems
              </strong>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0E1526]/60 p-3.5 text-center">
              <Target className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs text-slate-400">Passing Score</div>
              <strong className="text-sm font-bold text-white">
                {data.passingScore}%
              </strong>
            </div>
          </div>
        </div>

        {/* Proctoring Rules & System Compatibility Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B101D] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Assessment Integrity & Rules Checklist
              </h2>
              <p className="text-xs text-slate-400">
                Please review the proctoring conditions before initiating your timed attempt
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Rule 1: Fullscreen */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#0A0F1D]">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Maximize2 className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <strong className="text-white block font-semibold">
                  Fullscreen Requirement:{" "}
                  {proctoring.requireFullscreen ? (
                    <span className="text-amber-300">Mandatory Fullscreen</span>
                  ) : (
                    <span className="text-slate-400">Recommended</span>
                  )}
                </strong>
                <p className="text-slate-400">
                  {proctoring.requireFullscreen
                    ? "The assessment will prompt you into fullscreen mode upon entering. Exiting fullscreen will be flagged as an integrity incident."
                    : "Fullscreen mode is suggested for an optimal coding workspace without desktop distractions."}
                </p>
              </div>
            </div>

            {/* Rule 2: Tab Switching & Focus Loss */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#0A0F1D]">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <strong className="text-white block font-semibold">
                  Browser Focus & Tab Activity
                </strong>
                <p className="text-slate-400">
                  {proctoring.trackTabSwitches || proctoring.trackFocusLoss
                    ? `Navigating away from the assessment workspace or switching tabs is monitored in real-time. Allowed policy violations: ${proctoring.maxViolations}${
                        proctoring.autoSubmitOnViolations ? " (reaches auto-submission upon limit)" : ""
                      }.`
                    : "Focus tracking is in standard unmonitored mode for this assessment."}
                </p>
              </div>
            </div>

            {/* Rule 3: Copy / Paste Restrictions */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#0A0F1D]">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Ban className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <strong className="text-white block font-semibold">
                  Clipboard & Code Integrity
                </strong>
                <p className="text-slate-400">
                  {proctoring.restrictPaste
                    ? "External paste into Monaco editor is disabled. Solutions must be typed directly within the coding workspace."
                    : "Clipboard pasting is permitted within the editor."}
                </p>
              </div>
            </div>

            {/* Rule 4: Webcam & Video Recording */}
            {proctoring.webcamProctoring && (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-[#0E1526]/80 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="text-xs space-y-0.5 flex-1">
                    <strong className="text-white block font-semibold flex items-center gap-1.5">
                      Smart Webcam Presence Check
                      {cameraActive ? (
                        <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Hardware Check
                        </span>
                      )}
                    </strong>
                    <p className="text-slate-400">
                      Camera presence is monitored locally on your machine during the assessment. Audio is strictly NEVER recorded.
                      {proctoring.recordingMode === "INCIDENT_ONLY" &&
                        " Short 15-30s incident clips are saved only when a policy violation occurs."}
                      {proctoring.recordingMode === "FULL" &&
                        " Full video session is recorded for recruiter review."}
                    </p>
                  </div>
                </div>

                {/* Webcam Live Preview Box */}
                <div className="relative rounded-xl border border-slate-700 bg-black overflow-hidden max-w-sm mx-auto aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/80 space-y-2">
                      <Camera className="h-8 w-8 text-slate-500" />
                      <p className="text-[11px] text-slate-400">
                        {cameraError || "Requesting camera preview..."}
                      </p>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Preview Active
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Accommodation Request Section */}
          <div className="rounded-xl border border-slate-800 bg-[#0A0F1D] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Accessibility className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-white">
                  Accessibility & Special Accommodations
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestingAccommodation((prev) => !prev)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline"
              >
                {isRequestingAccommodation ? "Hide note" : "Add accommodation note"}
              </button>
            </div>

            {isRequestingAccommodation && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Describe any accessibility aids, assistive technology, or verified hardware constraints (e.g. screen reader in use, secondary monitor required)..."
                  value={accommodationNotes}
                  onChange={(e) => setAccommodationNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#080C14] border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-[10px] text-slate-500">
                  This note will be attached to your submission and highlighted in the recruiter review report.
                </p>
              </div>
            )}
          </div>

          {/* Acknowledgement & Start Button */}
          <div className="space-y-4 pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasAcknowledgedRules}
                onChange={(e) => setHasAcknowledgedRules(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                I acknowledge the assessment rules, confirm that I will complete this challenge independently without unauthorized assistance, and consent to assessment integrity monitoring.
              </span>
            </label>

            {submitError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <Button
              disabled={
                !hasAcknowledgedRules ||
                isSubmitting ||
                (proctoring.webcamProctoring && !cameraActive && !accommodationNotes.trim())
              }
              onClick={handleStartAssessment}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entering Assessment Workspace...
                </>
              ) : (
                <>
                  <span>I Agree & Begin Assessment</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-center text-[11px] text-slate-500">
              The {data.durationMinutes}-minute countdown begins immediately upon entering the workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
