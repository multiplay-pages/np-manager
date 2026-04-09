# Project Continuity

## Current state summary
Recent completed work in repository history includes:
- PR12C: assignment-users endpoint and enabling BOK reassignment from detail flow.
- PR12D: ownership filter moved to backend so `MINE` / `UNASSIGNED` have correct pagination and totals.

These changes are technically valid, but the preferred **business direction** has changed.

## Updated business decision
The project should no longer optimize toward "one BOK employee owns a porting case" as the main concept.

Target model:
- BOK handles porting cases as a team.
- A case may optionally have a **commercial owner** responsible for client-facing sales/contact context.
- Internal progress notifications should go to:
  1. the commercial owner, when present,
  2. otherwise shared team recipients (mailboxes and/or Teams destinations).

## What this means for existing assignment work
- Existing `assignedUserId`-based mechanics may remain in code for compatibility.
- Do not expand personal BOK assignment as the strategic product direction.
- Prefer future features centered on:
  - `commercialOwnerUserId` (or equivalent),
  - internal notification routing,
  - fallback recipients for cases without commercial owner.

## Recommended next step
Preferred next foundation step:

### PR13A — commercial owner + internal notification routing foundation
Scope should likely include:
- additive data model support for optional commercial owner on porting request,
- role/support model for sales/commercial users,
- internal notification recipient resolution,
- fallback to shared mailbox / Teams channel configuration,
- preserving current customer-facing communication flow as a separate concern.

## Architectural guidance for PR13A
- Keep changes additive.
- Do not remove current assignment fields destructively yet.
- Reuse `Notification` for internal notification records where practical.
- Reuse `SystemSetting` for fallback mailbox / Teams routing configuration where practical.
- Keep internal operational notifications separate from customer communication history.

## Discipline for future changes
Whenever the roadmap or business interpretation changes, update this file in the same change set so Codex, Claude Code, Antigravity, and future sessions can rely on repository memory instead of chat-only context.
