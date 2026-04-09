# NP-Manager — QA Checklist

## Obowiązkowa checklista po zmianach

### 1. Zakres
- Jaki moduł został zmieniony?
- Jakie role są dotknięte?
- Czy zmiana dotyka backendu, frontendu, shared, bazy lub seedów?

### 2. Regresje funkcjonalne
- Czy stary flow nadal działa?
- Czy widoki listy i detail działają poprawnie?
- Czy refresh strony nie psuje stanu?
- Czy błąd backendu jest obsłużony czytelnym komunikatem?

### 3. RBAC
- Czy ADMIN ma wymagane akcje?
- Czy użytkownik o niższych uprawnieniach nie widzi lub nie może wykonać niedozwolonej akcji?
- Czy backend odrzuca niedozwoloną operację nawet jeśli frontend zostanie ominięty?

### 4. Dane i API
- Czy DTO są spójne?
- Czy payload API zgadza się z frontendem?
- Czy walidacja działa po stronie backendu?
- Czy błędy biznesowe mają czytelne kody i komunikaty?

### 5. Testy techniczne
Uruchom lub zaproponuj:
- testy backend
- testy frontend
- build shared
- build backend
- build frontend

### 6. Manual QA
Sprawdź:
- wejście na listę
- wejście na detail
- główną akcję modułu
- walidacje
- edge case
- refresh strony
- przypadek bez uprawnień

### 7. Raport końcowy
Po wdrożeniu każdej zmiany wypisz:
- lista plików zmienionych
- co działa
- co nie było testowane
- ryzyka
- rekomendowany kolejny krok
