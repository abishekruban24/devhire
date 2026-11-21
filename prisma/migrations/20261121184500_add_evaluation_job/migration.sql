-- CreateEnum
CREATE TYPE "EvaluationJobStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL');

-- CreateTable
CREATE TABLE "EvaluationJob" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "status" "EvaluationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationJob_attemptId_key" ON "EvaluationJob"("attemptId");

-- CreateIndex
CREATE INDEX "EvaluationJob_status_nextRunAt_idx" ON "EvaluationJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "EvaluationJob_lockedAt_idx" ON "EvaluationJob"("lockedAt");

-- AddForeignKey
ALTER TABLE "EvaluationJob" ADD CONSTRAINT "EvaluationJob_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
