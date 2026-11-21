-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "AssessmentReview" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pointsPossible" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionReview" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "pointsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pointsPossible" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentReview_attemptId_key" ON "AssessmentReview"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentReview_attemptId_idx" ON "AssessmentReview"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentReview_reviewerId_idx" ON "AssessmentReview"("reviewerId");

-- CreateIndex
CREATE INDEX "AssessmentReview_status_idx" ON "AssessmentReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReview_reviewId_questionId_key" ON "QuestionReview"("reviewId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionReview_reviewId_idx" ON "QuestionReview"("reviewId");

-- CreateIndex
CREATE INDEX "QuestionReview_questionId_idx" ON "QuestionReview"("questionId");

-- AddForeignKey
ALTER TABLE "AssessmentReview" ADD CONSTRAINT "AssessmentReview_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentReview" ADD CONSTRAINT "AssessmentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AssessmentReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
