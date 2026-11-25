-- CreateEnums safely
DO $$ BEGIN
    CREATE TYPE "SubmissionReason" AS ENUM ('MANUAL', 'TIMER_EXPIRED', 'POLICY_VIOLATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IntegrityEventType" AS ENUM ('TAB_SWITCH', 'FOCUS_LOSS', 'FULLSCREEN_EXIT', 'PASTE_ATTEMPT', 'COPY_ATTEMPT', 'FACE_ABSENT', 'MULTIPLE_FACES', 'CAMERA_DISCONNECTED', 'CAMERA_BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Assessment
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "enableProctoring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "requireFullscreen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "trackTabSwitches" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "trackFocusLoss" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "restrictPaste" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "restrictCopy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "maxViolations" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "autoSubmitOnViolations" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "webcamProctoring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "recordingMode" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable AssessmentAttempt
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "submissionReason" "SubmissionReason" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "proctoringSnapshot" JSONB;
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "consentGivenAt" TIMESTAMP(3);
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "cameraConsentGiven" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "recordingConsentGiven" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "accommodationGranted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "accommodationNotes" TEXT;
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "violationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable IntegrityEvent
CREATE TABLE IF NOT EXISTS "IntegrityEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventType" "IntegrityEventType" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable AssessmentRecording
CREATE TABLE IF NOT EXISTS "AssessmentRecording" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "recordingType" TEXT NOT NULL DEFAULT 'INCIDENT',
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL_DEV',
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'video/webm',
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "incidentEventType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable RecordingAuditLog
CREATE TABLE IF NOT EXISTS "RecordingAuditLog" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "IntegrityEvent_attemptId_idx" ON "IntegrityEvent"("attemptId");
CREATE INDEX IF NOT EXISTS "IntegrityEvent_eventType_idx" ON "IntegrityEvent"("eventType");
CREATE INDEX IF NOT EXISTS "IntegrityEvent_timestamp_idx" ON "IntegrityEvent"("timestamp");

CREATE INDEX IF NOT EXISTS "AssessmentRecording_attemptId_idx" ON "AssessmentRecording"("attemptId");
CREATE INDEX IF NOT EXISTS "AssessmentRecording_expiresAt_idx" ON "AssessmentRecording"("expiresAt");
CREATE INDEX IF NOT EXISTS "AssessmentRecording_status_idx" ON "AssessmentRecording"("status");

CREATE INDEX IF NOT EXISTS "RecordingAuditLog_recordingId_idx" ON "RecordingAuditLog"("recordingId");
CREATE INDEX IF NOT EXISTS "RecordingAuditLog_userId_idx" ON "RecordingAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "RecordingAuditLog_timestamp_idx" ON "RecordingAuditLog"("timestamp");

-- AddForeignKeys safely
DO $$ BEGIN
    ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AssessmentRecording" ADD CONSTRAINT "AssessmentRecording_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecordingAuditLog" ADD CONSTRAINT "RecordingAuditLog_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "AssessmentRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecordingAuditLog" ADD CONSTRAINT "RecordingAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
