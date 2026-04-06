-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PortingCommunicationType" AS ENUM ('EMAIL', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PortingCommunicationStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PortingCommunicationTriggerType" AS ENUM (
        'CASE_RECEIVED',
        'SENT_TO_EXTERNAL_SYSTEM',
        'PORT_DATE_SCHEDULED',
        'CASE_REJECTED',
        'PORT_COMPLETED',
        'MANUAL'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PortingCommunicationTemplateKey" AS ENUM (
        'case_received',
        'sent_to_external_system',
        'port_date_scheduled',
        'case_rejected',
        'port_completed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "porting_requests"
ADD COLUMN "sentToExternalSystemAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "porting_communications" (
    "id" TEXT NOT NULL,
    "portingRequestId" TEXT NOT NULL,
    "type" "PortingCommunicationType" NOT NULL,
    "status" "PortingCommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "triggerType" "PortingCommunicationTriggerType" NOT NULL,
    "recipient" VARCHAR(200) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "templateKey" "PortingCommunicationTemplateKey" NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porting_communications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porting_communications_portingRequestId_idx" ON "porting_communications"("portingRequestId");

-- CreateIndex
CREATE INDEX "porting_communications_portingRequestId_createdAt_idx" ON "porting_communications"("portingRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "porting_communications_status_idx" ON "porting_communications"("status");

-- AddForeignKey
ALTER TABLE "porting_communications" ADD CONSTRAINT "porting_communications_portingRequestId_fkey" FOREIGN KEY ("portingRequestId") REFERENCES "porting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_communications" ADD CONSTRAINT "porting_communications_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
