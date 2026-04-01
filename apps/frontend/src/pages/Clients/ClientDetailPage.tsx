import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ROUTES, buildPath } from '@/constants/routes'
import { getClientById } from '@/services/clients.api'
import { CLIENT_TYPE_LABELS } from '@np-manager/shared'
import type { ClientDetailDto } from '@np-manager/shared'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        setClient(await getClientById(id))
      } catch {
        setError('Nie udało się załadować danych klienta.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [id])

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-24 text-gray-400 text-sm">
        Ładowanie...
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="text-red-500 text-sm mb-4">{error ?? 'Klient nie został znaleziony.'}</p>
          <button onClick={() => void navigate(ROUTES.CLIENTS)} className="btn-secondary">
            Wróć do listy
          </button>
        </div>
      </div>
    )
  }

  const editPath = buildPath(ROUTES.CLIENT_EDIT, client.id)
  const requestNewPath = `${ROUTES.REQUEST_NEW}?clientId=${encodeURIComponent(client.id)}`
  const isIndividual = client.clientType === 'INDIVIDUAL'
  const hasProxy = client.proxyName || client.proxyPesel

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Nagłówek */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => void navigate(ROUTES.CLIENTS)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Kartoteka klientów
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{client.displayName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isIndividual
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {CLIENT_TYPE_LABELS[client.clientType]}
            </span>
            {client.requestsCount > 0 && (
              <span className="text-xs text-gray-500">
                {client.requestsCount}{' '}
                {client.requestsCount === 1 ? 'sprawa' : 'sprawy/spraw'}
              </span>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-start">
          <Link to={requestNewPath} className="btn-secondary text-center">
            Nowa sprawa portowania
          </Link>
          <Link to={editPath} className="btn-primary text-center">
            Edytuj klienta
          </Link>
        </div>
      </div>

      {/* Dane podstawowe */}
      <Section title={isIndividual ? 'Dane osobowe' : 'Dane firmy'}>
        {isIndividual ? (
          <>
            <Field label="Imię" value={client.firstName} />
            <Field label="Nazwisko" value={client.lastName} />
            <Field label="PESEL" value={client.pesel} mono />
          </>
        ) : (
          <>
            <Field label="Nazwa firmy" value={client.companyName} />
            <Field label="NIP" value={client.nip} mono />
            {client.krs && <Field label="KRS" value={client.krs} mono />}
          </>
        )}
      </Section>

      {/* Dane kontaktowe */}
      <Section title="Dane kontaktowe">
        <Field label="E-mail" value={client.email} />
        <Field label="Telefon kontaktowy" value={client.phoneContact} mono />
      </Section>

      {/* Adres */}
      <Section title="Adres">
        <Field label="Ulica i numer" value={client.addressStreet} />
        <Field label="Miejscowość" value={client.addressCity} />
        <Field label="Kod pocztowy" value={client.addressZip} mono />
      </Section>

      {/* Pełnomocnik — wyświetlaj tylko jeśli istnieje */}
      {hasProxy && (
        <Section title="Pełnomocnik">
          {client.proxyName && <Field label="Imię i nazwisko" value={client.proxyName} />}
          {client.proxyPesel && <Field label="PESEL pełnomocnika" value={client.proxyPesel} mono />}
        </Section>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400 space-y-0.5 pt-1">
        <p>Utworzono: {formatDate(client.createdAt)}</p>
        <p>Ostatnia zmiana: {formatDate(client.updatedAt)}</p>
      </div>
    </div>
  )
}

// ============================================================
// POMOCNICZE KOMPONENTY
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        {title}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</dl>
    </div>
  )
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-gray-400">—</span>}
      </dd>
    </div>
  )
}
