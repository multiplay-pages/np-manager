import { z } from 'zod'

export const communicationTemplateCodeSchema = z.enum([
  'REQUEST_RECEIVED',
  'PORT_DATE_RECEIVED',
  'PORTING_DAY',
  'ISSUE_NOTICE',
])

export const communicationTemplateChannelSchema = z.enum(['EMAIL'])

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
})

export const createCommunicationTemplateVersionSchema = z.object({
  name: z.string().max(150).trim().optional(),
  description: z.string().max(1000).trim().nullable().optional(),
  sourceVersionId: z.string().trim().min(1).nullable().optional(),
  subjectTemplate: z
    .string({ required_error: 'Temat szablonu jest wymagany.' })
    .min(1, 'Temat szablonu jest wymagany.')
    .max(300),
  bodyTemplate: z
    .string({ required_error: 'Tresc szablonu jest wymagana.' })
    .min(1, 'Tresc szablonu jest wymagana.'),
})

export const updateCommunicationTemplateVersionSchema = z
  .object({
    name: z.string().max(150).trim().optional(),
    description: z.string().max(1000).trim().nullable().optional(),
    subjectTemplate: z.string().min(1).max(300).optional(),
    bodyTemplate: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Brak danych do aktualizacji wersji szablonu.',
  })

export const previewRealCaseSchema = z
  .object({
    portingRequestId: z.string().trim().min(1).optional(),
    caseNumber: z.string().trim().min(1).optional(),
    issueDescription: z.string().trim().nullable().optional(),
  })
  .refine((value) => Boolean(value.portingRequestId || value.caseNumber), {
    message: 'Podaj identyfikator sprawy albo numer sprawy.',
  })
