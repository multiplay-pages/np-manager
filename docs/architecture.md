# Architektura NP-Manager

Dokument opisujący decyzje architektoniczne i strukturę systemu.

## Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| Backend | Node.js 20 + Fastify 4 + TypeScript | Wydajny, wbudowana walidacja schematów, lepsza typizacja niż Express |
| ORM | Prisma 5 | Type-safe queries, wersjonowane migracje, Prisma Studio |
| Baza danych | PostgreSQL 16 | ACID, JSONB, enum arrays, pełnotekstowe wyszukiwanie |
| Frontend | React 18 + Vite 5 + TypeScript | Dojrzały ekosystem, HMR, szybki build |
| Styling | Tailwind CSS 3 | Utility-first, brak vendor lock-in |
| State | Zustand | Prosty, bez boilerplate |
| Walidacja | Zod (współdzielona) | Jeden schemat → frontend + backend |
| Auth | JWT (@fastify/jwt) | Bezstanowy, skalowalny |

## Dokumenty analityczne

- Etap 1: Analiza biznesowa i procesowa
- Etap 2: Plan techniczny i model danych
- Etap 3: Reguły biznesowe i zgodność procesowa

Szczegółowe dokumenty dostępne u architekta systemu.
