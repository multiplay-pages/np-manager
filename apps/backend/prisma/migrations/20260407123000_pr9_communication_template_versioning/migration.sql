DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CommunicationTemplateVersionStatus'
  ) THEN
    CREATE TYPE "CommunicationTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

ALTER TABLE "communication_templates" RENAME TO "communication_templates_legacy";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'communication_templates_pkey'
  ) THEN
    ALTER TABLE "communication_templates_legacy"
      RENAME CONSTRAINT "communication_templates_pkey" TO "communication_templates_legacy_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'communication_templates_code_channel_key'
  ) THEN
    ALTER TABLE "communication_templates_legacy"
      RENAME CONSTRAINT "communication_templates_code_channel_key" TO "communication_templates_legacy_code_channel_key";
  END IF;
END $$;

DROP INDEX IF EXISTS "communication_templates_code_channel_idx";
DROP INDEX IF EXISTS "communication_templates_code_channel_isActive_idx";

CREATE TABLE "communication_templates" (
  "id" TEXT NOT NULL,
  "code" "CommunicationTemplateCode" NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "channel" "ContactChannel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_template_versions" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "CommunicationTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "subjectTemplate" VARCHAR(300) NOT NULL,
  "bodyTemplate" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "publishedByUserId" TEXT,
  CONSTRAINT "communication_template_versions_pkey" PRIMARY KEY ("id")
);

WITH ranked_families AS (
  SELECT
    legacy.*,
    ROW_NUMBER() OVER (
      PARTITION BY legacy."code", legacy."channel"
      ORDER BY legacy."isActive" DESC, legacy."version" DESC, legacy."updatedAt" DESC, legacy."id" ASC
    ) AS family_rank
  FROM "communication_templates_legacy" AS legacy
)
INSERT INTO "communication_templates" (
  "id",
  "code",
  "name",
  "description",
  "channel",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId"
)
SELECT
  ranked."id",
  ranked."code",
  ranked."name",
  ranked."description",
  ranked."channel",
  ranked."createdAt",
  ranked."updatedAt",
  ranked."createdByUserId",
  ranked."updatedByUserId"
FROM ranked_families AS ranked
WHERE ranked.family_rank = 1;

WITH family_state AS (
  SELECT
    legacy."code",
    legacy."channel",
    BOOL_OR(legacy."isActive") AS has_published,
    MAX(CASE WHEN legacy."isActive" THEN legacy."createdAt" END) AS published_created_at
  FROM "communication_templates_legacy" AS legacy
  GROUP BY legacy."code", legacy."channel"
),
ranked_versions AS (
  SELECT
    legacy.*,
    ROW_NUMBER() OVER (
      PARTITION BY legacy."code", legacy."channel"
      ORDER BY legacy."version" ASC, legacy."createdAt" ASC, legacy."updatedAt" ASC, legacy."id" ASC
    ) AS normalized_version_number,
    ROW_NUMBER() OVER (
      PARTITION BY legacy."code", legacy."channel"
      ORDER BY legacy."version" DESC, legacy."updatedAt" DESC, legacy."id" DESC
    ) AS latest_rank_desc,
    state.has_published,
    state.published_created_at
  FROM "communication_templates_legacy" AS legacy
  INNER JOIN family_state AS state
    ON state."code" = legacy."code"
   AND state."channel" = legacy."channel"
)
INSERT INTO "communication_template_versions" (
  "id",
  "templateId",
  "versionNumber",
  "status",
  "subjectTemplate",
  "bodyTemplate",
  "createdAt",
  "updatedAt",
  "createdByUserId",
  "updatedByUserId",
  "publishedAt",
  "publishedByUserId"
)
SELECT
  ranked."id",
  family."id" AS "templateId",
  ranked.normalized_version_number AS "versionNumber",
  CASE
    WHEN ranked."isActive" THEN 'PUBLISHED'::"CommunicationTemplateVersionStatus"
    WHEN NOT ranked.has_published AND ranked.latest_rank_desc = 1 THEN 'DRAFT'::"CommunicationTemplateVersionStatus"
    WHEN ranked.has_published
      AND ranked.published_created_at IS NOT NULL
      AND (ranked."createdAt" > ranked.published_created_at OR ranked."updatedAt" > ranked.published_created_at)
      THEN 'DRAFT'::"CommunicationTemplateVersionStatus"
    ELSE 'ARCHIVED'::"CommunicationTemplateVersionStatus"
  END AS "status",
  ranked."subjectTemplate",
  ranked."bodyTemplate",
  ranked."createdAt",
  ranked."updatedAt",
  ranked."createdByUserId",
  ranked."updatedByUserId",
  CASE WHEN ranked."isActive" THEN ranked."updatedAt" ELSE NULL END AS "publishedAt",
  CASE WHEN ranked."isActive" THEN ranked."updatedByUserId" ELSE NULL END AS "publishedByUserId"
FROM ranked_versions AS ranked
INNER JOIN "communication_templates" AS family
  ON family."code" = ranked."code"
 AND family."channel" = ranked."channel";

ALTER TABLE "communication_templates"
  ADD CONSTRAINT "communication_templates_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_templates"
  ADD CONSTRAINT "communication_templates_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_template_versions"
  ADD CONSTRAINT "communication_template_versions_publishedByUserId_fkey"
  FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "communication_templates_code_channel_key"
  ON "communication_templates"("code", "channel");

CREATE INDEX "communication_templates_code_channel_idx"
  ON "communication_templates"("code", "channel");

CREATE UNIQUE INDEX "communication_template_versions_templateId_versionNumber_key"
  ON "communication_template_versions"("templateId", "versionNumber");

CREATE INDEX "communication_template_versions_templateId_status_idx"
  ON "communication_template_versions"("templateId", "status");

CREATE INDEX "communication_template_versions_status_idx"
  ON "communication_template_versions"("status");

CREATE UNIQUE INDEX "communication_template_versions_one_published_per_template_idx"
  ON "communication_template_versions"("templateId")
  WHERE "status" = 'PUBLISHED';

DROP TABLE "communication_templates_legacy";
