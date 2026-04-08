/*
  Warnings:

  - The values [READY] on the enum `PortingCommunicationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserAdminActionType" AS ENUM ('USER_CREATED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'USER_PASSWORD_RESET', 'USER_FORCE_PASSWORD_CHANGE_SET');

-- AlterEnum
BEGIN;
CREATE TYPE "PortingCommunicationStatus_new" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
ALTER TABLE "porting_communications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "porting_communications" ALTER COLUMN "status" TYPE "PortingCommunicationStatus_new" USING ("status"::text::"PortingCommunicationStatus_new");
ALTER TYPE "PortingCommunicationStatus" RENAME TO "PortingCommunicationStatus_old";
ALTER TYPE "PortingCommunicationStatus_new" RENAME TO "PortingCommunicationStatus";
DROP TYPE "PortingCommunicationStatus_old";
ALTER TABLE "porting_communications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "communication_delivery_attempts" DROP CONSTRAINT "communication_delivery_attempts_attemptedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "communication_delivery_attempts" DROP CONSTRAINT "communication_delivery_attempts_communicationId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByUserId" TEXT,
ADD COLUMN     "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "reactivatedAt" TIMESTAMP(3),
ADD COLUMN     "reactivatedByUserId" TEXT;

-- CreateTable
CREATE TABLE "user_admin_audit_log" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actionType" "UserAdminActionType" NOT NULL,
    "previousStateJson" JSONB,
    "nextStateJson" JSONB,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_admin_audit_log_targetUserId_idx" ON "user_admin_audit_log"("targetUserId");

-- CreateIndex
CREATE INDEX "user_admin_audit_log_actorUserId_idx" ON "user_admin_audit_log"("actorUserId");

-- CreateIndex
CREATE INDEX "user_admin_audit_log_createdAt_idx" ON "user_admin_audit_log"("createdAt");

-- AddForeignKey
ALTER TABLE "communication_delivery_attempts" ADD CONSTRAINT "communication_delivery_attempts_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "porting_communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_delivery_attempts" ADD CONSTRAINT "communication_delivery_attempts_attemptedByUserId_fkey" FOREIGN KEY ("attemptedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_admin_audit_log" ADD CONSTRAINT "user_admin_audit_log_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_admin_audit_log" ADD CONSTRAINT "user_admin_audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
