import { useState, useEffect, useCallback } from 'react'
import { getOperators } from '@/services/operators.api'
import type { OperatorDto } from '@np-manager/shared'

// ============================================================
// HOOK
// ============================================================

export interface UseOperatorsOptions {
  /** Czy pobierać też nieaktywnych operatorów. Domyślnie false. */
  includeInactive?: boolean
}

export interface UseOperatorsResult {
  operators: OperatorDto[]
  isLoading: boolean
  error: string | null
  /** Wymusza ponowne pobranie listy — np. po dodaniu nowego operatora */
  reload: () => void
}

export function useOperators(options: UseOperatorsOptions = {}): UseOperatorsResult {
  const { includeInactive = false } = options

  const [operators, setOperators] = useState<OperatorDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getOperators(includeInactive)
      setOperators(data)
    } catch {
      setError('Nie udało się załadować listy operatorów.')
    } finally {
      setIsLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    void load()
  }, [load])

  return { operators, isLoading, error, reload: load }
}

// ============================================================
// HELPER — przyszłe selecty/dropdowny w formularzu portowania
// ============================================================

export interface OperatorSelectOption {
  value: string
  label: string
  routingNumber: string
  isRecipientDefault: boolean
}

/**
 * Przekształca listę operatorów na opcje dla komponentów Select/Combobox.
 * Filtruje nieaktywnych — drop-downy w formularzach nie powinny ich pokazywać.
 *
 * Użycie (przyszły formularz portowania):
 *   const options = operatorsToSelectOptions(operators)
 *   <Select options={options} />
 */
export function operatorsToSelectOptions(operators: OperatorDto[]): OperatorSelectOption[] {
  return operators
    .filter((op) => op.isActive)
    .map((op) => ({
      value: op.id,
      label: `${op.name} (${op.routingNumber})`,
      routingNumber: op.routingNumber,
      isRecipientDefault: op.isRecipientDefault,
    }))
}
