# AGENTS.md — NP-Manager

Wytyczne dla agentów AI pracujących w tym repozytorium.

---

## Struktura projektu

Monorepo zarządzane przez npm workspaces:

```
np-manager/
  apps/
    backend/     # Fastify + Prisma 5 + PostgreSQL (port 3001)
    frontend/    # React 18 + Vite + Tailwind CSS (port 5173)
  packages/
    shared/      # Wspólne typy DTO i stałe (@np-manager/shared)
  docs/          # Dokumentacja projektu
```

---

## Komendy

### Backend

```bash
cd apps/backend
npx vitest run              # Uruchom wszystkie testy
npx tsc --noEmit            # Sprawdź typy TypeScript
npx prisma generate --no-engine  # Regeneruj klienta Prisma (gdy DLL jest zablokowany)
npx prisma generate         # Regeneruj klienta Prisma (pełna wersja)
```

### Frontend

```bash
cd apps/frontend
npx vitest run              # Uruchom wszystkie testy
npx tsc --noEmit            # Sprawdź typy TypeScript
```

### Shared package

```bash
# Zmiany w packages/shared są automatycznie widoczne przez workspaces
# Nie trzeba budować — import bezpośrednio ze źródeł TypeScript
```

---

## Zasady pracy

### Przed zakończeniem zadania ZAWSZE

1. Uruchom `npx vitest run` w `apps/backend` — wszystkie testy muszą przejść
2. Uruchom `npx vitest run` w `apps/frontend` — wszystkie testy muszą przejść
3. Uruchom `npx tsc --noEmit` w obu apps — brak błędów TypeScript

### Testy

- Framework: **Vitest** (nie Jest)
- Mocki: `vi.hoisted()` + `vi.mock()` na górze pliku — **przed** importami modułów pod testem
- Prisma mock pattern:
  ```typescript
  mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg)  // tablica Promise
    if (typeof arg === 'function') return arg(tx)    // callback z tx
  })
  ```
- Testy **nie** potrzebują działającej bazy — wszystko przez mocki

### Prisma / baza danych

- Po zmianie `prisma/schema.prisma` → `npx prisma generate`
- Nowe migracje: utwórz plik SQL w `prisma/migrations/YYYYMMDDHHMMSS_nazwa/migration.sql`
- Nigdy nie usuwaj istniejących kolumn w migracji — tylko addytywne zmiany
- `$transaction([p1, p2])` przyjmuje tablicę Promise (nie funkcje)

### Bezpieczeństwo

- Backend nigdy nie ufa danym z frontendu dla operacji wymagających tożsamości  
  (np. filtr `MINE` używa `request.user.id` z JWT, nie query param)
- Każda mutacja musi logować przez `logAuditEvent()`
- DTO w `packages/shared` to kontrakt publiczny — nie zawiera pól wrażliwych (np. `passwordHash`)

### Styl kodu

- TypeScript strict mode (bez `any`)
- Zod do walidacji body/query w routerach
- `AppError.notFound()` / `AppError.badRequest(msg, code)` — nigdy `throw new Error()`
- Polskie komunikaty błędów (system obsługi portowania w Polsce)
- Powiadomienia: non-blocking dispatch z `.catch(() => {})`

---

## Kontekst biznesowy

NP-Manager to system zarządzania procesem przenoszenia numerów (number portability) w Polsce.

Główne podmioty:
- **PortingRequest** — sprawa portowania numeru telefonu
- **User** — pracownik operatora (BOK, BACK_OFFICE, MANAGER, SALES, itp.)
- **Operator** — operator telefoniczny (donor/recipient)
- **PLI CBD** — zewnętrzny system regulatora (interfejs XML/SOAP)

Workflow spraw jest kontrolowany przez `availableStatusActions` zwracane przez backend — frontend tylko wyświetla dozwolone akcje.

---

## Ciągłość między sesjami

Stan projektu jest udokumentowany w:
- `docs/PROJECT_CONTINUITY.md` — szczegółowy opis stanu i decyzji architektonicznych
- `C:\Users\cicha\.claude\projects\...\memory\MEMORY.md` — zwięzłe podsumowanie dla Claude

Po każdym PR aktualizuj oba dokumenty.
