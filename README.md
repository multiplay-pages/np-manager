# NP-Manager

System zarządzania przenoszeniem numerów telefonów stacjonarnych.

---

## Wymagania

| Narzędzie | Wersja minimalna |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x |
| Docker + Docker Compose | Dowolna aktualna |

---

## Uruchomienie lokalne

### 1. Sklonuj repozytorium i zainstaluj zależności

```bash
git clone <repo-url>
cd np-manager
npm install
```

### 2. Skopiuj pliki środowiskowe

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Edytuj `apps/backend/.env` jeśli potrzebujesz zmienić domyślne ustawienia.

### 3. Uruchom bazę danych (PostgreSQL + pgAdmin)

```bash
docker compose up -d
```

Sprawdź czy kontenery działają:
```bash
docker compose ps
```

PostgreSQL będzie dostępny na `localhost:5432`.
pgAdmin dostępny pod: http://localhost:5050 (login: admin@np-manager.local / admin123)

### 4. Uruchom migracje i seed bazy danych

```bash
npm run db:migrate
npm run db:seed
```

Po seedzie dostępne są konta QA:

| Rola | E-mail | Hasło |
|---|---|---|
| ADMIN | `admin@np-manager.local` | `Admin@NP2026!` |
| BOK_CONSULTANT | `bok@np-manager.local` | `Bok@NP2026!` |
| BACK_OFFICE | `back-office@np-manager.local` | `BackOffice@NP2026!` |
| MANAGER | `manager@np-manager.local` | `Manager@NP2026!` |
| AUDITOR | `auditor@np-manager.local` | `Auditor@NP2026!` |

> ⚠️ Konta QA są przeznaczone wyłącznie do środowiska dev/demo. Nie używaj tych haseł na produkcji.

### 5. Uruchom aplikację w trybie deweloperskim

Wszystko jednocześnie (backend + frontend):
```bash
npm run dev
```

Lub osobno:
```bash
npm run dev:backend   # Backend na http://localhost:3001
npm run dev:frontend  # Frontend na http://localhost:5173
```

### 6. Gdy logowanie zwraca blad serwera

Najpierw sprawdz liveness backendu:

```bash
curl http://localhost:3001/health
```

Jesli `/health` zwraca `200`, sprawdz readiness aplikacji:

```bash
curl -i http://localhost:3001/health/ready
```

Interpretacja:
- `/health = 200` oznacza, ze proces backendu zyje
- `/health/ready = 200` oznacza, ze backend jest gotowy do pracy i ma polaczenie z baza
- `/health/ready = 503` oznacza, ze backend dziala, ale nie jest gotowy do obslugi ruchu aplikacyjnego

Jesli logowanie zwraca komunikat o niedostepnej bazie danych albo `/health/ready` zwraca `503`, uruchom lokalny PostgreSQL i ponownie wykonaj:

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Brak uruchomionej bazy na `localhost:5432` powoduje, ze:
- `GET /health` nadal zwraca `200`
- `GET /health/ready` zwraca `503`
- `POST /api/auth/login` nie moze wykonac zapytania Prisma i zwraca `503 DATABASE_UNAVAILABLE`

---

## Struktura projektu

```
np-manager/
├── apps/
│   ├── backend/          # Node.js + Fastify + Prisma
│   └── frontend/         # React + Vite + Tailwind
├── packages/
│   └── shared/           # Wspólne typy, walidatory, stałe
├── docs/                 # Dokumentacja projektu
└── docker-compose.yml    # PostgreSQL + pgAdmin
```

Szczegółowy opis architektury: [docs/architecture.md](docs/architecture.md)

---

## Skrypty

