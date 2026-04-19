# Zadanie: Auto-dismiss komunikatu sukcesu retry w RequestDetailPage
Projekt: NP-Manager | Cykl: 1 | Tryb: frontend-only



## Opis zadania

Dodaj automatyczne znikanie komunikatu sukcesu po retry internal notification attempt. Komunikat sukcesu w RequestDetailPage powinien znikać sam po około 3 sekundach bez resetowania całego panelu i bez wpływu na komunikat błędu. Zachowaj obecny backend-driven flow: brak zmian w backendzie, brak nowego API, brak zmian w DTO. Jeśli komunikat błędu jest widoczny, nie ma być automatycznie czyszczony tym mechanizmem. Preferuj prosty useEffect + setTimeout z poprawnym cleanup.

## Acceptance criteria

1. Komunikat sukcesu retry znika automatycznie po około 3 sekundach
2. Mechanizm auto-dismiss nie resetuje całego panelu ani listy attempts
3. Komunikat błędu nie jest automatycznie czyszczony tym samym mechanizmem
4. Rozwiązanie ma cleanup timera i nie tworzy wycieków po unmount lub zmianie komunikatu
5. Brak zmian w backendzie, packages/shared, prisma i package.json

## Zasady – bezwzględne

- Zakres zmian: **frontend-only**
- Zabronione ścieżki:
- apps/backend/
- prisma/
- packages/shared/
- package.json
- package-lock.json
- pnpm-lock.yaml
- yarn.lock
- Wyjątki dla tego etapu:
- brak wyjątków
- NIE modyfikuj package.json / lockfile / backendu / prismy / shared, chyba że allow_paths mówi inaczej.
- NIE dodawaj nowych zależności npm.
- NIE importuj kodu backendu do frontendu.
- Używaj istniejących komponentów, hooków i publicznego kontraktu API.
- Zachowaj styl kodu i nazewnictwo z repo.
- Po zmianach pliki MUSZĄ być zapisane na dysku.

## Pliki do edycji (wskazówka)

apps/frontend/src/pages/Requests/RequestDetailPage.tsx
apps/frontend/src/components/InternalNotificationAttemptsPanel/InternalNotificationAttemptsPanel.test.tsx (jeśli potrzebny test)

## Format pracy

1. W 2-3 zdaniach opisz plan.
2. Edytuj pliki i zapisz je na dysku.
3. Na końcu wypisz:
   - listę zmienionych plików,
   - krótkie podsumowanie zmian.

Zacznij od razu. Nie pytaj o potwierdzenie.