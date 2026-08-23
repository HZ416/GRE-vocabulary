import type { Card } from 'ts-fsrs'
import { scheduleReview, statusForCard, type StudyRating } from '../fsrs/scheduler'
import type { StudyRepository } from '../services/repositories'
import type { StudyWord, UserWordState } from '../types/models'
import type { DatabaseConnection } from './types'
import { SqliteVocabularyRepository } from './sqliteVocabularyRepository'

interface StateRow {
  word_id: string; status: UserWordState['status']; is_favorite: number; is_difficult: number
  total_reviews: number; correct_reviews: number; incorrect_reviews: number; last_reviewed_at: string | null
  next_review_at: string | null; fsrs_state: number | null; fsrs_step: number | null; fsrs_stability: number | null
  fsrs_difficulty: number | null; fsrs_due: string | null; fsrs_last_review: string | null
  fsrs_scheduled_days: number | null; fsrs_elapsed_days: number | null; fsrs_reps: number | null; fsrs_lapses: number | null
}

export function mapStudyState(row: StateRow): UserWordState {
  return { wordId: row.word_id, status: row.status, isFavorite: Boolean(row.is_favorite),
    isDifficult: Boolean(row.is_difficult), totalReviews: row.total_reviews,
    correctReviews: row.correct_reviews, incorrectReviews: row.incorrect_reviews,
    lastReviewedAt: row.last_reviewed_at, nextReviewAt: row.next_review_at, fsrsState: row.fsrs_state,
    fsrsStep: row.fsrs_step, fsrsStability: row.fsrs_stability, fsrsDifficulty: row.fsrs_difficulty,
    fsrsDue: row.fsrs_due, fsrsLastReview: row.fsrs_last_review, fsrsScheduledDays: row.fsrs_scheduled_days,
    fsrsElapsedDays: row.fsrs_elapsed_days, fsrsReps: row.fsrs_reps, fsrsLapses: row.fsrs_lapses }
}

export class SqliteStudyRepository implements StudyRepository {
  private readonly vocabulary: SqliteVocabularyRepository
  constructor(private readonly database: DatabaseConnection) { this.vocabulary = new SqliteVocabularyRepository(database) }

  private async getState(wordId: string): Promise<UserWordState | null> {
    const rows = await this.database.select<StateRow>('SELECT * FROM user_word_state WHERE word_id = ?', [wordId])
    return rows[0] ? mapStudyState(rows[0]) : null
  }

  async getDailyQueue(now: Date, options: { newLimit?: number; reviewLimit?: number } = {}): Promise<StudyWord[]> {
    const reviewLimit = options.reviewLimit ?? 200
    const newLimit = options.newLimit ?? 20
    const dueRows = await this.database.select<{ word_id: string }>(
      `SELECT word_id FROM user_word_state WHERE status IN ('learning', 'review', 'mastered')
       AND COALESCE(fsrs_due, next_review_at) <= ? ORDER BY COALESCE(fsrs_due, next_review_at) ASC LIMIT ?`,
      [now.toISOString(), reviewLimit],
    )
    const newRows = await this.database.select<{ id: string }>(
      `SELECT w.id FROM words w LEFT JOIN user_word_state s ON s.word_id = w.id
       WHERE s.word_id IS NULL OR s.status = 'new' ORDER BY w.priority_score DESC, w.lemma ASC LIMIT ?`, [newLimit],
    )
    const ids = [...dueRows.map(({ word_id }) => word_id), ...newRows.map(({ id }) => id)]
    const uniqueIds = [...new Set(ids)]
    const queue: StudyWord[] = []
    for (const id of uniqueIds) {
      const word = await this.vocabulary.findById(id)
      if (word) queue.push({ ...word, studyState: await this.getState(id) })
    }
    return queue
  }