| Komenda | Opis |
|---|---|
| `npm install` | Instalacja wszystkich zależności (wszystkie workspace'y) |
| `npm run dev` | Uruchomienie backendu i frontendu jednocześnie |
| `npm run dev:backend` | Tylko backend (hot reload) |
| `npm run dev:frontend` | Tylko frontend (hot reload) |
| `npm run build` | Build produkcyjny (shared → backend → frontend) |
| `npm run lint` | Sprawdzenie kodu ESLint |
| `npm run lint:fix` | Automatyczna naprawa problemów ESLint |
| `npm run format` | Formatowanie kodu Prettier |
| `npm run test` | Uruchomienie testów (shared + backend) |
| `npm run db:migrate` | Wykonanie nowych migracji Prisma |
| `npm run db:migrate:prod` | Migracje w trybie produkcyjnym |
| `npm run db:seed` | Załadowanie danych startowych |
| `npm run db:studio` | Otwarcie Prisma Studio (GUI bazy) |
| `npm run db:reset` | Reset bazy i ponowny seed (tylko DEV!) |

---

## Środowiska

| Środowisko | Backend | Frontend |
|---|---|---|
| development | http://localhost:3001 | http://localhost:5173 |
| staging | https://staging.np-manager.local | https://staging.np-manager.local |
| production | https://api.np-manager.local | https://np-manager.local |

---

## Technologie

**Backend:** Node.js 20, TypeScript, Fastify 4, Prisma 5, PostgreSQL 16, Zod

**Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, Zustand

**Shared:** TypeScript, Zod (walidatory PESEL, NIP, numery PL)

---

## Dane startowe (seed)

Po uruchomieniu `npm run db:seed` system zawiera:

- Konto administratora (admin@np-manager.local)
- 15 statusów spraw z pełnym workflow
- Wszystkie przejścia statusów z kontrolą uprawnień
- 6 typów dokumentów
- 5 przykładowych operatorów telekomunikacyjnych
- Ustawienia systemowe (SLA, limity plików)
- Kalendarz świąt 2026

---

## Staging deployment (demo/QA)

Etap 13 — pierwsze wdrożenie staging/demo. Realne SMTP, realne PLI CBD oraz dane produkcyjne **nie są** w zakresie tego środowiska.

### Rekomendowana architektura

| Warstwa | Platforma | Uwagi |
|---|---|---|
| Backend (Fastify, long-running Node) | Railway (lub VPS / Fly.io / Render) | `railway.json` w root — build + healthcheck `/health`. **Nie** Vercel serverless. |
| PostgreSQL 16 | Railway Postgres / Neon / Supabase / RDS | `DATABASE_URL` przekazany do backendu |
| Frontend (Vite SPA static) | Vercel / Netlify / Railway static / GH Pages | `vercel.json` (root) ma SPA fallback (`/(.*) → /index.html`), outputDirectory `apps/frontend/dist` |

### Wymagane zmienne środowiskowe — backend (staging)

| Klucz | Wartość staging |
|---|---|
| `NODE_ENV` | `staging` |
| `PORT` | ustawiane przez platformę (Railway injectuje); backend nasłuchuje `0.0.0.0:$PORT` |
| `DATABASE_URL` | `postgresql://USER:PASS@HOST:PORT/DB` (managed Postgres) |
| `JWT_SECRET` | min. 32 znaki, unikalny — `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `8h` (lub krócej dla demo) |
| `FRONTEND_URL` | publiczny URL frontendu staging (CORS allow-origin) |
| `LOG_LEVEL` | `info` |
| `UPLOAD_DIR` | `./uploads` (uwaga: ephemeral FS na Railway — pliki znikają po redeploy) |
| `MAX_FILE_SIZE_MB` | `10` |
| `INTERNAL_NOTIFICATION_EMAIL_ADAPTER` | `STUB` (brak realnego SMTP na stagingu) |
| `SMTP_*` | puste |
| `PLI_CBD_TRANSPORT_MODE` | `STUB` |
| `PLI_CBD_REAL_SOAP_*` | puste / domyślne placeholdery |

### Wymagane zmienne — frontend (staging)

| Klucz | Wartość staging |
|---|---|
| `VITE_API_URL` | publiczny URL backendu staging, np. `https://np-manager-api.up.railway.app` |
| `VITE_APP_NAME` | `NP-Manager (staging)` (opcjonalne) |

### Kroki wdrożenia

1. **Postgres** — utwórz bazę staging i pobierz `DATABASE_URL`.
2. **Backend (Railway)**:
   - Połącz repo, root `/`, plik `railway.json` zostanie wykryty automatycznie.
   - Build: `npm ci && npm run build -w packages/shared && npm run build -w apps/backend` (wykonywany przez Railway).
   - Start: `npm run db:migrate:prod -w apps/backend && npm run start -w apps/backend` — migracje uruchamiają się przed startem.
   - Healthcheck: `/health`.
   - Ustaw zmienne środowiskowe z tabeli powyżej.
3. **Seed QA (jednorazowo, ręcznie)**:
   ```bash
   railway run --service backend npm run db:seed -w apps/backend
   ```
   Seed jest idempotentny i tworzy konta: `admin`, `bok`, `back-office`, `manager`, `auditor`. **Nie uruchamiaj seeda na produkcji z realnymi danymi.**
4. **Frontend (Vercel)**:
   - Project root: `apps/frontend` (lub root z `vercel.json` — patrz plik).
   - Ustaw `VITE_API_URL` na URL backendu staging.
   - Build/output zdefiniowane w `apps/frontend/vercel.json`.
5. **CORS** — upewnij się, że `FRONTEND_URL` na backendzie = dokładny URL deployu frontendu (bez trailing slash).

### Smoke checklist (po każdym deployu staging)

- [ ] `GET /health` → `200`
- [ ] `GET /health/ready` → `200` (DB osiągalna, schema OK)
- [ ] Login: ADMIN, BOK, BACK_OFFICE, MANAGER, AUDITOR
- [ ] Utworzenie sprawy FNP (BOK)
- [ ] Przejście DRAFT → SUBMITTED
- [ ] Anulowanie błędnej sprawy (Etap 10 flow)
- [ ] `/reports` dostępne dla ADMIN i MANAGER i AUDITOR
- [ ] `/reports` zablokowane dla BOK (403/redirect)
- [ ] Brak błędów CORS w konsoli przeglądarki

### Znane ograniczenia staging

- PLI CBD: tryb STUB, brak realnej integracji SOAP.
- Notyfikacje email: STUB, brak realnej wysyłki.
- Dane: tylko demo/QA z seeda — **nie używać realnych danych klientów**.
- Uploads na Railway: ephemeral FS — załączniki giną po redeploy (akceptowalne dla demo, do zmiany przy produkcji: S3/object storage).
- Brak skonfigurowanego CI/CD (deploy ręczny / przez integrację Railway+GitHub).
- Brak realnych sekretów w repo — wszystkie wartości są przykładowe.

---

## Deployment checklist

Przed wdrożeniem na środowisko produkcyjne lub staging:

- [ ] Ustaw `NODE_ENV=production` w środowisku backendu
- [ ] Wygeneruj silny `JWT_SECRET` (min. 32 znaki): `openssl rand -hex 32`
- [ ] Ustaw `DATABASE_URL` wskazujący na produkcyjną bazę PostgreSQL
- [ ] Ustaw `FRONTEND_URL` na docelowy adres frontendu (CORS)
- [ ] Uruchom migracje przed startem: `npm run db:migrate:prod`
- [ ] Zweryfikuj health check: `GET /health/ready` powinno zwracać `200`
- [ ] Ustaw `INTERNAL_NOTIFICATION_EMAIL_ADAPTER=STUB|REAL|DISABLED` zgodnie z potrzebą
- [ ] Nie seeduj kont QA na produkcji (`npm run db:seed` tylko dev/demo)
- [ ] Zmień hasło pgAdmin (`admin123`) jeśli pgAdmin jest dostępny publicznie
- [ ] Backend: długo żyjący proces Node.js (Railway, VPS) — nie Vercel serverless
- [ ] Frontend: statyczny hosting (Vercel, Netlify, nginx) z `VITE_API_URL` wskazującym na backend

---

## Bezpieczeństwo

- Nie commituj pliku `.env` do repozytorium
- Zmień domyślne hasło admina i hasło pgAdmin przed wdrożeniem
- W środowisku produkcyjnym ustaw `NODE_ENV=production`
- Wygeneruj silny `JWT_SECRET` (min. 32 znaki) przed wdrożeniem
