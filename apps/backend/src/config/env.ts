import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const blankStringToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalEnvString = z.preprocess(
  blankStringToUndefined,
  z.string().trim().min(1).optional(),
)

const envSchema = z.object({
  // Aplikacja
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Baza danych
  DATABASE_URL: z.string().min(1, 'DATABASE_URL jest wymagany'),

  // JWT
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET musi mieć min. 32 znaki — ustaw bezpieczny klucz!'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // Pliki
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),

  // Logi
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Integracja PLI CBD
  PLI_CBD_TRANSPORT_MODE: z
    .enum(['DISABLED', 'STUB', 'REAL_SOAP'])
    .default('STUB'),
  PLI_CBD_REAL_SOAP_ENDPOINT_URL: z.preprocess(
    blankStringToUndefined,
    z.string().trim().url().optional(),
  ),
  PLI_CBD_REAL_SOAP_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  PLI_CBD_REAL_SOAP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_PATH: optionalEnvString,
  PLI_CBD_REAL_SOAP_CLIENT_CERTIFICATE_ALIAS: optionalEnvString,
  PLI_CBD_REAL_SOAP_CLIENT_KEY_PATH: optionalEnvString,
  PLI_CBD_REAL_SOAP_CA_CERTIFICATE_PATH: optionalEnvString,
  PLI_CBD_REAL_SOAP_ENVIRONMENT_NAME: z.string().trim().min(1).default('LOCAL'),
  PLI_CBD_REAL_SOAP_PROFILE: z.string().trim().min(1).default('LOCAL_DEFAULT'),
  PLI_CBD_REAL_SOAP_ACTION_E03: z.string().trim().min(1).default('urn:pli-cbd:fnp:E03'),
  PLI_CBD_REAL_SOAP_ACTION_E12: z.string().trim().min(1).default('urn:pli-cbd:fnp:E12'),
  PLI_CBD_REAL_SOAP_ACTION_E18: z.string().trim().min(1).default('urn:pli-cbd:fnp:E18'),
  PLI_CBD_REAL_SOAP_ACTION_E23: z.string().trim().min(1).default('urn:pli-cbd:fnp:E23'),

  // Email (opcjonalny na etapie MVP)
  SMTP_HOST: optionalEnvString,
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: optionalEnvString,
  SMTP_PASS: optionalEnvString,
  SMTP_FROM: z.preprocess(blankStringToUndefined, z.string().trim().email().optional()),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌  Błędna konfiguracja środowiska:')
    const fieldErrors = result.error.flatten().fieldErrors
    Object.entries(fieldErrors).forEach(([field, errors]) => {
      console.error(`   ${field}: ${errors?.join(', ')}`)
    })
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
