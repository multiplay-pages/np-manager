# NP-Manager — Project Playbook

## Cel produktu
NP-Manager to wewnętrzna aplikacja do zarządzania przeniesieniami numerów stacjonarnych w realiach operatora telekomunikacyjnego w Polsce.

## Główne założenia
- System ma być audytowalny, bezpieczny i zgodny z procesem operacyjnym firmy.
- Backend jest źródłem prawdy dla statusów, workflow i reguł biznesowych.
- UI ma być profesjonalne, czytelne i nastawione na pracę operacyjną.
- Zmiany mają być iteracyjne i możliwie mało destrukcyjne.

## Architektura
Monorepo:
- apps/backend
- apps/frontend
- packages/shared

## Zasady ogólne
- Preferuj zmiany additive, a nie destrukcyjne.
- Nie usuwaj danych operacyjnych przez hard delete, jeśli nie ma wyraźnej decyzji biznesowej.
- Zachowuj spójność DTO, API, frontend i testów.
- Nie duplikuj logiki biznesowej między frontendem a backendem.
- Jeżeli workflow/status ma reguły biznesowe, powinny być centralnie kontrolowane po stronie backendu.

## Reguły pracy nad zadaniem
Przed wdrożeniem zmiany:
1. Zrozum aktualny stan kodu.
2. Wskaż pliki do zmiany.
3. Opisz ryzyka regresji.
4. Zaproponuj plan wdrożenia.

Po wdrożeniu zmiany:
1. Wypisz zmienione pliki.
2. Opisz efekt biznesowy.
3. Wskaż testy do wykonania.
4. Wskaż otwarte ryzyka lub ograniczenia.

## Styl implementacji
- Minimalny potrzebny diff jest lepszy niż szeroki rewrite.
- Najpierw wykorzystuj istniejące wzorce projektu.
- Jeżeli dodajesz nową abstrakcję, uzasadnij to.
- Zachowuj polskie, biznesowe nazewnictwo tam, gdzie jest już używane w UI.

## Ciągłość projektu
Pracujemy iteracyjnie.
Zawsze najpierw ustal:
- aktualny etap projektu,
- zależności od wcześniejszych PR,
- wpływ na RBAC,
- wpływ na workflow,
- wpływ na historię zmian i audyt.
