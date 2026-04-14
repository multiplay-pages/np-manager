# NP-Manager - filozofia produktu i roadmapa wdrozeniowa 2026

Dokument Etapu 0. Cel: uporzadkowac kierunek produktu przed kolejnymi PR-ami. Nie jest to pelny audyt repo ani specyfikacja wszystkich funkcji.

## 1. Obecny stan produktu

NP-Manager jest monorepo dla systemu obslugi przenoszenia numerow stacjonarnych w Polsce. Backend Fastify + Prisma jest zrodlem prawdy dla workflow, RBAC, walidacji i audit logu. Frontend React/Vite pokazuje liste spraw, szczegol sprawy, akcje statusowe, ownership, komunikacje, diagnostyke notyfikacji i foundation integracji PLI CBD.

Produkt ma juz kilka istotnych fundamentow:

- sprawy portowania z kontrolowanym statusem i dozwolonymi akcjami z backendu,
- operacyjne filtry listy, summary cards i health notyfikacji,
- przypisanie techniczne BOK oraz opcjonalny opiekun handlowy SALES,
- komunikacje do klienta jako drafty e-mail z szablonow,
- wewnetrzne notyfikacje eventowe z transportem e-mail/Teams, audytem, health, fallbackiem i retry backendowym,
- PLI CBD jako foundation: drafty, payloady, XML preview, manualny eksport, historia integracji i tryby transportu.

Obecny produkt jest bardziej "operacyjnym pulpitem do kontroli spraw" niz prostym CRUD-em. Najwieksze ryzyko nie lezy teraz w braku kolejnego widgetu, ale w rozmyciu priorytetow: wiele paneli i sciezek istnieje rownolegle, a uzytkownik potrzebuje jasnej odpowiedzi "co mam zrobic teraz i co jest ryzykiem".

## 2. Problem, ktory produkt naprawde rozwiazuje

NP-Manager ma zmniejszyc ryzyko operacyjne w procesie przeniesienia numeru: zagubione sprawy, brak wlasciciela, niejasny status, brak sladu decyzji, opozniona reakcja na bledy notyfikacji lub integracji oraz reczna komunikacja bez kontroli.

Produkt nie istnieje po to, aby "ladnie przechowywac dane o sprawach". Istnieje po to, aby zespoly BOK, Back Office, Managerowie i Sales wiedzialy:

- ktore sprawy wymagaja dzialania,
- kto odpowiada za relacje handlowa,
- czy klient i zespol dostali potrzebne komunikaty,
- czy proces regulacyjno-techniczny jest gotowy do dalszego kroku,
- jaki slad audytowy uzasadnia decyzje.

## 3. Persony i role

- BOK Consultant: zaklada i prowadzi sprawy, uzupelnia dane, przypisuje obsluge, wykonuje podstawowe akcje operacyjne.
- Back Office: prowadzi kroki merytoryczne, reakcje na dawce, przygotowanie do PLI CBD, decyzje o statusie.
- Manager: kontroluje kolejke, ryzyka, bledy, pokrycie ownership i jakosc procesu.
- Sales / Opiekun handlowy: odpowiada za relacje z klientem i powinien widziec sprawy, w ktorych jego reakcja ma znaczenie.
- Admin: konfiguruje uzytkownikow, slowniki, ustawienia notyfikacji i tryby techniczne.
- Technical / Integrations: diagnozuje payloady, XML, transport i historie PLI CBD.
- Auditor / Legal: potrzebuje podgladu historii, decyzji, statusow, komunikacji i sladu audytowego.

## 4. Filozofia produktu

### Misja

NP-Manager ma byc operacyjnym systemem kontroli procesu portowania numerow: prowadzi sprawy przez kolejne decyzje, minimalizuje ryzyko pomylek, zostawia audytowalny slad i stopniowo automatyzuje transport oraz integracje bez utraty kontroli przez operatora.

### Zasady projektowe

1. Backend jest zrodlem prawdy.
   Frontend nie decyduje sam o workflow, rolach, filtrze "moje" ani dostepnosci akcji.

2. Najpierw kontrola operacyjna, potem automatyzacja.
   Automatyzujemy tylko proces, ktory jest zrozumiany, widoczny i ma retry/audit.

3. Male PR-y, addytywne zmiany.
   Nie przebudowujemy calego UI, schemy ani domeny bez konkretnej potrzeby biznesowej.

