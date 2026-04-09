---
name: prisma-safe-migration
description: Use this when modifying Prisma schema, database models, enums, relations, migrations, seeds, or any backend feature that changes persistence in NP-Manager.
---

# Prisma Safe Migration

## Goal
Implement database changes in a way that is safe, auditable, and consistent with NP-Manager rules.

## Required behavior
- Prefer additive schema changes.
- Avoid destructive drop and recreate unless explicitly approved.
- Review current schema and existing migrations before proposing changes.
- Call out data migration risks explicitly.
- Check impact on:
  - DTOs
  - backend services
  - frontend forms
  - seed data
  - tests

## Best-effort rule
Even if the exact field is not yet specified, provide a useful migration analysis framework first.
Do not immediately ask clarifying questions if a generic but concrete impact analysis can already be given.

## Mandatory checklist
1. What models are changing?
2. Is this additive or destructive?
3. What migration risk exists?
4. What seed updates are required?
5. What API/DTO changes are required?
6. What frontend changes are required?
7. What tests must be updated?

## Output format
Always provide:
- likely schema impact,
- likely DTO/API impact,
- likely seed impact,
- likely frontend impact,
- migration risk categories,
- recommended implementation order.

If key details are missing, add a short section:
## Missing specifics
and list only the missing items after giving the best-effort analysis.

## Anti-patterns to avoid
- Turning the response into a questionnaire before giving analysis
- Refusing to assess risks without exact field names
- Proposing unnecessary documents when a direct plan is enough
