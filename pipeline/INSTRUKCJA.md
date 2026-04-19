# NP-Manager Dev Pipeline V2 – Instrukcja obsługi

> Wersja gotowa do pracy lokalnej: guardy, walidacja build/test, review prompt i raport etapu.

---

## 1. Po co to jest

Budujesz NP-Manager przy pomocy AI i chcesz pracować w uporządkowany sposób:
- jeden model pisze kod,
- drugi model robi review,
- Ty masz kontrolę nad zakresem, testami i historią cykli.

Ten pipeline pomaga Ci to robić bez chaosu. Skrypt:
- prowadzi Cię przez etapy z `plan.json`,
- generuje gotowe prompty do skopiowania,
- zapisuje diff zmian,
- pilnuje guardów bezpieczeństwa,
- uruchamia walidację techniczną,
- generuje prompt do review,
- zapisuje historię i raport etapu.

### Czego skrypt NIE robi

- nie rozmawia z AI przez API,
- nie klika za Ciebie w Codex / Claude / ChatGPT,
- nie commituje automatycznie kodu.

To nadal jest półautomat, ale uporządkowany i bezpieczny.

---

## 2. Jakie pliki wchodzą w skład pipeline'u

W folderze `pipeline/` masz 4 najważniejsze pliki:

- `run.js` – główny skrypt / orchestrator,
- `plan.json` – plan etapów i konfiguracja guardów,
- `state.json` – aktualny stan pracy,
- `INSTRUKCJA.md` – ten dokument.

Dodatkowo skrypt sam tworzy foldery pomocnicze:

- `pipeline/prompts/` – gotowe prompty do wklejenia,
- `pipeline/diffs/` – zapis diffów,
- `pipeline/reports/` – wyniki walidacji,
- `pipeline/logs/` – raporty zakończonych etapów.

### Ważne

Artefakty tworzone przez pipeline są ignorowane przy analizie `git diff` i `git status` wewnątrz skryptu. Dzięki temu reviewer AI widzi głównie zmiany w kodzie aplikacji, a nie pliki pomocnicze pipeline'u.

---

## 3. Jednorazowe wdrożenie na laptopie

### Krok 1 – skopiuj pliki

Do folderu `pipeline/` w repo NP-Manager skopiuj:
- `run.js`
- `plan.json`
- `state.json`
- `INSTRUKCJA.md`

### Krok 2 – przejdź do repo

W terminalu:

```bash
cd C:\Users\cicha\OneDrive\Desktop\Projekt\np-manager
```

### Krok 3 – uruchom test startu

```bash
node pipeline\run.js
```

Jeśli widzisz menu z opcjami `[1] [2] [3] [4] [Q]`, to pipeline działa poprawnie.

---

## 4. Co jest już ustawione w tej wersji

Ta wersja jest przygotowana tak, żebyś nie startował z placeholdera.

### Etap 1

Etap 1 jest już oznaczony jako historycznie ukończony.

### Etap 2

Aktywny etap to:

**Auto-dismiss komunikatu sukcesu retry w RequestDetailPage**

Czyli pierwszy realny prompt, jaki pipeline wygeneruje, będzie już dotyczył konkretnego zadania frontendowego, a nie pustego szablonu.

---

## 5. Jak działa codzienny flow pracy

Po uruchomieniu:

```bash
node pipeline\run.js
```

zobaczysz menu.

### Opcja [1] – Generuj prompt dla AI (kod)

Używaj tej opcji, gdy chcesz zlecić modelowi napisanie lub poprawienie kodu.

#### Co robi skrypt

- czyta aktywny etap z `plan.json`,
- bierze pod uwagę aktualny cykl z `state.json`,
- jeśli poprzednia decyzja była `FIX`, dokleja feedback z poprzedniego cyklu,
- zapisuje gotowy prompt do:

`pipeline/prompts/codex-prompt.md`

#### Co robisz Ty

