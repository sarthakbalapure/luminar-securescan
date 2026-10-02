-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('PLUS', 'PRO', 'MAX');

-- CreateEnum
CREATE TYPE "ReportLevel" AS ENUM ('BASIC', 'DETAILED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FixRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED');

-- Extend the existing organization subscription table without discarding legacy assignments.
ALTER TABLE "SubscriptionPlan"
  ADD COLUMN "planCode" "PlanCode" NOT NULL DEFAULT 'PLUS',
  ADD COLUMN "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "assignedBy" TEXT,
  ADD COLUMN "monthlyScanLimit" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "monthlyFixRequestLimit" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dailyScanEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reportLevel" "ReportLevel" NOT NULL DEFAULT 'BASIC',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "paymentProvider" TEXT,
  ADD COLUMN "paymentStatus" TEXT,
  ADD COLUMN "paymentReference" TEXT;

UPDATE "SubscriptionPlan"
SET
  "planCode" = CASE
    WHEN UPPER("planName") = 'MAX' OR UPPER("planName") = 'STARTUP' THEN 'MAX'::"PlanCode"
    WHEN UPPER("planName") = 'PRO' THEN 'PRO'::"PlanCode"
    ELSE 'PLUS'::"PlanCode"
  END,
  "monthlyScanLimit" = CASE
    WHEN UPPER("planName") = 'MAX' OR UPPER("planName") = 'STARTUP' THEN 30
    WHEN UPPER("planName") = 'PRO' THEN 10
    ELSE 3
  END,
  "monthlyFixRequestLimit" = CASE WHEN UPPER("planName") = 'MAX' OR UPPER("planName") = 'STARTUP' THEN 10 ELSE 0 END,
  "dailyScanEnabled" = UPPER("planName") = 'MAX' OR UPPER("planName") = 'STARTUP',
  "reportLevel" = CASE WHEN UPPER("planName") IN ('PRO', 'MAX', 'STARTUP') THEN 'DETAILED'::"ReportLevel" ELSE 'BASIC'::"ReportLevel" END;

-- CreateTable
CREATE TABLE "PlanDefinition" (
  "id" TEXT NOT NULL,
  "code" "PlanCode" NOT NULL,
  "displayName" TEXT NOT NULL,
  "monthlyScanLimit" INTEGER NOT NULL,
  "reportLevel" "ReportLevel" NOT NULL,
  "detailedRemediation" BOOLEAN NOT NULL DEFAULT false,
  "dailyScanEnabled" BOOLEAN NOT NULL DEFAULT false,
  "monthlyFixRequestLimit" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priceMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "description" TEXT,
  "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionUsage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planCode" "PlanCode" NOT NULL,
  "monthKey" TEXT NOT NULL,
  "scansUsed" INTEGER NOT NULL DEFAULT 0,
  "fixRequestsUsed" INTEGER NOT NULL DEFAULT 0,
  "dailyScanCount" INTEGER NOT NULL DEFAULT 0,
  "lastScanDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixSupportRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "assetId" TEXT,
  "scanId" TEXT,
  "findingId" TEXT,
  "requestedBy" TEXT NOT NULL,
  "assignedToAdmin" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "FindingSeverity",
  "status" "FixRequestStatus" NOT NULL DEFAULT 'OPEN',
  "adminResponse" TEXT,
  "customerResponse" TEXT,
  "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "FixSupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDefinition_code_key" ON "PlanDefinition"("code");
CREATE INDEX "SubscriptionPlan_organizationId_status_isActive_idx" ON "SubscriptionPlan"("organizationId", "status", "isActive");
CREATE INDEX "SubscriptionPlan_planCode_isActive_idx" ON "SubscriptionPlan"("planCode", "isActive");
CREATE INDEX "SubscriptionPlan_assignedBy_idx" ON "SubscriptionPlan"("assignedBy");
CREATE UNIQUE INDEX "SubscriptionUsage_organizationId_monthKey_key" ON "SubscriptionUsage"("organizationId", "monthKey");
CREATE INDEX "SubscriptionUsage_monthKey_planCode_idx" ON "SubscriptionUsage"("monthKey", "planCode");
CREATE INDEX "FixSupportRequest_organizationId_status_createdAt_idx" ON "FixSupportRequest"("organizationId", "status", "createdAt");
CREATE INDEX "FixSupportRequest_requestedBy_createdAt_idx" ON "FixSupportRequest"("requestedBy", "createdAt");
CREATE INDEX "FixSupportRequest_assignedToAdmin_status_idx" ON "FixSupportRequest"("assignedToAdmin", "status");
CREATE INDEX "FixSupportRequest_findingId_idx" ON "FixSupportRequest"("findingId");

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionUsage" ADD CONSTRAINT "SubscriptionUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixSupportRequest" ADD CONSTRAINT "FixSupportRequest_assignedToAdmin_fkey" FOREIGN KEY ("assignedToAdmin") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