4. Kazda mutacja musi miec slad.
   Status, ownership, komunikacja, integracja i retry musza byc odtwarzalne z historii.

5. Uzytkownik ma widziec nastepna akcje, nie tylko dane.
   Lista i detail maja pomagac znalezc sprawy wymagajace reakcji.

6. Oddzielamy strumienie komunikacji.
   Notyfikacje wewnetrzne, komunikacja do klienta i integracja PLI CBD maja inne cele, odbiorcow i ryzyka.

7. Brak zaufania do danych z klienta UI.
   Operacje zalezne od tozsamosci, uprawnien i ownershipu musza byc rozstrzygane backendowo.

### Czego produkt NIE ma robic

- Nie ma byc CRM-em ogolnego przeznaczenia.
- Nie ma zastapic pelnego systemu billingowego, ticketowego ani hurtowego OSS/BSS.
- Nie ma mieszac komunikacji do klienta z wewnetrznym alertingiem.
- Nie ma ukrywac bledow integracji za "sukcesem" UI.
- Nie ma automatycznie wykonywac ryzykownych krokow PLI CBD bez diagnostyki, retry i jasnych uprawnien.
- Nie ma rozwijac redesignu jako celu samego w sobie.

### Jak podejmujemy decyzje o priorytetach

Priorytet ma praca, ktora:

1. zmniejsza liczbe spraw bez wlasciciela lub bez nastepnej akcji,
2. skraca czas reakcji na blad notyfikacji, komunikacji lub PLI CBD,
3. wzmacnia zgodnosc procesu i audyt,
4. upraszcza codzienna prace BOK/Back Office/Managera bez redesignu,
5. zamyka istniejacy foundation w uzywalny przeplyw.

Nizszy priorytet maja zmiany, ktore sa glownie kosmetyczne, wymagaja szerokiego refaktoru albo dokladaja nowy obszar bez domkniecia istniejacych fundamentow.

### Operacyjnosc, compliance, automatyzacja i UX

- Operacyjnosc jest pierwsza: system ma pokazac kolejke, ryzyko i nastepna akcje.
- Compliance jest warunkiem brzegowym: akcje musza byc kontrolowane rolami, walidowane i audytowane.
- Automatyzacja jest etapem dojrzalosci: najpierw widocznosc, potem reczne wykonanie z audytem, potem retry, dopiero potem automatyczne wyzwalanie.
- UX ma sluzyc decyzyjnosci: mniej szumu, lepsze etykiety, sensowne domyslne widoki, bez wielkiego redesignu w Etapie 1.

## 5. Kierunek 6-12 miesiecy

Docelowo NP-Manager powinien stac sie kontrolowana konsola operacyjna dla calego procesu FNP:

- jedna kolejka pracy pokazujaca sprawy wymagajace reakcji,
- czytelny status procesu: sprawa, komunikacja do klienta, notyfikacje wewnetrzne, PLI CBD,
- pierwszoklasowe retry dla problemow transportowych i integracyjnych,
- dojrzala integracja PLI CBD: od manual foundation do realnego transportu SOAP z kontrola bledow,
- konsekwentny model ownership: BOK jako ownership operacyjny, SALES jako relacja handlowa,
- admin settings jako kontrolowane centrum konfiguracji, nie zbior przypadkowych przelacznikow,
- redesign UI dopiero po ustaleniu przeplywow i metryk operacyjnych.

## 6. Roadmapa etapowa

### Etap 0 - Filozofia i roadmapa

Cel:
Utrwalic kierunek produktu, zasady priorytetyzacji i kolejnosc wdrozen.

Zakres:
- nowy dokument filozofii i roadmapy,
- opis person, misji, zasad i etapow,
- wskazanie jednego malego Etapu 1.

Czego nie obejmuje:
- zmian w kodzie aplikacji,
- migracji DB,
- redesignu UI,
- uruchamiania pelnej walidacji repo.

Zaleznosci:
- aktualny AGENTS.md,
- docs/PROJECT_CONTINUITY.md,
- ograniczony odczyt kluczowych plikow frontend/backend.

Ryzyka:
- dokument bazuje na ograniczonej probce, wiec nie zastapi pelnego discovery.

Definition of Done:
- dokument istnieje w `docs/`,
- jasno wskazuje Etap 1,
- nie zmienia zachowania aplikacji.

