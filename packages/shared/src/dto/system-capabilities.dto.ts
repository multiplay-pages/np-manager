// ============================================================
// SYSTEM CAPABILITIES — tryb systemu i dostępne moduły opcjonalne
// ============================================================
//
// Etap 4B.1: wprowadza warstwę capabilities, która pozwala odróżnić:
//   - STANDALONE — system manualny, bez integracji PLI CBD,
//   - PLI_CBD_INTEGRATED — system zintegrowany z regulatorem PLI CBD.
//
// Frontend korzysta z pola `pliCbd.active`, żeby schować sekcje PLI CBD,
// gdy moduł nie jest aktywny. Backend używa tych samych danych do
// kontrolowanego odrzucania żądań (404 STANDALONE / 503 INTEGRATED bez
// konfiguracji).

export const SYSTEM_MODES = ['STANDALONE', 'PLI_CBD_INTEGRATED'] as const
export type SystemMode = (typeof SYSTEM_MODES)[number]

export const SYSTEM_MODE_LABELS: Record<SystemMode, string> = {
  STANDALONE: 'Tryb manualny (standalone)',
  PLI_CBD_INTEGRATED: 'Tryb zintegrowany z PLI CBD',
}

export interface SystemPliCbdCapabilitiesDto {
  /** Indywidualne capabilities modułu — wszystkie = active. */
  export: boolean
  sync: boolean
  diagnostics: boolean
  externalActions: boolean
}

export interface SystemPliCbdSectionDto {
  /** Miękki przełącznik: admin może odłączyć moduł bez utraty konfiguracji. */
  enabled: boolean
  /** Wszystkie wymagane ustawienia (endpoint, credentials, operator code) obecne. */
  configured: boolean
  /**
   * Efektywna aktywność:
   *   mode === 'PLI_CBD_INTEGRATED' && enabled && configured.
   * Tylko active=true pozwala na użycie endpointów PLI CBD w backendzie
   * i widoczność sekcji PLI CBD w UI.
   */
  active: boolean
  capabilities: SystemPliCbdCapabilitiesDto
}

export interface SystemCapabilitiesDto {
  mode: SystemMode
  pliCbd: SystemPliCbdSectionDto
  /** ISO timestamp momentu obliczenia odpowiedzi (do debugowania cache). */
  resolvedAt: string
}

// ============================================================
// KLUCZE SYSTEM SETTING — tryb systemu / PLI CBD
// ============================================================

export const SYSTEM_CAPABILITIES_SETTING_KEYS = {
  SYSTEM_MODE: 'system.mode',
  PLI_CBD_ENABLED: 'pli_cbd.enabled',
  PLI_CBD_ENDPOINT_URL: 'pli_cbd.endpoint_url',
  PLI_CBD_CREDENTIALS_REF: 'pli_cbd.credentials_ref',
  PLI_CBD_OPERATOR_CODE: 'pli_cbd.operator_code',
} as const

export type SystemCapabilitiesSettingKey =
  (typeof SYSTEM_CAPABILITIES_SETTING_KEYS)[keyof typeof SYSTEM_CAPABILITIES_SETTING_KEYS]

// ============================================================
// KODY BŁĘDÓW CAPABILITY GATING
// ============================================================

export const CAPABILITY_ERROR_CODES = {
  /** 404: moduł nie jest włączony w tym trybie systemu (STANDALONE). */
  CAPABILITY_NOT_AVAILABLE: 'CAPABILITY_NOT_AVAILABLE',
  /** 503: moduł włączony, ale wymaga konfiguracji do uruchomienia. */
  CAPABILITY_NOT_CONFIGURED: 'CAPABILITY_NOT_CONFIGURED',
} as const

export type CapabilityErrorCode =
  (typeof CAPABILITY_ERROR_CODES)[keyof typeof CAPABILITY_ERROR_CODES]
