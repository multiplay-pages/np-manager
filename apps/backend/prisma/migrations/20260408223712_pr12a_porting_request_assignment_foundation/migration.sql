-- AlterTable
ALTER TABLE "porting_requests" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedByUserId" TEXT,
ADD COLUMN     "assignedUserId" TEXT;

-- CreateTable
CREATE TABLE "porting_request_assignment_history" (
    "id" TEXT NOT NULL,
    "portingRequestId" TEXT NOT NULL,
    "previousAssignedUserId" TEXT,
    "nextAssignedUserId" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porting_request_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porting_request_assignment_history_portingRequestId_idx" ON "porting_request_assignment_history"("portingRequestId");

-- CreateIndex
CREATE INDEX "porting_request_assignment_history_portingRequestId_created_idx" ON "porting_request_assignment_history"("portingRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "porting_request_assignment_history_changedByUserId_idx" ON "porting_request_assignment_history"("changedByUserId");

-- CreateIndex
CREATE INDEX "porting_requests_assignedUserId_idx" ON "porting_requests"("assignedUserId");

-- CreateIndex
CREATE INDEX "porting_requests_assignedAt_idx" ON "porting_requests"("assignedAt");

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_request_assignment_history" ADD CONSTRAINT "porting_request_assignment_history_portingRequestId_fkey" FOREIGN KEY ("portingRequestId") REFERENCES "porting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_request_assignment_history" ADD CONSTRAINT "porting_request_assignment_history_previousAssignedUserId_fkey" FOREIGN KEY ("previousAssignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_request_assignment_history" ADD CONSTRAINT "porting_request_assignment_history_nextAssignedUserId_fkey" FOREIGN KEY ("nextAssignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porting_request_assignment_history" ADD CONSTRAINT "porting_request_assignment_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
