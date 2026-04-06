DO $$
BEGIN
    ALTER TYPE "PortingCommunicationTemplateKey" ADD VALUE IF NOT EXISTS 'missing_documents';
    ALTER TYPE "PortingCommunicationTemplateKey" ADD VALUE IF NOT EXISTS 'client_confirmation';
    ALTER TYPE "PortingCommunicationTemplateKey" ADD VALUE IF NOT EXISTS 'rejection_notice';
    ALTER TYPE "PortingCommunicationTemplateKey" ADD VALUE IF NOT EXISTS 'completion_notice';
    ALTER TYPE "PortingCommunicationTemplateKey" ADD VALUE IF NOT EXISTS 'internal_note_email';
END $$;
