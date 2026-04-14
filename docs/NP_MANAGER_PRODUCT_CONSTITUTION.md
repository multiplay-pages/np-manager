# NP-Manager Product Constitution

Ten dokument jest nadrzedna konstytucja produktu NP-Manager. Kazda propozycja zmian, kazdy PR, kazdy refactor, kazda poprawka UI i kazda nowa funkcja musi byc zgodna z tymi zasadami.

## 1. Glowna filozofia produktu

NP-Manager ma byc przede wszystkim:

- czytelnym,
- transparentnym,
- przyjaznym operacyjnie,
- nowoczesnym,
- estetycznym,
- prostym w odbiorze systemem do prowadzenia spraw.

To nie ma byc przeladowana aplikacja enterprise z nadmiarem paneli, badge'y, terminow technicznych i funkcji wrzuconych na jeden ekran.

Najwazniejszy cel produktu: uzytkownik ma rozumiec:

- gdzie jest,
- co widzi,
- co jest wazne,
- co blokuje sprawe,
- co ma zrobic dalej.

Szczegolnie wazne: zwykly uzytkownik operacyjny, ktory "po prostu klika sprawy", nie moze zgubic sie w gaszczu informacji, skrotow, badge'y i terminow, ktorych moze nie rozumiec.

## 2. Architektura produktu: core + moduly

NP-Manager ma byc budowany jako:

```text
CORE + MODULY
```

### Core

Core ma zawierac tylko rzeczy niezbedne dla wiekszosci uzytkownikow:

- logowanie i role,
- lista spraw,
- detail sprawy,
- status workflow,
- ownership / przypisanie,
- historia i audit,
- podstawowe akcje operacyjne,
- jasna informacje "co teraz trzeba zrobic".

Core ma byc:

- maksymalnie prosty,
- czytelny,
- lekki poznawczo,
- bez niepotrzebnych technicznych szczegolow.

### Moduly

Bardziej zaawansowane obszary maja byc traktowane jako moduly lub warstwy drugiego poziomu, np.:

- NotificationOps,
- komunikacja do klienta,
- PLI CBD,
- administracja,
- diagnostyka techniczna,
- integracje,
- metryki i SLA.

Moduly:

- moga byc widoczne tylko dla odpowiednich rol,
- nie moga zasmiecac glownego flow uzytkownika podstawowego,
- maja rozszerzac system, a nie komplikowac core.

Przy kazdej zmianie najpierw ocen:

- czy to nalezy do core,
- czy to nalezy do modulu,
- czy zwykly uzytkownik musi to widziec od razu.

## 3. Zasada maksymalnej przejrzystosci i transparentnosci

System ma byc maksymalnie transparentny dla uzytkownika.

Uzytkownik ma rozumiec:

- dlaczego cos jest zablokowane,
- dlaczego akcja jest niedostepna,
- co wymaga recznej interwencji,
- co mozna wykonac od razu,
- co jest tylko diagnostyka techniczna.

System nie moze sprawiac wrazenia "magicznego" ani ukrywac istotnej logiki bez prostego wyjasnienia.

Zamiast technicznego zargonu preferuj:

- prosty jezyk,
- jasne statusy,
- jednoznaczne komunikaty,
- zrozumiale nazwy akcji.

## 4. Kierunek UI / frontend

Frontend ma byc:

- nowoczesny,
- czysty,
- spokojny wizualnie,
- estetyczny,
- przyjemny w uzyciu,
- uporzadkowany,
- lekki i niezasmiecony.

Inspiracja wizualna:

- Canva-like / premium / clean SaaS,
- ale bez przesady i bez cukierkowosci.

UI ma byc:

- ladne,
- przyjazne,
- uzyteczne,
- nowoczesne,
- z duza dbaloscia o hierarchie informacji,
- z naciskiem na prostote.

Unikaj:

- sciany kart i badge'y,
- zbyt wielu rownorzednych sekcji,
- przeladowanych ekranow,
- ukrytych zaleznosci,
- funkcji dodawanych "na wszelki wypadek",
- skomplikowanego UI, ktore obciaza uzytkownika.

Preferuj:

- wyrazna hierarchie,
- duzo oddechu,
- czytelne sekcje,
- prosty uklad,
- widoczna nastepna akcje,
- progresywne ujawnianie szczegolow.

## 5. Zasada progresywnego ujawniania informacji

Nie wszystko powinno byc widoczne od razu.

Pokazuj:

1. najwazniejsze informacje,
2. potem szczegoly,
3. dopiero potem diagnostyke techniczna.

Zaawansowane informacje:

- chowaj glebiej,
- pokazuj warunkowo,
- pokazuj zaleznie od roli,
- umieszczaj w modulach lub sekcjach drugiego poziomu.

Najpierw ma byc czytelnosc, dopiero potem glebia.

## 6. Zasada rozwoju: male kroki, bez chaosu

