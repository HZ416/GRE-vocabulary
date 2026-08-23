import type { ProgressRepository } from '../services/repositories'
import type { DashboardSummary, StatisticsSummary } from '../types/models'
import type { DatabaseConnection } from './types'

interface DashboardRow {
  total_words: number
  unseen_words: number
  due: number
  overdue: number
  introduced: number
  learning: number
  in_review: number
  mastered: number
}

interface StatisticsRow {
  words_introduced: number
  words_reviewed: number
  words_mastered: number
  reviews_today: number
  correct_today: number
  total_reviews: number
  total_correct: number
}

function startOfLocalDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export class SqliteProgressRepository implements ProgressRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async getDashboard(now: Date): Promise<DashboardSummary> {
    const start = startOfLocalDay(now)
    const row = (await this.database.select<DashboardRow>(`SELECT
      (SELECT COUNT(*) FROM words) AS total_words,
      (SELECT COUNT(*) FROM words w LEFT JOIN user_word_state s ON s.word_id = w.id
        WHERE s.word_id IS NULL OR s.status = 'new') AS unseen_words,
      (SELECT COUNT(*) FROM user_word_state WHERE status IN ('learning', 'review', 'mastered')
        AND COALESCE(fsrs_due, next_review_at) >= ? AND COALESCE(fsrs_due, next_review_at) <= ?) AS due,
      (SELECT COUNT(*) FROM user_word_state WHERE status IN ('learning', 'review', 'mastered')
        AND COALESCE(fsrs_due, next_review_at) < ?) AS overdue,
      (SELECT COUNT(*) FROM user_word_state WHERE total_reviews > 0) AS introduced,
      (SELECT COUNT(*) FROM user_word_state WHERE status = 'learning') AS learning,
      (SELECT COUNT(*) FROM user_word_state WHERE status = 'review') AS in_review,
      (SELECT COUNT(*) FROM user_word_state WHERE status = 'mastered') AS mastered`,
    [start.toISOString(), now.toISOString(), start.toISOString()]))[0]
    if (!row) throw new Error('Unable to calculate dashboard')
    const newWords = Math.min(row.unseen_words, 20)
    return {
      newWords, due: row.due, overdue: row.overdue, total: newWords + row.due + row.overdue,
      totalWords: row.total_words, introduced: row.introduced, learning: row.learning,
      inReview: row.in_review, mastered: row.mastered,
    }
  }

  async getStatistics(now: Date): Promise<StatisticsSummary> {
    const start = startOfLocalDay(now)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const row = (await this.database.select<StatisticsRow>(`SELECT
      (SELECT COUNT(*) FROM user_word_state WHERE total_reviews > 0) AS words_introduced,
      (SELECT COUNT(DISTINCT word_id) FROM review_logs) AS words_reviewed,
      (SELECT COUNT(*) FROM user_word_state WHERE status = 'mastered') AS words_mastered,
      (SELECT COUNT(*) FROM review_logs WHERE reviewed_at >= ? AND reviewed_at < ?) AS reviews_today,
      (SELECT COUNT(*) FROM review_logs WHERE reviewed_at >= ? AND reviewed_at < ? AND rating > 1) AS correct_today,
      (SELECT COUNT(*) FROM review_logs) AS total_reviews,
      (SELECT COUNT(*) FROM review_logs WHERE rating > 1) AS total_correct`,
    [start.toISOString(), end.toISOString(), start.toISOString(), end.toISOString()]))[0]
    if (!row) throw new Error('Unable to calculate statistics')
    const reviewRows = await this.database.select<{ reviewed_at: string }>('SELECT reviewed_at FROM review_logs ORDER BY reviewed_at DESC')
    const activeDays = new Set(reviewRows.map(({ reviewed_at }) => localDayKey(new Date(reviewed_at))))
    const cursor = startOfLocalDay(now)
    if (!activeDays.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    let currentStreak = 0
    while (activeDays.has(localDayKey(cursor))) {
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return {
      wordsIntroduced: row.words_introduced, wordsReviewed: row.words_reviewed,
      wordsMastered: row.words_mastered, reviewsToday: row.reviews_today,
      accuracyToday: row.reviews_today ? row.correct_today / row.reviews_today : null,
      currentStreak, totalReviews: row.total_reviews,
      overallAccuracy: row.total_reviews ? row.total_correct / row.total_reviews : null,
    }
  }
}
