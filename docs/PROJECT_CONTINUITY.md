# NP-Manager - Project Continuity Guide

Dokument dla kolejnych sesji AI/deweloperskich. Opisuje stan, decyzje architektoniczne i zasady kontynuacji.

---

## Aktualny stan projektu (2026-04-10)

### Zrealizowane PR-y

| PR      | Opis                                                                 | Status |
|---------|----------------------------------------------------------------------|--------|
| PR11A | Backend foundation - uzytkownicy admin, role, JWT auth              | DONE   |
| PR11B | Frontend - panel admina uzytkownikow                                | DONE   |
| PR12C | Assignment-users endpoint + reassignment z detail flow              | DONE   |
| PR12D | Ownership filter (MINE/UNASSIGNED) przeniesiony na backend          | DONE   |
| PR13A | Commercial owner (SALES) + foundation internal event notifications  | DONE   |
| PR13B | Realny transport wewnetrznych powiadomien email/Teams               | DONE   |
| PR14  | Historia wewnetrznych notyfikacji w UI + panel admin settings       | DONE   |
| PR15  | Raportowanie i widoki operacyjne commercial owner                    | DONE   |
| PR16  | Diagnostyka zdrowia notyfikacji (health helper + 4-state badge)     | DONE   |
| PR17  | Operacyjna historia problemow notyfikacji w szczegolach sprawy      | DONE   |
| EPIC-18 | Fallback Runtime Completion — podlaczenie fallback execution do dispatch pipeline | DONE |

---

### EPIC-18 — Fallback Runtime Completion

- **Cel**: domkniecie luki miedzy admin fallback settings a realnym dispatch pipeline notyfikacji wewnetrznych.
- **Zmiana**: `porting-notification.service.ts` po zebraniu wynikow transportu sprawdza, czy ktorykolwiek outcome to FAILED lub MISCONFIGURED. Jesli tak, i fallback settings maja readiness READY z odpowiednimi flagami `applyToFailed` / `applyToMisconfigured`, wysyla email na `fallbackRecipientEmail` z tagiem `[FALLBACK]` w temacie i tresci.
- **Kanoniczny path**: jedyne zrodlo prawdy dla fallback settings to `getNotificationFallbackSettings()` z `admin-notification-fallback-settings.service.ts`. Brak konkurujacych mechanizmow.
- **Decyzje projektowe**:
  - Fallback wysyla tylko email (nie Teams) — DTO admina ma jeden email, nie webhook.
  - Jeden fallback email per dispatch, niezaleznie ile transportow zawiodlo.
  - Brak fallback-of-fallback (brak rekurencji).
  - Lazy: `getNotificationFallbackSettings()` wywolywane TYLKO gdy jest failure outcome (zero dodatkowych queries na happy path).
  - Recipient tagowany `[FALLBACK]` — istniejace parsery health i failure history obsluguja to bez zmian.
- **Pliki zmienione**:
  - `apps/backend/src/modules/porting-requests/porting-notification.service.ts` (~50 LOC nowego kodu)
  - `apps/backend/src/modules/porting-requests/__tests__/porting-notification.service.test.ts` (+11 nowych testow)
- **Weryfikacja**: backend 306 testow PASS, tsc --noEmit PASS, frontend 104 testy PASS.
- **Zero nowych endpointow, zero migracji, zero nowych modeli.**

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

### PR16 - diagnostyka zdrowia notyfikacji

- Nowy helper `porting-notification-health.helper.ts` — jedyne miejsce obliczania `NotificationHealthStatus` (`OK | FAILED | MISCONFIGURED | MIXED`).
- `NotificationHealthDiagnosticsDto` w `packages/shared` — failureCount, failedCount, misconfiguredCount, lastFailureAt, lastFailureOutcome.
- `PortingRequestDetailDto.notificationHealth` — pelna diagnostyka w widoku szczegolu.
- `PortingRequestListItemDto` — 4 pola health w pozycji listy.
- Frontend `NotificationHealthBadge` (4 stany) w tabeli listy; `NotificationHealthPanel` w detail.
- Weryfikacja: 334 testow backend + 99 testow frontend, oba projekty bez bledow TypeScript, build OK.
- Wykryty problem runtime: backend serwuje skompilowany `dist/` — po PR15/PR16 endpoint `GET /api/porting-requests/summary` zwracal 404 (stary dist lapany przez handler `/:id`). Naprawione przez `npm run build` + restart backend.
- Seed: 7 rekordow, wszystkie z health `OK`, failureCount = 0.

### PR17 - operacyjny drill-down historii problemow notyfikacji

