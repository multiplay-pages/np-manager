import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

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

  // Email (opcjonalny na etapie MVP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
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
