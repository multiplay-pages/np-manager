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

Po seedzie dostępne jest konto administratora:
- **E-mail:** `admin@np-manager.local`
- **Hasło:** `Admin@NP2026!`

> ⚠️ Zmień hasło administratora po pierwszym zalogowaniu.

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

## Bezpieczeństwo

- Nie commituj pliku `.env` do repozytorium
- Zmień domyślne hasło admina i hasło pgAdmin przed wdrożeniem
- W środowisku produkcyjnym ustaw `NODE_ENV=production`
- Wygeneruj silny `JWT_SECRET` (min. 32 znaki) przed wdrożeniem
