-- CreateEnum
CREATE TYPE "PortingMode" AS ENUM ('END', 'EOP', 'DAY');

-- CreateEnum
CREATE TYPE "PortingCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_DONOR', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'PORTED', 'ERROR');

-- CreateEnum
CREATE TYPE "PliCbdExxType" AS ENUM ('E03', 'E06', 'E16', 'E17', 'E18', 'E23', 'E31');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('EMAIL', 'SMS', 'LETTER');

-- CreateEnum
CREATE TYPE "NumberType" AS ENUM ('FIXED_LINE', 'MOBILE');

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_requestId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_requestId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_requestId_fkey";

-- DropForeignKey
ALTER TABLE "phone_numbers" DROP CONSTRAINT "phone_numbers_requestId_fkey";

-- DropForeignKey
ALTER TABLE "portability_requests" DROP CONSTRAINT "portability_requests_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "portability_requests" DROP CONSTRAINT "portability_requests_clientId_fkey";

-- DropForeignKey
ALTER TABLE "portability_requests" DROP CONSTRAINT "portability_requests_createdById_fkey";

-- DropForeignKey
ALTER TABLE "portability_requests" DROP CONSTRAINT "portability_requests_donorOperatorId_fkey";

-- DropForeignKey
ALTER TABLE "portability_requests" DROP CONSTRAINT "portability_requests_recipientOperatorId_fkey";

-- DropForeignKey
ALTER TABLE "portability_requests" DROP CONSTRAINT "portability_requests_statusId_fkey";

-- DropForeignKey
ALTER TABLE "status_history" DROP CONSTRAINT "status_history_requestId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_requestId_fkey";

-- DropIndex
DROP INDEX "operators_shortCode_key";

-- AlterTable
ALTER TABLE "operators"
ADD COLUMN     "isRecipientDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routingNumber" VARCHAR(20),
ADD COLUMN     "shortName" VARCHAR(100);

-- Backfill nowych pól operatora na podstawie istniejącego shortCode.
-- Na tym etapie routingNumber zapisujemy jako snapshot dotychczasowego kodu operatora,
-- żeby migracja była wykonywalna na danych seedowych i wersjonowalna.
UPDATE "operators"
SET
  "shortName" = "shortCode",
  "routingNumber" = "shortCode"
WHERE "shortName" IS NULL
   OR "routingNumber" IS NULL;

ALTER TABLE "operators"
ALTER COLUMN "routingNumber" SET NOT NULL,
ALTER COLUMN "shortName" SET NOT NULL;

ALTER TABLE "operators" DROP COLUMN "contactEmail",
DROP COLUMN "contactPhone",
DROP COLUMN "isDonorCapable",
DROP COLUMN "isRecipientCapable",
DROP COLUMN "notes",
DROP COLUMN "shortCode";

-- DropTable
DROP TABLE "portability_requests";

-- CreateTable
CREATE TABLE "porting_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "portedNumber" VARCHAR(20) NOT NULL,
    "numberType" "NumberType" NOT NULL DEFAULT 'FIXED_LINE',
    "donorOperatorId" TEXT NOT NULL,
    "recipientOperatorId" TEXT NOT NULL,
    "donorRoutingNumber" VARCHAR(20) NOT NULL,
    "recipientRoutingNumber" VARCHAR(20) NOT NULL,
    "requestRegisteredAt" TIMESTAMP(3),
    "requestedPortDate" DATE,
    "confirmedPortDate" DATE,
    "portingMode" "PortingMode" NOT NULL,
    "statusInternal" "PortingCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "statusPliCbd" VARCHAR(50),
    "pliCbdCaseId" VARCHAR(100),
    "pliCbdPackageId" VARCHAR(100),
    "lastExxReceived" "PliCbdExxType",
    "rejectionCode" VARCHAR(50),
    "rejectionReason" TEXT,
    "createdBy" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porting_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porting_requests_clientId_idx" ON "porting_requests"("clientId");

-- CreateIndex
CREATE INDEX "porting_requests_donorOperatorId_idx" ON "porting_requests"("donorOperatorId");

-- CreateIndex
CREATE INDEX "porting_requests_recipientOperatorId_idx" ON "porting_requests"("recipientOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "operators_routingNumber_key" ON "operators"("routingNumber");

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_donorOperatorId_fkey" FOREIGN KEY ("donorOperatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_recipientOperatorId_fkey" FOREIGN KEY ("recipientOperatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

