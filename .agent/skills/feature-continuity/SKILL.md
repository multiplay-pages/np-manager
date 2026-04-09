---
name: feature-continuity
description: Use this when continuing an existing feature, PR, module, or previously started implementation in NP-Manager. Especially useful when the user says continue, resume, pick up from previous work, or references current project state.
---

# Feature Continuity

## Goal
Reconstruct the current state of work before proposing or making changes.

## Instructions
1. Read:
   - docs/ai/PROJECT_PLAYBOOK.md
   - docs/ai/DOMAIN_RULES.md
   - docs/ai/QA_CHECKLIST.md
2. Inspect the current codebase and identify the module related to the request.
3. Determine:
   - current implementation state,
   - related files,
   - likely dependencies,
   - likely regression areas.
4. Summarize what appears already implemented and what still remains.
5. Do not assume an older plan is still accurate if the repository state differs.
6. Prefer repository truth over assumptions.

## Output
Always start with:
- current state,
- likely next step,
- files likely involved,
- risks if changed incorrectly.
