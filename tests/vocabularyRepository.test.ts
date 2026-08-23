import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/db/migrations'
import { SqliteVocabularyRepository } from '../src/db/sqliteVocabularyRepository'
import { parseVocabularyCsv } from '../src/import/vocabularyImport'
import type { DatabaseConnection } from '../src/db/types'
import { createSqliteTestDatabase } from './sqliteTestDatabase'

describe('SQLite vocabulary repository', () => {
  let database: DatabaseConnection
  let repository: SqliteVocabularyRepository

  beforeEach(async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
    repository = new SqliteVocabularyRepository(database)
  })
  afterEach(async () => database.close())

  it('imports, searches, and loads a word detail page', async () => {
    const parsed = parseVocabularyCsv(`lemma,definition_en,definition_zh,source_name
equivocal,open to multiple interpretations,模棱两可的,gregmat`)
    await expect(repository.import(parsed.records)).resolves.toEqual({ inserted: 1, updated: 0 })
    const results = await repository.list('模棱')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ lemma: 'equivocal', priorityScore: 5 })
    const detail = await repository.getDetail(results[0]!.id)
    expect(detail?.sources.map(({ sourceName }) => sourceName)).toEqual(['gregmat'])
  })

  it('merges updated sources without erasing progress or user notes', async () => {
    const first = parseVocabularyCsv(`lemma,definition_en,source_name
equivocal,original definition,gregmat`)
    await repository.import(first.records)
    const word = await repository.findByLemma('equivocal')
    expect(word).not.toBeNull()
    await database.execute("UPDATE words SET notes = 'my note' WHERE id = ?", [word!.id])
    await database.execute(
      `INSERT INTO user_word_state (word_id, status, total_reviews, correct_reviews, next_review_at)
       VALUES (?, 'review', 7, 6, '2026-09-01T00:00:00.000Z')`, [word!.id],
    )

    const update = parseVocabularyCsv(`lemma,definition_en,definition_zh,source_name
EQUIVOCAL,replacement must not win,模棱两可的,barrons`)
    await expect(repository.import(update.records)).resolves.toEqual({ inserted: 0, updated: 1 })

    const detail = await repository.getDetail(word!.id)
    expect(detail?.word).toMatchObject({ definitionEn: 'original definition', definitionZh: '模棱两可的', notes: 'my note', priorityScore: 8 })
    expect(detail?.studyState).toMatchObject({ status: 'review', totalReviews: 7, correctReviews: 6, nextReviewAt: '2026-09-01T00:00:00.000Z' })
    expect(detail?.sources.map(({ sourceName }) => sourceName)).toEqual(['barrons', 'gregmat'])
  })
})
