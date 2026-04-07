import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type {
  CommunicationTemplateDto,
  CreateCommunicationTemplateDto,
  UpdateCommunicationTemplateDto,
} from '@np-manager/shared'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTES, buildPath } from '@/constants/routes'
import {
  activateCommunicationTemplate,
  createCommunicationTemplate,
  deactivateCommunicationTemplate,
  getCommunicationTemplates,
  updateCommunicationTemplate,
} from '@/services/communicationTemplates.api'
import {
  buildCommunicationTemplateGroups,
  findTemplateGroupByCode,
  renderCommunicationTemplatePreview,
  type CommunicationTemplateGroupView,
  type CommunicationTemplateListFilterStatus,
  type CommunicationTemplatePreviewResult,
  type CommunicationTemplateVersionView,
} from '@/lib/communicationTemplates'
import {
  getCommunicationTemplateAdminErrorMessage,
  normalizeCommunicationTemplateChannel,
  publishCommunicationTemplateVersion,
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
  sourceVersionId?: string
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
}

interface PublishModalState {
  isOpen: boolean
  versionId: string | null
  code: string | null
  templateName: string
  versionLabel: string
}

function createEmptyEditorForm(): CommunicationTemplateEditorFormState {
  return {
    id: null,
    code: 'REQUEST_RECEIVED',
    name: '',
    description: '',
    channel: 'EMAIL',
    subjectTemplate: '',
    bodyTemplate: '',
    isActive: false,
    version: null,
  }
}

function mapVersionToForm(version: CommunicationTemplateVersionView): CommunicationTemplateEditorFormState {
  return {
    id: version.id,
    code: version.code,
    name: version.name,
    description: version.description ?? '',
    channel: version.channel,
    subjectTemplate: version.subjectTemplate,
    bodyTemplate: version.bodyTemplate,
    isActive: false,
    version: version.version,
  }
}

function cloneVersionToDraft(
  version: CommunicationTemplateVersionView,
  nextVersion: number,
): CommunicationTemplateEditorFormState {
  return {
    ...mapVersionToForm(version),
    id: null,
    isActive: false,
    version: nextVersion,
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

  return Math.max(...group.versions.map((version) => version.version)) + 1
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
      versionLabel: `v${editedVersion.version}`,
      statusLabel: 'Robocza',
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
    versionLabel: form.version ? `v${form.version}` : `v${getNextVersion(group)}`,
    statusLabel: 'Robocza - nieopublikowana',
    lastEditedAt: null,
    lastEditedByDisplayName: null,
  }
}

