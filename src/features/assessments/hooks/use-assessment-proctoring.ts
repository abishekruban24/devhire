"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { IntegrityEventType } from "@prisma/client";
import { logIntegrityEvent } from "@/features/assessments/actions/attempt-actions";

export interface ProctoringOptions {
  attemptId: string;
  enableProctoring: boolean;
  requireFullscreen: boolean;
  trackTabSwitches: boolean;
  trackFocusLoss: boolean;
  restrictPaste: boolean;
  restrictCopy: boolean;
  maxViolations: number;
  autoSubmitOnViolations: boolean;
  initialViolations?: number;
  onAutoSubmit?: (reason: "POLICY_VIOLATION") => void;
}

export interface ProctoringViolationNotice {
  id: string;
  eventType: IntegrityEventType;
  title: string;
  message: string;
  timestamp: string;
}

export function useAssessmentProctoring({
  attemptId,
  enableProctoring,
  requireFullscreen,
  trackTabSwitches,
  trackFocusLoss,
  restrictPaste,
  restrictCopy,
  maxViolations = 3,
  autoSubmitOnViolations = true,
  initialViolations = 0,
  onAutoSubmit,
}: ProctoringOptions) {
  const [violationCount, setViolationCount] = useState<number>(initialViolations);
  const [recentNotice, setRecentNotice] = useState<ProctoringViolationNotice | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Debounce tracking to prevent double-counting simultaneous events (e.g. blur + visibilitychange on tab switch)
  const lastEventTimeRef = useRef<Record<string, number>>({});
  const isAutoSubmittedRef = useRef<boolean>(false);

  const isDebounced = useCallback((eventType: string, windowMs = 1500): boolean => {
    const now = Date.now();
    const last = lastEventTimeRef.current[eventType] || 0;
    if (now - last < windowMs) {
      return true;
    }
    lastEventTimeRef.current[eventType] = now;
    return false;
  }, []);

  // Dispatch an integrity violation
  const recordViolation = useCallback(
    async (
      eventType: IntegrityEventType,
      title: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      if (!enableProctoring || isAutoSubmittedRef.current) return;

      // Group focus_loss and tab_switch to prevent double penalty on single alt-tab
      if (eventType === "FOCUS_LOSS" && isDebounced("TAB_OR_FOCUS", 1500)) {
        return;
      }
      if (eventType === "TAB_SWITCH") {
        isDebounced("TAB_OR_FOCUS", 1500);
      }

      if (isDebounced(eventType, 1500)) {
        return;
      }

      const notice: ProctoringViolationNotice = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        eventType,
        title,
        message,
        timestamp: new Date().toLocaleTimeString(),
      };

      setRecentNotice(notice);

      try {
        const res = await logIntegrityEvent({
          attemptId,
          eventType,
          metadata: {
            ...metadata,
            clientTimestamp: new Date().toISOString(),
          },
        });

        if (res.success) {
          setViolationCount(res.violationCount);

          if (res.shouldAutoSubmit && !isAutoSubmittedRef.current) {
            isAutoSubmittedRef.current = true;
            if (onAutoSubmit) {
              onAutoSubmit("POLICY_VIOLATION");
            }
          }
        }
      } catch (err) {
        console.error("[Proctoring Telemetry Error]:", err);
      }
    },
    [attemptId, enableProctoring, isDebounced, onAutoSubmit]
  );

  // 1. Fullscreen Monitoring
  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // User or browser denied fullscreen
    }
  }, []);

  useEffect(() => {
    if (!enableProctoring) return;

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);

      if (requireFullscreen && !active) {
        recordViolation(
          "FULLSCREEN_EXIT",
          "Fullscreen Mode Exited",
          "This proctored assessment requires full-screen mode. Please return to full-screen."
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [enableProctoring, requireFullscreen, recordViolation]);

  // 2. Tab Switch & Page Visibility Monitoring
  useEffect(() => {
    if (!enableProctoring || !trackTabSwitches) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation(
          "TAB_SWITCH",
          "Tab Switch Detected",
          "Navigating away from the assessment workspace is recorded as a policy violation."
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enableProctoring, trackTabSwitches, recordViolation]);

  // 3. Window Blur / Focus Loss Monitoring
  useEffect(() => {
    if (!enableProctoring || !trackFocusLoss) return;

    const handleWindowBlur = () => {
      recordViolation(
        "FOCUS_LOSS",
        "Window Focus Lost",
        "Switching windows or interacting with external applications is tracked by the proctoring monitor."
      );
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enableProctoring, trackFocusLoss, recordViolation]);

  // 4. Paste & Copy Prevention
  useEffect(() => {
    if (!enableProctoring) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (restrictPaste) {
        e.preventDefault();
        recordViolation(
          "PASTE_ATTEMPT",
          "External Paste Blocked",
          "Pasting external code or text into the assessment workspace is restricted by policy."
        );
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (restrictCopy) {
        e.preventDefault();
        recordViolation(
          "COPY_ATTEMPT",
          "Copy Attempt Restricted",
          "Copying assessment questions or test benchmarks is restricted by security policy."
        );
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("copy", handleCopy);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("copy", handleCopy);
    };
  }, [enableProctoring, restrictPaste, restrictCopy, recordViolation]);

  const clearRecentNotice = useCallback(() => {
    setRecentNotice(null);
  }, []);

  return {
    violationCount,
    maxViolations,
    recentNotice,
    clearRecentNotice,
    isFullscreen,
    requestFullscreen,
    recordViolation,
  };
}
