# NP-Manager — Domain Rules

## Kontekst domenowy
System dotyczy przenoszenia numerów stacjonarnych.
Każda implementacja musi uwzględniać:
- audytowalność,
- historię operacji,
- rozdzielenie warstwy operacyjnej od integracyjnej,
- role użytkowników,
- bezpieczeństwo danych.

## Twarde reguły domenowe
- Nie wprowadzaj hard delete dla głównych bytów operacyjnych bez wyraźnej decyzji.
- Historia sprawy i historia integracji to różne byty i nie należy ich mieszać.
- Status workflow i dostępne akcje powinny być kontrolowane po stronie backendu.
- RBAC musi być spójny w backendzie i frontendzie.
- Komunikacja operacyjna, szablony, eksporty i historia muszą być audytowalne.

## RBAC
Zawsze sprawdzaj wpływ zmian na:
- ADMIN
- BOK_CONSULTANT
- inne role istniejące w projekcie

Nie zakładaj dostępu „dla wszystkich”, jeśli nie wynika to wprost z obecnych reguł.

## Prisma i baza danych
- Preferuj migracje additive.
- Unikaj drop/recreate tabel, jeśli da się tego uniknąć.
- Jawnie opisuj ryzyko migracji danych.
- Sprawdzaj wpływ na seed, DTO, testy i formularze.

## Frontend
- UI ma być operacyjne, zwarte i czytelne.
- Copy ma być po polsku, biznesowe, jednoznaczne.
- Nie dodawaj marketingowego stylu ani luźnych sformułowań.
- Nie ukrywaj ważnych błędów technicznych pod nieprecyzyjnymi komunikatami.

## QA
Każda zmiana powinna mieć:
- zakres testów,
- miejsca ryzyka regresji,
- scenariusze happy path,
- scenariusze permission / validation / refresh / reload / retry.
