import type { CommunicationTemplateCode } from '@np-manager/shared'
import { getCommunicationTemplatePlaceholderItems } from '@/lib/communicationTemplates'
import { DataField, SectionCard } from '@/components/ui'

interface CommunicationTemplatePlaceholdersCardProps {
  code?: CommunicationTemplateCode
  title?: string
  description?: string
}

export function CommunicationTemplatePlaceholdersCard({
  code,
  title = 'Dostępne placeholdery',
  description = 'Użyj placeholderów w temacie lub treści, aby system uzupełnił dane sprawy podczas tworzenia komunikatu.',
}: CommunicationTemplatePlaceholdersCardProps) {
  const placeholders = getCommunicationTemplatePlaceholderItems()

  return (
    <SectionCard
      title={title}
      description={
        <>
          {description}
          {code ? ` Dla kodu ${code} pełna walidacja per typ będzie rozszerzana w kolejnym etapie.` : ''}
        </>
      }
    >
      <div className="space-y-3">
        {placeholders.map((item) => (
          <div
            key={item.placeholder}
            className="rounded-panel border border-line bg-ink-50/60 px-4 py-3"
          >
            <DataField label={`{{${item.placeholder}}}`} value={item.label} mono />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
