import { prisma } from '../../config/database'

export interface ReadinessCheckResult {
  status: 'up' | 'down'
  message: string
}

const REQUIRED_PUBLIC_TABLES = ['porting_request_case_history'] as const

async function getMissingRequiredTables(): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('porting_request_case_history')
  `

  const existingTables = new Set(rows.map((row) => row.table_name))

  return REQUIRED_PUBLIC_TABLES.filter((tableName) => !existingTables.has(tableName))
}

export interface AppReadinessResult {
  status: 'ready' | 'not_ready'
  timestamp: string
  environment: string
  version: string
  checks: {
    db: ReadinessCheckResult
  }
}

export async function checkDatabaseReadiness(): Promise<ReadinessCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`
    const missingTables = await getMissingRequiredTables()

    if (missingTables.length > 0) {
      return {
        status: 'down',
        message: `Database schema is incomplete. Missing required tables: ${missingTables.join(', ')}.`,
      }
    }

    return {
      status: 'up',
      message: 'Database connection is ready.',
    }
  } catch {
    return {
      status: 'down',
      message: 'Database connection is unavailable.',
    }
  }
}

export async function buildReadinessResult(params: {
  environment: string
  version: string
}): Promise<AppReadinessResult> {
  const db = await checkDatabaseReadiness()

  return {
    status: db.status === 'up' ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    environment: params.environment,
    version: params.version,
    checks: {
      db,
    },
  }
}
