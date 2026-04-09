# AGENTS.md - NP-Manager

Primary rule: repository state is the source of truth.

Wytyczne dla agentow AI pracujacych w tym repozytorium.

---

## Read first

Przed zmianami przeczytaj:
1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/PROJECT_CONTINUITY.md`

---

## Struktura projektu

Monorepo zarzadzane przez npm workspaces:

```text
np-manager/
  apps/
    backend/     # Fastify + Prisma 5 + PostgreSQL (port 3001)
    frontend/    # React 18 + Vite + Tailwind CSS (port 5173)
  packages/
    shared/      # Wspolne typy DTO i stale (@np-manager/shared)
  docs/          # Dokumentacja projektu
```

---

## Komendy

### Backend

```bash
cd apps/backend
npx vitest run                    # Uruchom wszystkie testy
npx tsc --noEmit                  # Sprawdz typy TypeScript
npx prisma generate --no-engine   # Regeneruj klienta Prisma (gdy DLL jest zablokowany)
npx prisma generate               # Regeneruj klienta Prisma (pelna wersja)
```

### Frontend

```bash
cd apps/frontend
npx vitest run                    # Uruchom wszystkie testy
npx tsc --noEmit                  # Sprawdz typy TypeScript
```

### Shared package

```bash
# Zmiany w packages/shared sa automatycznie widoczne przez workspaces
# Nie trzeba budowac - import bezposrednio ze zrodel TypeScript
```

---

## Zasady pracy

### Przed zakonczeniem zadania ZAWSZE

1. Uruchom `npx vitest run` w `apps/backend` - wszystkie testy musza przejsc
2. Uruchom `npx vitest run` w `apps/frontend` - wszystkie testy musza przejsc
3. Uruchom `npx tsc --noEmit` w obu apps - brak bledow TypeScript

### Testy

- Framework: **Vitest** (nie Jest)
- Mocki: `vi.hoisted()` + `vi.mock()` na gorze pliku - **przed** importami modulow pod testem
- Prisma mock pattern:
  ```typescript
  mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg)  // tablica Promise
    if (typeof arg === 'function') return arg(tx)    // callback z tx
  })
  ```
- Testy **nie** potrzebuja dzialajacej bazy - wszystko przez mocki

### Prisma / baza danych

- Po zmianie `prisma/schema.prisma` -> `npx prisma generate`
- Nowe migracje: utworz plik SQL w `prisma/migrations/YYYYMMDDHHMMSS_nazwa/migration.sql`
- Nigdy nie usuwaj istniejacych kolumn w migracji - tylko addytywne zmiany
- `$transaction([p1, p2])` przyjmuje tablice Promise (nie funkcje)

### Bezpieczenstwo

- Backend nigdy nie ufa danym z frontendu dla operacji wymagajacych tozsamosci
  (np. filtr `MINE` uzywa `request.user.id` z JWT, nie query param)
- Kazda mutacja musi logowac przez `logAuditEvent()`
- DTO w `packages/shared` to kontrakt publiczny - nie zawiera pol wrazliwych (np. `passwordHash`)

### Styl kodu

- TypeScript strict mode (bez `any`)
- Zod do walidacji body/query w routerach
- `AppError.notFound()` / `AppError.badRequest(msg, code)` - nigdy `throw new Error()`
- Polskie komunikaty bledow (system obslugi portowania w Polsce)
- Powiadomienia: non-blocking dispatch z `.catch(() => {})`

### Zasady wspolpracy i zmian kierunku

- Preferuj male, reviewowalne PR-y.
- Preferuj zmiany addytywne zamiast destrukcyjnych rewrite.
- Nie kontynuuj starego kierunku, jesli aktualny stan repo lub decyzja biznesowa sie zmienily.
- Gdy zmienia sie kierunek produktu, aktualizuj `docs/PROJECT_CONTINUITY.md` w tym samym change secie.
- Nie traktuj historii czatu jako jedynej pamieci projektu. Decyzje utrwalaj w repo.

---

## Kontekst biznesowy

NP-Manager to system zarzadzania procesem przenoszenia numerow (number portability) w Polsce.

Glowne podmioty:
- **PortingRequest** - sprawa portowania numeru telefonu
- **User** - pracownik operatora (BOK, BACK_OFFICE, MANAGER, SALES, itp.)
- **Operator** - operator telefoniczny (donor/recipient)
- **PLI CBD** - zewnetrzny system regulatora (interfejs XML/SOAP)

Workflow spraw jest kontrolowany przez `availableStatusActions` zwracane przez backend - frontend tylko wyswietla dozwolone akcje.

### Semantyka ownership i notyfikacji (PR13A+, PR13B, PR14)

- Biznesowo ownership operacyjny jest po stronie **zespolu BOK**, a nie personalnie pojedynczego pracownika.
- `assignedUserId` pozostaje na razie mechanizmem technicznym (additive, bez destrukcyjnego usuwania), ale nie jest glowna osia rozwoju domeny.
- Sprawa moze miec opcjonalnego `commercialOwnerUserId` (rola `SALES`) odpowiedzialnego za relacje handlowa.
- Powiadomienia wewnetrzne sa modelowane eventowo (`PortingNotificationEvent`) i routowane:
  - do opiekuna handlowego, gdy jest aktywny,
  - do odbiorcow zespolowych (e-mail/Teams fallback), gdy opiekuna brak lub jest nieaktywny.
- Powiadomienia wewnetrzne sa oddzielone od komunikacji do klienta koncowego (to osobny strumien funkcjonalny).
- Future note: mozna rozwazyc domyslnego opiekuna handlowego na poziomie `Client`, ale foundation PR13A jest celowo na poziomie `PortingRequest`.

#### Transport wewnetrznych powiadomien (PR13B)

- `internal-notification.adapter.ts` — email (nodemailer) + Teams webhook; osobny od `communication-delivery.adapter.ts`
- `internal-notification-formatter.ts` — formatter tresci wiadomosci (plain-text, j. polski)
- Tryb email: `INTERNAL_NOTIFICATION_EMAIL_ADAPTER=STUB|REAL|DISABLED` (domyslnie: STUB)
- Teams: zawsze real gdy webhook URL jest skonfigurowany w SystemSettings
- Brak crasha glownego API przy bledzie transportu — dispatch jest non-blocking
- Kazdy dispatch zostawia `PortingRequestEvent NOTE` z trescia: kanal, odbiorca, outcome, tryb, ewentualny blad

#### Operacyjna warstwa UI i settings (PR14)

- Detail sprawy pokazuje sekcje `Historia powiadomien wewnetrznych` oparta o lekki read model:
  - `Notification` (odbiorcy USER),
  - `PortingRequestEvent NOTE` (TEAM routing intent + `[Dispatch]` transport audit).
- Admin ma panel `Ustawienia powiadomien portingowych` do zarzadzania fallbackiem:
  - `porting_status_notify_shared_emails`,
  - `porting_status_teams_enabled`,
  - `porting_status_notify_shared_teams_webhook`.
- Legacy klucze `porting_notify_*` sa utrzymane tylko dla kompatybilnosci odczytu.
- Diagnostyka env (`email adapter mode`, `SMTP configured`) jest read-only.
- Nadal nie mieszamy notyfikacji wewnetrznych z komunikacja do klienta koncowego.

---

## Ciaglosc miedzy sesjami

Stan projektu jest udokumentowany w:
- `docs/PROJECT_CONTINUITY.md` - szczegolowy opis stanu i decyzji architektonicznych
- `C:\Users\cicha\.claude\projects\...\memory\MEMORY.md` - zwiezle podsumowanie dla Claude

Po kazdym PR aktualizuj oba dokumenty.
