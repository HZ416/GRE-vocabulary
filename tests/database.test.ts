import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkDatabaseHealth } from '../src/db/health'
import { runMigrations } from '../src/db/migrations'
import type { DatabaseConnection } from '../src/db/types'
import { createSqliteTestDatabase } from './sqliteTestDatabase'

describe('database initialization', () => {
  let database: DatabaseConnection

  beforeEach(async () => { database = await createSqliteTestDatabase() })
  afterEach(async () => database.close())

  it('applies the initial migration and creates every Phase 1 table', async () => {
    await runMigrations(database)
    const rows = await database.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    const names = rows.map(({ name }) => name)
    expect(names).toEqual(expect.arrayContaining([
      'words', 'word_sources', 'tags', 'word_tags', 'user_word_state', 'review_logs', 'schema_migrations',
    ]))
  })

  it('is idempotent and reports a healthy SQLite connection', async () => {
    await runMigrations(database)
    await runMigrations(database)
    const versions = await database.select<{ version: number }>('SELECT version FROM schema_migrations')
    expect(versions).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }])
    await expect(checkDatabaseHealth(database)).resolves.toMatchObject({ ok: true })
  })

  it('enforces foreign keys so orphaned progress cannot be created', async () => {
    await runMigrations(database)
    await expect(database.execute("INSERT INTO user_word_state (word_id) VALUES ('missing')")).rejects.toThrow()
  })
})
