DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunicationTemplateCode') THEN
        CREATE TYPE "CommunicationTemplateCode" AS ENUM (
            'REQUEST_RECEIVED',
            'PORT_DATE_RECEIVED',
            'PORTING_DAY',
            'ISSUE_NOTICE'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "communication_templates" (
    "id" TEXT NOT NULL,
    "code" "CommunicationTemplateCode" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "channel" "ContactChannel" NOT NULL,
    "subjectTemplate" VARCHAR(300) NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "communication_templates_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "communication_templates_updatedByUserId_fkey"
      FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "communication_templates_code_channel_idx"
  ON "communication_templates"("code", "channel");

CREATE INDEX IF NOT EXISTS "communication_templates_code_channel_isActive_idx"
  ON "communication_templates"("code", "channel", "isActive");