- Backend:
  - nowy endpoint `GET /api/porting-requests/:id/notification-failures`,
  - nowy lekki read model `NotificationFailureHistoryItemDto` (bez surowego payloadu eventu),
  - mapowanie oparte o `PortingRequestEvent NOTE [Dispatch]` z outcome `FAILED | MISCONFIGURED`,
  - domyslny limit: 20 pozycji (najnowsze -> najstarsze),
  - klasyfikacja:
    - `MISCONFIGURED` -> blad konfiguracji (`isConfigurationIssue=true`),
    - `FAILED` -> blad wysylki (`isDeliveryIssue=true`),
  - defensywny parser linii dispatch i bezpieczne `technicalDetailsPreview`.
- Frontend:
  - `RequestDetailPage` rozszerzony o sekcje `Ostatnie problemy notyfikacji`,
  - sekcja jest logicznym uzupelnieniem panelu health z PR16 i renderuje konkretne incydenty,
  - dla spraw bez bledow sekcja nie jest wyswietlana (utrzymanie kompaktowego UI).
- Wspolny kontrakt:
  - DTO `NotificationFailureHistoryItemDto` + `NotificationFailureHistoryResultDto` w `packages/shared`.
- Weryfikacja PR17:
  - backend: 340 testow PASS,
  - frontend: 102 testy PASS,
  - `npx tsc --noEmit` PASS w obu appkach,
  - `npm run build` (shared + backend + frontend) PASS.

### PR15 - operacyjne raportowanie commercial owner i health notyfikacji

- Backend:
  - lista spraw (`GET /api/porting-requests`) wspiera dodatkowe filtry:
    - `commercialOwnerFilter`: `ALL | WITH_OWNER | WITHOUT_OWNER | MINE`
    - `notificationHealthFilter`: `ALL | HAS_FAILURES | NO_FAILURES`
  - `MINE` zawsze opiera sie o authenticated user id z JWT (backend source of truth).
  - definicja health = sprawa ma co najmniej jeden `[Dispatch]` NOTE z outcome `FAILED` lub `MISCONFIGURED`.
  - nowy endpoint summary: `GET /api/porting-requests/summary`:
    - `totalRequests`
    - `withCommercialOwner`
    - `withoutCommercialOwner`
    - `myCommercialRequests`
    - `requestsWithNotificationFailures`
  - list item DTO zwraca `commercialOwnerSummary` oraz `hasNotificationFailures`.
- Frontend:
  - `RequestsPage` ma operacyjne summary cards (5 licznikow) nad lista.
  - filtry commercial owner i health sa URL-driven i wykonywane backendowo.
  - tabela pokazuje opiekuna handlowego oraz prosty sygnal health notyfikacji (`OK` / `Blad`).
- Zakres pozostaje addytywny:
  - bez migracji DB,
  - bez przebudowy historii PR14,
  - bez zmian w customer communication module.

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
  porting-notification-health.helper.ts    # single source of truth dla health computation (PR16)
  porting-notification-failure-history.service.ts  # lekki drill-down failure history (PR17)

apps/backend/prisma/
  schema.prisma
  seed.ts
  migrations/

packages/shared/src/
  constants/index.ts
  dto/porting-requests.dto.ts

apps/frontend/src/
  components/NotificationFailureHistoryPanel/NotificationFailureHistoryPanel.tsx
  pages/Requests/RequestDetailPage.tsx
  pages/Requests/RequestsPage.tsx
  pages/Requests/requestsOperational.ts
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

## Kolejne kroki (roadmapa v2, zatwierdzona 2026-04-10)

- **EPIC-18**: Fallback Runtime Completion — **DONE**
- **EPIC-19**: Notification Operations v1 — retry + first-class delivery model
- **EPIC-20**: Communication Productionization — real transport adapter
- **EPIC-21**: Security & Observability Baseline — rate limiting, RBAC review
- **EPIC-22**: PLI-CBD Production Readiness — real SOAP + inbound webhook
- **EPIC-23**: SLA & Audit Completion
- **EPIC-24**: Reporting & Operational Visibility
- **EPIC-25**: Customer Portal (1.1+)
- **EPIC-26**: Final Hardening & Rollout Readiness
- Future: podlaczenie pozostalych eventow z katalogu (E03, E06, E12, E13, NUMBER_PORTED, CASE_REJECTED)

---

## Discipline note

Gdy roadmapa lub interpretacja biznesowa sie zmienia, aktualizuj ten plik w tym samym change secie, aby kolejne sesje opieraly sie na pamieci repo, a nie tylko historii czatu.
