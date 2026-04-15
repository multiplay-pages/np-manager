# NP-Manager - Project Continuity Guide

Dokument dla kolejnych sesji AI/deweloperskich. Opisuje stan, decyzje architektoniczne i zasady kontynuacji.

---

## Aktualny stan projektu (2026-04-15)

### Stan prac / etapy

| PR    | Opis                                                                 | Status |
|-------|----------------------------------------------------------------------|--------|
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
| PR18A | Fallback runtime completion (error fallback execution + audit)       | DONE   |
| PR19A-1 | NotificationOps foundation: first-class delivery attempts + dual-write | DONE   |
| PR19A-2 | Request-level read layer dla internal notification attempts        | DONE   |
| PR19B-1 | Backend retry eligibility + request-scoped retry endpoint          | DONE   |
| PR20E | Full server-side operational status filters for global queue       | DONE   |
| Etap 2A.1 | Frontend redesign foundation + app shell + RequestsPage          | DONE   |
| Etap 2A.2 | Frontend redesign RequestDetailPage                              | DONE   |
| Etap 2A.3 | Operacyjny UX polish po review                                  | DONE   |
| Etap 2A.4 | Final micro-polish przed zamknieciem 2A                         | DONE   |
| Etap 2B   | Routing/deeplinks/nawigacja lista-detail (canonical URL, UUID redirect, filtr po powrocie) | DONE |
| Etap 3A   | Assignment closeout: visual polish PortingAssignmentPanel + usun martwy kod filterPortingRequestsByOwnership | DONE |

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

### PR18A - fallback runtime completion (error fallback execution)

- Domknieto runtime gap miedzy admin fallback settings a dispatch pipeline wewnetrznych notyfikacji.
- Dodano kanoniczny resolver polityki fallbacku oparty o `notification_fallback_*`:
  - `notification_fallback_enabled`
  - `notification_fallback_recipient_email`
  - `notification_fallback_recipient_name`
  - `notification_fallback_apply_to_failed`
  - `notification_fallback_apply_to_misconfigured`
- Error fallback uruchamia sie po primary dispatch tylko dla outcome `FAILED` / `MISCONFIGURED` zgodnie z policy.
- V1 fallback transport: email (`sendInternalEmail`) na `fallbackRecipientEmail`.
- Brak petli retry fallbacku: fallback to pojedyncza akcja na jeden dispatch.
- Audit trail:
  - primary dispatch pozostaje w `[Dispatch] ...`,
  - nowy wpis `[ErrorFallback] ...` zawiera decyzje: `TRIGGERED` albo `SKIPPED` z reason.
- Rozroznienie semantyk fallbacku:
  - `ROUTING_TEAM` (owner missing/inactive -> team recipients) - notatki `Powiadomienie zespolowe: ...`,
  - `ERROR_FALLBACK` (po bledzie transportu) - notatki `[ErrorFallback] ...`.
- UI detail (`Historia powiadomien wewnetrznych`) pokazuje rowniez wpisy `[ErrorFallback]`.

### PR19A-1 - NotificationOps foundation (first-class attempts + dual-write)

- Dodano nowy addytywny model danych: `InternalNotificationDeliveryAttempt`
  - przeznaczenie: trwale zapisy attemptow runtime (PRIMARY / ERROR_FALLBACK / przyszly RETRY),
  - model zawiera m.in. `attemptOrigin`, `channel`, `recipient`, `mode`, `outcome`, `failureKind`, `retryOfAttemptId`, `retryCount`, `isLatestForChain`, `triggeredByUserId`.
- Runtime dispatch wykonuje dual-write:
  - PRIMARY dispatch zapisuje attempt records dla wynikow transportu email/Teams,
  - ERROR_FALLBACK zapisuje attempt record tylko gdy fallback wykonuje realna probe transportu.
- Semantyka zapisu PR19A-1:
  - persisted sa tylko wykonane proby transportu,
  - decyzje policy typu `SKIPPED` pozostaja audit-only w `[ErrorFallback]` NOTE (bez synthetic attempt record).
