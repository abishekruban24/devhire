import "./local-dns-preload.cjs";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function applyMigration() {
  console.log("Applying additive migration for AssessmentInvitation to Neon PostgreSQL...");

  // 1. Create enum if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'STARTED', 'COMPLETED', 'EXPIRED', 'REVOKED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ Type 'InvitationStatus' verified/created");

  // 2. Alter AssessmentAttempt to add invitationId if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "invitationId" TEXT;
  `);
  console.log("✓ Column 'invitationId' added to 'AssessmentAttempt'");

  // 3. Create table AssessmentInvitation if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AssessmentInvitation" (
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "AssessmentInvitation_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("✓ Table 'AssessmentInvitation' verified/created");

  // 4. Create indices if not exists
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AssessmentAttempt_invitationId_idx" ON "AssessmentAttempt"("invitationId");
    CREATE INDEX IF NOT EXISTS "AssessmentInvitation_candidateId_idx" ON "AssessmentInvitation"("candidateId");
    CREATE INDEX IF NOT EXISTS "AssessmentInvitation_companyId_idx" ON "AssessmentInvitation"("companyId");
    CREATE INDEX IF NOT EXISTS "AssessmentInvitation_assessmentId_idx" ON "AssessmentInvitation"("assessmentId");
    CREATE INDEX IF NOT EXISTS "AssessmentInvitation_applicationId_idx" ON "AssessmentInvitation"("applicationId");
    CREATE INDEX IF NOT EXISTS "AssessmentInvitation_status_idx" ON "AssessmentInvitation"("status");
    CREATE INDEX IF NOT EXISTS "AssessmentInvitation_expiresAt_idx" ON "AssessmentInvitation"("expiresAt");
    CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentInvitation_unique_active" ON "AssessmentInvitation"("applicationId", "assessmentId") WHERE status IN ('PENDING', 'STARTED');
  `);
  console.log("✓ Indices on 'AssessmentInvitation' and 'AssessmentAttempt' created");

  // 5. Add foreign keys safely
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "AssessmentInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "AssessmentInvitation" ADD CONSTRAINT "AssessmentInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ Foreign key constraints verified/created");

  // 6. Record migration in _prisma_migrations so future `prisma migrate deploy` operations see it as applied
  const fs = await import("fs");
  const crypto = await import("crypto");
  const path = await import("path");

  const migrationName = "20261121161500_add_assessment_invitation";
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

  console.log("\nAdditive migration successfully applied and recorded in Neon PostgreSQL!");
}

applyMigration()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
