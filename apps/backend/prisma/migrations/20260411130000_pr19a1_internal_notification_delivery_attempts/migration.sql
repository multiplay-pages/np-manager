-- CreateEnum
CREATE TYPE "InternalNotificationAttemptOrigin" AS ENUM ('PRIMARY', 'ERROR_FALLBACK', 'RETRY');

-- CreateEnum
CREATE TYPE "InternalNotificationAttemptChannel" AS ENUM ('EMAIL', 'TEAMS');

-- CreateEnum
CREATE TYPE "InternalNotificationAttemptMode" AS ENUM ('REAL', 'STUB', 'DISABLED', 'POLICY');

-- CreateEnum
CREATE TYPE "InternalNotificationAttemptOutcome" AS ENUM ('SENT', 'STUBBED', 'DISABLED', 'MISCONFIGURED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "InternalNotificationFailureKind" AS ENUM ('DELIVERY', 'CONFIGURATION', 'POLICY');

-- CreateTable
CREATE TABLE "internal_notification_delivery_attempts" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventCode" VARCHAR(50) NOT NULL,
    "eventLabel" VARCHAR(200) NOT NULL,
    "attemptOrigin" "InternalNotificationAttemptOrigin" NOT NULL,
    "channel" "InternalNotificationAttemptChannel" NOT NULL,
    "recipient" VARCHAR(300) NOT NULL,
    "mode" "InternalNotificationAttemptMode" NOT NULL,
    "outcome" "InternalNotificationAttemptOutcome" NOT NULL,
    "errorCode" VARCHAR(100),
    "errorMessage" TEXT,
    "failureKind" "InternalNotificationFailureKind",
    "retryOfAttemptId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "isLatestForChain" BOOLEAN NOT NULL DEFAULT true,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notification_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_requestId_idx" ON "internal_notification_delivery_attempts"("requestId");

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_requestId_createdAt_idx" ON "internal_notification_delivery_attempts"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_outcome_idx" ON "internal_notification_delivery_attempts"("outcome");

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_attemptOrigin_outcome_createdAt_idx" ON "internal_notification_delivery_attempts"("attemptOrigin", "outcome", "createdAt");

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_retryOfAttemptId_idx" ON "internal_notification_delivery_attempts"("retryOfAttemptId");

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_isLatestForChain_idx" ON "internal_notification_delivery_attempts"("isLatestForChain");

-- CreateIndex
CREATE INDEX "internal_notification_delivery_attempts_triggeredByUserId_idx" ON "internal_notification_delivery_attempts"("triggeredByUserId");

-- AddForeignKey
ALTER TABLE "internal_notification_delivery_attempts" ADD CONSTRAINT "internal_notification_delivery_attempts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "porting_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notification_delivery_attempts" ADD CONSTRAINT "internal_notification_delivery_attempts_retryOfAttemptId_fkey" FOREIGN KEY ("retryOfAttemptId") REFERENCES "internal_notification_delivery_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notification_delivery_attempts" ADD CONSTRAINT "internal_notification_delivery_attempts_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
