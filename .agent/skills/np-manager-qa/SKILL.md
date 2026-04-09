---
name: np-manager-qa
description: Use this when preparing QA scenarios, manual testing instructions, browser-agent prompts, regression test plans, or acceptance criteria for NP-Manager.
---

# NP-Manager QA

## Goal
Prepare practical QA guidance for implementation verification.

## Instructions
- Prefer concrete end-to-end scenarios over vague suggestions.
- Include happy path, validation path, permission path, and refresh/reload path.
- When UI clicking is needed, prepare a structured prompt for a browser agent or tester.
- Use business language consistent with NP-Manager.
- Keep the plan concise by default unless the user asks for a full QA document.

## Output structure
1. Test scope
2. Preconditions
3. Step-by-step scenarios
4. Expected result
5. Regression risks
6. What is not covered

## Anti-patterns to avoid
- Overlong QA plans when a short actionable set is enough
- Missing RBAC or refresh checks
- Generic advice without exact user steps