- Zachowano kompatybilnosc wsteczna:
  - audit NOTE `[Dispatch] ...` oraz `[ErrorFallback] ...` pozostaje bez zmiany semantyki,
  - istniejace read modele (`internal-notifications`, `notification-failures`) dalej dzialaja na NOTE parsing.
- PR19A-1 nie obejmuje:
  - retry endpointu i retry buttona,
  - queue/listy operacyjnej,
  - backfill historycznych NOTE do nowej tabeli.

### PR19A-2 - request-level read layer dla attempts

- Dodano request-level endpoint:
  - `GET /api/porting-requests/:id/internal-notification-attempts`
  - endpoint zwraca first-class ledger wykonanych prob transportu z tabeli `InternalNotificationDeliveryAttempt`.
- Dodano shared DTO dla internal notification attempts:
  - origin/channel/mode/outcome/failureKind,
  - dane request/event/recipient/error/retry-chain jako read-only kontrakt pod PR19B.
- Frontend `RequestDetailPage` ma minimalny panel read-only `Proby dostarczenia notyfikacji`.
- Semantyka UI:
  - `Historia powiadomien wewnetrznych` = szersza historia eventow, routingu i audit NOTE,
  - `Proby dostarczenia notyfikacji` = ledger wykonanych prob transportu z modelu attempts.
- Zachowano kompatybilnosc:
  - istniejace panele `internal-notifications` i `notification-failures` nadal dzialaja rownolegle,
  - NOTE parsing nie zostal usuniety,
  - brak retry endpointu, retry buttona, global queue UI i backfillu historycznych NOTE.

### PR19B-1 - backend retry eligibility i request-scoped retry

- Dodano kanoniczny helper eligibility retry dla `InternalNotificationDeliveryAttempt`:
  - retryowalne sa tylko `attemptOrigin=PRIMARY | RETRY`,
  - retryowalne sa tylko outcome `FAILED | MISCONFIGURED`,
  - retry wymaga `isLatestForChain=true`,
  - limit v1: `retryCount < 3`.
- Read API `GET /api/porting-requests/:id/internal-notification-attempts` zwraca teraz dla kazdego attemptu:
  - `canRetry`,
  - `retryBlockedReasonCode`.
- Dodano endpoint:
  - `POST /api/porting-requests/:id/internal-notification-attempts/:attemptId/retry`,
  - body: `{ reason?: string }` (`reason` max 300 znakow),
  - role: `ADMIN`, `BOK_CONSULTANT`, `BACK_OFFICE`, `MANAGER`,
  - `409` zwraca `retryBlockedReasonCode`.
- Retry wykonuje transport ponownie dla tego samego `channel`, `recipient` i `eventCode`, ale z aktualna konfiguracja adapterow.
- Nowy attempt ma:
  - `attemptOrigin=RETRY`,
  - `retryOfAttemptId=sourceAttempt.id`,
  - `retryCount=source.retryCount + 1`,
  - `triggeredByUserId=currentUser.id`,
  - `isLatestForChain=true`.
- Poprzedni latest attempt w chain jest przestawiany na `isLatestForChain=false`.
- Retry ma wlasny marker NOTE: `[NotificationRetry]`.
- Retry nie uruchamia `ERROR_FALLBACK`, nie uruchamia routing fallback i nie zmienia NOTE-based historii PR14/PR17.
- Pragmatyczna granica transakcji PR19B-1:
  - zewnetrzne I/O transportu nie jest trzymane w dlugiej transakcji DB,
  - eligibility jest sprawdzane przed transportem i ponownie w krotkiej transakcji zapisu,
  - w rzadkim wyscigu po wykonaniu transportu, ale przed zapisem, transakcja moze odrzucic retry jako juz nie-latest.

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

### Etap 2A - redesign frontendowy UI/UX

Zakres pozostaje wylacznie frontendowy: bez zmian backendu, DTO, endpointow, workflow i logiki domenowej.

Etap 2A.1:
- Dodano lekka foundation UI w `apps/frontend/src/components/ui/`:
  - `Button`, `ButtonLink`, `Badge`, `FilterChip`, `MetricCard`, `PageHeader`, `cx`.
