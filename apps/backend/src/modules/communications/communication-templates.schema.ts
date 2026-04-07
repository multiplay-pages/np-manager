import { z } from 'zod'

const communicationTemplateCodeSchema = z.enum([
  'REQUEST_RECEIVED',
  'PORT_DATE_RECEIVED',
  'PORTING_DAY',
  'ISSUE_NOTICE',
])

const communicationTemplateChannelSchema = z.enum(['EMAIL'])

export const createCommunicationTemplateSchema = z.object({
  code: communicationTemplateCodeSchema,
  name: z
    .string({ required_error: 'Nazwa szablonu jest wymagana.' })
    .min(1, 'Nazwa szablonu jest wymagana.')
    .max(150)
    .trim(),
  description: z.string().max(1000).trim().nullable().optional(),
  channel: communicationTemplateChannelSchema,
  subjectTemplate: z
    .string({ required_error: 'Temat szablonu jest wymagany.' })
    .min(1, 'Temat szablonu jest wymagany.')
    .max(300),
  bodyTemplate: z
    .string({ required_error: 'Tresc szablonu jest wymagana.' })
    .min(1, 'Tresc szablonu jest wymagana.'),
  isActive: z.boolean().optional(),
})

export const updateCommunicationTemplateSchema = createCommunicationTemplateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Brak danych do aktualizacji szablonu.',
  })
