import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/Button'
import { SystemModeSettingsPanel } from './SystemModeSettingsPanel'

function collectElements(node: ReactNode): ReactElement[] {
  const elements: ReactElement[] = []

  const visit = (value: ReactNode) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    if (!isValidElement(value)) {
      return
    }

    elements.push(value)
    visit((value.props as { children?: ReactNode }).children)
  }

  visit(node)
  return elements
}

function findElementByPlaceholder(tree: ReactNode, placeholder: string): ReactElement | undefined {
  return collectElements(tree).find(
    (element) => (element.props as { placeholder?: string }).placeholder === placeholder,
  )
}

function findButtonByText(tree: ReactNode, label: string): ReactElement | undefined {
  return collectElements(tree).find((element) => {
    if (element.type !== 'button' && element.type !== Button) {
      return false
    }

    const children = (element.props as { children?: ReactNode }).children
    const text = Array.isArray(children) ? children.join('') : String(children ?? '')
    return text.includes(label)
  })
}

describe('SystemModeSettingsPanel', () => {
  it('renders loaded values, diagnostics and feedback banners', () => {
    const html = renderToStaticMarkup(
      <SystemModeSettingsPanel
        form={{
          mode: 'PLI_CBD_INTEGRATED',
          pliCbdEnabled: true,
          pliCbdEndpointUrl: 'https://pli.example.test',
          pliCbdCredentialsRef: 'secret/pli',
          pliCbdOperatorCode: 'OP01',
        }}
        diagnostics={{ configured: true, active: true, missingFields: [] }}
        isLoading={false}
        isSaving={false}
        error="Blad zapisu."
        success="Ustawienia zapisane."
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(html).toContain('Tryb systemu i PLI CBD')
    expect(html).toContain('Zintegrowany z PLI CBD')
    expect(html).toContain('Modul aktywny')
    expect(html).toContain('Ustawienia zapisane.')
    expect(html).toContain('Blad zapisu.')
  })

  it('triggers edit handlers and save callback', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()

    const tree = SystemModeSettingsPanel({
      form: {
        mode: 'STANDALONE',
        pliCbdEnabled: false,
        pliCbdEndpointUrl: '',
        pliCbdCredentialsRef: '',
        pliCbdOperatorCode: '',
      },
      diagnostics: { configured: false, active: false, missingFields: ['endpointUrl'] },
      isLoading: false,
      isSaving: false,
      error: null,
      success: null,
      onChange,
      onSave,
    })

    const endpointInput = findElementByPlaceholder(tree, 'https://pli.example.test/api')
    const credentialsInput = findElementByPlaceholder(tree, 'secret/pli-cbd')
    const operatorInput = findElementByPlaceholder(tree, 'OP01')
    const saveButton = findButtonByText(tree, 'Zapisz ustawienia')

    ;(endpointInput?.props as { onChange?: (event: { target: { value: string } }) => void }).onChange?.({
      target: { value: 'https://pli.example.test' },
    })
    ;(credentialsInput?.props as { onChange?: (event: { target: { value: string } }) => void }).onChange?.({
      target: { value: 'secret/pli' },
    })
    ;(operatorInput?.props as { onChange?: (event: { target: { value: string } }) => void }).onChange?.({
      target: { value: 'op01' },
    })
    ;(saveButton?.props as { onClick?: () => void }).onClick?.()

    expect(onChange).toHaveBeenCalledWith('pliCbdEndpointUrl', 'https://pli.example.test')
    expect(onChange).toHaveBeenCalledWith('pliCbdCredentialsRef', 'secret/pli')
    expect(onChange).toHaveBeenCalledWith('pliCbdOperatorCode', 'op01')
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
