---
trigger: always_on
---

When a task is about UI behavior, validation, user flow, browser interactions, localhost testing, or visible regressions in NP-Manager, prefer browser-based QA reasoning over code-only assumptions.

Rules:
- Treat localhost UI behavior as primary evidence for user-facing issues.
- Use current repository state as source of truth for expected behavior.
- Distinguish clearly between:
  1. what is confirmed in the browser,
  2. what is inferred from code,
  3. what still needs backend verification.
- For RBAC-related UI issues, do not assume that hidden UI alone proves correctness; mention server-side enforcement if relevant.
- End with practical QA steps or one recommended next verification step.
- Be concise and operational.