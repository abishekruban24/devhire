-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'STARTED', 'COMPLETED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "AssessmentAttempt" ADD COLUMN "invitationId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentInvitation" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentAttempt_invitationId_idx" ON "AssessmentAttempt"("invitationId");

-- CreateIndex
CREATE INDEX "AssessmentInvitation_candidateId_idx" ON "AssessmentInvitation"("candidateId");

-- CreateIndex
CREATE INDEX "AssessmentInvitation_companyId_idx" ON "AssessmentInvitation"("companyId");

-- CreateIndex
CREATE INDEX "AssessmentInvitation_assessmentId_idx" ON "AssessmentInvitation"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentInvitation_applicationId_idx" ON "AssessmentInvitation"("applicationId");

-- CreateIndex
CREATE INDEX "AssessmentInvitation_status_idx" ON "AssessmentInvitation"("status");

-- CreateIndex
CREATE INDEX "AssessmentInvitation_expiresAt_idx" ON "AssessmentInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentInvitation_unique_active" ON "AssessmentInvitation"("applicationId", "assessmentId") WHERE status IN ('PENDING', 'STARTED');

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "AssessmentInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
