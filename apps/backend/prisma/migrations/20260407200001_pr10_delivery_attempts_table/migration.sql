-- PR10 (2/2): Tabela historii prob doreczenia + nowy enum + migracja danych
-- Wymaga wczesniejszego zatwierdzenia nowych wartosci enuma (migracja 20260407200000).

-- 1. Migracja danych: READY -> READY_TO_SEND
UPDATE "porting_communications"
SET "status" = 'READY_TO_SEND'
WHERE "status" = 'READY';

-- Uwaga: wartosc READY pozostaje w enumie dla kompatybilnosci wstecznej.
-- W produkcji mozna ja usunac po potwierdzeniu braku rekordow z tym statusem.

-- 2. Nowy enum CommunicationDeliveryOutcome
DO $$
BEGIN
    CREATE TYPE "CommunicationDeliveryOutcome" AS ENUM ('SUCCESS', 'FAILED', 'STUBBED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabela historii prob doreczenia
CREATE TABLE IF NOT EXISTS "communication_delivery_attempts" (
    "id"                  TEXT NOT NULL,
    "communicationId"     TEXT NOT NULL,
    "attemptedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptedByUserId"   TEXT NOT NULL,
    "channel"             "PortingCommunicationType" NOT NULL,
    "recipient"           VARCHAR(200) NOT NULL,
    "subjectSnapshot"     VARCHAR(300) NOT NULL,
    "bodySnapshot"        TEXT NOT NULL,
    "outcome"             "CommunicationDeliveryOutcome" NOT NULL,
    "transportMessageId"  VARCHAR(200),
    "transportReference"  VARCHAR(200),
    "errorCode"           VARCHAR(100),
    "errorMessage"        TEXT,
    "responsePayloadJson" JSONB,
    "adapterName"         VARCHAR(100) NOT NULL,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign keys
DO $$
BEGIN
    ALTER TABLE "communication_delivery_attempts"
        ADD CONSTRAINT "communication_delivery_attempts_communicationId_fkey"
        FOREIGN KEY ("communicationId")
        REFERENCES "porting_communications"("id")
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "communication_delivery_attempts"
        ADD CONSTRAINT "communication_delivery_attempts_attemptedByUserId_fkey"
        FOREIGN KEY ("attemptedByUserId")
        REFERENCES "users"("id")
        ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. Indeksy
CREATE INDEX IF NOT EXISTS "communication_delivery_attempts_communicationId_idx"
    ON "communication_delivery_attempts"("communicationId");

CREATE INDEX IF NOT EXISTS "communication_delivery_attempts_communicationId_attemptedAt_idx"
    ON "communication_delivery_attempts"("communicationId", "attemptedAt");
