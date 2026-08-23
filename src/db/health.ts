import { z } from 'zod'
import type { DatabaseConnection } from './types'

const healthRowSchema = z.object({ sqlite_version: z.string() })

export interface DatabaseHealth {
  ok: true
  sqliteVersion: string
  checkedAt: string
}

export async function checkDatabaseHealth(database: DatabaseConnection): Promise<DatabaseHealth> {
  const rows = await database.select<unknown>('SELECT sqlite_version() AS sqlite_version')
  const row = healthRowSchema.parse(rows[0])
  return { ok: true, sqliteVersion: row.sqlite_version, checkedAt: new Date().toISOString() }
}

