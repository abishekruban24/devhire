"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, AlertCircle, Eye, EyeOff, ShieldCheck, Video } from "lucide-react";
import type { IntegrityEventType } from "@prisma/client";
import { saveAssessmentRecording } from "@/features/assessments/actions/attempt-actions";

interface AssessmentWebcamPreviewProps {
  attemptId: string;
  enabled: boolean;
  recordingMode: string; // "NONE" | "INCIDENT_ONLY" | "FULL"
  onViolation?: (eventType: IntegrityEventType, title: string, message: string) => void;
}

export function AssessmentWebcamPreview({
  attemptId,
  enabled,
  recordingMode,
  onViolation,
}: AssessmentWebcamPreviewProps) {
  const [streamActive, setStreamActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [cameraWarning, setCameraWarning] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Face absence tracking counters
  const faceAbsentSecondsRef = useRef<number>(0);
  const lastAbsenceViolationRef = useRef<number>(0);

  // Initialize camera stream
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user",
          },
          audio: false, // Strict privacy: audio NEVER requested or recorded
        });

        if (mounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setStreamActive(true);
          setCameraWarning(null);

          // Initialize MediaRecorder if recording is requested
          if (recordingMode !== "NONE" && typeof MediaRecorder !== "undefined") {
            try {
              const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
                  ? "video/webm;codecs=vp8"
                  : "video/webm",
              });

              recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                  recordedChunksRef.current.push(event.data);
                  // Keep only last 30 seconds of rolling chunks (assuming 5s intervals)
                  if (recordedChunksRef.current.length > 6) {
                    recordedChunksRef.current.shift();
                  }
                }
              };

              recorder.start(5000); // 5-second chunk intervals
              mediaRecorderRef.current = recorder;
            } catch (recErr) {
              console.warn("[MediaRecorder Init Warning]:", recErr);
            }
          }

          // Handle camera disconnection
          stream.getVideoTracks().forEach((track) => {
            track.onended = () => {
              if (mounted) {
                setStreamActive(false);
                setCameraWarning("Webcam was disconnected.");
                if (onViolation) {
                  onViolation(
                    "CAMERA_DISCONNECTED",
                    "Webcam Disconnected",
                    "Webcam video feed was interrupted or closed during the assessment."
                  );
                }
              }
            };
          });
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch {
        if (mounted) {
          setStreamActive(false);
          setCameraWarning("Camera access unavailable.");
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enabled, recordingMode, onViolation]);

  // Client-side Face Presence Analyzer (1Hz check)
  useEffect(() => {
    if (!enabled || !streamActive) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Draw downscaled frame for lightweight analysis
      canvas.width = 80;
      canvas.height = 60;
      ctx.drawImage(video, 0, 0, 80, 60);

      try {
        const frame = ctx.getImageData(0, 0, 80, 60);
        const data = frame.data;
        let skinTonePixels = 0;
        const totalPixels = data.length / 4;

        // Fast skin-tone chrominance approximation (YCbCr representation)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Basic bounding for human skin tone under natural illumination
          if (
            r > 60 &&
            g > 40 &&
            b > 20 &&
            r > g &&
            r > b &&
            Math.abs(r - g) > 15
          ) {
            skinTonePixels++;
          }
        }

        const skinRatio = skinTonePixels / totalPixels;
        // Presence threshold: candidate face / neck occupying at least 3% of frame
        const hasFace = skinRatio > 0.03;

        setFaceDetected(hasFace);

        if (!hasFace) {
          faceAbsentSecondsRef.current += 1;

          // Prolonged absence violation (>15 seconds without face, debounced to 30s intervals)
          const now = Date.now();
          if (
            faceAbsentSecondsRef.current >= 15 &&
            now - lastAbsenceViolationRef.current > 30000
          ) {
            lastAbsenceViolationRef.current = now;
            if (onViolation) {
              onViolation(
                "FACE_ABSENT",
                "Face Not Visible in Frame",
                "Candidate was not detected in the webcam view for over 15 consecutive seconds."
              );
            }
          }
        } else {
          faceAbsentSecondsRef.current = 0;
        }
      } catch {
        // Ignore canvas read errors
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, streamActive, onViolation]);

  // Method to save recorded incident clip on demand
  const captureIncidentClip = useCallback(
    async (triggerEvent?: IntegrityEventType) => {
      if (recordingMode === "NONE" || recordedChunksRef.current.length === 0) return;

      try {
        const clipBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          if (base64Data) {
            await saveAssessmentRecording({
              attemptId,
              recordingType: "INCIDENT",
              videoDataUrlOrKey: base64Data,
              durationSeconds: 15,
              triggerEvent,
              fileSizeBytes: clipBlob.size,
            });
          }
        };

        reader.readAsDataURL(clipBlob);
      } catch (err) {
        console.warn("[Save Incident Clip Error]:", err);
      }
    },
    [attemptId, recordingMode]
  );

  if (!enabled) return null;

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Compact Webcam Widget */}
      <div
        className={`fixed bottom-4 right-4 z-40 rounded-xl border border-slate-800 bg-[#0B101D]/90 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-200 select-none ${
          isMinimized ? "w-40 h-10 p-2 flex items-center justify-between" : "w-52 sm:w-60"
        }`}
      >
        {isMinimized ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Camera className="h-3.5 w-3.5 text-purple-400" />
              <span className="font-medium text-[11px]">Proctoring Active</span>
            </div>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-slate-400 hover:text-white p-1"
              title="Expand webcam preview"
            >
              <Eye className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div>
            {/* Widget Bar */}
            <div className="px-2.5 py-1.5 bg-[#0E1526] border-b border-slate-800/80 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${
                    streamActive && faceDetected
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-amber-400"
                  }`}
                />
                <span className="font-semibold text-slate-300">
                  {streamActive ? (faceDetected ? "Face Detected" : "Face Not In Frame") : "Camera Off"}
                </span>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-slate-400 hover:text-white p-0.5"
                title="Minimize preview"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            </div>

            {/* Video Feed */}
            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/85 text-[10px] text-slate-400">
                  <Camera className="h-5 w-5 mb-1 text-slate-500" />
                  <span>{cameraWarning || "Camera stream inactive"}</span>
                </div>
              )}

              {/* Face Absence Warning Overlay */}
              {streamActive && !faceDetected && (
                <div className="absolute inset-0 bg-amber-950/60 border border-amber-500/50 flex flex-col items-center justify-center p-2 text-center text-amber-200 text-[10px] space-y-1">
                  <AlertCircle className="h-4 w-4 text-amber-400 animate-bounce" />
                  <span className="font-semibold leading-tight">
                    Face Not Visible
                  </span>
                  <span className="text-[9px] text-amber-300/80">
                    Keep your face centered
                  </span>
                </div>
              )}

              {/* Recording indicator */}
              {recordingMode !== "NONE" && streamActive && (
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[9px] font-semibold flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>{recordingMode === "INCIDENT_ONLY" ? "Incident Buffer" : "Recording"}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
