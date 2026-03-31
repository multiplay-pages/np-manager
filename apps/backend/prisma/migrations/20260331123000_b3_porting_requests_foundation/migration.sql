-- CreateEnum
CREATE TYPE "PortedNumberKind" AS ENUM ('SINGLE', 'DDI_RANGE');

-- CreateEnum
CREATE TYPE "SubscriberIdentityType" AS ENUM ('PESEL', 'NIP', 'REGON', 'ID_CARD', 'PASSPORT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PliCbdExxType" ADD VALUE 'E12';
ALTER TYPE "PliCbdExxType" ADD VALUE 'E13';

-- AlterTable
ALTER TABLE "porting_requests" DROP COLUMN "createdBy",
DROP COLUMN "portedNumber",
ADD COLUMN     "caseNumber" VARCHAR(30) NOT NULL,
ADD COLUMN     "contactChannel" "ContactChannel" NOT NULL,
ADD COLUMN     "correspondenceAddress" TEXT NOT NULL,
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "earliestAcceptablePortDate" DATE,
ADD COLUMN     "hasPowerOfAttorney" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "identityType" "SubscriberIdentityType" NOT NULL,
ADD COLUMN     "identityValue" VARCHAR(100) NOT NULL,
ADD COLUMN     "infrastructureOperatorId" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "linkedWholesaleServiceOnRecipientSide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numberRangeKind" "PortedNumberKind" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "primaryNumber" VARCHAR(20),
ADD COLUMN     "rangeEnd" VARCHAR(20),
ADD COLUMN     "rangeStart" VARCHAR(20),
ADD COLUMN     "requestDocumentNumber" VARCHAR(100),
ADD COLUMN     "requestedPortTime" VARCHAR(5),
ADD COLUMN     "subscriberCompanyName" VARCHAR(200),
ADD COLUMN     "subscriberFirstName" VARCHAR(100),
ADD COLUMN     "subscriberKind" "ClientType" NOT NULL,
ADD COLUMN     "subscriberLastName" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "porting_requests_caseNumber_key" ON "porting_requests"("caseNumber");

-- CreateIndex
CREATE INDEX "porting_requests_statusInternal_idx" ON "porting_requests"("statusInternal");

-- CreateIndex
CREATE INDEX "porting_requests_primaryNumber_idx" ON "porting_requests"("primaryNumber");

-- CreateIndex
CREATE INDEX "porting_requests_infrastructureOperatorId_idx" ON "porting_requests"("infrastructureOperatorId");

-- CreateIndex
CREATE INDEX "porting_requests_createdByUserId_idx" ON "porting_requests"("createdByUserId");

-- CreateIndex
CREATE INDEX "porting_requests_createdAt_idx" ON "porting_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_infrastructureOperatorId_fkey" FOREIGN KEY ("infrastructureOperatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

