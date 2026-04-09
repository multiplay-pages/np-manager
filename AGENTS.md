# AGENTS.md

## Primary rule
Repository state is the source of truth.

## Read first
Before making changes, agents should read:
1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/PROJECT_CONTINUITY.md`

## Working rules for all coding agents
- Prefer small, reviewable PRs.
- Prefer additive changes over destructive rewrites.
- Do not continue a previously suggested direction if the current repository state or business decision changed.
- When the agreed product direction changes, update `docs/PROJECT_CONTINUITY.md` in the same change set.
- Do not treat chat history alone as project memory. Persist important architectural and product decisions in repo files.

## Current business direction for NP-Manager
- Do **not** treat personal BOK ownership as the target business model for porting cases.
- A porting case is operationally handled by BOK as a team.
- Optional personal responsibility should refer to a **commercial / sales owner** responsible for client relationship, not a single BOK operator.
- Status-change notifications should be routed to:
  - the commercial owner when assigned,
  - otherwise shared team recipients such as mailbox aliases and/or Teams channels.

## Implications for future work
- Avoid expanding personal BOK assignment UX as a strategic direction.
- Existing `assignedUserId` / assignment history may remain for compatibility, but new business features should favor `commercialOwner` semantics.
- Notification work should be designed as internal operational notifications, separate from customer-facing communication history.

## Documentation discipline
When implementing a new step or changing direction:
- update `docs/PROJECT_CONTINUITY.md`,
- reflect the new target architecture, current state, and next recommended step,
- keep the continuity file concise and practical.
