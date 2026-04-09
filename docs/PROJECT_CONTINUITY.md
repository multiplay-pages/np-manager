# NP-Manager - Project Continuity Guide

Dokument dla kolejnych sesji AI/deweloperskich. Opisuje stan, decyzje architektoniczne i zasady kontynuacji.

---

## Aktualny stan projektu (2026-04-09)

### Zrealizowane PR-y

| PR    | Opis                                                                 | Status |
|-------|----------------------------------------------------------------------|--------|
| PR11A | Backend foundation - uzytkownicy admin, role, JWT auth              | DONE   |
| PR11B | Frontend - panel admina uzytkownikow                                | DONE   |
| PR12D | Ownership filter (MINE/UNASSIGNED) przeniesiony na backend          | DONE   |
| PR13A | Commercial owner (SALES) + foundation internal event notifications  | DONE   |

---

## Kluczowe decyzje domenowe

### Ownership spraw portowania

- Biznesowo sprawa nalezy operacyjnie do **zespolu BOK**.
- `assignedUserId` pozostaje tymczasowo jako mechanizm techniczny/historyczny i jest utrzymany addytywnie.
- Glowny nowy model biznesowy PR13A: opcjonalny `commercialOwnerUserId` (`User.role = SALES`) na `PortingRequest`.
- `commercialOwnerUserId` nie usuwa ani nie nadpisuje istniejacego assignmentu BOK, ale jest osia routingu notyfikacji wewnetrznych.

Future note:
- W kolejnych etapach mozna rozwazyc domyslnego commercial ownera na poziomie `Client`, ale PR13A celowo wdraza foundation na poziomie `PortingRequest`.

### Notyfikacje wewnetrzne (event-driven foundation)

Architektura rozdziela trzy warstwy:

1. **Event domenowy** (`PortingNotificationEvent`)
2. **Resolver odbiorcow** (owner -> USER, fallback -> TEAM_EMAIL / TEAM_WEBHOOK)
3. **Trace**
   - `Notification` dla odbiorcy typu USER,
   - `PortingRequestEvent` typu NOTE dla fallbacku zespolowego bez konkretnego `userId`.

Dispatch jest non-blocking (`.catch(() => {})`) i nie blokuje glownego flow API.

### Katalog eventow foundation

- `REQUEST_CREATED`
- `STATUS_CHANGED` (realnie podlaczony)
- `E03_SENT`
- `E06_RECEIVED`
- `PORT_DATE_CONFIRMED`
- `E12_SENT`
- `E13_RECEIVED`
- `NUMBER_PORTED`
- `CASE_REJECTED`
- `COMMERCIAL_OWNER_CHANGED`

W PR13A aktywnie podlaczony jest bezpieczny hook `STATUS_CHANGED` (+ zmiana ownera). Pozostale eventy sa gotowe jako punkt rozszerzenia.

### Rozdzial odpowiedzialnosci komunikacyjnych

- **Internal notifications**: routing do opiekuna handlowego albo fallbacku zespolowego.
- **Komunikacja do klienta koncowego**: osobny strumien funkcjonalny (nie czesc PR13A).

---

## System settings dla notyfikacji

Preferowane klucze:
- `porting_status_notify_shared_emails`
- `porting_status_teams_enabled`
- `porting_status_notify_shared_teams_webhook`

Kompatybilnosc wsteczna (legacy aliases):
- `porting_notify_shared_emails`
- `porting_notify_teams_enabled`
- `porting_notify_teams_webhook`

Resolver najpierw probuje kluczy preferowanych, potem legacy.

---

## Kluczowe pliki

```text
apps/backend/src/modules/porting-requests/
  porting-requests.service.ts
  porting-requests.router.ts
  porting-requests.schema.ts
  porting-notification-events.ts
  porting-notification-recipient-resolver.ts
  porting-notification.service.ts

apps/backend/prisma/
  schema.prisma
  seed.ts
  migrations/

packages/shared/src/
  constants/index.ts
  dto/porting-requests.dto.ts

apps/frontend/src/
  pages/Requests/RequestDetailPage.tsx
  services/portingRequests.api.ts
```

---

## Zasady kontynuacji pracy

1. Zawsze uruchamiaj testy: `npx vitest run` w `apps/backend` i `apps/frontend`
2. Po zmianie Prisma schema: `npx prisma generate --no-engine` (lub pelne `npx prisma generate`)
3. Typy: `npx tsc --noEmit` w obu apps
4. Zmiany w `packages/shared` wymagaja spojnosci kontraktow backend/frontend
5. Branch naming: `prXXy/short-description`
6. Commit prefix: `feat(prXXy): opis`

---

## Kolejne kroki (poza PR13A)

- PR13B: realny transport adapter dla fallbacku (email/Teams)
- PR14: historia notyfikacji wewnetrznych i ustawienia systemowe w UI admina
- PR15: raportowanie i widoki operacyjne dla modelu commercial owner
