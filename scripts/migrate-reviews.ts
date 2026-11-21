/**
 * DEVHIRE PHASE 5: ADD ASSESSMENT REVIEWS MIGRATION SCRIPT
 *
 * Idempotently applies additive DDL for AssessmentReview and QuestionReview
 * to Neon PostgreSQL and records the migration in _prisma_migrations.
 */

import "./local-dns-preload.cjs";
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "../src/lib/prisma";

async function applyMigration() {
  console.log("Applying additive migration for AssessmentReview and QuestionReview to Neon PostgreSQL...");

  // 1. Create enum ReviewStatus if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ Type 'ReviewStatus' verified/created");

  // 2. Create table AssessmentReview if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AssessmentReview" (
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
  `);
  console.log("✓ Table 'AssessmentReview' verified/created");

  // 3. Create table QuestionReview if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QuestionReview" (
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
  `);
  console.log("✓ Table 'QuestionReview' verified/created");

  // 4. Create indices if not exists
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentReview_attemptId_key" ON "AssessmentReview"("attemptId");
    CREATE INDEX IF NOT EXISTS "AssessmentReview_attemptId_idx" ON "AssessmentReview"("attemptId");
    CREATE INDEX IF NOT EXISTS "AssessmentReview_reviewerId_idx" ON "AssessmentReview"("reviewerId");
    CREATE INDEX IF NOT EXISTS "AssessmentReview_status_idx" ON "AssessmentReview"("status");

    CREATE UNIQUE INDEX IF NOT EXISTS "QuestionReview_reviewId_questionId_key" ON "QuestionReview"("reviewId", "questionId");
    CREATE INDEX IF NOT EXISTS "QuestionReview_reviewId_idx" ON "QuestionReview"("reviewId");
    CREATE INDEX IF NOT EXISTS "QuestionReview_questionId_idx" ON "QuestionReview"("questionId");
  `);
  console.log("✓ Indices verified/created");

  // 5. Add foreign keys safely
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentReview" ADD CONSTRAINT "AssessmentReview_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "AssessmentReview" ADD CONSTRAINT "AssessmentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AssessmentReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ Foreign key constraints verified/created");

  // 6. Record migration in _prisma_migrations
  const migrationName = "20261121213000_add_assessment_reviews";
  const migrationFilePath = path.join(process.cwd(), "prisma", "migrations", migrationName, "migration.sql");
  const migrationContent = fs.readFileSync(migrationFilePath);
  const checksum = crypto.createHash("sha256").update(migrationContent).digest("hex");

  const existingMigration = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT id FROM "_prisma_migrations" WHERE migration_name = $1
  `, migrationName);

  if (existingMigration.length === 0) {
    const migrationId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (
        "id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count"
      ) VALUES (
        $1, $2, NOW(), $3, '', NULL, NOW(), 1
      )
    `, migrationId, checksum, migrationName);
    console.log(`✓ Migration '${migrationName}' recorded in '_prisma_migrations' (checksum: ${checksum})`);
  } else {
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations"
      SET "checksum" = $1, "finished_at" = NOW(), "rolled_back_at" = NULL
      WHERE "migration_name" = $2
    `, checksum, migrationName);
    console.log(`✓ Migration '${migrationName}' record refreshed in '_prisma_migrations' (checksum: ${checksum})`);
  }

  console.log("\nAdditive migration for AssessmentReview successfully applied and recorded in Neon PostgreSQL!");
}

applyMigration()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
