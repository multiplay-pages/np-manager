import type { CommunicationTemplateCode } from '@np-manager/shared'
import { getCommunicationTemplatePlaceholderItems } from '@/lib/communicationTemplates'

interface CommunicationTemplatePlaceholdersCardProps {
  code?: CommunicationTemplateCode
  title?: string
  description?: string
}

export function CommunicationTemplatePlaceholdersCard({
  code,
  title = 'Dostepne placeholdery',
  description = 'Uzyj placeholderow w temacie lub tresci, aby system uzupelnil dane sprawy podczas tworzenia komunikatu.',
}: CommunicationTemplatePlaceholdersCardProps) {
  const placeholders = getCommunicationTemplatePlaceholderItems()

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {description}
          {code ? ` Dla kodu ${code} pelna walidacja per typ bedzie rozszerzana w kolejnym etapie.` : ''}
        </p>
      </div>

      <div className="space-y-3">
        {placeholders.map((item) => (
          <div
            key={item.placeholder}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <div className="font-mono text-xs text-gray-900">{`{{${item.placeholder}}}`}</div>
            <p className="mt-1 text-sm text-gray-600">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