1. Otwórz `pipeline/prompts/codex-prompt.md`
2. Skopiuj całość
3. Wklej do Codex albo Claude Code
4. Poczekaj aż AI rzeczywiście zapisze pliki na dysku
5. Wróć do terminala i wybierz `[2]`

---

### Opcja [2] – AI skończyło: diff + guardy + walidacja + review prompt

To jest najważniejsza opcja po pracy modelu.

#### Co robi skrypt krok po kroku

1. sprawdza `git status` (bez artefaktów pipeline'u),
2. zapisuje diff do `pipeline/diffs/...`,
3. sprawdza guardy (`forbidden_paths` + `allow_paths`),
4. jeśli guardy są OK – uruchamia walidację techniczną,
5. zapisuje raport walidacji do `pipeline/reports/...`,
6. generuje prompt do review w:

`pipeline/prompts/review-prompt.md`

#### HARD STOP – bardzo ważne

Jeśli skrypt wykryje zmiany w zabronionych ścieżkach, np.:
- `apps/backend/`
- `prisma/`
- `packages/shared/`
- `package.json`

wtedy:
- zapisze diff jako ślad audytowy,
- pokaże listę naruszeń,
- pokaże gotowe komendy `git checkout -- ...`,
- **NIE uruchomi walidacji**,
- **NIE wygeneruje review promptu**,
- zakończy opcję `[2]`.

Dopiero po cofnięciu niedozwolonych zmian albo dopisaniu wyjątku do `allow_paths` możesz uruchomić `[2]` ponownie.

#### Co robisz Ty po poprawnym przejściu [2]

1. Otwórz `pipeline/prompts/review-prompt.md`
2. Skopiuj całość
3. Wklej do drugiego modelu AI (nie tego, który pisał kod)
4. Odbierz odpowiedź z decyzją `OK` albo `FIX`
5. Wróć do terminala i wybierz `[3]`

---

### Opcja [3] – Wklej decyzję AI (OK / FIX)

Po review wpisujesz decyzję.

#### Jeśli decyzja to OK

Skrypt:
- zapisze wynik do historii,
- oznaczy etap jako `done: true` w `plan.json`,
- zresetuje cykl dla kolejnego etapu,
- wygeneruje raport etapu w `pipeline/logs/...`,
- pokaże dalsze kroki.

#### Jeśli decyzja to FIX

Skrypt:
- zapisze feedback reviewera,
- zwiększy numer cyklu,
- przy następnym `[1]` dołączy poprawki do promptu dla modelu wykonawczego.

#### Jeśli dojdziesz do 3 cykli FIX

Skrypt nie będzie już kręcił się w nieskończoność. Dostaniesz komunikat, że trzeba:
- rozbić etap na mniejsze zadania,
- poprawić ręcznie,
- albo zacząć od nowa z lepszym opisem.

---

### Opcja [4] – Pokaż raport etapu

Po zakończeniu etapu decyzją `OK` możesz wyświetlić raport etapu.

To jest materiał do końcowego audytu architektonicznego w ChatGPT.

#### Co robisz dalej

1. Otwórz raport
2. Wklej go do ChatGPT
3. Poproś o audyt architektoniczny
4. Jeśli audyt jest OK – zrób commit i push

---

## 6. Jak wygląda pełny cykl pracy

W skrócie:

1. `[1]` – generujesz prompt dla modelu wykonawczego
2. wklejasz prompt do Codex / Claude Code
3. model zapisuje kod
4. `[2]` – pipeline robi diff, guardy, walidację i prompt do review
5. review prompt wklejasz do drugiego modelu AI
6. `[3]` – wpisujesz `OK` albo `FIX`
7. po `OK` robisz audyt w ChatGPT
8. commit + push

W jednej linii:

```text
[1] prompt → AI pisze kod → [2] diff+guardy+walidacja+review → drugi model ocenia → [3] OK/FIX → audyt ChatGPT → commit
```

---

## 7. Co robić w typowych problemach

### Problem 1 – prompt wygenerował się, ale AI nic nie zapisało

Objaw:
- w opcji `[2]` skrypt nie widzi zmian,
- diff jest pusty.

Co zrobić:
1. Sprawdź pliki w VS Code
2. Zapisz je ręcznie, jeśli trzeba (`Ctrl+S`)
3. Jeśli AI tylko opisało zmiany, wróć do modelu i napisz:
   
   **"Nie opisałeś tylko zmian – zapisz pliki realnie na dysku."**
4. Uruchom `[2]` ponownie

---

### Problem 2 – HARD STOP przez forbidden_paths

Objaw:
- skrypt pokazuje czerwony komunikat,
- listę zabronionych plików,
- i zatrzymuje się.

Co zrobić:

#### Wariant A – cofnij niedozwolone zmiany

Skorzystaj z komend podanych przez skrypt, np.:

```bash
git checkout -- "package.json"
```

Potem uruchom `[2]` jeszcze raz.

#### Wariant B – etap naprawdę wymaga wyjątku

Jeśli wyjątkowo dany etap musi dotknąć pliku spoza standardowego zakresu, dopisz ścieżkę do `allow_paths` w odpowiednim etapie w `plan.json`.

Potem uruchom `[2]` ponownie.

---

### Problem 3 – walidacja zwraca FAIL

To nie oznacza jeszcze, że masz ręcznie wszystko poprawiać.

W praktyce:
- zostaw wynik FAIL w review promptcie,
- daj reviewerowi pełen kontekst,
- reviewer prawie na pewno zwróci `FIX` z konkretnymi poprawkami.

---

### Problem 4 – walidacja zwraca SKIPPED

To znaczy zwykle, że:
- nie ma danego skryptu w workspace,
- albo komenda z `plan.json` nie pasuje do Twojego repo.

Wtedy:
1. Otwórz `plan.json`
2. Popraw komendy w sekcji `validation`
3. Uruchom pipeline ponownie

---

### Problem 5 – skończył się limit w jednym modelu

To nie szkodzi.

Prompty są zapisane w plikach, więc możesz płynnie przejść do innego modelu.

Przykład:
- zacząłeś w Codex,
- kończy Ci się limit,
- bierzesz `pipeline/prompts/codex-prompt.md`,
- wklejasz do Claude Code,
- pracujesz dalej.

Pipeline nie jest przywiązany do jednego modelu.

---

### Problem 6 – chcę zacząć od nowa

Jeśli chcesz zresetować stan pracy:

- usuń `pipeline/state.json`
- uruchom `node pipeline\run.js` ponownie

Skrypt odtworzy stan na podstawie pierwszego etapu z `done: false`.

---

## 8. Co zrobić po wdrożeniu tych 4 plików

### Krok 1
Podmień 4 pliki w `pipeline/`

### Krok 2
Uruchom:

```bash
node pipeline\run.js
```

### Krok 3
Zrób szybki test guardów:
- dodaj drobną zmianę w `package.json`,
- uruchom `[2]`,
- sprawdź czy dostaniesz HARD STOP,
- cofnij zmianę.

### Krok 4
Wróć do normalnej pracy i zacznij od aktywnego etapu 2.

---

## 9. Słownik najważniejszych pojęć

- **etap** – jedno zadanie z `plan.json`
- **cykl** – jedna iteracja pracy nad etapem
- **diff** – tekstowy zapis zmian w plikach
- **review** – ocena zmian przez drugi model AI
- **guard / hard stop** – blokada niedozwolonych zmian
- **walidacja** – testy i build uruchamiane przez skrypt
- **artefakty pipeline'u** – prompty, diffy, raporty i logi tworzone przez skrypt

---

## 10. Najkrótsza wersja obsługi

Jeśli chcesz zapamiętać tylko jedno, to zapamiętaj to:

1. `[1]` – wygeneruj prompt do modelu piszącego kod
2. AI zapisuje kod
3. `[2]` – pipeline robi diff, guardy, testy i prompt do review
4. drugi model robi review
5. `[3]` – wpisujesz `OK` albo `FIX`
6. po `OK` robisz audyt w ChatGPT i commit

Powodzenia 🚀
