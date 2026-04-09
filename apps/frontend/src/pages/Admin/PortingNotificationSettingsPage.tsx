import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type { PortingNotificationSettingsDiagnosticsDto } from '@np-manager/shared'
import { useAuthStore } from '@/stores/auth.store'
import {
  getAdminPortingNotificationSettings,
  updateAdminPortingNotificationSettings,
} from '@/services/adminPortingNotificationSettings.api'
import {
  PortingNotificationSettingsPanel,
  type PortingNotificationSettingsFormState,
} from '@/components/admin-settings/PortingNotificationSettingsPanel'

function isValidEmailList(value: string): boolean {
  const emails = value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  if (emails.length === 0) {
    return true
  }

  return emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
}

function isValidWebhookUrl(value: string): boolean {
  if (!value.trim()) {
    return true
  }

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error
    ?.message
  return message ?? fallback
}

function AdminAccessDeniedState() {
  return (
    <div className="p-6">
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Brak dostepu do administracji</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Ta sekcja jest dostepna tylko dla administratora systemu.
        </p>
      </div>
    </div>
  )
}

const EMPTY_FORM: PortingNotificationSettingsFormState = {
  sharedEmails: '',
  teamsEnabled: false,
  teamsWebhookUrl: '',
}

export function PortingNotificationSettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [form, setForm] = useState<PortingNotificationSettingsFormState>(EMPTY_FORM)
  const [diagnostics, setDiagnostics] = useState<PortingNotificationSettingsDiagnosticsDto | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAdminPortingNotificationSettings()
      setForm({
        sharedEmails: result.sharedEmails,
        teamsEnabled: result.teamsEnabled,
        teamsWebhookUrl: result.teamsWebhookUrl,
      })
      setDiagnostics(result.diagnostics)
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udalo sie zaladowac ustawien powiadomien.'))
      setForm(EMPTY_FORM)
      setDiagnostics(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    void loadSettings()
  }, [isAdmin, loadSettings])

  const handleChange = <K extends keyof PortingNotificationSettingsFormState>(
    field: K,
    value: PortingNotificationSettingsFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    if (isSaving) return

    if (!isValidEmailList(form.sharedEmails)) {
      setError('Podaj poprawna liste adresow e-mail (rozdzielonych przecinkami).')
      setSuccess(null)
      return
    }

    if (!isValidWebhookUrl(form.teamsWebhookUrl)) {
      setError('Podaj poprawny URL webhooka Teams.')
      setSuccess(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAdminPortingNotificationSettings({
        sharedEmails: form.sharedEmails.trim(),
        teamsEnabled: form.teamsEnabled,
        teamsWebhookUrl: form.teamsWebhookUrl.trim(),
      })

      setForm({
        sharedEmails: result.sharedEmails,
        teamsEnabled: result.teamsEnabled,
        teamsWebhookUrl: result.teamsWebhookUrl,
      })
      setDiagnostics(result.diagnostics)
      setSuccess('Ustawienia powiadomien portingowych zostaly zapisane.')
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udalo sie zapisac ustawien powiadomien.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAdmin) {
    return <AdminAccessDeniedState />
  }

  return (
    <PortingNotificationSettingsPanel
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
