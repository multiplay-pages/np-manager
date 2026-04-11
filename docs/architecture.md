# Architektura NP-Manager

Dokument opisujacy decyzje architektoniczne i strukture systemu.

## Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| Backend | Node.js 20 + Fastify 4 + TypeScript | Wydajny runtime, dobra typizacja i modularny routing |
| ORM | Prisma 5 | Type-safe queries, migracje i spojny model danych |
| Baza danych | PostgreSQL 16 | ACID, dobre wsparcie dla danych procesowych i auditowych |
| Frontend | React 18 + Vite 5 + TypeScript | Szybki build, HMR i dojrzaly ekosystem |
| Styling | Tailwind CSS 3 | Utility-first i szybka iteracja UI |
| State | Zustand | Lekki store dla stanu aplikacji |
| Walidacja | Zod | Jeden kontrakt walidacyjny frontend + backend |
| Auth | JWT (@fastify/jwt) | Bezstanowy model autoryzacji |

## Semantyka fallbacku notyfikacji wewnetrznych (EPIC-18)

W systemie funkcjonuja dwa rozne fallbacki i nie nalezy ich mieszac:

1. `ROUTING_TEAM` (owner fallback)
- Uruchamiany, gdy sprawa nie ma aktywnego opiekuna handlowego.
- Resolver odbiorcow przechodzi na odbiorcow zespolowych (`TEAM_EMAIL` / `TEAM_WEBHOOK`).
- Konfiguracja: `porting_status_*` (+ legacy `porting_notify_*`).

2. `ERROR_FALLBACK` (delivery/config fallback)
- Uruchamiany po primary dispatch, gdy wystapi `FAILED` lub `MISCONFIGURED`.
- Konfiguracja kanoniczna: `notification_fallback_*`.
- V1 transport: fallback email na `notification_fallback_recipient_email`.
- Jedna akcja fallback na jeden dispatch (bez petli fallback->fallback).

Audit i diagnostyka:
- `[Dispatch] ...` - primary transport audit (podstawa health/failure history),
- `[ErrorFallback] ...` - decyzja i wynik error fallback (`TRIGGERED` lub `SKIPPED` z reason).

## Notification Operations foundation (EPIC-19 / PR19A-1 + PR19A-2)

Dodano addytywny, first-class model runtime:

- tabela `internal_notification_delivery_attempts`,
- rekord tworzony dla kazdego primary transport outcome (`attemptOrigin=PRIMARY`),
- rekord tworzony dla fallback transport outcome, gdy fallback byl realnie uruchomiony (`attemptOrigin=ERROR_FALLBACK`),
- pola przygotowujace pod retry chain: `retryOfAttemptId`, `retryCount`, `isLatestForChain`, `triggeredByUserId`.

Semantyka PR19A-1:

- model zapisuje wykonane proby transportu (runtime execution attempts),
- decyzje policy bez wykonania transportu (np. `SKIPPED/POLICY_DISABLED`) pozostaja w audit NOTE `[ErrorFallback]` i nie sa jeszcze persisted jako attempt.

Istotne zasady:

- model attempts nie zmienia semantyki `ROUTING_TEAM` vs `ERROR_FALLBACK`,
- NOTE audit pozostaje aktywny i jest utrzymany rownolegle jako warstwa kompatybilnosci,
- brak retry endpointow i queue UI w PR19A-1 (to zakres kolejnych krokow EPIC-19).

Read layer PR19A-2:

- request-level endpoint: `GET /api/porting-requests/:id/internal-notification-attempts`,
- shared DTO w `porting-internal-notifications.dto.ts`,
- UI detail pokazuje osobny panel `Proby dostarczenia notyfikacji`.

Semantyka read modelu:

- `Historia powiadomien wewnetrznych` nadal pokazuje szersza historie eventow, routingu i audit NOTE,
- `Proby dostarczenia notyfikacji` pokazuje first-class ledger wykonanych prob transportu,
- PR19A-2 nie usuwa NOTE parsing i nie backfilluje historycznych NOTE,
- retry endpoint, retry button i global queue pozostaja zakresem PR19B.
