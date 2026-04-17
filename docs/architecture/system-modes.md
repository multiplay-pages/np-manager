# ADR: System modes i warstwa capabilities (Etap 4B)

Status: **Accepted** (Etap 4B.1, 2026-04-16)

## Kontekst

NP-Manager ma jeden rdzeń domenowy (zarządzanie procesem przenoszenia numerów
w Polsce) i opcjonalny moduł integracji z PLI CBD — zewnętrznym systemem
regulatora. W praktyce projekt obsługuje dwa profile użycia:

1. **Tryb manualny / standalone** — operator obsługuje sprawy ręcznie,
   bez automatycznej wymiany komunikatów E03/E06/… z PLI CBD. Sekcje
   PLI CBD, diagnostyka techniczna i „akcje zewnętrzne” są dla takiego
   operatora szumem i mogą wprowadzać w błąd.
2. **Tryb zintegrowany z PLI CBD** — operator korzysta z pełnego
   workflow wraz z eksportem/synchronizacją XML, podglądem draftów
   komunikatów oraz akcjami zewnętrznymi odpowiadającymi zdarzeniom
   po stronie regulatora.

Do tej pory rdzeń i moduł PLI CBD były splecione na poziomie UI i
routów backendu — każdy deploy zachowywał się jak „tryb zintegrowany”.
Chcemy wprowadzić warstwę capabilities, żeby:

- admin mógł deklaratywnie wskazać tryb, w jakim pracuje instancja,
- backend mógł kontrolowanie blokować endpointy opcjonalnego modułu,
  gdy nie są dostępne w danym trybie,
- frontend mógł ukryć sekcje PLI CBD, gdy nie są aktywne.

## Decyzja

Wprowadzamy warstwę `SystemCapabilities` jako pojedyncze źródło prawdy:

### Tryby

- `STANDALONE` — moduł PLI CBD jest traktowany jak „nieobecny”.
  Wszystkie jego endpointy zwracają **404** `CAPABILITY_NOT_AVAILABLE`.
- `PLI_CBD_INTEGRATED` — moduł jest obecny. Dodatkowo miękki
  przełącznik `pli_cbd.enabled` pozwala wyłączyć moduł bez utraty
  konfiguracji (np. w ramach utrzymania). Wyłączony moduł również
  zwraca **404** — z punktu widzenia klienta endpoint nie istnieje.

### Capabilities DTO

```ts
interface SystemCapabilitiesDto {
  mode: 'STANDALONE' | 'PLI_CBD_INTEGRATED'
  pliCbd: {
    enabled: boolean      // soft toggle (SystemSetting pli_cbd.enabled)
    configured: boolean   // endpoint_url + credentials_ref + operator_code obecne
    active: boolean       // mode === 'PLI_CBD_INTEGRATED' && enabled && configured
    capabilities: {
      export: boolean
      sync: boolean
      diagnostics: boolean
      externalActions: boolean
    }
  }
  resolvedAt: string
}
```

### SystemSetting keys

- `system.mode` (`STANDALONE | PLI_CBD_INTEGRATED`)
- `pli_cbd.enabled` (boolean)
- `pli_cbd.endpoint_url` (string)
- `pli_cbd.credentials_ref` (string, referencja do vault/secret store)
- `pli_cbd.operator_code` (string)

`configured` to derywacja: wszystkie trzy ostatnie niepuste.

### Gating endpointów

Nowy hook `requireCapability(path)` (preHandler Fastify) zwraca:

- **404 `CAPABILITY_NOT_AVAILABLE`** — gdy `mode === STANDALONE`
  lub `pliCbd.enabled === false`. Semantycznie: „w tym trybie ten
  endpoint nie istnieje”.
- **503 `CAPABILITY_NOT_CONFIGURED`** — gdy `mode === PLI_CBD_INTEGRATED`
  i `pliCbd.enabled`, ale `configured === false`. Semantycznie: „moduł
  jest włączony, ale nie gotowy — dokończ konfigurację”.
- przepuszcza żądanie, gdy capability jest aktywna.

Granularne ścieżki (`pliCbd.capabilities.export` / `.sync` /
`.diagnostics` / `.externalActions`) są zarezerwowane na przyszłe,
bardziej szczegółowe feature-flags. W 4B.1 wszystkie zwracają tę samą
wartość co `active`, ale rozdzielenie trzyma gating API niezmienione
przy rozszerzeniu.

### Cache

Resolver cache'uje snapshot na 30 sekund. Cache można jawnie unieważnić
przez `invalidateSystemCapabilitiesCache()`. Od 4B.2 endpoint adminowy
`PUT /api/admin/system-mode-settings` invaliduje cache po zapisie i zwraca
świeży snapshot `capabilities`, który frontend podstawia do globalnego
store bez twardego reloadu aplikacji.

### Bootstrap — heurystyka przy pierwszym starcie

Gdy klucz `system.mode` nie istnieje w SystemSetting:

