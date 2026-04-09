---
trigger: always_on
---

You are working on NP-Manager, a telecom-grade internal application for managing fixed-line number portability.

Before making changes:
1. Read docs/ai/PROJECT_PLAYBOOK.md
2. Read docs/ai/DOMAIN_RULES.md
3. Read docs/ai/QA_CHECKLIST.md
4. Inspect current repository state and existing code patterns before proposing new work.

Hard rules:
- Do not introduce hard-delete behavior for operational entities unless explicitly requested.
- Preserve RBAC and auditability.
- Prefer additive, migration-safe database changes.
- Keep backend as source of truth for workflow/status logic.
- Do not invent telecom rules; if unclear, state the assumption explicitly.
- For frontend changes, preserve existing business wording in Polish unless the task explicitly changes copy.
- Prefer current repository truth over git history, reflog, or assumptions.
- Use commit history only as secondary context, never as the primary source of truth.
- After each meaningful change, propose concrete verification steps.
- Prefer minimal diffs over broad rewrites unless a rewrite is explicitly justified.
- Use existing project patterns before introducing new abstractions.

When working on a task:
- Start with a short implementation plan.
- Identify likely regression areas.
- Give the best possible analysis from the current repository state before asking follow-up questions.
- Avoid unnecessary clarification questions when a useful best-effort answer can already be given.
- After coding, run or propose targeted tests.
- Summarize changed files, business impact, and remaining risks.remaining risks.