### Etap 1 - Operacyjna kolejka problemow notyfikacji

Cel:
Domknac istniejacy foundation NotificationOps w maly, uzywalny przeplyw pracy: operator widzi bledne proby dostarczenia notyfikacji i moze szybko przejsc do sprawy/retry.

Zakres:
- wykorzystac istniejace backendowe podstawy: attempts, eligibility, request-scoped retry, global failure queue foundation,
- dodac minimalny widok lub sekcje "Problemy notyfikacji" dostepna dla rol operacyjnych,
- pokazac najwazniejsze pola: sprawa, event, kanal, odbiorca, outcome, failureKind, retry count, czas ostatniej proby, blokada retry,
- akcja: przejscie do szczegolu sprawy; retry tylko jesli bezpiecznie miesci sie w istniejacym endpointzie i RBAC,
- bez zmiany schemy i bez przebudowy detail page.

Czego nie obejmuje:
- redesignu listy spraw,
- nowego systemu kolejek/asynchronicznego workera,
- backfillu historycznych NOTE do attempts,
- automatycznych retry,
- zmian w PLI CBD.

Zaleznosci:
- istniejacy model `InternalNotificationDeliveryAttempt`,
- istniejacy endpoint retry request-scoped,
- istniejacy lub latwy do domkniecia backend read model global queue,
- RBAC zgodny z aktualnym routerem.

Ryzyka:
- jesli global queue backend jest niepelny mimo wpisu w continuity, trzeba ograniczyc PR do backend read endpoint + prosty frontend w kolejnym PR,
- retry moze dotykac realnego transportu, wiec UI musi jasno rozroznic STUB/REAL/DISABLED/MISCONFIGURED.

Definition of Done:
- operator widzi liste aktualnych problemow notyfikacji bez wchodzenia w kazda sprawe,
- kazdy rekord prowadzi do sprawy i pokazuje, czy retry jest mozliwy,
- retry respektuje backendowe `canRetry` i `retryBlockedReasonCode`,
- brak migracji DB,
- testy celowane dla nowego read modelu/UI, bez pelnego audytu repo.

### Etap 2 - Nastepna akcja na sprawie

Cel:
Zmniejszyc szum w szczegole sprawy i pomoc operatorowi odpowiedziec: "co teraz?".

Zakres:
- lekki read model "next operational action" liczony backendowo,
- sygnaly: brak opiekuna, blad notyfikacji, draft komunikacji, status wymagajacy reakcji, PLI CBD blocking reasons,
- kompaktowy panel w detail i opcjonalnie kolumna/sygnal na liscie.

Czego nie obejmuje:
- przebudowy calego layoutu,
- automatycznego wykonywania akcji,
- nowych stanow domenowych bez potrzeby.

Zaleznosci:
- stabilne kontrakty status actions, notification health i communication summary.

Ryzyka:
- zbyt szeroka definicja "next action" moze zamienic sie w reguly biznesowe bez wlasciciela.

Definition of Done:
- dla typowych spraw operator widzi jedna lub kilka priorytetowych rekomendacji,
- reguly sa testowalne i opisane,
- frontend tylko renderuje wynik backendu.

### Etap 3 - Porzadkowanie komunikacji do klienta

Cel:
Uczynic komunikacje klienta pelnym, kontrolowanym przeplywem operacyjnym, a nie zbiorem draftow.

Zakres:
- lepszy status komunikacji na sprawie,
- jasne rozroznienie draft/sent/error/cancelled/sending,
- retry i delivery attempts jako operacyjna diagnostyka,
- minimalne metryki: komunikacje oczekujace, bledne, wyslane.

Czego nie obejmuje:
- SMS workflow, jesli e-mail nie jest domkniety,
- masowej kampanii komunikacyjnej,
- nowego edytora szablonow ponad aktualna architekture.

Zaleznosci:
- istniejacy module communications i delivery attempts.

Ryzyka:
- ryzyko pomieszania komunikacji klienta z wewnetrznymi notyfikacjami.

Definition of Done:
- operator rozumie stan komunikacji do klienta,
- bledy komunikacji sa widoczne i retryowalne,
- akcje pozostaja audytowane.

### Etap 4 - PLI CBD real transport hardening

Cel:
Przejsc z foundation/manual diagnostics do kontrolowanego realnego transportu.