  async rate(wordId: string, rating: StudyRating, now: Date, responseMs?: number): Promise<UserWordState> {
    const previous = await this.getState(wordId)
    const result = scheduleReview(previous, rating, now)
    const totalReviews = (previous?.totalReviews ?? 0) + 1
    const correct = rating !== 1
    const status = statusForCard(result.card, totalReviews)
    const next = this.stateFromCard(wordId, previous, result.card, status, totalReviews, correct, now)
    await this.database.execute('BEGIN IMMEDIATE')
    try {
      await this.database.execute(
        `INSERT INTO user_word_state (word_id, status, is_favorite, is_difficult, total_reviews, correct_reviews,
          incorrect_reviews, last_reviewed_at, next_review_at, fsrs_state, fsrs_step, fsrs_stability,
          fsrs_difficulty, fsrs_due, fsrs_last_review, fsrs_scheduled_days, fsrs_elapsed_days, fsrs_reps, fsrs_lapses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(word_id) DO UPDATE SET status=excluded.status, total_reviews=excluded.total_reviews,
          correct_reviews=excluded.correct_reviews, incorrect_reviews=excluded.incorrect_reviews,
          last_reviewed_at=excluded.last_reviewed_at, next_review_at=excluded.next_review_at,
          fsrs_state=excluded.fsrs_state, fsrs_step=excluded.fsrs_step, fsrs_stability=excluded.fsrs_stability,
          fsrs_difficulty=excluded.fsrs_difficulty, fsrs_due=excluded.fsrs_due,
          fsrs_last_review=excluded.fsrs_last_review, fsrs_scheduled_days=excluded.fsrs_scheduled_days,
          fsrs_elapsed_days=excluded.fsrs_elapsed_days, fsrs_reps=excluded.fsrs_reps, fsrs_lapses=excluded.fsrs_lapses`,
        [wordId, next.status, next.isFavorite ? 1 : 0, next.isDifficult ? 1 : 0, next.totalReviews,
          next.correctReviews, next.incorrectReviews, next.lastReviewedAt, next.nextReviewAt, next.fsrsState,
          next.fsrsStep, next.fsrsStability, next.fsrsDifficulty, next.fsrsDue, next.fsrsLastReview,
          next.fsrsScheduledDays, next.fsrsElapsedDays, next.fsrsReps, next.fsrsLapses],
      )
      await this.database.execute(
        `INSERT INTO review_logs (id, word_id, reviewed_at, rating, response_ms, previous_due, next_due,
          previous_stability, new_stability, previous_difficulty, new_difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), wordId, now.toISOString(), rating, responseMs ?? null, previous?.fsrsDue ?? null,
          next.fsrsDue, previous?.fsrsStability ?? null, next.fsrsStability,
          previous?.fsrsDifficulty ?? null, next.fsrsDifficulty],
      )
      await this.database.execute('COMMIT')
      return next
    } catch (error) { await this.database.execute('ROLLBACK'); throw error }
  }

  private stateFromCard(wordId: string, previous: UserWordState | null, card: Card, status: UserWordState['status'], totalReviews: number, correct: boolean, now: Date): UserWordState {
    return { wordId, status, isFavorite: previous?.isFavorite ?? false, isDifficult: previous?.isDifficult ?? false,
      totalReviews, correctReviews: (previous?.correctReviews ?? 0) + (correct ? 1 : 0),
      incorrectReviews: (previous?.incorrectReviews ?? 0) + (correct ? 0 : 1), lastReviewedAt: now.toISOString(),
      nextReviewAt: card.due.toISOString(), fsrsState: card.state, fsrsStep: card.learning_steps,
      fsrsStability: card.stability, fsrsDifficulty: card.difficulty, fsrsDue: card.due.toISOString(),
      fsrsLastReview: card.last_review?.toISOString() ?? now.toISOString(), fsrsScheduledDays: card.scheduled_days,
      fsrsElapsedDays: card.elapsed_days, fsrsReps: card.reps, fsrsLapses: card.lapses }
  }

  private async toggleFlag(wordId: string, column: 'is_favorite' | 'is_difficult'): Promise<boolean> {
    await this.database.execute(`INSERT INTO user_word_state (word_id, ${column}) VALUES (?, 1)
      ON CONFLICT(word_id) DO UPDATE SET ${column} = CASE ${column} WHEN 1 THEN 0 ELSE 1 END`, [wordId])
    const rows = await this.database.select<Record<string, number>>(`SELECT ${column} FROM user_word_state WHERE word_id = ?`, [wordId])
    return Boolean(rows[0]?.[column])
  }
  toggleFavorite(wordId: string) { return this.toggleFlag(wordId, 'is_favorite') }
  toggleDifficult(wordId: string) { return this.toggleFlag(wordId, 'is_difficult') }
}
