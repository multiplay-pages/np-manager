// @vitest-environment jsdom
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserDetailDto, AdminUserListItemDto } from '@np-manager/shared'
import { buildAdminAuditEntryView } from '@/lib/adminUsers'
import { AdminUserDeactivateModal } from './AdminUserDeactivateModal'
import { AdminUserDetail } from './AdminUserDetail'
import { AdminUserForm } from './AdminUserForm'
import { AdminUsersList } from './AdminUsersList'
import { AdminUserPasswordResetModal } from './AdminUserPasswordResetModal'

const LIST_USERS: AdminUserListItemDto[] = [
  {
    id: 'admin-1',
    email: 'admin@np-manager.local',
    firstName: 'Anna',
    lastName: 'Admin',
    role: 'ADMIN',
    isActive: true,
    forcePasswordChange: false,
    lastLoginAt: '2026-04-08T09:00:00.000Z',
    createdAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'user-1',
    email: 'jan.kowalski@firma.pl',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: 'BOK_CONSULTANT',
    isActive: false,
    forcePasswordChange: true,
    lastLoginAt: null,
    createdAt: '2026-04-02T10:00:00.000Z',
  },
]

const DETAIL_USER: AdminUserDetailDto = {
  id: 'user-1',
  email: 'jan.kowalski@firma.pl',
  firstName: 'Jan',
  lastName: 'Kowalski',
  role: 'BOK_CONSULTANT',
  isActive: true,
  forcePasswordChange: true,
  passwordChangedAt: null,
  lastLoginAt: '2026-04-08T09:00:00.000Z',
  deactivatedAt: null,
  deactivatedByUserId: null,
  reactivatedAt: null,
  reactivatedByUserId: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-08T10:00:00.000Z',
}

function collectElements(node: ReactNode): ReactElement[] {
  const elements: ReactElement[] = []

  const visit = (value: ReactNode) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    if (!isValidElement(value)) {
      return
    }

    elements.push(value)
    visit((value.props as { children?: ReactNode }).children)
  }

  visit(node)

  return elements
}

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map((item) => getTextContent(item)).join('')
  }

  if (!isValidElement(node)) {
    return ''
  }

  return getTextContent((node.props as { children?: ReactNode }).children)
}

function findButtonByText(tree: ReactNode, label: string): ReactElement | undefined {
  return collectElements(tree).find(
    (element) => {
      const props = element.props as { children?: ReactNode; onClick?: () => void }

      return typeof props.onClick === 'function' && getTextContent(props.children).includes(label)
    },
  )
}

