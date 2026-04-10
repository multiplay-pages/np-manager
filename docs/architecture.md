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