- Rozszerzono tokeny Tailwind o spokojny system `brand`, `ink`, `surface`, `canvas`, `line`, radiusy `ui/panel` i cienie `soft/panel`.
- Przebudowano `AppLayout` na jasniejszy SaaS shell: sidebar, topbar, wrapper tresci.
- Przeprojektowano `RequestsPage`:
  - naglowek operacyjny,
  - summary cards jako szybkie filtry,
  - pogrupowany panel filtrow,
  - tabela z mocniej widocznym statusem, ownerem i health notyfikacji.
- Zachowano istniejace hooki, API calls, URL params i zachowanie biznesowe.

Etap 2A.2:
- Przeprojektowano `RequestDetailPage` w tym samym kierunku wizualnym:
  - header sprawy z numerem, klientem, statusem, trybem i szybka akcja,
  - metryki decyzyjne u gory: status, przypisanie BOK, opiekun handlowy, notyfikacje,
  - sekcje operacyjne przed historia i diagnostyka,
  - PLI CBD oraz diagnostyka pozostaja dostepne nizej w sekcjach rozwijanych dla admina.
- Nie usunieto istniejacych funkcji detail page; zmieniono hierarchie, grupowanie i styling.

Etap 2A.3:
- Wdrozono frontend-only polish po review bez zmian backendu, DTO, endpointow i workflow.
- Poprawiono disabled CTA w komunikacji operacyjnej:
  - zablokowane akcje nie wygladaja jak aktywne primary CTA,
  - operator widzi powody blokady oraz statusy, w ktorych akcja bedzie dostepna.
- Dodano lekkie `Szybkie akcje` i shortcuty z kart detail do workflow, przypisania, opiekuna i notyfikacji.
- Dopracowano empty state historii sprawy oraz usunieto z UI techniczne copy typu foundation/SOAP.
- Dodano affordance disclosure dla PLI CBD/Diagnostyki.

Etap 2A.4:
- Wdrozono finalny frontend-only micro-polish przed zamknieciem 2A.
- Uspojniono disclosure/focus:
  - caly naglowek sekcji jest klikalny,
  - focus po toggle pozostaje logicznie na headerze sekcji.
- Skrocono naglowek kolumny notyfikacji na liscie do `Notyfikacje`.
- Lekko wzmocniono mikro-linki w gornych kartach detail (`Akcje`, `Zmien`, `Historia`) bez robienia z nich duzych CTA.
- Routing po `caseNumber` zrealizowany w Etapie 2B.

### Etap 2B - routing/deeplinks/nawigacja lista-detail

- Frontend:
  - `ROUTES.REQUEST_DETAIL` zmieniony z `/requests/:id` na `/requests/:caseNumber` (canonical URL po biznesowym numerze sprawy).
  - `buildPath` w `routes.ts` zgeneralizowany do `route.replace(/:[^/]+/, param)`.
  - `RequestsPage`: klik w liste naviguje po `request.caseNumber` + przekazuje `location.state = { fromList: true, listSearch: location.search }`.
  - `RequestDetailPage`:
    - `useParams<{caseNumber}>()` zamiast `{id}`,
    - `UUID_REGEX` detekcja: jesli URL jest UUID → `getPortingRequestById` + silent redirect na canonical `/requests/:caseNumber`,
    - jesli URL jest caseNumber → `getPortingRequestByCaseNumber`,
    - `internalId` / `const id = internalId` alias dla wstecznej kompatybilnosci z istniejacymi mutacjami,
    - podzielony useEffect: Effect 1 reaguje na `caseNumber` (URL), Effect 2 na `internalId`,
    - `backToList()` zwraca do listy z zachowanymi filterami z `location.state.listSearch`,
    - `notFound` state i 404 UI z numerem sprawy.
  - `portingRequests.api.ts`: nowa funkcja `getPortingRequestByCaseNumber` → `GET /porting-requests/by-case-number/:caseNumber`.
- Backend:
  - Nowy endpoint `GET /api/porting-requests/by-case-number/:caseNumber` zarejestrowany PRZED `/:id` (Fastify route tree).
  - Nowa funkcja `getPortingRequestByCaseNumber(caseNumber, role)` w service — `findUnique({where:{caseNumber}})` + delegacja do `getPortingRequest(id, role)`.