Projekt rozwijamy malymi, czytelnymi, bezpiecznymi krokami.

Kazdy PR powinien byc:

- maly,
- celowy,
- testowalny,
- mozliwie waski,
- bez szerokiego rozlewania zakresu,
- bez duzych refactorow "przy okazji".

Nie rob:

- wielkich przebudow bez uzasadnienia,
- rozleglych redesignow bez potrzeby,
- zmian backend/front/shared/UI naraz, jesli mozna to zrobic weziej,
- poprawiania pobocznych rzeczy "przy okazji".

Preferuj:

- jeden maly vertical slice,
- jasny efekt biznesowy,
- testy celowane,
- krotki manual QA,
- merge,
- dopiero potem kolejny krok.

## 7. Zasada porzadku w kodzie

Kod ma byc:

- maksymalnie czytelny,
- dobrze nazwany,
- spojny,
- logicznie uporzadkowany,
- dobrze opisany tam, gdzie logika nie jest oczywista.

Regularnie czysc kod z:

- martwych fragmentow,
- nieuzywanych linii,
- zbednych importow,
- starych helperow,
- porzuconych eksperymentow,
- dublujacej sie logiki,
- pozostalosci po wczesniejszych iteracjach.

Jesli dotykasz danego obszaru kodu, ocen, czy mozesz go:

- uproscic,
- uporzadkowac,
- odchudzic,
- lepiej opisac,
- bez rozpychania zakresu.

Nie zostawiaj niepotrzebnego smietnika w repo.

## 8. Zasada opisywania kodu dla kolejnych devow

Kod ma byc zrozumialy dla kolejnego developera.

Dbaj o:

- dobre nazwy funkcji i zmiennych,
- czytelna strukture plikow,
- lokalne komentarze wyjasniajace intencje,
- krotkie opisy tam, gdzie logika biznesowa nie jest oczywista,
- spojny podzial odpowiedzialnosci.

Developer przegladajacy repo powinien szybko rozumiec:

- po co cos istnieje,
- czy to jest core czy modul,
- co jest swiadomie odlozone,
- jaka jest intencja rozwiazania.

## 9. Zasada jezyka w UI

Komunikaty w UI maja byc:

- proste,
- czytelne,
- konkretne,
- pomocne operacyjnie,
- zrozumiale dla nietechnicznego uzytkownika.

Zamiast technicznych komunikatow preferuj:

- co sie stalo,
- dlaczego,
- co mozna zrobic teraz.

Nie zakladaj wiedzy developerskiej ani domenowej wiekszej niz konieczna.

## 10. Jak oceniac kazda zmiane

Kazda proponowana zmiane ocen wedlug 4 filtrow.

### Filtr produktowy

Czy to realnie pomaga uzytkownikowi wykonywac prace?

### Filtr UX

Czy ekran po tej zmianie jest prostszy i bardziej przejrzysty?

### Filtr architektury

Czy to nalezy do core czy do modulu?

### Filtr kodowy

Czy kod po tej zmianie jest czytelniejszy i bardziej uporzadkowany?

Jesli zmiana nie przechodzi tych filtrow, zawez ja albo zaproponuj lepszy wariant.

## 11. Jak pracowac przy kolejnych zadaniach

Przy kazdym zadaniu:

1. Najpierw ocen, czy temat dotyczy core czy modulu.
2. Zaproponuj najmniejszy sensowny zakres.
3. Unikaj dokladania zbednej zlozonosci.
4. Dbaj o czytelnosc UI i kodu.
5. Wskazuj rzeczy swiadomie odlozone poza zakres.
6. Jesli cos jest za szerokie, rozbij to na mniejsze etapy.
7. Jesli zmiana dotyczy UI, pilnuj stylu: clean, premium, przyjazny, nowoczesny, prosty.

## 12. Czego unikac

Nie rob:

- chaosu informacyjnego,
- przeladowanych ekranow,
- technicznego jezyka bez potrzeby,
- przypadkowych refactorow,
- szerokich zmian bez planu,
- dokladania funkcji bez jasnej wartosci,
- ukrywania waznej logiki przed uzytkownikiem,
- zasmiecania kodu.

## 13. Oczekiwany styl odpowiedzi przy pracy nad repo

Gdy pracujesz nad zadaniem:

1. Najpierw krotko opisz proponowany zakres.
2. Wskaz pliki do zmiany.
3. Wykonaj minimalny potrzebny zakres.
4. Opisz, co zostalo zrobione.
5. Wskaz, czego swiadomie nie robiles.
6. Zaproponuj ewentualny nastepny maly krok.

Masz dzialac jak odpowiedzialny architekt i produktowiec, a nie tylko generator kodu.

Najwazniejsza zasada koncowa: NP-Manager ma byc systemem profesjonalnym, nowoczesnym, lekkim dla uzytkownika, przejrzystym i mocnym operacyjnie. Kazda zmiana ma wzmacniac te cechy, a nie je oslabiac.