describe('Admin users module UI', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders users list with summary cards, filters and rows', () => {
    const html = renderToStaticMarkup(
      <AdminUsersList
        users={LIST_USERS}
        totalUsersCount={LIST_USERS.length}
        summary={{
          activeCount: 1,
          inactiveCount: 1,
          adminCount: 1,
          consultantCount: 1,
        }}
        filters={{ search: '', role: 'ALL', status: 'ALL' }}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
      />,
    )

    expect(html).toContain('Użytkownicy')
    expect(html).toContain('Aktywni')
    expect(html).toContain('jan.kowalski@firma.pl')
    expect(html).toContain('Wymuszona zmiana hasła')
    expect(html).toContain('Szczegóły')
  })

  it('renders loading, empty and no-results states for the list', () => {
    const loadingHtml = renderToStaticMarkup(
      <AdminUsersList
        users={[]}
        totalUsersCount={0}
        summary={{ activeCount: 0, inactiveCount: 0, adminCount: 0, consultantCount: 0 }}
        filters={{ search: '', role: 'ALL', status: 'ALL' }}
        isLoading
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
      />,
    )

    const emptyHtml = renderToStaticMarkup(
      <AdminUsersList
        users={[]}
        totalUsersCount={0}
        summary={{ activeCount: 0, inactiveCount: 0, adminCount: 0, consultantCount: 0 }}
        filters={{ search: '', role: 'ALL', status: 'ALL' }}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
      />,
    )

    const noResultsHtml = renderToStaticMarkup(
      <AdminUsersList
        users={[]}
        totalUsersCount={2}
        summary={{ activeCount: 1, inactiveCount: 1, adminCount: 1, consultantCount: 1 }}
        filters={{ search: 'anna', role: 'ADMIN', status: 'INACTIVE' }}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
      />,
    )

    expect(loadingHtml).toContain('Ładowanie kont użytkowników')
    expect(loadingHtml).toContain('--')
    expect(emptyHtml).toContain('Brak kont w systemie')
    expect(noResultsHtml).toContain('Brak wyników')
  })

  it('renders create form with required fields and backend contract copy', () => {
    const html = renderToStaticMarkup(
      <AdminUserForm
        form={{
          email: '',
          firstName: '',
          lastName: '',
          role: 'BOK_CONSULTANT',
          temporaryPassword: '',
        }}
        errors={{}}
        isSaving={false}
        feedbackSuccess={null}
        feedbackError={null}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(html).toContain('Nowy użytkownik')
    expect(html).toContain('Adres e-mail')
    expect(html).toContain('Hasło tymczasowe')
    expect(html).toContain('Backend ustawi wymuszenie zmiany hasła')
  })

  it('renders detail view with admin actions and readable audit history', () => {
    const auditEntry = buildAdminAuditEntryView(
      {
        id: 'audit-1',
        targetUserId: 'user-1',
        actorUserId: 'admin-1',
        actionType: 'USER_ROLE_CHANGED',
        previousStateJson: { role: 'BOK_CONSULTANT' },
        nextStateJson: { role: 'ADMIN' },
        reason: null,
        createdAt: '2026-04-08T10:00:00.000Z',
      },
      {
        'admin-1': LIST_USERS[0]!,
      },
      DETAIL_USER,
    )

    const html = renderToStaticMarkup(
      <AdminUserDetail
        user={DETAIL_USER}
        auditEntries={[auditEntry]}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        roleDraft="BOK_CONSULTANT"
        isRoleSaving={false}
        isStatusUpdating={false}
        isDeactivateDisabled={false}
        deactivateModalOpen={false}
        isResettingPassword={false}
        resetPasswordModalOpen={false}
        resetPasswordValue=""
        resetPasswordError={null}
        onBack={vi.fn()}
        onRoleChange={vi.fn()}
        onRoleSave={vi.fn()}
        onDeactivate={vi.fn()}
        onCloseDeactivateModal={vi.fn()}
        onConfirmDeactivate={vi.fn()}
        onReactivate={vi.fn()}
        onOpenResetPassword={vi.fn()}
        onCloseResetPassword={vi.fn()}
        onResetPasswordValueChange={vi.fn()}
        onResetPasswordSubmit={vi.fn()}
      />,
    )

    expect(html).toContain('Akcje administracyjne')
    expect(html).toContain('Zmień rolę')
    expect(html).toContain('Dezaktywuj konto')
    expect(html).toContain('Reset hasła')
    expect(html).toContain('Historia audytu')
    expect(html).toContain('Rola zmieniona z Konsultant BOK na Administrator.')
    expect(html).toContain('Anna Admin (Administrator)')
  })

  it('renders detail error state when user cannot be loaded', () => {
    const html = renderToStaticMarkup(
      <AdminUserDetail
        user={null}
        auditEntries={[]}
        isLoading={false}
        error="Nie udalo sie pobrac szczegolow uzytkownika."
        feedbackSuccess={null}
        feedbackError={null}
        roleDraft="BOK_CONSULTANT"
        isRoleSaving={false}
        isStatusUpdating={false}
        isDeactivateDisabled={false}
        deactivateModalOpen={false}
        isResettingPassword={false}
        resetPasswordModalOpen={false}
        resetPasswordValue=""
        resetPasswordError={null}
        onBack={vi.fn()}
        onRoleChange={vi.fn()}
        onRoleSave={vi.fn()}
        onDeactivate={vi.fn()}
        onCloseDeactivateModal={vi.fn()}
        onConfirmDeactivate={vi.fn()}
        onReactivate={vi.fn()}
        onOpenResetPassword={vi.fn()}
        onCloseResetPassword={vi.fn()}
        onResetPasswordValueChange={vi.fn()}
        onResetPasswordSubmit={vi.fn()}
      />,
    )

    expect(html).toContain('Nie udało się otworzyć konta')
    expect(html).toContain('Nie udalo sie pobrac szczegolow uzytkownika.')
  })

  it('renders disabled self-deactivation CTA with helper copy for the logged-in account', () => {
    const html = renderToStaticMarkup(
      <AdminUserDetail
        user={DETAIL_USER}
        auditEntries={[]}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        roleDraft="BOK_CONSULTANT"
        isRoleSaving={false}
        isStatusUpdating={false}
        isDeactivateDisabled
        deactivateModalOpen={false}
        isResettingPassword={false}
        resetPasswordModalOpen={false}
        resetPasswordValue=""
        resetPasswordError={null}
        onBack={vi.fn()}
        onRoleChange={vi.fn()}
        onRoleSave={vi.fn()}
        onDeactivate={vi.fn()}
        onCloseDeactivateModal={vi.fn()}
        onConfirmDeactivate={vi.fn()}
        onReactivate={vi.fn()}
        onOpenResetPassword={vi.fn()}
        onCloseResetPassword={vi.fn()}
        onResetPasswordValueChange={vi.fn()}
        onResetPasswordSubmit={vi.fn()}
      />,
    )

    expect(html).toContain('data-testid="admin-user-status-action"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('Nie możesz dezaktywować własnego konta.')
  })

  it('wires the deactivate CTA to opening the confirmation modal flow', () => {
    const onOpenDeactivateModal = vi.fn()
    const tree = AdminUserDetail({
      user: DETAIL_USER,
      auditEntries: [],
      isLoading: false,
      error: null,
      feedbackSuccess: null,
      feedbackError: null,
      roleDraft: 'BOK_CONSULTANT',
      isRoleSaving: false,
      isStatusUpdating: false,
      isDeactivateDisabled: false,
      deactivateModalOpen: false,
      isResettingPassword: false,
      resetPasswordModalOpen: false,
      resetPasswordValue: '',
      resetPasswordError: null,
      onBack: vi.fn(),
      onRoleChange: vi.fn(),
      onRoleSave: vi.fn(),
      onDeactivate: onOpenDeactivateModal,
      onCloseDeactivateModal: vi.fn(),
      onConfirmDeactivate: vi.fn(),
      onReactivate: vi.fn(),
      onOpenResetPassword: vi.fn(),
      onCloseResetPassword: vi.fn(),
      onResetPasswordValueChange: vi.fn(),
      onResetPasswordSubmit: vi.fn(),
    })

    const deactivateButton = findButtonByText(tree, 'Dezaktywuj konto')

    expect(deactivateButton).toBeDefined()
    ;(deactivateButton?.props as { onClick?: () => void }).onClick?.()

    expect(onOpenDeactivateModal).toHaveBeenCalledTimes(1)
  })

  it('renders the deactivate confirmation modal with consequences and type-to-confirm copy', () => {
    const html = renderToStaticMarkup(
      <AdminUserDetail
        user={DETAIL_USER}
        auditEntries={[]}
        isLoading={false}
        error={null}
        feedbackSuccess={null}
        feedbackError={null}
        roleDraft="BOK_CONSULTANT"
        isRoleSaving={false}
        isStatusUpdating={false}
        isDeactivateDisabled={false}
        deactivateModalOpen
        isResettingPassword={false}
        resetPasswordModalOpen={false}
        resetPasswordValue=""
        resetPasswordError={null}
        onBack={vi.fn()}
        onRoleChange={vi.fn()}
        onRoleSave={vi.fn()}
        onDeactivate={vi.fn()}
        onCloseDeactivateModal={vi.fn()}
        onConfirmDeactivate={vi.fn()}
        onReactivate={vi.fn()}
        onOpenResetPassword={vi.fn()}
        onCloseResetPassword={vi.fn()}
        onResetPasswordValueChange={vi.fn()}
        onResetPasswordSubmit={vi.fn()}
      />,
    )

    expect(html).toContain('Potwierdź dezaktywację konta')
    expect(html).toContain('Użytkownik straci możliwość logowania.')
    expect(html).toContain('Konto nie zostanie usunięte.')
    expect(html).toContain('Historię i audyt nadal będzie można odczytać.')
    expect(html).toContain('Konto można później reaktywować.')
    expect(html).toContain('Aby potwierdzić, wpisz adres e-mail użytkownika.')
    expect(html).toContain('Dezaktywuj konto')
  })

  it('does not trigger deactivation when the modal is cancelled', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <AdminUserDeactivateModal
        isOpen
        email={DETAIL_USER.email}
        isSaving={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByTestId('admin-user-deactivate-cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('keeps deactivation disabled until the typed email matches', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <AdminUserDeactivateModal
        isOpen
        email={DETAIL_USER.email}
        isSaving={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    const input = screen.getByTestId('admin-user-deactivate-confirm-email')
    const confirmButton = screen.getByTestId('admin-user-deactivate-confirm') as HTMLButtonElement

    expect(confirmButton.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'wrong@example.com' } })
    expect(confirmButton.disabled).toBe(true)

    fireEvent.click(confirmButton)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: `  ${DETAIL_USER.email.toUpperCase()}  ` } })
    expect(confirmButton.disabled).toBe(false)

    fireEvent.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('resets the deactivate confirmation email after closing the modal', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <AdminUserDeactivateModal
        isOpen
        email={DETAIL_USER.email}
        isSaving={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('admin-user-deactivate-confirm-email'), {
      target: { value: DETAIL_USER.email },
    })
    expect((screen.getByTestId('admin-user-deactivate-confirm') as HTMLButtonElement).disabled).toBe(
      false,
    )

    fireEvent.click(screen.getByTestId('admin-user-deactivate-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <AdminUserDeactivateModal
        isOpen={false}
        email={DETAIL_USER.email}
        isSaving={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    )
    rerender(
      <AdminUserDeactivateModal
        isOpen
        email={DETAIL_USER.email}
        isSaving={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    )

    expect((screen.getByTestId('admin-user-deactivate-confirm-email') as HTMLInputElement).value).toBe(
      '',
    )
    expect((screen.getByTestId('admin-user-deactivate-confirm') as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('renders password reset risk copy for temporary passwords', () => {
    render(
      <AdminUserPasswordResetModal
        isOpen
        email={DETAIL_USER.email}
        temporaryPassword=""
        error={null}
        isSaving={false}
        onTemporaryPasswordChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Reset hasła ustawi nowe hasło tymczasowe.')).toBeDefined()
    expect(
      screen.getByText('Użytkownik będzie musiał zmienić hasło przy kolejnym logowaniu.'),
    ).toBeDefined()
    expect(screen.getByText('Nie wysyłaj hasła kanałem publicznym.')).toBeDefined()
  })

  it('keeps password reset validation errors visible for empty and short passwords', () => {
    const { rerender } = render(
      <AdminUserPasswordResetModal
        isOpen
        email={DETAIL_USER.email}
        temporaryPassword=""
        error="Haslo tymczasowe jest wymagane."
        isSaving={false}
        onTemporaryPasswordChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Haslo tymczasowe jest wymagane.')).toBeDefined()

    rerender(
      <AdminUserPasswordResetModal
        isOpen
        email={DETAIL_USER.email}
        temporaryPassword="short"
        error="Haslo tymczasowe musi miec co najmniej 8 znakow."
        isSaving={false}
        onTemporaryPasswordChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Haslo tymczasowe musi miec co najmniej 8 znakow.')).toBeDefined()
  })

  it('submits a valid temporary password through the existing reset handler', () => {
    const onSubmit = vi.fn()

    render(
      <AdminUserPasswordResetModal
        isOpen
        email={DETAIL_USER.email}
        temporaryPassword="NewTemp@1234"
        error={null}
        isSaving={false}
        onTemporaryPasswordChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Zresetuj hasło' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
