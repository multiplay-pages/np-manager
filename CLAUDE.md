# Claude Code Entrypoint - NP-Manager

Quick reference. Read full docs first:
- **`AGENTS.md`** — permanent rules, validation, conventions
- **`docs/PROJECT_CONTINUITY.md`** — current state, architecture decisions
- **`.claudeignore`** — filters out build artifacts, node_modules

## Stack
- **Backend**: Fastify 5.8 + Prisma 5 + PostgreSQL (port 3001)
- **Frontend**: React 18 + Vite + Tailwind CSS + Redux Toolkit (port 5173)
- **Shared**: TypeScript types in `packages/shared`
- **Testing**: Playwright 1.59 (e2e), Vitest (unit)

## Key Commands
```bash
npm run dev              # backend + frontend
npm run build           # build all
npm run lint            # lint all
npm run test            # run all tests
npm run type-check      # TS check all
```

## Conventions
- **Routes/API**: via React Router + Fastify endpoints
- **State**: Zustand + Redux Toolkit (frontend)
- **Shared DTOs**: `@np-manager/shared` package
- **Tests**: `.spec.ts` (Playwright), `.test.ts` (Vitest)
- **Types**: no `any`, prefer strict TypeScript

## Browser / UI Testing
- Do not use Playwright MCP for routine UI checks.
- Use official Playwright CLI from `apps/frontend`:
  - `npx playwright test`
  - `npx playwright codegen http://localhost:5173`
  - `npx playwright --help`
- Do not use non-standard commands: `playwright-cli fill`, `click`, `snapshot`, `install --skills`.
- UI tests must target local NP-Manager, not external websites.

## Token Discipline
- **Search before Read**: use `rg` first; on Windows fallback to PowerShell `Get-ChildItem -Recurse -File | Select-String`.
- Do not read whole large files unless necessary.
- Prefer focused file/line inspection over broad repo exploration.
- Start reviews with `git status --short` and `git diff --stat`.
- Use full `git diff` only for relevant files.
- Keep responses short: status → files changed → tests → risks.
- For larger tasks, maintain `scratchpad/active-task.md` as handoff/tracking.
- Do not edit this `CLAUDE.md` for one-off task instructions.

## Important
- Repo state is source of truth — don't duplicate docs here
- Update `AGENTS.md` for permanent rules, `docs/PROJECT_CONTINUITY.md` for current state
