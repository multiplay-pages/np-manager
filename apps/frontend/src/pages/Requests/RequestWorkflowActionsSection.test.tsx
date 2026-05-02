// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PortingRequestStatusActionDto } from '@np-manager/shared'
import {
  RequestWorkflowActionsSection,
  type RequestWorkflowActionsSectionProps,
} from './RequestWorkflowActionsSection'

const ACTION_CONFIRM: PortingRequestStatusActionDto = {
  actionId: 'CONFIRM',
  label: 'Potwierdz przez dawce',
  targetStatus: 'CONFIRMED',
  requiresReason: false,
  requiresComment: false,
  reasonLabel: null,
  commentLabel: null,
  description: 'Dawca potwierdza date przeniesienia',
}

const ACTION_REJECT: PortingRequestStatusActionDto = {
  actionId: 'REJECT',
  label: 'Odrzuc',
  targetStatus: 'REJECTED',
  requiresReason: true,
  requiresComment: true,
  reasonLabel: 'Powod odrzucenia',
  commentLabel: 'Komentarz odrzucenia',
  description: 'Odrzucenie wniosku przez dawce',
}

const ACTION_MARK_PORTED: PortingRequestStatusActionDto = {
  actionId: 'MARK_PORTED',
  label: 'Oznacz jako przeniesiona',
  targetStatus: 'PORTED',
  requiresReason: false,
  requiresComment: false,
  reasonLabel: null,
  commentLabel: 'Komentarz operacyjny',
  description: 'Zamknij sprawe jako zrealizowana.',
}

function buildProps(
  overrides: Partial<RequestWorkflowActionsSectionProps> = {},
): RequestWorkflowActionsSectionProps {
  return {
    canManageStatus: true,
    statusInternal: 'SUBMITTED',
    canUsePliCbdExternalActions: false,
    workflowErrorEmptyStateMessage: 'Workflow error empty state.',
    availableStatusActions: [],
    selectedStatusAction: null,
    statusReason: '',
    statusComment: '',
    isUpdatingStatus: false,
    isExporting: false,
    isSyncing: false,
    statusActionSuccess: null,
    statusActionError: null,
    onSelectStatusAction: vi.fn(),
    onStatusReasonChange: vi.fn(),
    onStatusCommentChange: vi.fn(),
    onSubmitStatusAction: vi.fn(),
    onResetStatusActionForm: vi.fn(),
    canUseManualPortDateAction: false,
    canUseManualPortDateForCurrentStatus: false,
    manualConfirmedPortDate: '',
    manualPortDateComment: '',
    isSubmittingManualPortDate: false,
    manualPortDateSuccess: null,
    manualPortDateError: null,
    onManualConfirmedPortDateChange: vi.fn(),
    onManualPortDateCommentChange: vi.fn(),
    onConfirmManualPortDate: vi.fn(),
    pliCbdExternalActionsSlot: null,
    ...overrides,
  }
}

