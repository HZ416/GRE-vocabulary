import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/db/migrations'
import { SqliteProgressRepository } from '../src/db/sqliteProgressRepository'
import { SqliteStudyRepository } from '../src/db/sqliteStudyRepository'
import { SqliteVocabularyRepository } from '../src/db/sqliteVocabularyRepository'
import { parseVocabularyCsv } from '../src/import/vocabularyImport'
import type { SqliteTestDatabase } from './sqliteTestDatabase'
import { createSqliteTestDatabase } from './sqliteTestDatabase'

describe('progress and flagged vocabulary views', () => {
  let database: SqliteTestDatabase
  let vocabulary: SqliteVocabularyRepository

  beforeEach(async () => {
    database = await createSqliteTestDatabase()
    await runMigrations(database)
    vocabulary = new SqliteVocabularyRepository(database)
    await vocabulary.import(parseVocabularyCsv(`lemma,definition_en,source_name
alpha,first,gregmat
beta,second,barrons
gamma,third,magoosh_common`).records)
  })
  afterEach(async () => database.close())

  it('lists favorite and difficult words independently', async () => {
    const alpha = await vocabulary.findByLemma('alpha')
    const beta = await vocabulary.findByLemma('beta')
    const study = new SqliteStudyRepository(database)
    await study.toggleFavorite(alpha!.id)
    await study.toggleDifficult(beta!.id)
    expect((await vocabulary.listFlagged('favorite')).map(({ lemma }) => lemma)).toEqual(['alpha'])
    expect((await vocabulary.listFlagged('difficult')).map(({ lemma }) => lemma)).toEqual(['beta'])
  })

  it('calculates dashboard counts, accuracy, and consecutive-day streaks', async () => {
    const now = new Date(2026, 7, 23, 12, 0, 0)
    const due = new Date(2026, 7, 23, 10, 0, 0).toISOString()
    const overdue = new Date(2026, 7, 22, 10, 0, 0).toISOString()
    const alpha = await vocabulary.findByLemma('alpha')
    const beta = await vocabulary.findByLemma('beta')
    await database.execute(
      `INSERT INTO user_word_state (word_id, status, total_reviews, correct_reviews, next_review_at, fsrs_due)
       VALUES (?, 'learning', 1, 1, ?, ?), (?, 'mastered', 4, 3, ?, ?)`,
      [alpha!.id, due, due, beta!.id, overdue, overdue],
    )
    const todayGood = new Date(2026, 7, 23, 9, 0, 0).toISOString()
    const todayAgain = new Date(2026, 7, 23, 10, 0, 0).toISOString()
    const yesterdayGood = new Date(2026, 7, 22, 9, 0, 0).toISOString()
    await database.execute(
      `INSERT INTO review_logs (id, word_id, reviewed_at, rating) VALUES
       ('r1', ?, ?, 3), ('r2', ?, ?, 1), ('r3', ?, ?, 3)`,
      [alpha!.id, todayGood, beta!.id, todayAgain, alpha!.id, yesterdayGood],
    )
    const repository = new SqliteProgressRepository(database)
    await expect(repository.getDashboard(now)).resolves.toMatchObject({
      newWords: 1, due: 1, overdue: 1, total: 3, totalWords: 3,
      introduced: 2, learning: 1, mastered: 1,
    })
    await expect(repository.getStatistics(now)).resolves.toMatchObject({
      wordsIntroduced: 2, wordsReviewed: 2, wordsMastered: 1,
      reviewsToday: 2, accuracyToday: 0.5, currentStreak: 2,
      totalReviews: 3, overallAccuracy: 2 / 3,
    })
  })
})
