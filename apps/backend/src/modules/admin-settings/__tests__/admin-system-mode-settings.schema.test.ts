import { describe, expect, it } from 'vitest'
import { updateSystemModeSettingsBodySchema } from '../admin-system-mode-settings.schema'

describe('admin-system-mode-settings.schema', () => {
  it('trims PLI CBD settings and uppercases operator code', () => {
    const result = updateSystemModeSettingsBodySchema.parse({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbd: {
        enabled: true,
        endpointUrl: ' https://pli.example.test/api ',
        credentialsRef: ' secret/pli ',
        operatorCode: ' op01 ',
      },
    })

    expect(result).toEqual({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbd: {
        enabled: true,
        endpointUrl: 'https://pli.example.test/api',
        credentialsRef: 'secret/pli',
        operatorCode: 'OP01',
      },
    })
  })

  it('allows incomplete PLI CBD configuration to be saved', () => {
    const result = updateSystemModeSettingsBodySchema.safeParse({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbd: {
        enabled: true,
        endpointUrl: '',
        credentialsRef: '',
        operatorCode: '',
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects non-empty endpoint when it is not a valid http or https URL', () => {
    const result = updateSystemModeSettingsBodySchema.safeParse({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbd: {
        enabled: true,
        endpointUrl: 'not-a-url',
        credentialsRef: 'secret/pli',
        operatorCode: 'OP01',
      },
    })

    expect(result.success).toBe(false)
  })
})