describe('RequestWorkflowActionsSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders read-only message when canManageStatus is false', () => {
    render(<RequestWorkflowActionsSection {...buildProps({ canManageStatus: false })} />)

    expect(screen.getByText(/Twoja rola ma dostep tylko do podgladu/)).toBeDefined()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders terminal closed empty state when no actions and status is closed', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({ statusInternal: 'PORTED', availableStatusActions: [] })}
      />,
    )

    expect(screen.getByText(/Sprawa zako/)).toBeDefined()
  })

  it('renders ERROR empty state with workflow error message', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          statusInternal: 'ERROR',
          availableStatusActions: [],
          workflowErrorEmptyStateMessage: 'Custom workflow error.',
        })}
      />,
    )

    expect(screen.getByText('Custom workflow error.')).toBeDefined()
  })

  it('renders available status actions and triggers onSelectStatusAction on click', () => {
    const onSelectStatusAction = vi.fn()
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          availableStatusActions: [ACTION_CONFIRM, ACTION_REJECT],
          onSelectStatusAction,
        })}
      />,
    )

    const confirmButton = screen.getByRole('button', { name: 'Potwierdz przez dawce' })
    fireEvent.click(confirmButton)
    expect(onSelectStatusAction).toHaveBeenCalledWith(ACTION_CONFIRM)
  })

  it('shows reason and comment fields when selected action requires them', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          availableStatusActions: [ACTION_REJECT],
          selectedStatusAction: ACTION_REJECT,
        })}
      />,
    )

    expect(screen.getByText('Powod odrzucenia')).toBeDefined()
    expect(screen.getByText('Komentarz odrzucenia')).toBeDefined()
    expect(screen.getByPlaceholderText('Powod odrzucenia')).toBeDefined()
    expect(screen.getByPlaceholderText('Dodaj wymagany komentarz')).toBeDefined()
  })

  it('hides reason field when selected action does not require it', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          availableStatusActions: [ACTION_CONFIRM],
          selectedStatusAction: ACTION_CONFIRM,
        })}
      />,
    )

    expect(screen.queryByPlaceholderText('Podaj powod')).toBeNull()
    expect(screen.getByPlaceholderText('Opcjonalny komentarz operacyjny')).toBeDefined()
  })

  it('triggers onSubmitStatusAction when submit button clicked', () => {
    const onSubmitStatusAction = vi.fn()
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          availableStatusActions: [ACTION_CONFIRM],
          selectedStatusAction: ACTION_CONFIRM,
          onSubmitStatusAction,
        })}
      />,
    )

    const submitButtons = screen.getAllByRole('button', { name: 'Potwierdz przez dawce' })
    // First button = action selector, second button = submit
    fireEvent.click(submitButtons[submitButtons.length - 1]!)
    expect(onSubmitStatusAction).toHaveBeenCalledTimes(1)
  })

  it('renders manual confirm port date block when allowed', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUseManualPortDateAction: true,
          canUseManualPortDateForCurrentStatus: true,
        })}
      />,
    )

    expect(screen.getAllByText('Potwierdz date przeniesienia').length).toBeGreaterThan(0)
    expect(screen.getByText(/zapisuje krok procesu/)).toBeDefined()
  })

  it('hides manual port date form when status disallows it', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUseManualPortDateAction: true,
          canUseManualPortDateForCurrentStatus: false,
        })}
      />,
    )

    expect(screen.queryByText(/Potwierdz date przeniesienia/)).toBeNull()
    expect(screen.queryByText(/Akcja dostepna tylko dla statusow/)).toBeNull()
  })

  it('renders manual port date success and error feedback', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUseManualPortDateAction: true,
          canUseManualPortDateForCurrentStatus: true,
          manualPortDateSuccess: 'Saved OK',
          manualPortDateError: 'Save failed',
        })}
      />,
    )

    expect(screen.getByText('Saved OK')).toBeDefined()
    expect(screen.getByText('Save failed')).toBeDefined()
  })

  it('triggers onConfirmManualPortDate when manual confirm button clicked', () => {
    const onConfirmManualPortDate = vi.fn()
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUseManualPortDateAction: true,
          canUseManualPortDateForCurrentStatus: true,
          onConfirmManualPortDate,
        })}
      />,
    )

    const buttons = screen.getAllByRole('button', { name: 'Potwierdz date przeniesienia' })
    fireEvent.click(buttons[buttons.length - 1]!)
    expect(onConfirmManualPortDate).toHaveBeenCalledTimes(1)
  })

  it('renders status action success and error feedback', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          statusActionSuccess: 'Status updated',
          statusActionError: 'Status error',
        })}
      />,
    )

    expect(screen.getByText('Status updated')).toBeDefined()
    expect(screen.getByText('Status error')).toBeDefined()
  })

  it('renders pliCbdExternalActionsSlot when canUsePliCbdExternalActions is true', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUsePliCbdExternalActions: true,
          pliCbdExternalActionsSlot: <div data-testid="external-slot">EXTERNAL</div>,
        })}
      />,
    )

    expect(screen.getByTestId('external-slot')).toBeDefined()
  })

  it('does not render pliCbdExternalActionsSlot when canUsePliCbdExternalActions is false', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUsePliCbdExternalActions: false,
          pliCbdExternalActionsSlot: <div data-testid="external-slot">EXTERNAL</div>,
        })}
      />,
    )

    expect(screen.queryByTestId('external-slot')).toBeNull()
  })

  it('renders MARK_PORTED action and triggers onSelectStatusAction', () => {
    const onSelectStatusAction = vi.fn()
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          statusInternal: 'CONFIRMED',
          availableStatusActions: [ACTION_MARK_PORTED],
          onSelectStatusAction,
        })}
      />,
    )

    const button = screen.getByRole('button', { name: 'Oznacz jako przeniesiona' })
    fireEvent.click(button)
    expect(onSelectStatusAction).toHaveBeenCalledWith(ACTION_MARK_PORTED)
  })

  it('MARK_PORTED action shows no reason field and optional comment', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          statusInternal: 'CONFIRMED',
          availableStatusActions: [ACTION_MARK_PORTED],
          selectedStatusAction: ACTION_MARK_PORTED,
        })}
      />,
    )

    expect(screen.queryByPlaceholderText('Podaj powod')).toBeNull()
    expect(screen.getByPlaceholderText('Opcjonalny komentarz operacyjny')).toBeDefined()
  })

  it('PORTED status shows terminal closed empty state, no action buttons', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          statusInternal: 'PORTED',
          availableStatusActions: [],
        })}
      />,
    )

    expect(screen.getByText(/Sprawa zako/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Oznacz jako przeniesiona' })).toBeNull()
  })

  it('renders external slot inside separator wrapper when canUsePliCbdExternalActions is true', () => {
    const { container } = render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUsePliCbdExternalActions: true,
          pliCbdExternalActionsSlot: <div data-testid="ext-slot">EXT</div>,
        })}
      />,
    )

    const slot = screen.getByTestId('ext-slot')
    expect(slot).toBeDefined()
    // separator wrapper must be an ancestor
    const wrapper = slot.closest('.border-t')
    expect(wrapper).not.toBeNull()
  })

  it('shows external slot even when status is terminal and status actions are empty', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          statusInternal: 'PORTED',
          availableStatusActions: [],
          canUsePliCbdExternalActions: true,
          pliCbdExternalActionsSlot: <div data-testid="ext-slot">EXT</div>,
        })}
      />,
    )

    expect(screen.getByText(/Sprawa zako/)).toBeDefined()
    expect(screen.getByTestId('ext-slot')).toBeDefined()
  })

  it('does not render external slot wrapper when pliCbdExternalActionsSlot is null', () => {
    const { container } = render(
      <RequestWorkflowActionsSection
        {...buildProps({
          canUsePliCbdExternalActions: true,
          pliCbdExternalActionsSlot: null,
        })}
      />,
    )

    expect(container.querySelector('.border-t')).toBeNull()
  })

  it('disables status action buttons when isUpdatingStatus is true', () => {
    render(
      <RequestWorkflowActionsSection
        {...buildProps({
          availableStatusActions: [ACTION_CONFIRM],
          isUpdatingStatus: true,
        })}
      />,
    )

    const button = screen.getByRole('button', { name: 'Potwierdz przez dawce' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })
})
