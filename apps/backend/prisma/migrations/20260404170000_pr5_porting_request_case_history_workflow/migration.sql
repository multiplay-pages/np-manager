-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "PortingRequestCaseHistoryEventType" AS ENUM ('REQUEST_CREATED', 'STATUS_CHANGED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE "porting_request_case_history" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventType" "PortingRequestCaseHistoryEventType" NOT NULL,
    "statusBefore" "PortingCaseStatus",
    "statusAfter" "PortingCaseStatus",
    "reason" VARCHAR(300),
    "comment" TEXT,
    "metadata" JSONB,
    "actorUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porting_request_case_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porting_request_case_history_requestId_idx" ON "porting_request_case_history"("requestId");

-- CreateIndex
CREATE INDEX "porting_request_case_history_requestId_occurredAt_idx" ON "porting_request_case_history"("requestId", "occurredAt");

-- AddForeignKey
ALTER TABLE "porting_request_case_history" ADD CONSTRAINT "porting_request_case_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_request_case_history" ADD CONSTRAINT "porting_request_case_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
