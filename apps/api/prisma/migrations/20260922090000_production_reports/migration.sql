ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'EXECUTIVE_SUMMARY';
ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'TECHNICAL_FINDINGS';
ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'FULL_SECURITY_AUDIT';
ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'RETEST_REPORT';

DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "projectId" TEXT,
  ADD COLUMN IF NOT EXISTS "assetId" TEXT,
  ADD COLUMN IF NOT EXISTS "generatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "securityScore" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "riskRating" TEXT,
  ADD COLUMN IF NOT EXISTS "severitySummary" JSONB,
  ADD COLUMN IF NOT EXISTS "scannerSummary" JSONB,
  ADD COLUMN IF NOT EXISTS "reportStatus" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
  ADD COLUMN IF NOT EXISTS "htmlPath" TEXT,
  ADD COLUMN IF NOT EXISTS "pdfPath" TEXT,
  ADD COLUMN IF NOT EXISTS "jsonPath" TEXT,
  ADD COLUMN IF NOT EXISTS "csvPath" TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "errorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

UPDATE "Report" AS report
SET
  "organizationId" = project."organizationId",
  "projectId" = project."id",
  "assetId" = asset."id",
  "generatedBy" = scan."createdBy",
  "securityScore" = scan."securityScore",
  "reportStatus" = 'COMPLETED',
  "title" = COALESCE(report."title", 'LuminarIQ SecureScan Security Report')
FROM "Scan" AS scan
JOIN "Asset" AS asset ON asset."id" = scan."assetId"
JOIN "Project" AS project ON project."id" = asset."projectId"
WHERE report."scanId" = scan."id";

ALTER TABLE "Report" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "assetId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "generatedBy" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Report" ADD CONSTRAINT "Report_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "Report_organizationId_generatedAt_idx" ON "Report"("organizationId", "generatedAt");
CREATE INDEX IF NOT EXISTS "Report_assetId_generatedAt_idx" ON "Report"("assetId", "generatedAt");
CREATE INDEX IF NOT EXISTS "Report_generatedBy_generatedAt_idx" ON "Report"("generatedBy", "generatedAt");
CREATE INDEX IF NOT EXISTS "Report_reportStatus_generatedAt_idx" ON "Report"("reportStatus", "generatedAt");
