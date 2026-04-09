---
name: rbac-review
description: Use this when a task affects permissions, roles, restricted UI, admin-only actions, protected routes, hidden buttons, or backend authorization in NP-Manager.
---

# RBAC Review

## Goal
Ensure that access control remains correct across backend and frontend.

## Instructions
1. Identify affected roles.
2. Check backend authorization rules first.
3. Check frontend route guards, visibility rules, and action buttons.
4. Verify that forbidden actions are blocked server-side, not only hidden client-side.
5. Identify regressions for:
   - ADMIN
   - BOK_CONSULTANT
   - read-only or other authenticated users if applicable

## Output
Provide:
- affected roles,
- expected allowed actions,
- expected forbidden actions,
- files likely involved,
- regression checklist.
