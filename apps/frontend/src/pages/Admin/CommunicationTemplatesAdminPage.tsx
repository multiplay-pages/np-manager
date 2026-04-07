import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type {
  CommunicationTemplateCode,
  CommunicationTemplateDto,
  CommunicationTemplateListItemDto,
  CommunicationTemplateVersionDto,
  CreateCommunicationTemplateDto,
  CreateCommunicationTemplateVersionDto,
  UpdateCommunicationTemplateVersionDto,
} from '@np-manager/shared'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTES, buildPath } from '@/constants/routes'
import {
  archiveCommunicationTemplateVersion,
  cloneCommunicationTemplateVersion,
  createCommunicationTemplate,
  createCommunicationTemplateVersion,
  getCommunicationTemplateByCode,
  getCommunicationTemplates,
  previewCommunicationTemplateVersionRealCase,
  publishCommunicationTemplateVersion,
  updateCommunicationTemplateVersion,
} from '@/services/communicationTemplates.api'
import {
  buildCommunicationTemplateDetailView,
  buildCommunicationTemplateListView,
  mapRealCasePreviewToPreviewResult,
  renderCommunicationTemplatePreview,
  type CommunicationTemplateGroupView,
  type CommunicationTemplateListFilterStatus,
  type CommunicationTemplateListItemView,
  type CommunicationTemplatePreviewResult,
  type CommunicationTemplateVersionView,
} from '@/lib/communicationTemplates'
import {
  getCommunicationTemplateAdminErrorMessage,
  normalizeCommunicationTemplateChannel,
} from '@/lib/communicationTemplateAdmin'
import {
  CommunicationTemplateDetail,
  CommunicationTemplateEditor,
  CommunicationTemplatePreviewModal,
  CommunicationTemplatePublishModal,
  CommunicationTemplatesList,
  type CommunicationTemplateEditorFormState,
  type CommunicationTemplateEditorStatusInfo,
} from '@/components/CommunicationTemplatesAdmin'

type AdminMode = 'LIST' | 'DETAIL' | 'NEW' | 'EDIT'

interface RouteState {
  versionId?: string
}

interface FeedbackState {
  success: string | null
  error: string | null
}

interface PreviewModalState {
  isOpen: boolean
  title: string
  subtitle: string
  preview: CommunicationTemplatePreviewResult
  testPreview: CommunicationTemplatePreviewResult
  versionId: string | null
  realCaseReference: string
  realCaseLabel: string
  isRealCaseLoading: boolean
  realCaseError: string | null
  realCaseHelpText: string | null
}

interface PublishModalState {
  isOpen: boolean
  versionId: string | null
  code: CommunicationTemplateCode | null
  templateName: string
  versionLabel: string
}

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createEmptyEditorForm(
  code: CommunicationTemplateCode = 'REQUEST_RECEIVED',
): CommunicationTemplateEditorFormState {
  return {
    id: null,
    templateId: null,
    code,
    name: '',
    description: '',
    channel: 'EMAIL',
    subjectTemplate: '',
    bodyTemplate: '',
    status: 'DRAFT',
    versionNumber: null,
  }
}

function mapVersionToForm(version: CommunicationTemplateVersionView): CommunicationTemplateEditorFormState {
  return {
    id: version.id,
    templateId: version.templateId,
    code: version.code,
    name: version.name,
    description: version.description ?? '',
    channel: version.channel,
    subjectTemplate: version.subjectTemplate,
    bodyTemplate: version.bodyTemplate,
    status: version.status,
    versionNumber: version.versionNumber,
  }
}

function getAdminMode(pathname: string): AdminMode {
  if (pathname.endsWith('/new')) return 'NEW'
  if (pathname.endsWith('/edit')) return 'EDIT'
  if (pathname === ROUTES.ADMIN_COMMUNICATION_TEMPLATES) return 'LIST'
  return 'DETAIL'
}

function getNextVersion(group: CommunicationTemplateGroupView | null): number {
  if (!group || group.versions.length === 0) {
    return 1
  }

  return Math.max(...group.versions.map((version) => version.versionNumber)) + 1
}