- Weryfikacja 2B:
  - backend: 428 testow PASS,
  - frontend: 157 testow PASS,
  - `npx tsc --noEmit` PASS w obu appkach,
  - runtime: `GET /api/porting-requests/by-case-number/FNP-20260409-921D05` → 200, invalid caseNumber → 404 biznesowy, UUID przez stary endpoint → 200, brak tokenu → 401,
  - QA reczne 4/4 PASS (lista→detail po caseNumber, deeplink, UUID redirect, powrot z filtrem).
- Stare UUID URL (`/requests/:uuid`) sa w pelni wstecznie kompatybilne — silent redirect do canonical.
- Etap 2A nie oznacza jeszcze redesignu wszystkich ekranow; kolejne widoki powinny korzystac z `components/ui`.

### Etap 3A - assignment / ownership closeout

Wszystkie funkcje assignment zostaly zaimplementowane wczesniej (PR12C, PR12D). Etap 3A to wylacznie closeout: polish wizualny + usuniecie martwego kodu. Nie bylo nowych funkcji ani zmian backendu.

Zmiany:
- `PortingAssignmentPanel`: klasa `.card` zamieniona na `.panel` — spojnosci z `SectionCard` uzywana w sasiednich sekcjach `RequestDetailPage` (roznica: `shadow-sm` vs `shadow-panel`).
- `portingOwnership.ts`: usunieto `filterPortingRequestsByOwnership` — funkcja stala sie martwym kodem po przeniesieniu filtrow ownership na backend w PR12D; nie byla uzywana produkcyjnie.
- `portingOwnership.test.ts`: usunieto 2 testy i helper `buildListItem` ktore testowaly wylacznie usunieta funkcje.
- `docs/PROJECT_CONTINUITY.md`: zaktualizowano o Etap 3A.

Stan assignment po closeout:
- Detail: `PortingAssignmentPanel` — aktualny opiekun, "Przypisz do mnie", zmiana assignee (ADMIN/BOK_CONSULTANT), zdejmij przypisanie, historia przypisan.
- Lista: filtry `Moje sprawy` / `Nieprzypisane` — server-side, JWT-based, bez query manipulation.
- RBAC: assign-to-self i reassign = ADMIN + BOK_CONSULTANT; historia = wszyscy zalogowani.
- Weryfikacja 3A: frontend 155 testow PASS, tsc PASS w obu appkach.

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
  # od PR19A-1: dual-write attempt records (PRIMARY + ERROR_FALLBACK)
  porting-internal-notification-attempts.service.ts # od PR19A-2: read layer attempts
  internal-notification.adapter.ts         # email + Teams transport (PR13B)
  internal-notification-formatter.ts       # formatter tresci wiadomosci (PR13B)
  porting-notification-health.helper.ts    # single source of truth dla health computation (PR16)
  porting-notification-failure-history.service.ts  # lekki drill-down failure history (PR17)

apps/backend/prisma/
  schema.prisma
  seed.ts
  migrations/
  # od PR19A-1: tabela internal_notification_delivery_attempts

packages/shared/src/
  constants/index.ts
  dto/porting-requests.dto.ts
  dto/porting-internal-notifications.dto.ts # historia + DTO attempts (PR19A-2)

apps/frontend/src/
  components/ui/                 # Etap 2A frontend foundation
  components/layout/AppLayout.tsx # Etap 2A app shell
  components/InternalNotificationAttemptsPanel/InternalNotificationAttemptsPanel.tsx
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

## Kolejne kroki

- **PR19B**: retry actions oparte o `InternalNotificationDeliveryAttempt.id` + operator-facing failure queue.
- **PR19B-2**: UI retry action / kolejka operacyjna moze oprzec sie na `canRetry`, `retryBlockedReasonCode` i endpoint PR19B-1; RBAC nadal musi byc respektowany backendowo.
- Future: podlaczenie pozostalych eventow z katalogu (E03, E06, E12, E13, NUMBER_PORTED, CASE_REJECTED)

---

## Discipline note

Gdy roadmapa lub interpretacja biznesowa sie zmienia, aktualizuj ten plik w tym samym change secie, aby kolejne sesje opieraly sie na pamieci repo, a nie tylko historii czatu.
