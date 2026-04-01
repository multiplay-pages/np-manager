-- CreateEnum
CREATE TYPE "PortingEventSource" AS ENUM ('INTERNAL', 'PLI_CBD', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PortingEventType" AS ENUM ('REQUEST_CREATED', 'PLI_EXPORT_TRIGGERED', 'PLI_EXPORT_STATE_UPDATED', 'PLI_SYNC_TRIGGERED', 'PLI_SYNC_STATE_UPDATED', 'PLI_MESSAGE_RECEIVED', 'PLI_MESSAGE_PARSED', 'PLI_STATUS_UPDATED', 'NOTE');

-- CreateTable
CREATE TABLE "porting_request_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventSource" "PortingEventSource" NOT NULL,
    "eventType" "PortingEventType" NOT NULL,
    "exxType" VARCHAR(10),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "statusBefore" VARCHAR(50),
    "statusAfter" VARCHAR(50),
    "statusCode" VARCHAR(100),
    "technicalCode" VARCHAR(100),
    "payloadSummary" VARCHAR(500),
    "createdByUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porting_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porting_request_events_requestId_idx" ON "porting_request_events"("requestId");

-- CreateIndex
CREATE INDEX "porting_request_events_requestId_occurredAt_idx" ON "porting_request_events"("requestId", "occurredAt");

-- AddForeignKey
ALTER TABLE "porting_request_events" ADD CONSTRAINT "porting_request_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_request_events" ADD CONSTRAINT "porting_request_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
