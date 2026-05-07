// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportsPage } from './ReportsPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/services/reports.api', () => ({
  getOperationalReport: (...args: unknown[]) => getMock(...args),
}))

function makeReport(overrides = {}) {
  return {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31',
    generatedAt: '2026-05-07T10:00:00.000Z',
    totals: {
      createdInPeriod: 10,
      inProgress: 4,
      ported: 3,
      cancelled: 1,
      rejected: 1,
      error: 1,
      pendingDonor: 2,
    },
    byStatus: [
      { status: 'DRAFT', label: 'Szkic', count: 0 },
      { status: 'SUBMITTED', label: 'Złożona', count: 2 },
      { status: 'PENDING_DONOR', label: 'Oczekuje na dawcę', count: 2 },
      { status: 'CONFIRMED', label: 'Potwierdzona', count: 1 },
      { status: 'REJECTED', label: 'Odrzucona', count: 1 },
      { status: 'CANCELLED', label: 'Anulowana', count: 1 },
      { status: 'PORTED', label: 'Przeniesiona', count: 3 },
      { status: 'ERROR', label: 'Błąd', count: 1 },
    ],
    attention: { errorCount: 1, pendingDonorCount: 2, missingConfirmedPortDateCount: 3 },
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <Routes>
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders title and loads default data on mount', async () => {
    getMock.mockResolvedValue(makeReport())
    renderPage()

    expect(screen.getByText('Raporty operacyjne')).toBeTruthy()
    expect(screen.getByLabelText('Od')).toBeTruthy()
    expect(screen.getByLabelText('Do')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Zastosuj' })).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('Rozkład po statusach')).toBeTruthy()
    })

    expect(getMock).toHaveBeenCalledOnce()
  })

  it('clicking Zastosuj after changing draft dates fetches with new range', async () => {
    getMock.mockResolvedValue(makeReport())
    renderPage()

    await waitFor(() => expect(getMock).toHaveBeenCalledOnce())
    getMock.mockClear()

    getMock.mockResolvedValue(makeReport({ dateFrom: '2026-04-01', dateTo: '2026-04-30' }))

    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-04-01' } })
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-04-30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj' }))

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith({ dateFrom: '2026-04-01', dateTo: '2026-04-30' })
    })
  })

  it('onBlur commits programmatically set input value when onChange did not fire', async () => {
    getMock.mockResolvedValue(makeReport())
    renderPage()

    await waitFor(() => expect(getMock).toHaveBeenCalledOnce())
    getMock.mockClear()

    getMock.mockResolvedValue(makeReport({ dateFrom: '2026-03-01', dateTo: '2026-03-31' }))

    // Simulate browser/autofill setting value without triggering React onChange
    const inputFrom = screen.getByLabelText('Od') as HTMLInputElement
    Object.defineProperty(inputFrom, 'value', { value: '2026-03-01', configurable: true, writable: true })
    fireEvent.blur(inputFrom)

    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-03-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj' }))

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith({ dateFrom: '2026-03-01', dateTo: '2026-03-31' })
    })
  })

  it('shows range error and skips fetch when dateFrom > dateTo', async () => {
    getMock.mockResolvedValue(makeReport())
    renderPage()

    await waitFor(() => expect(getMock).toHaveBeenCalledOnce())
    getMock.mockClear()

    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-05-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj' }))

    expect(screen.getByText(/Data „Od" nie może być późniejsza/)).toBeTruthy()
    expect(getMock).not.toHaveBeenCalled()
  })

  it('renders metric cards after data loads', async () => {
    getMock.mockResolvedValue(makeReport())
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Rozkład po statusach')).toBeTruthy()
    })

    expect(screen.getByText('Przeniesione')).toBeTruthy()
    expect(screen.getByText('Przeniesiona')).toBeTruthy()
  })

  it('renders error state when API fails', async () => {
    getMock.mockRejectedValue(new Error('network error'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Nie udało się pobrać raportu/)).toBeTruthy()
    })
  })

  it('renders attention section when errors or pending exist', async () => {
    getMock.mockResolvedValue(makeReport())
    const { container } = renderPage()

    await waitFor(() => {
      expect(screen.getByText('Wymaga uwagi')).toBeTruthy()
    })

    expect(container.textContent).toContain('sprawa w')
    expect(container.textContent).toContain('oczekuje na')
  })

  it('renders empty state when createdInPeriod is zero', async () => {
    getMock.mockResolvedValue(
      makeReport({
        totals: { createdInPeriod: 0, inProgress: 0, ported: 0, cancelled: 0, rejected: 0, error: 0, pendingDonor: 0 },
        attention: { errorCount: 0, pendingDonorCount: 0, missingConfirmedPortDateCount: 0 },
      }),
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Brak spraw utworzonych/)).toBeTruthy()
    })
  })
})
