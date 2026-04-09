import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PortingNotificationSettingsPanel } from './PortingNotificationSettingsPanel'

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
    if (element.type !== 'button') {
      return false
    }

    const children = (element.props as { children?: ReactNode }).children
    const text = Array.isArray(children) ? children.join('') : String(children ?? '')
    return text.includes(label)
  })
}

describe('PortingNotificationSettingsPanel', () => {
  it('renders loaded values and feedback banners', () => {
    const html = renderToStaticMarkup(
      <PortingNotificationSettingsPanel
        form={{
          sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
          teamsEnabled: true,
          teamsWebhookUrl: 'https://teams.example/hook',
        }}
        diagnostics={{ emailAdapterMode: 'REAL', smtpConfigured: true }}
        isLoading={false}
        isSaving={false}
        error="Blad zapisu."
        success="Ustawienia zapisane."
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(html).toContain('Ustawienia powiadomien portingowych')
    expect(html).toContain('Ustawienia zapisane.')
    expect(html).toContain('Blad zapisu.')
    expect(html).toContain('REAL')
    expect(html).toContain('Tak')
  })

  it('triggers edit handlers and save callback', () => {
    const onChange = vi.fn()
    const onSave = vi.fn()

    const tree = PortingNotificationSettingsPanel({
      form: {
        sharedEmails: '',
        teamsEnabled: false,
        teamsWebhookUrl: '',
      },
      diagnostics: null,
      isLoading: false,
      isSaving: false,
      error: null,
      success: null,
      onChange,
      onSave,
    })

    const emailsTextarea = findElementByPlaceholder(tree, 'bok@multiplay.pl, sud@multiplay.pl')
    const webhookInput = findElementByPlaceholder(tree, 'https://...')
    const saveButton = findButtonByText(tree, 'Zapisz ustawienia')

    ;(emailsTextarea?.props as { onChange?: (event: { target: { value: string } }) => void }).onChange?.({
      target: { value: 'bok@multiplay.pl' },
    })
    ;(webhookInput?.props as { onChange?: (event: { target: { value: string } }) => void }).onChange?.({
      target: { value: 'https://teams.example/hook' },
    })
    ;(saveButton?.props as { onClick?: () => void }).onClick?.()

    expect(onChange).toHaveBeenCalledWith('sharedEmails', 'bok@multiplay.pl')
    expect(onChange).toHaveBeenCalledWith('teamsWebhookUrl', 'https://teams.example/hook')
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
