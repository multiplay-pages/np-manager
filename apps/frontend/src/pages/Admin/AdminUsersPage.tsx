import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type {
  AdminUserDetailDto,
  AdminUserListItemDto,
  UserAdminAuditLogItemDto,
  UserRole,
} from '@np-manager/shared'
import { USER_ROLES } from '@np-manager/shared'
import { buildPath, ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth.store'
import {
  createAdminUser,
  deactivateAdminUser,
  getAdminUserAuditLog,
  getAdminUserDetail,
  getAdminUsers,
  reactivateAdminUser,
  resetAdminUserPassword,
  updateAdminUserRole,
} from '@/services/adminUsers.api'
import {
  buildAdminAuditEntryView,
  getAdminUserErrorMessage,
  getAdminUserRoleDraftAfterSaveError,
  isAdminUserSelfDeactivationDisabled,
  getAdminUserValidationErrors,
} from '@/lib/adminUsers'
import {
  AdminUserDetail,
  AdminUserForm,
  AdminUsersList,
  type AdminUserFormErrors,
  type AdminUserFormState,
  type AdminUsersListFilters,
} from '@/components/admin-users'

type AdminUsersMode = 'LIST' | 'NEW' | 'DETAIL'

interface FeedbackState {
  success: string | null
  error: string | null
}

const EMPTY_CREATE_FORM: AdminUserFormState = {
  email: '',
  firstName: '',
  lastName: '',
  role: USER_ROLES.BOK_CONSULTANT,
  temporaryPassword: '',
}

function getAdminUsersMode(pathname: string): AdminUsersMode {
  if (pathname.endsWith('/new')) {
    return 'NEW'
  }

  if (pathname === ROUTES.ADMIN_USERS) {
    return 'LIST'
  }

  return 'DETAIL'
}

function createInitialFilters(): AdminUsersListFilters {
  return {
    search: '',
    role: 'ALL',
    status: 'ALL',
  }
}

function mapFiltersToApi(filters: AdminUsersListFilters) {
  return {
    query: filters.search.trim() || undefined,
    role: filters.role === 'ALL' ? undefined : filters.role,
    isActive: filters.status === 'ALL' ? undefined : filters.status === 'ACTIVE',
  }
}

function validateCreateForm(form: AdminUserFormState): AdminUserFormErrors {
  const errors: AdminUserFormErrors = {}

  if (!form.email.trim()) {
    errors.email = 'Adres e-mail jest wymagany.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Podaj poprawny adres e-mail.'
  }

  if (!form.firstName.trim()) {
    errors.firstName = 'Imie jest wymagane.'
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Nazwisko jest wymagane.'
  }

  if (!form.temporaryPassword) {
    errors.temporaryPassword = 'Haslo tymczasowe jest wymagane.'
  } else if (form.temporaryPassword.length < 8) {
    errors.temporaryPassword = 'Haslo tymczasowe musi miec co najmniej 8 znakow.'
  }

  return errors
}

function AdminUsersAccessDeniedState() {
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

export function AdminUsersPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === USER_ROLES.ADMIN
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const mode = getAdminUsersMode(location.pathname)
  const selectedUserId = params.id

  const [filters, setFilters] = useState<AdminUsersListFilters>(createInitialFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [allUsers, setAllUsers] = useState<AdminUserListItemDto[]>([])
  const [listUsers, setListUsers] = useState<AdminUserListItemDto[]>([])
  const [isListLoading, setIsListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUserDetailDto | null>(null)
  const [auditLog, setAuditLog] = useState<UserAdminAuditLogItemDto[]>([])
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>({ success: null, error: null })
  const [createForm, setCreateForm] = useState<AdminUserFormState>(EMPTY_CREATE_FORM)
  const [createErrors, setCreateErrors] = useState<AdminUserFormErrors>({})
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [roleDraft, setRoleDraft] = useState<UserRole>(USER_ROLES.BOK_CONSULTANT)
  const [isRoleSaving, setIsRoleSaving] = useState(false)
  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const isSelfDeactivateDisabled = isAdminUserSelfDeactivationDisabled({
    currentUserId: user?.id,
    targetUserId: selectedUser?.id,
    isActive: selectedUser?.isActive ?? false,
  })

  const listRequestIdRef = useRef(0)
  const detailRequestIdRef = useRef(0)

  const usersMap = useMemo(() => {
    const next = allUsers.reduce<Record<string, AdminUserListItemDto>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    if (selectedUser) {
      next[selectedUser.id] = selectedUser
    }

    return next
  }, [allUsers, selectedUser])

  const summary = useMemo(
    () => ({
      activeCount: allUsers.filter((item) => item.isActive).length,
      inactiveCount: allUsers.filter((item) => !item.isActive).length,
      adminCount: allUsers.filter((item) => item.role === USER_ROLES.ADMIN).length,
      consultantCount: allUsers.filter((item) => item.role === USER_ROLES.BOK_CONSULTANT).length,
    }),
    [allUsers],
  )

  const auditEntries = useMemo(() => {
    if (!selectedUser) {
      return []
    }

    return auditLog.map((entry) => buildAdminAuditEntryView(entry, usersMap, selectedUser))
  }, [auditLog, selectedUser, usersMap])

  const resetFeedback = () => {
    setFeedback({ success: null, error: null })
  }

  const loadUsers = async (activeFilters: AdminUsersListFilters) => {
    const requestId = ++listRequestIdRef.current
    setIsListLoading(true)

    try {
      const hasFilters =
        activeFilters.search.trim().length > 0 ||
        activeFilters.role !== 'ALL' ||
        activeFilters.status !== 'ALL'

      const filteredPromise = hasFilters ? getAdminUsers(mapFiltersToApi(activeFilters)) : null
      const allUsersPromise = getAdminUsers()

      const [filteredResult, allUsersResult] = await Promise.all([filteredPromise, allUsersPromise])

      if (requestId !== listRequestIdRef.current) {
        return
      }

      setAllUsers(allUsersResult.users)
      setListUsers(filteredResult?.users ?? allUsersResult.users)
      setListError(null)
    } catch (error) {
      if (requestId !== listRequestIdRef.current) {
        return
      }

      setAllUsers([])
      setListUsers([])
      setListError(getAdminUserErrorMessage(error, 'Nie udalo sie pobrac listy uzytkownikow.'))
    } finally {
      if (requestId === listRequestIdRef.current) {
        setIsListLoading(false)
      }
    }
  }

  const loadUserDetail = async (userId: string) => {
    const requestId = ++detailRequestIdRef.current
    setIsDetailLoading(true)

    try {
      const [detail, logs] = await Promise.all([
        getAdminUserDetail(userId),
        getAdminUserAuditLog(userId),
      ])

      if (requestId !== detailRequestIdRef.current) {
        return
      }

      setSelectedUser(detail)
      setAuditLog(logs)
      setRoleDraft(detail.role)
      setDetailError(null)
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) {
        return
      }

      setSelectedUser(null)
      setAuditLog([])
      setDetailError(
        getAdminUserErrorMessage(error, 'Nie udalo sie pobrac szczegolow uzytkownika.'),
      )
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setIsDetailLoading(false)
      }
    }
  }

  const refreshVisibleData = async (targetUserId?: string) => {
    await loadUsers({ ...filters, search: debouncedSearch })

    if (targetUserId) {
      await loadUserDetail(targetUserId)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [filters.search])

  useEffect(() => {
    if (!isAdmin) {
      setIsListLoading(false)
      return
    }

    void loadUsers({ ...filters, search: debouncedSearch })
  }, [debouncedSearch, filters.role, filters.status, isAdmin])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (mode !== 'DETAIL' || !selectedUserId) {
      setSelectedUser(null)
      setAuditLog([])
      setDetailError(null)
      return
    }

    void loadUserDetail(selectedUserId)
  }, [isAdmin, mode, selectedUserId])

  useEffect(() => {
    if (selectedUser) {
      setRoleDraft(selectedUser.role)
    }
  }, [selectedUser])

  const handleOpenCreate = () => {
    resetFeedback()
    setCreateErrors({})
    navigate(ROUTES.ADMIN_USER_NEW)
  }

  const handleBackToList = () => {
    resetFeedback()
    navigate(ROUTES.ADMIN_USERS)
  }

  const handleOpenDetail = (userId: string) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_USER_DETAIL, userId))
  }

  const handleCreateFormChange = <K extends keyof AdminUserFormState>(
    field: K,
    value: AdminUserFormState[K],
  ) => {
    setCreateForm((current) => ({ ...current, [field]: value }))
    setCreateErrors((current) => ({ ...current, [field]: undefined, _root: undefined }))
    resetFeedback()
  }

  const handleCreateUser = async () => {
    const validationErrors = validateCreateForm(createForm)

    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors)
      return
    }

    setIsCreatingUser(true)
    resetFeedback()

    try {
      const createdUser = await createAdminUser({
        email: createForm.email.trim().toLowerCase(),
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        role: createForm.role,
        temporaryPassword: createForm.temporaryPassword,
      })

      setCreateForm(EMPTY_CREATE_FORM)
      setCreateErrors({})
      setFeedback({
        success:
          'Uzytkownik zostal utworzony. Konto ma ustawione wymaganie zmiany hasla przy kolejnym logowaniu.',
        error: null,
      })
      await refreshVisibleData(createdUser.id)
      navigate(buildPath(ROUTES.ADMIN_USER_DETAIL, createdUser.id))
    } catch (error) {
      const fieldErrors = getAdminUserValidationErrors(error)

      setCreateErrors((current) => ({
        ...current,
        ...fieldErrors,
        email: fieldErrors.email ?? current.email,
        _root:
          Object.keys(fieldErrors).length > 0
            ? 'Formularz zawiera bledy. Popraw oznaczone pola.'
            : undefined,
      }))
      setFeedback({
        success: null,
        error: getAdminUserErrorMessage(error, 'Nie udalo sie utworzyc uzytkownika.'),
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleRoleSave = async () => {
    if (!selectedUser || roleDraft === selectedUser.role) {
      return
    }

    setIsRoleSaving(true)
    resetFeedback()

    try {
      await updateAdminUserRole(selectedUser.id, { role: roleDraft })
      setFeedback({ success: 'Rola uzytkownika zostala zaktualizowana.', error: null })
      await refreshVisibleData(selectedUser.id)
    } catch (error) {
      setRoleDraft(getAdminUserRoleDraftAfterSaveError(selectedUser, roleDraft))
      setFeedback({
        success: null,
        error: getAdminUserErrorMessage(error, 'Nie udalo sie zapisac nowej roli.'),
      })
    } finally {
      setIsRoleSaving(false)
    }
  }

  const closeDeactivateModal = () => {
    setDeactivateModalOpen(false)
  }

  const handleOpenDeactivateModal = () => {
    if (!selectedUser || isSelfDeactivateDisabled) {
      return
    }

    setDeactivateModalOpen(true)
  }

  const handleDeactivate = async () => {
    if (!selectedUser || isSelfDeactivateDisabled) {
      return
    }

    setDeactivateModalOpen(false)
    setIsStatusUpdating(true)
    resetFeedback()

    try {
      await deactivateAdminUser(selectedUser.id)
      setFeedback({ success: 'Konto zostalo dezaktywowane.', error: null })
      await refreshVisibleData(selectedUser.id)
    } catch (error) {
      setFeedback({
        success: null,
        error: getAdminUserErrorMessage(error, 'Nie udalo sie dezaktywowac konta.'),
      })
    } finally {
      setIsStatusUpdating(false)
    }
  }

  const handleReactivate = async () => {
    if (!selectedUser) {
      return
    }

    setIsStatusUpdating(true)
    resetFeedback()

    try {
      await reactivateAdminUser(selectedUser.id)
      setFeedback({ success: 'Konto zostalo ponownie aktywowane.', error: null })
      await refreshVisibleData(selectedUser.id)
    } catch (error) {
      setFeedback({
        success: null,
        error: getAdminUserErrorMessage(error, 'Nie udalo sie aktywowac konta.'),
      })
    } finally {
      setIsStatusUpdating(false)
    }
  }

  const closeResetPasswordModal = () => {
    setResetPasswordModalOpen(false)
    setResetPasswordValue('')
    setResetPasswordError(null)
  }

  const handleResetPasswordSubmit = async () => {
    if (!selectedUser) {
      return
    }

    if (!resetPasswordValue) {
      setResetPasswordError('Haslo tymczasowe jest wymagane.')
      return
    }

    if (resetPasswordValue.length < 8) {
      setResetPasswordError('Haslo tymczasowe musi miec co najmniej 8 znakow.')
      return
    }

    setIsResettingPassword(true)
    setResetPasswordError(null)
    resetFeedback()

    try {
      const result = await resetAdminUserPassword(selectedUser.id, {
        temporaryPassword: resetPasswordValue,
      })
      closeResetPasswordModal()
      setFeedback({
        success: result.message,
        error: null,
      })
      await refreshVisibleData(selectedUser.id)
    } catch (error) {
      setResetPasswordError(
        getAdminUserErrorMessage(error, 'Nie udalo sie zresetowac hasla uzytkownika.'),
      )
    } finally {
      setIsResettingPassword(false)
    }
  }

  if (!isAdmin) {
    return <AdminUsersAccessDeniedState />
  }

  if (mode === 'LIST') {
    return (
      <AdminUsersList
        users={listUsers}
        totalUsersCount={allUsers.length}
        summary={summary}
        filters={filters}
        isLoading={isListLoading}
        error={listError}
        feedbackSuccess={feedback.success}
        feedbackError={feedback.error}
        onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
        onRoleChange={(value) => setFilters((current) => ({ ...current, role: value }))}
        onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
        onCreate={handleOpenCreate}
        onOpen={handleOpenDetail}
      />
    )
  }

  if (mode === 'NEW') {
    return (
      <AdminUserForm
        form={createForm}
        errors={createErrors}
        isSaving={isCreatingUser}
        feedbackSuccess={feedback.success}
        feedbackError={feedback.error}
        onChange={handleCreateFormChange}
        onSubmit={handleCreateUser}
        onCancel={handleBackToList}
      />
    )
  }

  return (
    <AdminUserDetail
      user={selectedUser}
      auditEntries={auditEntries}
      isLoading={isDetailLoading}
      error={detailError}
      feedbackSuccess={feedback.success}
      feedbackError={feedback.error}
      roleDraft={roleDraft}
      isRoleSaving={isRoleSaving}
      isStatusUpdating={isStatusUpdating}
      isDeactivateDisabled={isSelfDeactivateDisabled}
      deactivateModalOpen={deactivateModalOpen}
      isResettingPassword={isResettingPassword}
      resetPasswordModalOpen={resetPasswordModalOpen}
      resetPasswordValue={resetPasswordValue}
      resetPasswordError={resetPasswordError}
      onBack={handleBackToList}
      onRoleChange={setRoleDraft}
      onRoleSave={handleRoleSave}
      onDeactivate={handleOpenDeactivateModal}
      onCloseDeactivateModal={closeDeactivateModal}
      onConfirmDeactivate={handleDeactivate}
      onReactivate={handleReactivate}
      onOpenResetPassword={() => setResetPasswordModalOpen(true)}
      onCloseResetPassword={closeResetPasswordModal}
      onResetPasswordValueChange={(value) => {
        setResetPasswordValue(value)
        setResetPasswordError(null)
      }}
      onResetPasswordSubmit={handleResetPasswordSubmit}
    />
  )
}
