import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/db/migrations'
import { SqliteStudyRepository } from '../src/db/sqliteStudyRepository'
import { SqliteVocabularyRepository } from '../src/db/sqliteVocabularyRepository'
import type { DatabaseConnection } from '../src/db/types'
import type { MergedVocabularyRecord } from '../src/import/vocabularyImport'
import { createSqliteTestDatabase } from '../tests/sqliteTestDatabase'

const WORD_COUNT = 20_000

describe('20,000-word performance envelope', () => {
  let database: DatabaseConnection
  let vocabulary: SqliteVocabularyRepository
  let importDuration = 0

  beforeAll(async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
    vocabulary = new SqliteVocabularyRepository(database)
    const records: MergedVocabularyRecord[] = Array.from({ length: WORD_COUNT }, (_, index) => ({
      lemma: `benchmark-${String(index).padStart(5, '0')}`,
      definitionEn: `Generated benchmark definition ${index}`,
      sources: [{ sourceName: 'performance_test', isHighPriority: false }],
    }))
    const started = performance.now()
    await vocabulary.import(records)
    importDuration = performance.now() - started
  }, 60_000)

  afterAll(async () => database.close())

  it('imports the dataset within the desktop usability budget', () => {
    expect(importDuration).toBeLessThan(30_000)
  })

  it('searches a selective definition in under two seconds', async () => {
    const started = performance.now()
    const result = await vocabulary.list('definition 19999')
    const duration = performance.now() - started
    expect(result.map(({ lemma }) => lemma)).toEqual(['benchmark-19999'])
    expect(duration).toBeLessThan(2_000)
  })

  it('builds the default daily queue in under two seconds', async () => {
    const started = performance.now()
    const queue = await new SqliteStudyRepository(database).getDailyQueue(new Date('2026-08-23T00:00:00Z'))
    const duration = performance.now() - started
    expect(queue).toHaveLength(20)
    expect(duration).toBeLessThan(2_000)
  })
})
