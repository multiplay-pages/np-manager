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

## Mandatory checklist
1. What models are changing?
2. Is this additive or destructive?
3. What migration risk exists?
4. What seed updates are required?
5. What API/DTO changes are required?
6. What frontend changes are required?
7. What tests must be updated?

## Output format
- Proposed schema change
- Risk assessment
- Files to change
- Test plan
- Rollback concerns
