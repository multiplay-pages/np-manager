// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NotificationFallbackSettingsDto } from '@np-manager/shared'
import { NotificationFallbackSettingsPage } from './NotificationFallbackSettingsPage'

const {
  authState,
  mockedUseAuthStore,
  mockGetAdminNotificationFallbackSettings,
  mockUpdateAdminNotificationFallbackSettings,
} = vi.hoisted(() => {
  const state: {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: 'ADMIN' | 'BOK_CONSULTANT'
      forcePasswordChange: boolean
    } | null
  } = {
    user: {
      id: 'admin-1',
      email: 'admin@np-manager.local',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN',
      forcePasswordChange: false,
    },
  }

  const store = Object.assign((selector?: (value: typeof state) => unknown) => {
    return selector ? selector(state) : state
  }, {
    getState: () => state,
  })

  return {
    authState: state,
    mockedUseAuthStore: store,
    mockGetAdminNotificationFallbackSettings: vi.fn(),
    mockUpdateAdminNotificationFallbackSettings: vi.fn(),
  }
})

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: mockedUseAuthStore,
}))

vi.mock('@/services/adminNotificationFallbackSettings.api', () => ({
  getAdminNotificationFallbackSettings: (...args: unknown[]) =>
    mockGetAdminNotificationFallbackSettings(...args),
  updateAdminNotificationFallbackSettings: (...args: unknown[]) =>
    mockUpdateAdminNotificationFallbackSettings(...args),
}))

const BASE_SETTINGS: NotificationFallbackSettingsDto = {
  fallbackEnabled: true,
  fallbackRecipientEmail: 'fallback@multiplay.pl',
  fallbackRecipientName: 'Zespol BOK',
  applyToFailed: true,
  applyToMisconfigured: true,
  readiness: 'READY',
}

function buildSavedSettings(
  overrides: Partial<NotificationFallbackSettingsDto> = {},
): NotificationFallbackSettingsDto {
  const merged = { ...BASE_SETTINGS, ...overrides }

  return {
    ...merged,
    readiness: !merged.fallbackEnabled
      ? 'DISABLED'
      : merged.fallbackRecipientEmail.trim()
        ? 'READY'
        : 'INCOMPLETE',
  }
}

async function renderAndWaitForForm() {
  const utils = render(<NotificationFallbackSettingsPage />)
  await screen.findByRole('button', { name: /zapisz ustawienia/i })
  await waitFor(() => {
    expect(screen.queryByText(/ladowanie ustawien/i)).toBeNull()
  })

  return utils
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = {
    id: 'admin-1',
    email: 'admin@np-manager.local',
    firstName: 'Anna',
    lastName: 'Admin',
    role: 'ADMIN',
    forcePasswordChange: false,
  }

  mockGetAdminNotificationFallbackSettings.mockResolvedValue(BASE_SETTINGS)
  mockUpdateAdminNotificationFallbackSettings.mockImplementation(
    async (payload: {
      fallbackEnabled: boolean
      fallbackRecipientEmail: string
      fallbackRecipientName: string
      applyToFailed: boolean
      applyToMisconfigured: boolean
    }) => buildSavedSettings(payload),
  )
})

afterEach(() => {
  cleanup()
})

describe('NotificationFallbackSettingsPage - save validation', () => {
  it('allows save when fallback is OFF even with invalid email in the field', async () => {
    const user = userEvent.setup()
    await renderAndWaitForForm()

    const emailInput = screen.getByLabelText(/adres email odbiorcy fallback/i)
    const fallbackToggle = screen.getByRole('checkbox', { name: /fallback notyfikacji/i })

    await user.clear(emailInput)
    await user.type(emailInput, 'abc')
    await user.click(fallbackToggle)
    await user.click(screen.getByRole('button', { name: /zapisz ustawienia/i }))

    await waitFor(() => {
      expect(mockUpdateAdminNotificationFallbackSettings).toHaveBeenCalledTimes(1)
    })

    expect(mockUpdateAdminNotificationFallbackSettings).toHaveBeenCalledWith({
      fallbackEnabled: false,
      fallbackRecipientEmail: 'abc',
      fallbackRecipientName: 'Zespol BOK',
      applyToFailed: true,
      applyToMisconfigured: true,
    })
    expect(screen.queryByText(/podaj poprawny adres e-mail/i)).toBeNull()
  })

  it('blocks save when fallback is ON and email format is invalid', async () => {
    const user = userEvent.setup()
    await renderAndWaitForForm()

    const emailInput = screen.getByLabelText(/adres email odbiorcy fallback/i)
    await user.clear(emailInput)
    await user.type(emailInput, 'abc')
    await user.click(screen.getByRole('button', { name: /zapisz ustawienia/i }))

    expect(mockUpdateAdminNotificationFallbackSettings).not.toHaveBeenCalled()
    expect(screen.getByText(/podaj poprawny adres e-mail/i)).toBeTruthy()
  })

  it('blocks save when fallback is ON and email is missing', async () => {
    const user = userEvent.setup()
    await renderAndWaitForForm()

    const emailInput = screen.getByLabelText(/adres email odbiorcy fallback/i)
    await user.clear(emailInput)
    await user.click(screen.getByRole('button', { name: /zapisz ustawienia/i }))

    expect(mockUpdateAdminNotificationFallbackSettings).not.toHaveBeenCalled()
    expect(screen.getByText(/podaj adres email odbiorcy fallback/i)).toBeTruthy()
  })
})

describe('NotificationFallbackSettingsPage - success feedback', () => {
  it('shows success message after save', async () => {
    const user = userEvent.setup()
    await renderAndWaitForForm()

    await user.click(screen.getByRole('button', { name: /zapisz ustawienia/i }))

    expect(await screen.findByText(/fallbacku.*zapisane/i)).toBeTruthy()
  })

  it('does not show success message after fresh remount without submit', async () => {
    const user = userEvent.setup()
    const firstRender = await renderAndWaitForForm()

    await user.click(screen.getByRole('button', { name: /zapisz ustawienia/i }))
    expect(await screen.findByText(/fallbacku.*zapisane/i)).toBeTruthy()

    firstRender.unmount()
    mockUpdateAdminNotificationFallbackSettings.mockClear()

    await renderAndWaitForForm()

    expect(mockUpdateAdminNotificationFallbackSettings).not.toHaveBeenCalled()
    expect(screen.queryByText(/fallbacku.*zapisane/i)).toBeNull()
  })
})