function getTemplateErrorMessage(error: unknown, fallback: string): string {
  return getCommunicationTemplateAdminErrorMessage(error, fallback)
}

function getEditorStatusInfo(
  form: CommunicationTemplateEditorFormState,
  group: CommunicationTemplateGroupView | null,
): CommunicationTemplateEditorStatusInfo {
  const editedVersion = form.id
    ? group?.versions.find((version) => version.id === form.id) ?? null
    : null

  if (editedVersion) {
    return {
      versionLabel: `v${editedVersion.versionNumber}`,
      statusLabel:
        editedVersion.status === 'PUBLISHED'
          ? 'Opublikowana'
          : editedVersion.status === 'ARCHIVED'
            ? 'Archiwalna'
            : 'Robocza',
      lastEditedAt: new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(editedVersion.updatedAt)),
      lastEditedByDisplayName: editedVersion.updatedByDisplayName,
    }
  }

  return {
    versionLabel: form.versionNumber ? `v${form.versionNumber}` : `v${getNextVersion(group)}`,
    statusLabel: 'Robocza - nieopublikowana',
    lastEditedAt: null,
    lastEditedByDisplayName: null,
  }
}

function createInitialPreviewState(): PreviewModalState {
  const emptyPreview = renderCommunicationTemplatePreview({
    subjectTemplate: '',
    bodyTemplate: '',
  })

  return {
    isOpen: false,
    title: '',
    subtitle: '',
    preview: emptyPreview,
    testPreview: emptyPreview,
    versionId: null,
    realCaseReference: '',
    realCaseLabel: '',
    isRealCaseLoading: false,
    realCaseError: null,
    realCaseHelpText: null,
  }
}

function createInitialPublishState(): PublishModalState {
  return {
    isOpen: false,
    versionId: null,
    code: null,
    templateName: '',
    versionLabel: '',
  }
}

function AdminAccessDeniedState() {
  return (
    <div className="p-6">
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Szablony komunikatow</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Ten widok jest dostepny wylacznie dla administratora. Jesli potrzebujesz dostepu,
          skontaktuj sie z wlascicielem systemu.
        </p>
      </div>
    </div>
  )
}

export function CommunicationTemplatesAdminPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const routeState = (location.state ?? {}) as RouteState
  const mode = getAdminMode(location.pathname)

  const [templateItems, setTemplateItems] = useState<CommunicationTemplateListItemDto[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplateDto | null>(null)
  const [isListLoading, setIsListLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>({ success: null, error: null })
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL' as CommunicationTemplateListFilterStatus,
    code: '',
    channel: '',
  })
  const [editorForm, setEditorForm] = useState<CommunicationTemplateEditorFormState>(() =>
    createEmptyEditorForm(),
  )
  const [previewMode, setPreviewMode] = useState<'TEST' | 'REAL'>('TEST')
  const [previewState, setPreviewState] = useState<PreviewModalState>(createInitialPreviewState)
  const [publishState, setPublishState] = useState<PublishModalState>(createInitialPublishState)
  const [publishError, setPublishError] = useState<string | null>(null)

  const templateList = useMemo(
    () => buildCommunicationTemplateListView(templateItems),
    [templateItems],
  )
  const selectedGroup = useMemo(
    () => buildCommunicationTemplateDetailView(selectedTemplate),
    [selectedTemplate],
  )

  const filteredList = useMemo(() => {
    return templateList.filter((item) => {
      const searchValue = filters.search.trim().toLowerCase()
      const matchesSearch =
        searchValue.length === 0 ||
        item.name.toLowerCase().includes(searchValue) ||
        item.code.toLowerCase().includes(searchValue) ||
        (item.description ?? '').toLowerCase().includes(searchValue)

      const matchesStatus = filters.status === 'ALL' || item.primaryStatus === filters.status
      const matchesCode = !filters.code || item.code === filters.code
      const matchesChannel = !filters.channel || item.channel === filters.channel

      return matchesSearch && matchesStatus && matchesCode && matchesChannel
    })
  }, [filters, templateList])

  const editorPreview = useMemo(
    () =>
      renderCommunicationTemplatePreview({
        subjectTemplate: editorForm.subjectTemplate,
        bodyTemplate: editorForm.bodyTemplate,
      }),
    [editorForm.bodyTemplate, editorForm.subjectTemplate],
  )

  const editorStatusInfo = useMemo(
    () => getEditorStatusInfo(editorForm, selectedGroup),
    [editorForm, selectedGroup],
  )

  const lockIdentityFields = mode === 'EDIT' && !!params.id
  const selectedCode = params.id as CommunicationTemplateCode | undefined

  const resetFeedback = () => {
    setFeedback({ success: null, error: null })
    setPageError(null)
    setPublishError(null)
  }

  const loadTemplateList = async () => {
    setIsListLoading(true)

    try {
      const result = await getCommunicationTemplates()
      setTemplateItems(result.items)
      setPageError(null)
    } catch (error) {
      setTemplateItems([])
      setPageError(getTemplateErrorMessage(error, 'Nie udalo sie pobrac szablonow komunikatow.'))
    } finally {
      setIsListLoading(false)
    }
  }

  const loadTemplateDetail = async (code: CommunicationTemplateCode) => {
    setIsDetailLoading(true)

    try {
      const template = await getCommunicationTemplateByCode(code)
      setSelectedTemplate(template)
      setPageError(null)
      return template
    } catch (error) {
      setSelectedTemplate(null)
      setPageError(getTemplateErrorMessage(error, 'Nie udalo sie pobrac szczegolow szablonu komunikatu.'))
      return null
    } finally {
      setIsDetailLoading(false)
    }
  }

  const refreshCurrentTemplate = async (code?: CommunicationTemplateCode | null) => {
    await loadTemplateList()

    if (code) {
      await loadTemplateDetail(code)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setIsListLoading(false)
      return
    }

    void loadTemplateList()
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (mode === 'LIST' || mode === 'NEW' || !selectedCode) {
      setSelectedTemplate(null)
      return
    }

    void loadTemplateDetail(selectedCode)
  }, [isAdmin, mode, selectedCode])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (mode === 'LIST' || mode === 'DETAIL') {
      return
    }

    if (mode === 'NEW') {
      setEditorForm(createEmptyEditorForm())
      return
    }

    if (!selectedGroup) {
      setEditorForm(createEmptyEditorForm(selectedCode))
      return
    }

    const editableVersion =
      selectedGroup.versions.find((version) => version.id === routeState.versionId) ?? null

    if (editableVersion) {
      setEditorForm(mapVersionToForm(editableVersion))
      return
    }

    if (selectedGroup.draftVersions[0]) {
      setEditorForm(mapVersionToForm(selectedGroup.draftVersions[0]))
      return
    }

    const empty = createEmptyEditorForm(selectedGroup.code)
    empty.templateId = selectedGroup.id
    empty.name = selectedGroup.name
    empty.description = selectedGroup.description ?? ''
    empty.channel = selectedGroup.channel
    empty.versionNumber = getNextVersion(selectedGroup)
    setEditorForm(empty)
  }, [isAdmin, mode, routeState.versionId, selectedGroup, selectedCode])

  const openPreview = (params: {
    title: string
    subtitle: string
    subjectTemplate: string
    bodyTemplate: string
    versionId: string | null
    realCaseHelpText?: string | null
  }) => {
    const testPreview = renderCommunicationTemplatePreview({
      subjectTemplate: params.subjectTemplate,
      bodyTemplate: params.bodyTemplate,
    })

    setPreviewMode('TEST')
    setPreviewState({
      isOpen: true,
      title: params.title,
      subtitle: params.subtitle,
      preview: testPreview,
      testPreview,
      versionId: params.versionId,
      realCaseReference: '',
      realCaseLabel: '',
      isRealCaseLoading: false,
      realCaseError: null,
      realCaseHelpText: params.realCaseHelpText ?? null,
    })
  }

  const handlePreviewModeChange = (modeValue: 'TEST' | 'REAL') => {
    setPreviewMode(modeValue)
    setPreviewState((current) => ({
      ...current,
      preview: modeValue === 'TEST' ? current.testPreview : current.preview,
      realCaseError: modeValue === 'TEST' ? null : current.realCaseError,
    }))
  }

  const handleRunRealCasePreview = async () => {
    if (!previewState.versionId) {
      return
    }

    const reference = previewState.realCaseReference.trim()

    if (!reference) {
      setPreviewState((current) => ({
        ...current,
        realCaseError: 'Podaj numer sprawy albo ID sprawy do preview real-case.',
      }))
      return
    }

    setPreviewState((current) => ({
      ...current,
      isRealCaseLoading: true,
      realCaseError: null,
    }))

    try {
      const preview = await previewCommunicationTemplateVersionRealCase(previewState.versionId, UUID_LIKE_PATTERN.test(reference)
        ? { portingRequestId: reference }
        : { caseNumber: reference })

      setPreviewState((current) => ({
        ...current,
        isRealCaseLoading: false,
        realCaseError: null,
        realCaseLabel: reference,
        preview: mapRealCasePreviewToPreviewResult(preview),
      }))
    } catch (error) {
      setPreviewState((current) => ({
        ...current,
        isRealCaseLoading: false,
        realCaseError: getTemplateErrorMessage(error, 'Nie udalo sie przygotowac preview dla wskazanej sprawy.'),
      }))
    }
  }

  const handleEditorChange = <K extends keyof CommunicationTemplateEditorFormState>(
    field: K,
    value: CommunicationTemplateEditorFormState[K],
  ) => {
    setEditorForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCreateTemplate = () => {
    resetFeedback()
    navigate(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_NEW)
  }

  const handleOpenDetail = (code: string) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL, code))
  }

  const handleCreateDraftFromDetail = async (group: CommunicationTemplateGroupView) => {
    resetFeedback()

    const sourceVersion = group.publishedVersion ?? group.draftVersions[0] ?? group.archivedVersions[0] ?? null

    if (!sourceVersion) {
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, group.code))
      return
    }

    try {
      const clonedVersion = await cloneCommunicationTemplateVersion(sourceVersion.id)
      await refreshCurrentTemplate(group.code)
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, group.code), {
        state: { versionId: clonedVersion.id } satisfies RouteState,
      })
    } catch (error) {
      setFeedback({
        success: null,
        error: getTemplateErrorMessage(error, 'Nie udalo sie utworzyc nowej wersji roboczej.'),
      })
    }
  }

  const handleCreateDraftFromList = async (code: string) => {
    const template = await loadTemplateDetail(code as CommunicationTemplateCode)

    if (!template) {
      return
    }

    const group = buildCommunicationTemplateDetailView(template)

    if (!group) {
      return
    }

    await handleCreateDraftFromDetail(group)
  }

  const handleEditDraft = (version: CommunicationTemplateVersionView) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, version.code), {
      state: { versionId: version.id } satisfies RouteState,
    })
  }

  const handleCloneVersion = async (version: CommunicationTemplateVersionView) => {
    resetFeedback()

    try {
      const clonedVersion = await cloneCommunicationTemplateVersion(version.id)
      await refreshCurrentTemplate(version.code)
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, version.code), {
        state: { versionId: clonedVersion.id } satisfies RouteState,
      })
    } catch (error) {
      setFeedback({
        success: null,
        error: getTemplateErrorMessage(error, 'Nie udalo sie sklonowac wersji do nowego draftu.'),
      })
    }
  }

  const handleArchiveVersion = async (version: CommunicationTemplateVersionView) => {
    resetFeedback()

    try {
      await archiveCommunicationTemplateVersion(version.id)
      await refreshCurrentTemplate(version.code)
      setFeedback({
        success: 'Wersja zostala zarchiwizowana.',
        error: null,
      })
    } catch (error) {
      setFeedback({
        success: null,
        error: getTemplateErrorMessage(error, 'Nie udalo sie zarchiwizowac wersji.'),
      })
    }
  }

  const handleOpenVersionPreview = (version: CommunicationTemplateVersionView) => {
    openPreview({
      title: `${version.name} - podglad`,
      subtitle: `Wersja v${version.versionNumber} · ${version.status === 'PUBLISHED' ? 'opublikowana' : version.status === 'DRAFT' ? 'robocza' : 'archiwalna'}`,
      subjectTemplate: version.subjectTemplate,
      bodyTemplate: version.bodyTemplate,
      versionId: version.id,
      realCaseHelpText: 'Preview real-case nie zapisuje komunikacji i sluzy tylko do bezpiecznego sprawdzenia renderu.',
    })
  }

  const handlePreviewPublished = async (code: string) => {
    const template = await loadTemplateDetail(code as CommunicationTemplateCode)

    if (!template) {
      return
    }

    const group = buildCommunicationTemplateDetailView(template)

    if (!group?.publishedVersion) {
      setFeedback({ success: null, error: 'Brak opublikowanej wersji tego szablonu.' })
      return
    }

    handleOpenVersionPreview(group.publishedVersion)
  }

  const persistDraft = async (): Promise<{
    version: CommunicationTemplateVersionDto
    code: CommunicationTemplateCode
  }> => {
    if (editorForm.id) {
      const payload: UpdateCommunicationTemplateVersionDto = {
        name: editorForm.name.trim(),
        description: editorForm.description.trim() || null,
        subjectTemplate: editorForm.subjectTemplate,
        bodyTemplate: editorForm.bodyTemplate,
      }

      const version = await updateCommunicationTemplateVersion(editorForm.id, payload)
      return { version, code: editorForm.code }
    }

    if (selectedGroup) {
      const payload: CreateCommunicationTemplateVersionDto = {
        name: editorForm.name.trim(),
        description: editorForm.description.trim() || null,
        subjectTemplate: editorForm.subjectTemplate,
        bodyTemplate: editorForm.bodyTemplate,
      }
      const version = await createCommunicationTemplateVersion(selectedGroup.code, payload)
      return { version, code: selectedGroup.code }
    }

    const payload: CreateCommunicationTemplateDto = {
      code: editorForm.code,
      name: editorForm.name.trim(),
      description: editorForm.description.trim() || null,
      channel: normalizeCommunicationTemplateChannel(editorForm.channel),
      subjectTemplate: editorForm.subjectTemplate,
      bodyTemplate: editorForm.bodyTemplate,
    }

    const template = await createCommunicationTemplate(payload)
    const draftVersion =
      template.versions.find((version) => version.status === 'DRAFT') ?? template.versions[0]

    if (!draftVersion) {
      throw new Error('Nie znaleziono zapisanej wersji roboczej po utworzeniu szablonu.')
    }

    return {
      version: draftVersion,
      code: template.code,
    }
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    resetFeedback()

    try {
      const saved = await persistDraft()
      await refreshCurrentTemplate(saved.code)
      setFeedback({ success: 'Wersja robocza zostala zapisana.', error: null })
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, saved.code), {
        replace: true,
        state: { versionId: saved.version.id } satisfies RouteState,
      })
    } catch (error) {
      setFeedback({
        success: null,
        error: getTemplateErrorMessage(error, 'Nie udalo sie zapisac wersji roboczej.'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenEditorPreview = () => {
    openPreview({
      title: editorForm.name.trim() || 'Podglad wersji roboczej',
      subtitle: 'Podglad na danych testowych. Dla zapisanych wersji mozesz uruchomic tez preview na realnej sprawie.',
      subjectTemplate: editorForm.subjectTemplate,
      bodyTemplate: editorForm.bodyTemplate,
      versionId: editorForm.id,
      realCaseHelpText: editorForm.id
        ? 'Preview real-case sprawdza zapisany stan wersji backendowej.'
        : 'Zapisz wersje robocza, aby uruchomic preview na realnej sprawie.',
    })
  }

  const openPublishModal = (
    versionId: string | null,
    code: CommunicationTemplateCode,
    templateName: string,
    versionLabel: string,
  ) => {
    setPublishError(null)
    setPublishState({
      isOpen: true,
      versionId,
      code,
      templateName,
      versionLabel,
    })
  }

  const handlePreparePublishFromEditor = () => {
    const isInvalid =
      !editorForm.name.trim() ||
      !editorForm.subjectTemplate.trim() ||
      !editorForm.bodyTemplate.trim() ||
      editorPreview.unknownPlaceholders.length > 0

    if (isInvalid) {
      setFeedback({
        success: null,
        error: 'Nie mozna opublikowac wersji z bledami walidacji.',
      })
      return
    }

    openPublishModal(
      editorForm.id,
      editorForm.code,
      editorForm.name.trim() || 'Szablon komunikatu',
      editorForm.versionNumber ? `v${editorForm.versionNumber}` : `v${getNextVersion(selectedGroup)}`,
    )
  }

  const handlePreparePublishVersion = (version: CommunicationTemplateVersionView) => {
    const preview = renderCommunicationTemplatePreview({
      subjectTemplate: version.subjectTemplate,
      bodyTemplate: version.bodyTemplate,
    })

    if (!version.subjectTemplate.trim() || !version.bodyTemplate.trim() || preview.unknownPlaceholders.length > 0) {
      setFeedback({
        success: null,
        error: 'Nie mozna opublikowac wersji z bledami walidacji.',
      })
      return
    }

    openPublishModal(version.id, version.code, version.name, `v${version.versionNumber}`)
  }

  const closePublishModal = () => {
    setPublishState(createInitialPublishState())
    setPublishError(null)
  }

  const confirmPublish = async () => {
    if (!publishState.code) {
      return
    }

    setIsPublishing(true)
    setPublishError(null)
    resetFeedback()

    try {
      let resolvedVersionId = publishState.versionId

      if (!resolvedVersionId) {
        const saved = await persistDraft()
        resolvedVersionId = saved.version.id
      }

      await publishCommunicationTemplateVersion(resolvedVersionId)
      await refreshCurrentTemplate(publishState.code)
      setFeedback({
        success: 'Wersja zostala opublikowana i jest juz uzywana operacyjnie.',
        error: null,
      })
      closePublishModal()
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL, publishState.code), {
        replace: true,
      })
    } catch (error) {
      setPublishError(
        getTemplateErrorMessage(
          error,
          'Nie udalo sie opublikowac wersji. Widok zostal odswiezony zgodnie z aktualnym stanem danych.',
        ),
      )
      await refreshCurrentTemplate(publishState.code)
    } finally {
      setIsPublishing(false)
    }
  }

  if (!isAdmin) {
    return <AdminAccessDeniedState />
  }

  if (mode === 'LIST') {
    return (
      <>
        <CommunicationTemplatesList
          items={filteredList}
          isLoading={isListLoading}
          error={pageError}
          filters={filters}
          onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          onCodeChange={(value) => setFilters((current) => ({ ...current, code: value }))}
          onChannelChange={(value) => setFilters((current) => ({ ...current, channel: value }))}
          onCreate={handleCreateTemplate}
          onOpen={handleOpenDetail}
          onCreateDraft={handleCreateDraftFromList}
          onPreviewPublished={handlePreviewPublished}
        />

        <CommunicationTemplatePreviewModal
          isOpen={previewState.isOpen}
          title={previewState.title}
          subtitle={previewState.subtitle}
          preview={previewState.preview}
          mode={previewMode}
          realCaseReference={previewState.realCaseReference}
          realCaseLabel={previewState.realCaseLabel}
          isRealCaseAvailable={Boolean(previewState.versionId)}
          isRealCaseLoading={previewState.isRealCaseLoading}
          realCaseError={previewState.realCaseError}
          realCaseHelpText={previewState.realCaseHelpText}
          onModeChange={handlePreviewModeChange}
          onRealCaseReferenceChange={(value) =>
            setPreviewState((current) => ({ ...current, realCaseReference: value, realCaseError: null }))
          }
          onRunRealCasePreview={handleRunRealCasePreview}
          onClose={() => setPreviewState(createInitialPreviewState())}
        />
      </>
    )
  }

  if (mode === 'DETAIL') {
    return (
      <>
        <CommunicationTemplateDetail
          group={selectedGroup}
          isLoading={isListLoading || isDetailLoading}
          error={pageError}
          feedbackSuccess={feedback.success}
          feedbackError={feedback.error}
          onBack={() => navigate(ROUTES.ADMIN_COMMUNICATION_TEMPLATES)}
          onCreateDraft={handleCreateDraftFromDetail}
          onEditDraft={handleEditDraft}
          onPreviewVersion={handleOpenVersionPreview}
          onPublishVersion={handlePreparePublishVersion}
          onArchiveVersion={handleArchiveVersion}
          onCloneVersion={handleCloneVersion}
          onDetailsVersion={handleOpenVersionPreview}
        />

        <CommunicationTemplatePreviewModal
          isOpen={previewState.isOpen}
          title={previewState.title}
          subtitle={previewState.subtitle}
          preview={previewState.preview}
          mode={previewMode}
          realCaseReference={previewState.realCaseReference}
          realCaseLabel={previewState.realCaseLabel}
          isRealCaseAvailable={Boolean(previewState.versionId)}
          isRealCaseLoading={previewState.isRealCaseLoading}
          realCaseError={previewState.realCaseError}
          realCaseHelpText={previewState.realCaseHelpText}
          onModeChange={handlePreviewModeChange}
          onRealCaseReferenceChange={(value) =>
            setPreviewState((current) => ({ ...current, realCaseReference: value, realCaseError: null }))
          }
          onRunRealCasePreview={handleRunRealCasePreview}
          onClose={() => setPreviewState(createInitialPreviewState())}
        />

        <CommunicationTemplatePublishModal
          isOpen={publishState.isOpen}
          versionLabel={publishState.versionLabel}
          templateName={publishState.templateName}
          isPublishing={isPublishing}
          publishError={publishError}
          onConfirm={confirmPublish}
          onCancel={closePublishModal}
        />
      </>
    )
  }

  return (
    <>
      <CommunicationTemplateEditor
        title={mode === 'NEW' ? 'Nowy szablon komunikatu' : 'Edycja wersji roboczej'}
        subtitle={
          mode === 'NEW'
            ? 'Przygotuj nowy szablon i zapisz go jako wersje robocza. Publikacja jest osobna, swiadoma akcja.'
            : 'Pracujesz na wersji roboczej. Opublikowana wersja pozostaje bezpieczna, dopoki nie zatwierdzisz zmian.'
        }
        form={editorForm}
        statusInfo={editorStatusInfo}
        preview={editorPreview}
        feedbackSuccess={feedback.success}
        feedbackError={feedback.error ?? pageError}
        isSaving={isSaving}
        isPublishing={isPublishing}
        lockIdentityFields={lockIdentityFields}
        onChange={handleEditorChange}
        onSave={handleSaveDraft}
        onPreview={handleOpenEditorPreview}
        onPublish={handlePreparePublishFromEditor}
        onCancel={() =>
          navigate(
            selectedCode
              ? buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL, selectedCode)
              : ROUTES.ADMIN_COMMUNICATION_TEMPLATES,
          )
        }
      />

      <CommunicationTemplatePreviewModal
        isOpen={previewState.isOpen}
        title={previewState.title}
        subtitle={previewState.subtitle}
        preview={previewState.preview}
        mode={previewMode}
        realCaseReference={previewState.realCaseReference}
        realCaseLabel={previewState.realCaseLabel}
        isRealCaseAvailable={Boolean(previewState.versionId)}
        isRealCaseLoading={previewState.isRealCaseLoading}
        realCaseError={previewState.realCaseError}
        realCaseHelpText={previewState.realCaseHelpText}
        onModeChange={handlePreviewModeChange}
        onRealCaseReferenceChange={(value) =>
          setPreviewState((current) => ({ ...current, realCaseReference: value, realCaseError: null }))
        }
        onRunRealCasePreview={handleRunRealCasePreview}
        onClose={() => setPreviewState(createInitialPreviewState())}
      />

      <CommunicationTemplatePublishModal
        isOpen={publishState.isOpen}
        versionLabel={publishState.versionLabel}
        templateName={publishState.templateName}
        isPublishing={isPublishing}
        publishError={publishError}
        onConfirm={confirmPublish}
        onCancel={closePublishModal}
      />
    </>
  )
}
