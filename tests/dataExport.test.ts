import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/db/migrations'
import { SqliteSettingsRepository } from '../src/db/sqliteSettingsRepository'
import { SqliteStudyRepository } from '../src/db/sqliteStudyRepository'
import { SqliteVocabularyRepository } from '../src/db/sqliteVocabularyRepository'
import { prettyJson, SqliteDataExportRepository, vocabularyToCsv } from '../src/export/dataExport'
import { parseVocabularyCsv } from '../src/import/vocabularyImport'
import type { DatabaseConnection } from '../src/db/types'
import { createSqliteTestDatabase } from './sqliteTestDatabase'

describe('portable data exports', () => {
  let database: DatabaseConnection
  let exports: SqliteDataExportRepository

  beforeEach(async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
    exports = new SqliteDataExportRepository(database)
  })
  afterEach(async () => database.close())

  it('exports vocabulary as structured JSON and re-importable CSV rows', async () => {
    const vocabulary = new SqliteVocabularyRepository(database)
    await vocabulary.import(parseVocabularyCsv(`lemma,definition_en,definition_zh,source_name,source_group
equivocal,"open, or ""uncertain""",模棱两可的,gregmat,core
equivocal,"open, or ""uncertain""",模棱两可的,barrons,book`).records)
    const word = await vocabulary.findByLemma('equivocal')
    await vocabulary.updateNotes(word!.id, 'Remember, two meanings\nnot one')

    const data = await exports.vocabulary(new Date('2026-08-23T10:00:00.000Z'))
    expect(data).toMatchObject({ format: 'gre-vocabulary-vocabulary', version: 1,
      exportedAt: '2026-08-23T10:00:00.000Z' })
    expect(data.words[0]?.sources.map(({ sourceName }) => sourceName)).toEqual(['barrons', 'gregmat'])
    expect(JSON.parse(prettyJson(data)).words[0].definitionZh).toBe('模棱两可的')

    const csv = vocabularyToCsv(data)
    expect(csv.startsWith('\uFEFFlemma,')).toBe(true)
    expect(csv).toContain('"open, or ""uncertain"""')
    expect(csv).toContain('"Remember, two meanings\nnot one"')
    const parsed = parseVocabularyCsv(csv)
    expect(parsed).toMatchObject({ duplicateRows: 1 })
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0]?.sources.map(({ sourceName }) => sourceName)).toEqual(['barrons', 'gregmat'])
  })

  it('exports settings, full FSRS state, and review history', async () => {
    const vocabulary = new SqliteVocabularyRepository(database)
    await vocabulary.import(parseVocabularyCsv(`lemma,definition_en,source_name
equivocal,open to multiple interpretations,gregmat`).records)
    const word = await vocabulary.findByLemma('equivocal')
    await new SqliteStudyRepository(database).rate(word!.id, 3, new Date('2026-08-23T10:00:00.000Z'), 900)
    await new SqliteSettingsRepository(database).save({ interfaceLanguage: 'zh', newWordsPerDay: 12, maxReviewsPerDay: 80,
      showEnglish: true, showChinese: false, showIpa: true, showExamples: false })

    const data = await exports.progress(new Date('2026-08-23T11:00:00.000Z'))
    expect(data.settings).toEqual({ interfaceLanguage: 'zh', newWordsPerDay: 12, maxReviewsPerDay: 80,
      showEnglish: true, showChinese: false, showIpa: true, showExamples: false })
    expect(data.wordStates[0]).toMatchObject({ wordId: word!.id, totalReviews: 1, fsrsReps: 1 })
    expect(data.wordStates[0]?.fsrsDue).not.toBeNull()
    expect(data.reviewLogs[0]).toMatchObject({ wordId: word!.id, rating: 3, responseMs: 900, mode: 'flashcard' })
  })
})
