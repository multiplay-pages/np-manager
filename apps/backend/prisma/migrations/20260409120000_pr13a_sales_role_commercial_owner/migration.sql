-- PR13A: Foundation pod opiekuna handlowego i routing powiadomień
-- Additive migration — nie usuwa istniejących kolumn assignmentu BOK

-- Dodaj wartość SALES do enumeracji UserRole
ALTER TYPE "UserRole" ADD VALUE 'SALES';

-- Dodaj kolumnę opiekuna handlowego do porting_requests
ALTER TABLE "porting_requests" ADD COLUMN "commercialOwnerUserId" TEXT;

-- Dodaj klucz obcy do tabeli users (ON DELETE SET NULL — jeśli user usunięty, pole wyzerowane)
ALTER TABLE "porting_requests" ADD CONSTRAINT "porting_requests_commercialOwnerUserId_fkey"
  FOREIGN KEY ("commercialOwnerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dodaj indeks dla zapytań filtrujących po opiekunie handlowym
CREATE INDEX "porting_requests_commercialOwnerUserId_idx" ON "porting_requests"("commercialOwnerUserId");
