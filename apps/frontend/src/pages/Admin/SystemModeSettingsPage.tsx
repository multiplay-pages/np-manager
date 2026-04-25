import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type {
  AdminSystemModeSettingsDiagnosticsDto,
  AdminSystemModeSettingsRawDto,
  UpdateAdminSystemModeSettingsDto,
} from '@np-manager/shared'
import { useAuthStore } from '@/stores/auth.store'
import { useSystemCapabilitiesStore } from '@/stores/systemCapabilities.store'
import {
  getAdminSystemModeSettings,
  updateAdminSystemModeSettings,
} from '@/services/adminSystemModeSettings.api'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  SystemModeSettingsPanel,
  type SystemModeSettingsFormState,
} from '@/components/admin-settings/SystemModeSettingsPanel'

const EMPTY_FORM: SystemModeSettingsFormState = {
  mode: 'STANDALONE',
  pliCbdEnabled: false,
  pliCbdEndpointUrl: '',
  pliCbdCredentialsRef: '',
  pliCbdOperatorCode: '',
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error
    ?.message
  return message ?? fallback
}

export function isValidOptionalUrl(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) {
    return true
  }

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function toSystemModeFormState(
  settings: AdminSystemModeSettingsRawDto,
): SystemModeSettingsFormState {
  return {
    mode: settings.mode,
    pliCbdEnabled: settings.pliCbd.enabled,
    pliCbdEndpointUrl: settings.pliCbd.endpointUrl,
    pliCbdCredentialsRef: settings.pliCbd.credentialsRef,
    pliCbdOperatorCode: settings.pliCbd.operatorCode,
  }
}

export function buildSystemModeSettingsPayload(
  form: SystemModeSettingsFormState,
): UpdateAdminSystemModeSettingsDto {
  return {
    mode: form.mode,
    pliCbd: {
      enabled: form.pliCbdEnabled,
      endpointUrl: form.pliCbdEndpointUrl.trim(),
      credentialsRef: form.pliCbdCredentialsRef.trim(),
      operatorCode: form.pliCbdOperatorCode.trim().toUpperCase(),
    },
  }
}

function AdminAccessDeniedState() {
  return (
    <div className="p-6">
      <EmptyState
        title="Brak dostępu do administracji"
        description="Ta sekcja jest dostępna tylko dla administratora systemu."
      />
    </div>
  )
}

export function SystemModeSettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const setCapabilitiesSnapshot = useSystemCapabilitiesStore((state) => state.setSnapshot)

  const [form, setForm] = useState<SystemModeSettingsFormState>(EMPTY_FORM)
  const [diagnostics, setDiagnostics] =
    useState<AdminSystemModeSettingsDiagnosticsDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAdminSystemModeSettings()
      setForm(toSystemModeFormState(result.settings))
      setDiagnostics(result.diagnostics)
      setCapabilitiesSnapshot(result.capabilities)
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udało się załadować ustawień trybu systemu.'))
      setForm(EMPTY_FORM)
      setDiagnostics(null)
    } finally {
      setIsLoading(false)
    }
  }, [setCapabilitiesSnapshot])

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    void loadSettings()
  }, [isAdmin, loadSettings])

  const handleChange = <K extends keyof SystemModeSettingsFormState>(
    field: K,
    value: SystemModeSettingsFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    if (isSaving) return

    if (!isValidOptionalUrl(form.pliCbdEndpointUrl)) {
      setError('Podaj poprawny URL endpointu PLI CBD.')
      setSuccess(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAdminSystemModeSettings(buildSystemModeSettingsPayload(form))

      setForm(toSystemModeFormState(result.settings))
      setDiagnostics(result.diagnostics)
      setCapabilitiesSnapshot(result.capabilities)
      setSuccess('Ustawienia trybu systemu zostały zapisane.')
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udało się zapisać ustawień trybu systemu.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAdmin) {
    return <AdminAccessDeniedState />
  }

  return (
    <SystemModeSettingsPanel
      form={form}
      diagnostics={diagnostics}
      isLoading={isLoading}
      isSaving={isSaving}
      error={error}
      success={success}
      onChange={handleChange}
      onSave={() => void handleSave()}
    />
  )
}
