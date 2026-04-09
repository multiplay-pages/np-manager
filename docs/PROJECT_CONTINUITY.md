# NP-Manager — Project Continuity Guide

Dokument przeznaczony dla agentów AI i deweloperów przejmujących pracę nad projektem.
Opisuje stan implementacji, architekturę decyzji i zasady kontynuowania pracy.

---

## Aktualny stan projektu (2026-04-09)

### Zrealizowane PR-y

| PR      | Opis                                                              | Status |
|---------|-------------------------------------------------------------------|--------|
| PR11A   | Backend foundation — użytkownicy admin, role, JWT auth            | ✅     |
| PR11B   | Frontend — panel admina użytkowników                              | ✅     |
| PR12D   | Ownership filter (MINE/UNASSIGNED) przeniesiony na backend        | ✅     |
| PR13A   | Opiekun handlowy (SALES) + fundament powiadomień wewnętrznych     | ✅     |

---

## Architektura decyzji

### Model ownership spraw portowania

Sprawa portowania ma **dwa niezależne pola powiązania z użytkownikami**:

- **`assignedUserId`** — operacyjny właściciel ze strony BOK (kto obsługuje sprawę),  
  role: BOK_CONSULTANT, BACK_OFFICE, MANAGER, ADMIN
- **`commercialOwnerUserId`** — opiekun handlowy odpowiedzialny za relację z klientem,  
  wyłącznie rola SALES

Oba pola są opcjonalne i niezależne — zmiana jednego nie wpływa na drugie.

### Notyfikacje wewnętrzne (fundament PR13A)

System notyfikacji używa dwóch ścieżek:

1. **`Notification` (DB record)** — gdy istnieje aktywny `commercialOwner` → zapis na konkretnego `userId`
2. **`PortingRequestEvent` NOTE** — fallback gdy brak opiekuna lub jest nieaktywny → zapis do dziennika sprawy  
   *(Notification wymaga non-null `userId`, więc nie można go użyć dla odbiorców "zespołowych")*

Dispatch jest **non-blocking** (fire-and-forget z `.catch(() => {})`), więc awaria powiadomienia nie blokuje odpowiedzi API.

### System settings kluczowe dla powiadomień

| Klucz                                 | Opis                                         |
|---------------------------------------|----------------------------------------------|
| `porting_notify_shared_emails`        | Lista e-maili zespołu (CSV), fallback recipient |
| `porting_notify_teams_enabled`        | Flaga włączenia MS Teams webhook              |
| `porting_notify_teams_webhook`        | URL webhooka MS Teams                        |

Klucze są zdefiniowane w `packages/shared/src/constants/index.ts` → `SYSTEM_SETTING_KEYS`.

---

## Konwencje kodowania

### Backend

- **Prisma `$transaction`**: w kodzie używamy `prisma.$transaction([promise1, promise2])` (tablica Promise, NIE funkcja). Mocki w testach:  
  ```typescript
  mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg)
    // ...
  })
  ```
- **AppError**: zawsze `AppError.notFound()` / `AppError.badRequest(msg, code)` — nigdy `throw new Error()`
- **AuditLog**: każda mutacja musi logować przez `logAuditEvent()` z `apps/backend/src/shared/audit/audit.service.ts`
- **Zod schemas**: każdy endpoint ma schemat w `*.schema.ts` z walidacją przez Fastify `preHandler`

### Frontend

- **URL-driven state**: filtry listy spraw są w URL params, nie w lokalnym state
- **Ownership filter security**: backend używa `request.user.id` z JWT dla filtru `MINE` — frontend nigdy nie wysyła userId
- **API functions**: w `apps/frontend/src/services/portingRequests.api.ts`, zawsze async, zwracają już rozwinięte DTO (nie wrapper `{ success, data }`)

---

## Struktura kluczowych plików

```
apps/backend/src/modules/porting-requests/
  porting-requests.service.ts          # Główny serwis — logika biznesowa
  porting-requests.router.ts           # Fastify routes + autoryzacja
  porting-requests.schema.ts           # Zod schemas dla request body/query
  porting-notification-events.ts       # Enum zdarzeń powiadomień
  porting-notification-recipient-resolver.ts  # Resolver odbiorców
  porting-notification.service.ts      # Dispatch powiadomień

apps/backend/prisma/
  schema.prisma                        # Główny schemat Prisma
  migrations/                          # Historia migracji SQL

packages/shared/src/
  dto/porting-requests.dto.ts          # Kontrakty DTO (frontend ↔ backend)
  constants/index.ts                   # USER_ROLES, SYSTEM_SETTING_KEYS, etc.

apps/frontend/src/
  services/portingRequests.api.ts      # Funkcje API klienta
  pages/Requests/RequestDetailPage.tsx # Strona szczegółów sprawy (duża, ~1750 linii)
```

---

## Zasady kontynuowania pracy

1. **Zawsze uruchamiaj testy** przed commitem: `npx vitest run` w obu apps
2. **Po zmianie Prisma schema** uruchom `npx prisma generate --no-engine` (lub poczekaj na zwolnienie DLL przez inne procesy i uruchom bez flagi)
3. **TypeScript check**: `npx tsc --noEmit` — oba projekty muszą przechodzić bez błędów
4. **Shared package**: zmiany w `packages/shared` wymagają aktualizacji DTOs **i** stałych — oba są eksportowane przez `@np-manager/shared`
5. **Branch naming**: `prXXy/short-description` (np. `pr13b/notification-dispatch`)
6. **Commit prefix**: `feat(prXXy): opis`

---

## Planowane kolejne kroki

- **PR13B**: Faktyczny dispatch e-mail/Teams — implementacja serwisu wysyłki opartego o ustawienia systemowe
- **PR14**: Historia powiadomień w UI + panel ustawień systemowych dla admina
- **PR15**: Rozszerzenie opiekuna handlowego — raportowanie, widok "moje sprawy" dla SALES
