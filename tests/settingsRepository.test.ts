import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/db/migrations'
import { SqliteProgressRepository } from '../src/db/sqliteProgressRepository'
import { SqliteSettingsRepository } from '../src/db/sqliteSettingsRepository'
import { SqliteVocabularyRepository } from '../src/db/sqliteVocabularyRepository'
import { parseVocabularyCsv } from '../src/import/vocabularyImport'
import { createSqliteTestDatabase, type SqliteTestDatabase } from './sqliteTestDatabase'

describe('persistent application settings', () => {
  let database: SqliteTestDatabase

  beforeEach(async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
  })
  afterEach(async () => database.close())

  it('loads defaults, validates changes, and survives database reinitialization', async () => {
    const repository = new SqliteSettingsRepository(database)
    await expect(repository.get()).resolves.toMatchObject({ interfaceLanguage: 'en', newWordsPerDay: 20, maxReviewsPerDay: 200 })
    const updated = await repository.save({
      interfaceLanguage: 'zh', newWordsPerDay: 7, maxReviewsPerDay: 80, showEnglish: false,
      showChinese: true, showIpa: false, showExamples: true,
    })
    expect(updated).toMatchObject({ interfaceLanguage: 'zh', newWordsPerDay: 7, maxReviewsPerDay: 80, showEnglish: false })
    const snapshot = database.export()
    await database.close()
    database = await createSqliteTestDatabase(snapshot)
    await expect(new SqliteSettingsRepository(database).get()).resolves.toEqual(updated)
  })

  it('rejects unsafe limits and applies the new-word limit to Dashboard', async () => {
    const settings = new SqliteSettingsRepository(database)
    await expect(settings.save({
      interfaceLanguage: 'en', newWordsPerDay: 500, maxReviewsPerDay: 200, showEnglish: true,
      showChinese: true, showIpa: true, showExamples: true,
    })).rejects.toThrow()
    await settings.save({
      interfaceLanguage: 'en', newWordsPerDay: 1, maxReviewsPerDay: 200, showEnglish: true,
      showChinese: true, showIpa: true, showExamples: true,
    })
    const vocabulary = new SqliteVocabularyRepository(database)
    await vocabulary.import(parseVocabularyCsv(`lemma,source_name
alpha,gregmat
beta,barrons`).records)
    await expect(new SqliteProgressRepository(database).getDashboard(new Date())).resolves.toMatchObject({ newWords: 1 })
  })
})
