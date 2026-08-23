import initialMigration from '../../migrations/001_initial.sql?raw'
import fsrsCardStateMigration from '../../migrations/002_fsrs_card_state.sql?raw'
import type { DatabaseConnection } from './types'

export interface Migration { version: number; description: string; sql: string }

export const migrations: Migration[] = [
  { version: 1, description: 'initial schema', sql: initialMigration },
  { version: 2, description: 'persist complete FSRS card state', sql: fsrsCardStateMigration },
]

export async function runMigrations(database: DatabaseConnection): Promise<void> {
  await database.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`)
  const applied = await database.select<{ version: number }>('SELECT version FROM schema_migrations')
  const appliedVersions = new Set(applied.map(({ version }) => version))

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue
    await database.execute(migration.sql)
    await database.execute(
      'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)',
      [migration.version, migration.description, new Date().toISOString()],
    )
  }
}
