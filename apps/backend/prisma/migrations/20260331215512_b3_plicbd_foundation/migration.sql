-- CreateEnum
CREATE TYPE "PliCbdExportStatus" AS ENUM ('NOT_EXPORTED', 'EXPORT_PENDING', 'EXPORTED', 'SYNC_ERROR');

-- AlterTable
ALTER TABLE "porting_requests" ADD COLUMN     "donorAssignedPortDate" DATE,
ADD COLUMN     "donorAssignedPortTime" VARCHAR(5),
ADD COLUMN     "lastPliCbdStatusCode" VARCHAR(100),
ADD COLUMN     "lastPliCbdStatusDescription" TEXT,
ADD COLUMN     "pliCbdCaseNumber" VARCHAR(100),
ADD COLUMN     "pliCbdExportStatus" "PliCbdExportStatus" NOT NULL DEFAULT 'NOT_EXPORTED',
ADD COLUMN     "pliCbdLastSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "porting_requests_pliCbdExportStatus_idx" ON "porting_requests"("pliCbdExportStatus");
