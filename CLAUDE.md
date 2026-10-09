# Claude Code Entrypoint - NP-Manager

Quick reference. Read full docs first:
- **`AGENTS.md`** — permanent rules, validation, conventions
- **`docs/PROJECT_CONTINUITY.md`** — current state, architecture decisions
- **`docs/PRODUCT_DISCOVERY.md`** - product documentation, open decisions and verification gates
- **`.claudeignore`** — filters out build artifacts, node_modules

## Stack
- **Backend**: Fastify 5.8 + Prisma 5 + PostgreSQL (port 3001)
- **Frontend**: React 18 + Vite 8 + Tailwind CSS + Zustand (port 5173)
- **Shared**: TypeScript types in `packages/shared`
- **Testing**: Vitest (unit/router/render). This checkout does not contain a configured Playwright browser suite.

## Key Commands
```bash
npm run dev              # backend + frontend
npm run build           # build all
npm run lint            # lint all
npm run test            # run all tests
npx tsc --noEmit -p apps/backend/tsconfig.json
npx tsc --noEmit -p apps/frontend/tsconfig.json
```

## Conventions
- **Routes/API**: via React Router + Fastify endpoints
- **State**: Zustand (frontend); no Redux wiring
- **Shared DTOs**: `@np-manager/shared` package
- **Tests**: Vitest source tests; backend includes `.test.ts` and `.spec.ts`. Filename `e2e` alone does not prove browser E2E.
- **Types**: no `any`, prefer strict TypeScript

## Browser / UI Testing
- Do not use Playwright MCP for routine UI checks.
- Browser QA requires an explicit setup and separate evidence. This checkout has no Playwright dependency, configuration or browser test suite; do not claim `npx playwright test` is a ready project check.
- When adding browser testing in a dedicated task, use official Playwright tooling and document the setup.
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
