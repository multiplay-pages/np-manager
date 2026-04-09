---
trigger: always_on
---

You are working on NP-Manager, a telecom-grade internal application for managing fixed-line number portability.

Before making changes:
1. Read docs/ai/PROJECT_PLAYBOOK.md
2. Read docs/ai/DOMAIN_RULES.md
3. Read docs/ai/QA_CHECKLIST.md
4. Inspect existing code patterns before proposing new ones.

Hard rules:
- Do not introduce hard-delete behavior for operational entities unless explicitly requested.
- Preserve RBAC and auditability.
- Prefer additive, migration-safe database changes.
- Keep backend as source of truth for workflow/status logic.
- Do not invent telecom rules; if unclear, surface the assumption explicitly.
- For frontend changes, preserve existing business wording in Polish unless the task explicitly changes copy.
- After each meaningful change, propose concrete verification steps.
- For code edits, prefer minimal diff over broad rewrites unless a rewrite is explicitly justified.
- For recurring modules, follow existing project conventions before introducing new abstractions.

When working on a task:
- Start with a short implementation plan.
- Identify likely regression areas.
- After coding, run or propose targeted tests.
- Summarize changed files, business impact, and remaining risks.