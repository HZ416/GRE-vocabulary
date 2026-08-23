import { afterEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/db/migrations'
import { SqliteStudyRepository } from '../src/db/sqliteStudyRepository'
import { SqliteVocabularyRepository } from '../src/db/sqliteVocabularyRepository'
import { parseVocabularyCsv } from '../src/import/vocabularyImport'
import { createSqliteTestDatabase, type SqliteTestDatabase } from './sqliteTestDatabase'

describe('restart-safe FSRS study', () => {
  let database: SqliteTestDatabase | undefined
  afterEach(async () => database?.close())

  it('imports → studies → rates Good → reinitializes → preserves state and due date', async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
    const vocabulary = new SqliteVocabularyRepository(database)
    const parsed = parseVocabularyCsv(`lemma,definition_en,definition_zh,source_name
equivocal,open to multiple interpretations,模棱两可的,gregmat`)
    await vocabulary.import(parsed.records)
    const now = new Date('2026-08-23T03:00:00.000Z')
    const study = new SqliteStudyRepository(database)
    const queue = await study.getDailyQueue(now)
    expect(queue.map(({ lemma }) => lemma)).toEqual(['equivocal'])

    const saved = await study.rate(queue[0]!.id, 3, now, 1250)
    expect(saved.fsrsState).not.toBeNull()
    expect(saved.fsrsDue).not.toBeNull()
    const expectedState = saved.fsrsState
    const expectedDue = saved.fsrsDue
    const snapshot = database.export()
    await database.close()

    database = await createSqliteTestDatabase(snapshot)
    const reloadedVocabulary = new SqliteVocabularyRepository(database)
    const reloaded = await reloadedVocabulary.getDetail(queue[0]!.id)
    expect(reloaded?.studyState).toMatchObject({ fsrsState: expectedState, fsrsDue: expectedDue, totalReviews: 1 })
    const logs = await database.select<{ rating: number; next_due: string }>('SELECT rating, next_due FROM review_logs')
    expect(logs).toEqual([{ rating: 3, next_due: expectedDue }])
  })

  it('orders due reviews before new words and prioritizes new words by score', async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
    const vocabulary = new SqliteVocabularyRepository(database)
    await vocabulary.import(parseVocabularyCsv(`lemma,source_name
lower,barrons
higher,gregmat`).records)
    const lower = await vocabulary.findByLemma('lower')
    await database.execute(
      `INSERT INTO user_word_state (word_id, status, next_review_at, fsrs_due, fsrs_state)
       VALUES (?, 'review', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z', 2)`, [lower!.id],
    )
    const queue = await new SqliteStudyRepository(database).getDailyQueue(new Date('2026-08-23T00:00:00.000Z'))
    expect(queue.map(({ lemma }) => lemma)).toEqual(['lower', 'higher'])
  })
})
