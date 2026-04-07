-- PR10 (1/2): Rozszerzenie enum PortingCommunicationStatus
-- Musi byc osobna migracja — PostgreSQL nie pozwala uzywac nowych wartosci enuma
-- w tej samej transakcji, w ktorej zostaly dodane (shadow DB by to odrzucila).

ALTER TYPE "PortingCommunicationStatus" ADD VALUE IF NOT EXISTS 'READY_TO_SEND';
ALTER TYPE "PortingCommunicationStatus" ADD VALUE IF NOT EXISTS 'SENDING';
ALTER TYPE "PortingCommunicationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