- jeśli w tabeli `PortingRequest` jest choć jeden rekord z
  `pliCbdCaseId != null` → **istniejące środowisko produkcyjne**.
  Ustawiamy `system.mode = PLI_CBD_INTEGRATED` i `pli_cbd.enabled = true`.
  Zachowana wsteczna kompatybilność — dotychczasowy UI PLI CBD
  pozostaje widoczny.
- w przeciwnym razie → **nowy deploy**. Ustawiamy
  `system.mode = STANDALONE` i `pli_cbd.enabled = false`.

Operacja jest idempotentna (`createMany` + `skipDuplicates`),
uruchamiana raz przy starcie procesu. Admin może nadpisać ustawienia
bezpośrednio w SystemSetting (admin UI trafi w 4B.2).

Log bootstrapu wypisuje jeden z dwóch komunikatów:

- `[Capabilities] Wykryto srodowisko bez historii PLI CBD — ustawiono tryb STANDALONE.`
- `[Capabilities] Wykryto srodowisko z historia PLI CBD — ustawiono tryb PLI_CBD_INTEGRATED.`

### Frontend

- `GET /api/system/capabilities` pobiera snapshot raz, po zalogowaniu.
- Store Zustand + hook `useSystemCapabilities()` zwraca dane + flagę
  `isReady`. Do czasu otrzymania odpowiedzi (lub przy błędzie)
  hook zwraca **fail-closed** snapshot (wszystkie capabilities = false),
  dzięki czemu sekcje gated UI pozostają ukryte.
- `RequestDetailPage.tsx` ukrywa: DisclosureCard „PLI CBD”, DisclosureCard
  „Diagnostyka”, `PortingExternalActionsPanel`, gdy odpowiednie
  capabilities są wyłączone.

## Zakres 4B.1

W 4B.1 dostarczamy:

1. `SystemMode` + `SystemCapabilitiesDto` w `@np-manager/shared`.
2. Backend: moduł `system-capabilities` (service + router + hook +
   bootstrap + testy).
3. Gating endpointów PLI CBD w `porting-requests.router.ts`.
4. Bootstrap uruchamiany raz przy starcie procesu.
5. Frontend: api/store/hook + 3 gated sekcje w RequestDetailPage.
6. ADR (ten dokument) + wpis w `docs/PROJECT_CONTINUITY.md`.

**Poza zakresem 4B.1 (na kolejne slice'y):**

- Admin UI do przełączania trybu / edycji `pli_cbd.*`.
- Zmiany w logice PLI CBD (brak modyfikacji handlerów, DTO ani adapterów).
- Zmiany w schemacie Prisma.
- Feature flagi innych modułów niż PLI CBD.

## Zakres 4B.2

W 4B.2 dodajemy wąski panel administracyjny do zarządzania trybem systemu:

1. Admin-only API `GET /api/admin/system-mode-settings` i
   `PUT /api/admin/system-mode-settings`.
2. Odczyt/zapis wyłącznie kluczy `system.mode` oraz `pli_cbd.*` używanych
   przez capabilities resolver.
3. Walidacja syntaktyczna: niepusty `endpoint_url` musi być URL HTTP/HTTPS,
   `operator_code` jest trimowany i uppercasowany, a niepełna konfiguracja
   pozostaje zapisywalna.
4. Response zawiera raw settings, diagnostics (`configured`, `active`,
   `missingFields`) oraz aktualny snapshot `capabilities`.
5. Frontend ma osobną stronę `/admin/system-mode-settings`, wpis w sidebarze
   i po zapisie odświeża globalny `systemCapabilities` store snapshotem z
   backendu.

4B.2 nadal nie zmienia handlerów PLI CBD, schematu Prisma ani nie czyści
istniejących `pli_cbd.*` settings przy przełączaniu trybu.

## Ryzyka

- **Heurystyka bootstrap na pustej bazie nowej produkcji** — mitigacja:
  po deploy można jawnie ustawić `system.mode` (SQL/skrypt/admin UI 4B.2).
- **Cache 30s → opóźnienie po zmianie trybu poza API 4B.2** — zmiany
  wykonane przez admin endpoint propagują się od razu dzięki invalidacji.
  Ręczne SQL/skrypty nadal mogą wymagać odczekania TTL albo restartu procesu.
- **Capability leak przez bezpośredni HTTP** — backend zwraca 404,
  co nie ujawnia istnienia funkcji.
- **Fail-closed frontend przy błędzie fetch** — przy chwilowym
  problemie sieciowym sekcje PLI CBD będą ukryte; reszta UI działa
  normalnie. Użytkownik może odświeżyć stronę.

## Alternatywy rozważone

- **Sztywny default STANDALONE zawsze** — odrzucone, bo psułoby
  istniejące środowiska zaraz po deploy.
- **Feature flag per rola / per user** — poza zakresem; chcemy
  decyzji na poziomie instancji, nie użytkownika.
- **Wycięcie modułu PLI CBD z repo** — odrzucone; chcemy jednego kodu,
  dwa profile użycia.
