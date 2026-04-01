-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PliCbdIntegrationDirection" AS ENUM ('EXPORT', 'SYNC');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PliCbdIntegrationStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "pli_cbd_integration_events" (
    "id" TEXT NOT NULL,
    "portingRequestId" TEXT NOT NULL,
    "operationType" "PliCbdIntegrationDirection" NOT NULL,
    "operationStatus" "PliCbdIntegrationStatus" NOT NULL,
    "actionName" VARCHAR(100),
    "requestPayloadJson" JSONB,
    "responsePayloadJson" JSONB,
    "errorMessage" TEXT,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "pli_cbd_integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pli_cbd_integration_events_portingRequestId_idx" ON "pli_cbd_integration_events"("portingRequestId");

-- CreateIndex
CREATE INDEX "pli_cbd_integration_events_portingRequestId_createdAt_idx" ON "pli_cbd_integration_events"("portingRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "pli_cbd_integration_events" ADD CONSTRAINT "pli_cbd_integration_events_portingRequestId_fkey" FOREIGN KEY ("portingRequestId") REFERENCES "porting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pli_cbd_integration_events" ADD CONSTRAINT "pli_cbd_integration_events_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
