# NP-Manager — produkt, wymagania i przygotowanie przebudowy

Stan dokumentacji: 2026-10-09. To przygotowanie decyzji, nie zatwierdzony projekt nowej aplikacji.

## Źródła i odpowiedzialności

[Indeks w Notion](https://app.notion.com/p/3f3daa43f5688183baf6f727b9eb8004) rozdziela:
- A: praca BOK — hipotezy, zadania i scenariusze do obserwacji;
- B: wymagania, decyzje, plan UX/odbioru, ocena modułów i brief Figma;
- C: 28 rozdziałów opisu obecnej implementacji, testów i doświadczeń.

- [A1 — Produkt i rzeczywista praca BOK](https://app.notion.com/p/3f4daa43f56881498c73c5cbe64f1c66)
- [A2 — Scenariusze pracy i kryteria odbioru](https://app.notion.com/p/3f4daa43f56881718c77edc9c4435515)
- [B1 — Reguły, wymagania i rejestr decyzji](https://app.notion.com/p/3f4daa43f5688171806af2a60247104f)
- [B2 — Plan UX, dowody i bramki odbioru](https://app.notion.com/p/3f4daa43f56881288779fe7f745b8192)
- [B3 — Moduły, warianty MVP i decyzja o przebudowie](https://app.notion.com/p/3f4daa43f56881b887a7f614c0397613)
- [B4 — Audyt, ryzyka i brief Figma](https://app.notion.com/p/3f4daa43f56881ccbbe7e95779a0aae5)

Treść R01–R22 pozostaje w [13.1 — Doświadczenia i wymagania](https://app.notion.com/p/3f3daa43f56881549147d16c2d4abebe). B1 dodaje priorytety robocze, D01–D12 i proces zatwierdzania. Nie tworzymy drugiej sprzecznej kopii wymagań w repo.

## Status faktów i decyzji

- Obecne zachowanie jest związane z konkretnym SHA.
- Propozycja nie jest zatwierdzonym wymaganiem. Zatwierdzenie wymaga osoby, daty, wersji, uzasadnienia i powiązanego scenariusza.
- Wszystkie nowe T01–T12, D01–D12 i M01–M14 wymagają uzgodnienia. Role konsultacyjne nie są przydziałem pracy konkretnym osobom.
- Nie przeprowadzono w tym uzupełnieniu badań BOK, browser E2E, odbioru PLI ani rzeczywistych wysyłek.
- Nie zdecydowano o rewrite, nowym stacku, usunięciu modułów ani migracji danych.
- Brief F01–F05 jest przygotowany. Publikacja diagramu FigJam wymaga wyboru planu/zespołu w widżecie; nie jest potwierdzonym plikiem ani klikalnym prototypem.

## Kolejność decyzji

1. Obserwacja rzeczywistej pracy i narzędzi zespołu (A1).
2. Zatwierdzenie zakresu MVP, reguł i kryteriów właściwych scenariuszy (A2/B1).
3. Prototyp i badanie użyteczności z zapisem wyników (B2/B4).
4. Decyzja zachować/przebudować/wycofać dla modułów, z kosztem i zależnościami (B3).
5. Jeden pełny flow i odbiór wybranego trybu; osobne warunki pilota manualnego, integracji i migracji.

Pilot manualny nie wymaga pozornego uznania PLI za działające. Wymaga jasnego obiegu poza aplikacją i odróżnienia symulacji, potwierdzenia ręcznego i efektu rzeczywistego. Pilot zintegrowany wymaga realnego transportu i zewnętrznego dowodu odbioru.

## Wersje i wyniki techniczne

Snapshot kodu: GitHub main `1292827587e0ec6439643e3735f187fbffb0623f`. Lokalny checkout `091e533a7a9b642ae6d8b8d7153adbbd290e7877` różni się trzema plikami API klienta/testu/env frontendu.

Powtórzenie 2026-10-09 na lokalnym checkout:
- `npx vitest run` w apps/backend: 74 pliki, 604 testy PASS;
- `npx vitest run` w apps/frontend: 51 plików PASS / 1 FAIL; 447 testów PASS / 1 FAIL — istniejąca asercja Email kontra E-mail w RequestOperationalDetailsPanel;
- `npx tsc --noEmit` w obu apps: PASS.

To wynik lokalnego SHA, nie suite dokładnego GitHub main ani docs-only PR. Nie wykonywano builda, nowego badania BOK, browser E2E ani realnych integracji. Wynik shared 4/4 source i błąd default discovery dist pochodzą z 2026-10-08; nie zostały powtórzone w tym uzupełnieniu.

## Utrzymanie

Po zmianie reguły aktualizować odpowiednie R/D/T, źródła w C, DTO/API/UI/testy oraz continuity. Notion jest źródłem treści produktu, a repo źródłem implementacji; odnośniki nie zastępują wersjonowania. Starsza roadmapa jest oznaczona jako historyczna, a nie obowiązujący backlog.
