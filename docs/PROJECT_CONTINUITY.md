# NP-Manager - Project Continuity Guide

Dokument dla kolejnych sesji AI/deweloperskich. Opisuje stan, decyzje architektoniczne i zasady kontynuacji.

---

## Aktualny stan projektu (2026-04-09)

### Zrealizowane PR-y

| PR    | Opis                                                                 | Status |
|-------|----------------------------------------------------------------------|--------|
| PR11A | Backend foundation - uzytkownicy admin, role, JWT auth              | DONE   |
| PR11B | Frontend - panel admina uzytkownikow                                | DONE   |
| PR12C | Assignment-users endpoint + reassignment z detail flow              | DONE   |
| PR12D | Ownership filter (MINE/UNASSIGNED) przeniesiony na backend          | DONE   |
| PR13A | Commercial owner (SALES) + foundation internal event notifications  | DONE   |
| PR13B | Realny transport wewnetrznych powiadomien email/Teams               | DONE   |
| PR14  | Historia wewnetrznych notyfikacji w UI + panel admin settings       | DONE   |

---

## Kluczowe decyzje domenowe

### Ownership spraw portowania

- Biznesowo sprawa nalezy operacyjnie do **zespolu BOK**.
- `assignedUserId` pozostaje tymczasowo jako mechanizm techniczny/historyczny i jest utrzymany addytywnie.
- Glowny nowy model biznesowy PR13A: opcjonalny `commercialOwnerUserId` (`User.role = SALES`) na `PortingRequest`.
- `commercialOwnerUserId` nie usuwa ani nie nadpisuje istniejacego assignmentu BOK, ale jest osia routingu notyfikacji wewnetrznych.

Future note:
- W kolejnych etapach mozna rozwazyc domyslnego commercial ownera na poziomie `Client`, ale PR13A celowo wdraza foundation na poziomie `PortingRequest`.

### Notyfikacje wewnetrzne (PR13A foundation + PR13B transport)

Architektura rozdziela cztery warstwy:

1. **Event domenowy** (`PortingNotificationEvent`)
2. **Resolver odbiorcow** (owner -> USER, fallback -> TEAM_EMAIL / TEAM_WEBHOOK)
3. **Trace domenowy**
   - `Notification` dla odbiorcy typu USER,
   - `PortingRequestEvent` typu NOTE (routing intent) dla fallbacku zespolowego.
4. **Transport realny (PR13B)**
   - Email via nodemailer (`sendInternalEmail`) — tryb STUB/REAL/DISABLED
   - Teams webhook via native fetch (`sendInternalTeamsWebhook`)
   - Po kazdym dispatchie: `PortingRequestEvent NOTE [Dispatch]` z wynikiem (kanal, odbiorca, outcome, tryb, ewentualny blad)

Dispatch jest non-blocking (`.catch(() => {})`) i nie blokuje glownego flow API.

### PR14 - warstwa operacyjna (UI + read model + admin settings)

- Backend:
  - endpoint `GET /api/porting-requests/:id/internal-notifications` zwraca uporzadkowana historie:
    - `USER_NOTIFICATION` z `Notification`,
    - `TEAM_ROUTING` z `PortingRequestEvent NOTE` (routing intent),
    - `TRANSPORT_AUDIT` z `[Dispatch] ...` NOTE.
  - endpointy admin:
    - `GET /api/admin/porting-notification-settings`
    - `PUT /api/admin/porting-notification-settings`
  - zapis preferuje klucze `porting_status_*`, odczyt wspiera fallback `porting_notify_*`.
- Frontend:
  - `RequestDetailPage` ma sekcje `Historia powiadomien wewnetrznych` (event, kanal, odbiorca, wynik, tryb, blad).
  - Admin ma strone `Ustawienia powiadomien portingowych` do konfiguracji fallback email/Teams.
  - Read-only diagnostyka env: `email adapter mode`, `SMTP configured`.
- Zakres pozostaje wewnetrzny (operacyjny) - bez zmian w customer communication pipeline.

#### Konfiguracja transportu email

```env
INTERNAL_NOTIFICATION_EMAIL_ADAPTER=STUB  # STUB (domyslnie) | REAL | DISABLED
SMTP_HOST=smtp.example.com                # wymagane dla REAL
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=secret
SMTP_FROM=noreply@np-manager.local
```

Teams: webhook URL pochodzi z `SystemSetting.porting_status_notify_shared_teams_webhook`; wlaczenie przez `porting_status_teams_enabled=true`.

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
  porting-notification.service.ts          # dispatcher (PR13A+PR13B)
  internal-notification.adapter.ts         # email + Teams transport (PR13B)
  internal-notification-formatter.ts       # formatter tresci wiadomosci (PR13B)

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

## Kolejne kroki

- PR15: raportowanie i widoki operacyjne dla modelu commercial owner
- Future: podlaczenie pozostalych eventow z katalogu (E03, E06, E12, E13, NUMBER_PORTED, CASE_REJECTED)

---

## Discipline note

Gdy roadmapa lub interpretacja biznesowa sie zmienia, aktualizuj ten plik w tym samym change secie, aby kolejne sesje opieraly sie na pamieci repo, a nie tylko historii czatu.