Zakres:
- doprecyzowanie trybow DISABLED/STUB/REAL_SOAP,
- walidacja konfiguracji,
- czytelne blocking reasons,
- retry/ponowienie dla transportu,
- runbook operacyjny.

Czego nie obejmuje:
- pelnej automatyzacji wysylki bez operatora,
- przebudowy domeny FNP,
- ukrywania diagnostyki przed admin/technical.

Zaleznosci:
- stabilny export service,
- envelope builder,
- integration tracker,
- decyzja biznesowa o realnych endpointach i credentialach.

Ryzyka:
- realny PLI CBD moze miec kontrakt/odpowiedzi inne niz stub,
- bledna konfiguracja moze tworzyc kosztowne false positive.

Definition of Done:
- real transport ma kontrolowany rollout,
- kazdy eksport ma historie, request/response snapshot i outcome,
- operator widzi, czy problem jest walidacyjny, transportowy czy zewnetrzny.

### Etap 5 - Operacyjne metryki i SLA

Cel:
Wprowadzic mierzalna kontrole pracy zespolu.

Zakres:
- metryki wieku spraw,
- czas w statusie,
- sprawy bez opiekuna,
- sprawy z bledami transportu,
- raport managera bez hurtowni danych.

Czego nie obejmuje:
- pelnego BI,
- eksportow regulacyjnych bez osobnego zakresu,
- predykcji/AI.

Zaleznosci:
- stabilne eventy i case history.

Ryzyka:
- metryki bez uzgodnionej definicji beda generowac konflikty operacyjne.

Definition of Done:
- manager ma praktyczny widok ryzyk,
- definicje metryk sa opisane,
- brak ciezkich migracji analitycznych.

### Etap 6 - Redesign przeplywow UI

Cel:
Przeprojektowac frontend wokol sprawdzonych przeplywow operacyjnych.

Zakres:
- informacyjna hierarchia listy i detail,
- uproszczenie paneli,
- wzorce akcji i diagnostyki,
- responsywnosc i dostepnosc.

Czego nie obejmuje:
- zmiany logiki biznesowej tylko dlatego, ze UI wyglada inaczej,
- ukrywania audytu lub diagnostyki.

Zaleznosci:
- Etapy 1-3 powinny pokazac realne potrzeby operatorow.

Ryzyka:
- redesign przed stabilizacja workflow moze tylko przestawic chaos.

Definition of Done:
- UI wspiera najczestsze zadania szybciej,
- regresje workflow sa pokryte testami,
- backend nadal jest zrodlem prawdy.

## 7. Rekomendowany Etap 1

Rekomendowany Etap 1: **Operacyjna kolejka problemow notyfikacji**.

Powod: projekt ma juz duzo foundation dla NotificationOps, ale wartosc biznesowa pojawi sie dopiero wtedy, gdy operator zobaczy globalna liste problemow i bedzie mogl przejsc do sprawy/retry bez recznego sprawdzania kazdego detaila. To jest male, wysokowartosciowe i nie wymaga redesignu ani migracji DB.

## 8. Zalozenia i niepewnosci

- Analiza byla celowo ograniczona do wskazanych plikow; nie sprawdzano calego repo.
- Zakladam, ze wpis PR20E o global queue oznacza istniejacy lub prawie gotowy backendowy fundament kolejki problemow notyfikacji. Jesli implementacja jest niepelna, Etap 1 trzeba rozbic na backend read endpoint i frontend view.
- Nie potwierdzalem aktualnego stanu testow ani buildow, bo Etap 0 nie obejmuje walidacji repo.
- Nie ocenialem pelnej ergonomii `RequestDetailPage`; widac jednak, ze szczegol zawiera wiele paneli i wymaga pozniejszego uporzadkowania.
- Nie weryfikowalem realnych wymagan PLI CBD poza foundation widocznym w kodzie.

## 9. Tematy celowo odlozone poza Etap 1

- Pelny redesign frontend.
- Migracje schemy bazy.
- Backfill historycznych NOTE do `InternalNotificationDeliveryAttempt`.
- Automatyczne retry notyfikacji.
- SMS workflow dla klienta.
- Realny rollout PLI CBD SOAP.
- Metryki SLA i dashboard managerski.
- Ujednolicanie calego detail page.
- Zmiana semantyki `assignedUserId` lub ownershipu BOK.
- Domyslny commercial owner na poziomie klienta.
