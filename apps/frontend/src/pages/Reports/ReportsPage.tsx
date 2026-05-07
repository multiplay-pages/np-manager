import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getOperationalReport } from '@/services/reports.api'
import { MetricCard, PageHeader, SectionCard } from '@/components/ui'
import type { PortingOperationalReportDto } from '@np-manager/shared'

function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function ReportsPage() {
  const defaults = currentMonthRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)
  const [report, setReport] = useState<PortingOperationalReportDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async (from: string, to: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getOperationalReport({ dateFrom: from, dateTo: to })
      setReport(data)
    } catch {
      setError('Nie udało się pobrać raportu. Sprawdź połączenie i spróbuj ponownie.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchReport(dateFrom, dateTo)
  }, [fetchReport, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Raporty"
        title="Raporty operacyjne"
        description="Podstawowe podsumowanie spraw FNP w wybranym okresie."
      />

      <SectionCard>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="dateFrom" className="text-xs font-semibold text-ink-600">
              Od
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dateTo" className="text-xs font-semibold text-ink-600">
              Do
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {report && (
            <p className="pb-2 text-xs text-ink-400">
              Wygenerowano: {new Date(report.generatedAt).toLocaleString('pl-PL')}
            </p>
          )}
        </div>
      </SectionCard>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-sm text-ink-500">
          Pobieranie raportu…
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-panel border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!isLoading && !error && report && (
        <>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              Podsumowanie okresu
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <MetricCard
                title="Utworzone w okresie"
                value={report.totals.createdInPeriod}
                tone="neutral"
              />
              <MetricCard
                title="W toku"
                value={report.totals.inProgress}
                tone="brand"
              />
              <MetricCard
                title="Przeniesione"
                value={report.totals.ported}
                tone="success"
              />
              <MetricCard
                title="Anulowane"
                value={report.totals.cancelled}
                tone="neutral"
              />
              <MetricCard
                title="Odrzucone"
                value={report.totals.rejected}
                tone="warning"
              />
              <MetricCard
                title="Błędy"
                value={report.totals.error}
                tone={report.totals.error > 0 ? 'danger' : 'neutral'}
              />
              <MetricCard
                title="Oczekuje na dawcę"
                value={report.totals.pendingDonor}
                tone="warning"
              />
            </div>
          </div>

          <SectionCard>
            <h2 className="mb-4 text-sm font-semibold text-ink-900">Rozkład po statusach</h2>
            <p className="mb-4 text-xs text-ink-400">
              Dotyczy spraw utworzonych w wybranym okresie ({report.dateFrom} – {report.dateTo}).
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Status
                  </th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Liczba spraw
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.byStatus.map((item) => (
                  <tr key={item.status}>
                    <td className="py-2.5 text-ink-800">{item.label}</td>
                    <td className="py-2.5 text-right font-semibold text-ink-900">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          {(report.attention.errorCount > 0 ||
            report.attention.pendingDonorCount > 0 ||
            report.attention.missingConfirmedPortDateCount > 0) && (
            <SectionCard>
              <h2 className="mb-4 text-sm font-semibold text-ink-900">Wymaga uwagi</h2>
              <ul className="space-y-2 text-sm">
                {report.attention.errorCount > 0 && (
                  <li className="flex items-center gap-2 text-red-700">
                    <span className="font-semibold">{report.attention.errorCount}</span>
                    <span>
                      {report.attention.errorCount === 1 ? 'sprawa w błędzie' : 'spraw w błędzie'}
                    </span>
                  </li>
                )}
                {report.attention.pendingDonorCount > 0 && (
                  <li className="flex items-center gap-2 text-amber-700">
                    <span className="font-semibold">{report.attention.pendingDonorCount}</span>
                    <span>
                      {report.attention.pendingDonorCount === 1
                        ? 'sprawa oczekuje na dawcę'
                        : 'spraw oczekuje na dawcę'}
                    </span>
                  </li>
                )}
                {report.attention.missingConfirmedPortDateCount > 0 && (
                  <li className="flex items-center gap-2 text-ink-700">
                    <span className="font-semibold">
                      {report.attention.missingConfirmedPortDateCount}
                    </span>
                    <span>aktywnych spraw bez potwierdzonej daty przeniesienia</span>
                  </li>
                )}
              </ul>
            </SectionCard>
          )}

          {report.totals.createdInPeriod === 0 && (
            <div className="rounded-panel border border-line bg-ink-50 px-5 py-10 text-center text-sm text-ink-500">
              Brak spraw utworzonych w wybranym okresie.
            </div>
          )}

          <div className="flex justify-start">
            <Link
              to={ROUTES.REQUESTS}
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Przejdź do listy spraw
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
