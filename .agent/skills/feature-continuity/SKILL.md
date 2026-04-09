---
name: feature-continuity
description: Use this when continuing an existing feature, PR, module, or previously started implementation in NP-Manager. Especially useful when the user says continue, resume, pick up from previous work, or references current project state.
---

# Feature Continuity

## Goal
Reconstruct the current state of work from the repository before proposing or making changes.

## Primary rule
Repository state is the primary source of truth.
Git history, reflog, commit messages, branch names, and TODO comments are only secondary hints and must never override the current codebase state.

## Instructions
1. Read:
   - docs/ai/PROJECT_PLAYBOOK.md
   - docs/ai/DOMAIN_RULES.md
   - docs/ai/QA_CHECKLIST.md
2. Inspect the current codebase and identify the module related to the request.
3. Determine from the actual repository state:
   - what is already implemented,
   - what appears incomplete,
   - which files are involved,
   - which dependencies and regressions are likely.
4. Use commit history or TODO comments only if the repository state alone does not explain recent work.
5. Prefer a useful best-effort conclusion over asking immediate follow-up questions.
6. If uncertainty remains, state it explicitly, but still provide the most likely current state and recommended next step.
7. End with a concrete recommended next step, not with waiting for confirmation, unless the user explicitly asked for options only.

## Output
Always start with:
- current state,
- what seems implemented,
- what likely remains,
- files likely involved,
- risks if changed incorrectly,
- recommended next step.

## Anti-patterns to avoid
- Over-relying on reflog or commit titles
- Treating a TODO comment as proof of business priority
- Asking the user what to do next before giving a concrete recommendation
- Presenting speculative history as confirmed current state
- Ending with “waiting for instructions” when a sensible next step can already be proposed
- Letting the previous conversation topic define the continuity assessment when the repository state points elsewhere
- Treating prior chat context as stronger evidence than the current project state