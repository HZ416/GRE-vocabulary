import type { AppSettings, ReviewLog, UserWordState, Word, WordSource } from '../types/models'
import type { DatabaseConnection } from '../db/types'
import { defaultAppSettings } from '../db/sqliteSettingsRepository'

export interface VocabularyExportItem extends Word {
  sources: WordSource[]
}

export interface VocabularyExport {
  format: 'gre-vocabulary-vocabulary'
  version: 1
  exportedAt: string
  words: VocabularyExportItem[]
}

export interface ProgressExport {
  format: 'gre-vocabulary-progress'
  version: 1
  exportedAt: string
  settings: AppSettings
  wordStates: UserWordState[]
  reviewLogs: ReviewLog[]
}

interface WordRow {
  id: string; lemma: string; part_of_speech: string | null; ipa: string | null
  definition_en: string | null; definition_zh: string | null; example_sentence: string | null
  mnemonic: string | null; roots: string | null; difficulty: number; frequency_tier: string
  priority_score: number; notes: string | null; created_at: string; updated_at: string
}

interface SourceRow {
  id: string; word_id: string; source_name: string; source_group: string | null
  source_rank: number | null; is_high_priority: number
}

interface StateRow {
  word_id: string; status: UserWordState['status']; is_favorite: number; is_difficult: number
  total_reviews: number; correct_reviews: number; incorrect_reviews: number
  last_reviewed_at: string | null; next_review_at: string | null
  fsrs_state: number | null; fsrs_step: number | null; fsrs_stability: number | null
  fsrs_difficulty: number | null; fsrs_due: string | null; fsrs_last_review: string | null
  fsrs_scheduled_days: number | null; fsrs_elapsed_days: number | null
  fsrs_reps: number | null; fsrs_lapses: number | null
}

interface ReviewRow {
  id: string; word_id: string; reviewed_at: string; rating: ReviewLog['rating']
  response_ms: number | null; mode: string; previous_due: string | null; next_due: string | null
  previous_stability: number | null; new_stability: number | null
  previous_difficulty: number | null; new_difficulty: number | null
}

interface SettingsRow {
  new_words_per_day: number; max_reviews_per_day: number; show_english: number
  show_chinese: number; show_ipa: number; show_examples: number
}

function mapWord(row: WordRow): Word {
  return {
    id: row.id, lemma: row.lemma, partOfSpeech: row.part_of_speech, ipa: row.ipa,
    definitionEn: row.definition_en, definitionZh: row.definition_zh,
    exampleSentence: row.example_sentence, mnemonic: row.mnemonic, roots: row.roots,
    difficulty: row.difficulty, frequencyTier: row.frequency_tier, priorityScore: row.priority_score,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

function mapSource(row: SourceRow): WordSource {
  return { id: row.id, wordId: row.word_id, sourceName: row.source_name,
    sourceGroup: row.source_group, sourceRank: row.source_rank, isHighPriority: Boolean(row.is_high_priority) }
}

function mapState(row: StateRow): UserWordState {
  return { wordId: row.word_id, status: row.status, isFavorite: Boolean(row.is_favorite),
    isDifficult: Boolean(row.is_difficult), totalReviews: row.total_reviews,
    correctReviews: row.correct_reviews, incorrectReviews: row.incorrect_reviews,
    lastReviewedAt: row.last_reviewed_at, nextReviewAt: row.next_review_at,
    fsrsState: row.fsrs_state, fsrsStep: row.fsrs_step, fsrsStability: row.fsrs_stability,
    fsrsDifficulty: row.fsrs_difficulty, fsrsDue: row.fsrs_due, fsrsLastReview: row.fsrs_last_review,
    fsrsScheduledDays: row.fsrs_scheduled_days, fsrsElapsedDays: row.fsrs_elapsed_days,
    fsrsReps: row.fsrs_reps, fsrsLapses: row.fsrs_lapses }
}

function mapReview(row: ReviewRow): ReviewLog {
  return { id: row.id, wordId: row.word_id, reviewedAt: row.reviewed_at, rating: row.rating,
    responseMs: row.response_ms, mode: row.mode, previousDue: row.previous_due, nextDue: row.next_due,
    previousStability: row.previous_stability, newStability: row.new_stability,
    previousDifficulty: row.previous_difficulty, newDifficulty: row.new_difficulty }
}

export class SqliteDataExportRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async vocabulary(exportedAt = new Date()): Promise<VocabularyExport> {
    const words = await this.database.select<WordRow>('SELECT * FROM words ORDER BY lemma COLLATE NOCASE')
    const sources = await this.database.select<SourceRow>('SELECT * FROM word_sources ORDER BY word_id, source_name COLLATE NOCASE')
    const sourcesByWord = new Map<string, WordSource[]>()
    for (const row of sources) {
      const list = sourcesByWord.get(row.word_id) ?? []
      list.push(mapSource(row))
      sourcesByWord.set(row.word_id, list)
    }
    return { format: 'gre-vocabulary-vocabulary', version: 1, exportedAt: exportedAt.toISOString(),
      words: words.map((word) => ({ ...mapWord(word), sources: sourcesByWord.get(word.id) ?? [] })) }
  }

  async progress(exportedAt = new Date()): Promise<ProgressExport> {
    const states = await this.database.select<StateRow>('SELECT * FROM user_word_state ORDER BY word_id')
    const logs = await this.database.select<ReviewRow>('SELECT * FROM review_logs ORDER BY reviewed_at, id')
    const settingsRow = (await this.database.select<SettingsRow>('SELECT * FROM app_settings WHERE id = 1'))[0]
    const settings = settingsRow ? {
      newWordsPerDay: settingsRow.new_words_per_day, maxReviewsPerDay: settingsRow.max_reviews_per_day,
      showEnglish: Boolean(settingsRow.show_english), showChinese: Boolean(settingsRow.show_chinese),
      showIpa: Boolean(settingsRow.show_ipa), showExamples: Boolean(settingsRow.show_examples),
    } : defaultAppSettings
    return { format: 'gre-vocabulary-progress', version: 1, exportedAt: exportedAt.toISOString(),
      settings, wordStates: states.map(mapState), reviewLogs: logs.map(mapReview) }
  }
}

const csvColumns = [
  'lemma', 'part_of_speech', 'definition_en', 'definition_zh', 'ipa', 'example_sentence',
  'mnemonic', 'roots', 'difficulty', 'frequency_tier', 'priority_score', 'notes',
  'source_name', 'source_group', 'source_rank', 'is_high_priority',
] as const

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function vocabularyToCsv(data: VocabularyExport): string {
  const rows: Array<Array<string | number | null>> = []
  for (const word of data.words) {
    const sources: Array<WordSource | null> = word.sources.length ? word.sources : [null]
    for (const source of sources) rows.push([
      word.lemma, word.partOfSpeech, word.definitionEn, word.definitionZh, word.ipa,
      word.exampleSentence, word.mnemonic, word.roots, word.difficulty, word.frequencyTier,
      word.priorityScore, word.notes, source?.sourceName ?? null, source?.sourceGroup ?? null,
      source?.sourceRank ?? null, source ? (source.isHighPriority ? 1 : 0) : null,
    ])
  }
  return `\uFEFF${csvColumns.join(',')}\r\n${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export function prettyJson(data: VocabularyExport | ProgressExport): string {
  return `${JSON.stringify(data, null, 2)}\n`
}