function createInitialPreviewState(): PreviewModalState {
  return {
    isOpen: false,
    title: '',
    subtitle: '',
    preview: renderCommunicationTemplatePreview({
      subjectTemplate: '',
      bodyTemplate: '',
    }),
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

  const [templates, setTemplates] = useState<CommunicationTemplateDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
  const [editorForm, setEditorForm] = useState<CommunicationTemplateEditorFormState>(createEmptyEditorForm)
  const [previewMode, setPreviewMode] = useState<'TEST' | 'REAL'>('TEST')
  const [previewState, setPreviewState] = useState<PreviewModalState>(createInitialPreviewState)
  const [publishState, setPublishState] = useState<PublishModalState>(createInitialPublishState)
  const [publishError, setPublishError] = useState<string | null>(null)

  const groups = useMemo(
    () => buildCommunicationTemplateGroups(templates),
    [templates],
  )
  const selectedGroup = useMemo(
    () => findTemplateGroupByCode(groups, params.id),
    [groups, params.id],
  )

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const searchValue = filters.search.trim().toLowerCase()
      const matchesSearch =
        searchValue.length === 0 ||
        group.name.toLowerCase().includes(searchValue) ||
        group.code.toLowerCase().includes(searchValue) ||
        (group.description ?? '').toLowerCase().includes(searchValue)

      const matchesStatus = filters.status === 'ALL' || group.primaryStatus === filters.status
      const matchesCode = !filters.code || group.code === filters.code
      const matchesChannel = !filters.channel || group.channel === filters.channel

      return matchesSearch && matchesStatus && matchesCode && matchesChannel
    })
  }, [filters, groups])

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

  const resetFeedback = () => {
    setFeedback({ success: null, error: null })
    setPageError(null)
    setPublishError(null)
  }

  const loadTemplates = async () => {
    setIsLoading(true)

    try {
      const result = await getCommunicationTemplates()
      setTemplates(result.items)
      setPageError(null)
    } catch (error) {
      setTemplates([])
      setPageError(getTemplateErrorMessage(error, 'Nie udalo sie pobrac szablonow komunikatow.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    void loadTemplates()
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    if (mode === 'LIST' || mode === 'DETAIL') {
      return
    }

    const targetGroup = selectedGroup
    const editableVersion =
      targetGroup?.versions.find((version) => version.id === routeState.versionId) ?? null
    const sourceVersion =
      targetGroup?.versions.find((version) => version.id === routeState.sourceVersionId) ?? null

    if (mode === 'NEW') {
      setEditorForm(createEmptyEditorForm())
      return
    }

    if (editableVersion) {
      setEditorForm(mapVersionToForm(editableVersion))
      return
    }

    if (sourceVersion) {
      setEditorForm(cloneVersionToDraft(sourceVersion, getNextVersion(targetGroup)))
      return
    }

    if (targetGroup?.draftVersions[0]) {
      setEditorForm(mapVersionToForm(targetGroup.draftVersions[0]))
      return
    }

    if (targetGroup?.publishedVersion) {
      setEditorForm(cloneVersionToDraft(targetGroup.publishedVersion, getNextVersion(targetGroup)))
      return
    }

    const empty = createEmptyEditorForm()
    if (params.id) {
      empty.code = params.id as CommunicationTemplateEditorFormState['code']
    }
    setEditorForm(empty)
  }, [isAdmin, mode, params.id, routeState.sourceVersionId, routeState.versionId, selectedGroup])

  const openPreview = ({
    title,
    subtitle,
    subjectTemplate,
    bodyTemplate,
  }: {
    title: string
    subtitle: string
    subjectTemplate: string
    bodyTemplate: string
  }) => {
    setPreviewMode('TEST')
    setPreviewState({
      isOpen: true,
      title,
      subtitle,
      preview: renderCommunicationTemplatePreview({
        subjectTemplate,
        bodyTemplate,
      }),
    })
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

  const handleOpenDetail = (group: CommunicationTemplateGroupView) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL, group.code))
  }

  const handleCreateDraftFromGroup = (group: CommunicationTemplateGroupView) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, group.code))
  }

  const handleEditDraft = (version: CommunicationTemplateVersionView) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, version.code), {
      state: { versionId: version.id } satisfies RouteState,
    })
  }

  const handleCloneVersion = (version: CommunicationTemplateVersionView) => {
    resetFeedback()
    navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, version.code), {
      state: { sourceVersionId: version.id } satisfies RouteState,
    })
  }

  const handleOpenVersionPreview = (version: CommunicationTemplateVersionView) => {
    openPreview({
      title: `${version.name} - podglad`,
      subtitle: `Wersja v${version.version} · ${version.uiStatus === 'PUBLISHED' ? 'opublikowana' : 'robocza lub archiwalna'}`,
      subjectTemplate: version.subjectTemplate,
      bodyTemplate: version.bodyTemplate,
    })
  }

  const handlePreviewPublished = (group: CommunicationTemplateGroupView) => {
    if (!group.publishedVersion) {
      setFeedback({ success: null, error: 'Brak opublikowanej wersji tego szablonu.' })
      return
    }

    handleOpenVersionPreview(group.publishedVersion)
  }

  const persistDraft = async (): Promise<CommunicationTemplateVersionView> => {
    const payload: CreateCommunicationTemplateDto | UpdateCommunicationTemplateDto = {
      code: editorForm.code,
      name: editorForm.name.trim(),
      description: editorForm.description.trim() || null,
      channel: normalizeCommunicationTemplateChannel(editorForm.channel),
      subjectTemplate: editorForm.subjectTemplate,
      bodyTemplate: editorForm.bodyTemplate,
      isActive: false,
    }

    if (editorForm.id) {
      return (await updateCommunicationTemplate(editorForm.id, payload)) as CommunicationTemplateVersionView
    }

    return (await createCommunicationTemplate(payload as CreateCommunicationTemplateDto)) as CommunicationTemplateVersionView
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    resetFeedback()

    try {
      const saved = await persistDraft()
      setFeedback({ success: 'Wersja robocza zostala zapisana.', error: null })
      await loadTemplates()
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_EDIT, saved.code), {
        replace: true,
        state: { versionId: saved.id } satisfies RouteState,
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
      subtitle: 'Podglad na danych testowych. Tryb realnej sprawy zostal przygotowany pod kolejny etap.',
      subjectTemplate: editorForm.subjectTemplate,
      bodyTemplate: editorForm.bodyTemplate,
    })
  }

  const openPublishModal = (
    versionId: string | null,
    code: string,
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
      editorForm.version ? `v${editorForm.version}` : `v${getNextVersion(selectedGroup)}`,
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

    openPublishModal(version.id, version.code, version.name, `v${version.version}`)
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
      const targetGroup = findTemplateGroupByCode(groups, publishState.code)
      const published = await publishCommunicationTemplateVersion({
        code: publishState.code,
        versionId: publishState.versionId,
        activeVersionId: targetGroup?.publishedVersion?.id ?? null,
        persistDraft,
        activateTemplate: activateCommunicationTemplate,
        deactivateTemplate: deactivateCommunicationTemplate,
      })
      await loadTemplates()

      setFeedback({
        success: 'Wersja zostala opublikowana i jest juz uzywana operacyjnie.',
        error: null,
      })
      closePublishModal()
      navigate(buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL, published.code), {
        replace: true,
      })
    } catch (error) {
      setPublishError(
        getTemplateErrorMessage(
          error,
          'Nie udalo sie opublikowac wersji. Widok zostal odswiezony zgodnie z aktualnym stanem danych.',
        ),
      )
      await loadTemplates()
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
          groups={filteredGroups}
          isLoading={isLoading}
          error={pageError}
          filters={filters}
          onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
          onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          onCodeChange={(value) => setFilters((current) => ({ ...current, code: value }))}
          onChannelChange={(value) => setFilters((current) => ({ ...current, channel: value }))}
          onCreate={handleCreateTemplate}
          onOpen={handleOpenDetail}
          onCreateDraft={handleCreateDraftFromGroup}
          onPreviewPublished={handlePreviewPublished}
        />

        <CommunicationTemplatePreviewModal
          isOpen={previewState.isOpen}
          title={previewState.title}
          subtitle={previewState.subtitle}
          preview={previewState.preview}
          mode={previewMode}
          onModeChange={setPreviewMode}
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
          isLoading={isLoading}
          error={pageError}
          feedbackSuccess={feedback.success}
          feedbackError={feedback.error}
          onBack={() => navigate(ROUTES.ADMIN_COMMUNICATION_TEMPLATES)}
          onCreateDraft={handleCreateDraftFromGroup}
          onEditDraft={handleEditDraft}
          onPreviewVersion={handleOpenVersionPreview}
          onPublishVersion={handlePreparePublishVersion}
          onCloneVersion={handleCloneVersion}
          onDetailsVersion={handleOpenVersionPreview}
        />

        <CommunicationTemplatePreviewModal
          isOpen={previewState.isOpen}
          title={previewState.title}
          subtitle={previewState.subtitle}
          preview={previewState.preview}
          mode={previewMode}
          onModeChange={setPreviewMode}
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
            params.id
              ? buildPath(ROUTES.ADMIN_COMMUNICATION_TEMPLATE_DETAIL, params.id)
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
        onModeChange={setPreviewMode}
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
