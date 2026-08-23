import type { VocabularyRepository } from '../services/repositories'
import type { MergedVocabularyRecord } from '../import/vocabularyImport'
import { calculatePriorityScore, mergeSources } from '../import/vocabularyImport'
import type { UserWordState, VocabularyListItem, Word, WordDetail, WordSource } from '../types/models'
import type { DatabaseConnection } from './types'

interface WordRow {
  id: string; lemma: string; part_of_speech: string | null; ipa: string | null
  definition_en: string | null; definition_zh: string | null; example_sentence: string | null
  mnemonic: string | null; roots: string | null; difficulty: number; frequency_tier: string
  priority_score: number; notes: string | null; created_at: string; updated_at: string
}

type VocabularyListRow = WordRow & {
  status: VocabularyListItem['status']
  next_review_at: string | null
  is_favorite: number
  is_difficult: number
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

function mapVocabularyListItem(row: VocabularyListRow): VocabularyListItem {
  return {
    ...mapWord(row), status: row.status, nextReviewAt: row.next_review_at,
    isFavorite: Boolean(row.is_favorite), isDifficult: Boolean(row.is_difficult),
  }
}

const wordColumns = `w.id, w.lemma, w.part_of_speech, w.ipa, w.definition_en, w.definition_zh,
  w.example_sentence, w.mnemonic, w.roots, w.difficulty, w.frequency_tier,
  w.priority_score, w.notes, w.created_at, w.updated_at`

export class SqliteVocabularyRepository implements VocabularyRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async findById(id: string): Promise<Word | null> {
    const rows = await this.database.select<WordRow>(`SELECT ${wordColumns} FROM words w WHERE w.id = ?`, [id])
    return rows[0] ? mapWord(rows[0]) : null
  }

  async findByLemma(lemma: string): Promise<Word | null> {
    const rows = await this.database.select<WordRow>(`SELECT ${wordColumns} FROM words w WHERE w.lemma = ?`, [lemma])
    return rows[0] ? mapWord(rows[0]) : null
  }

  async save(word: Word): Promise<void> {
    await this.database.execute(
      `INSERT INTO words (id, lemma, part_of_speech, ipa, definition_en, definition_zh, example_sentence,
        mnemonic, roots, difficulty, frequency_tier, priority_score, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET lemma=excluded.lemma, part_of_speech=excluded.part_of_speech,
        ipa=excluded.ipa, definition_en=excluded.definition_en, definition_zh=excluded.definition_zh,
        example_sentence=excluded.example_sentence, mnemonic=excluded.mnemonic, roots=excluded.roots,
        difficulty=excluded.difficulty, frequency_tier=excluded.frequency_tier,
        priority_score=excluded.priority_score, notes=excluded.notes, updated_at=excluded.updated_at`,
      [word.id, word.lemma, word.partOfSpeech, word.ipa, word.definitionEn, word.definitionZh,
        word.exampleSentence, word.mnemonic, word.roots, word.difficulty, word.frequencyTier,
        word.priorityScore, word.notes, word.createdAt, word.updatedAt],
    )
  }

  async list(query = ''): Promise<VocabularyListItem[]> {
    const pattern = `%${query.trim()}%`
    const rows = await this.database.select<VocabularyListRow>(`SELECT ${wordColumns}, COALESCE(s.status, 'new') AS status, s.next_review_at,
      COALESCE(s.is_favorite, 0) AS is_favorite, COALESCE(s.is_difficult, 0) AS is_difficult
      FROM words w LEFT JOIN user_word_state s ON s.word_id = w.id
      WHERE (? = '%%' OR w.lemma LIKE ? COLLATE NOCASE OR w.definition_en LIKE ? COLLATE NOCASE OR w.definition_zh LIKE ?)
      ORDER BY w.priority_score DESC, w.lemma ASC LIMIT 500`, [pattern, pattern, pattern, pattern])
    return rows.map(mapVocabularyListItem)
  }

  async listFlagged(flag: 'favorite' | 'difficult'): Promise<VocabularyListItem[]> {
    const column = flag === 'favorite' ? 'is_favorite' : 'is_difficult'
    const rows = await this.database.select<VocabularyListRow>(`SELECT ${wordColumns}, s.status, s.next_review_at,
      s.is_favorite, s.is_difficult FROM words w JOIN user_word_state s ON s.word_id = w.id
      WHERE s.${column} = 1 ORDER BY w.priority_score DESC, w.lemma ASC`)
    return rows.map(mapVocabularyListItem)
  }

  async getDetail(id: string): Promise<WordDetail | null> {
    const word = await this.findById(id)
    if (!word) return null
    const sourceRows = await this.database.select<{
      id: string; word_id: string; source_name: string; source_group: string | null; source_rank: number | null; is_high_priority: number
    }>('SELECT * FROM word_sources WHERE word_id = ? ORDER BY source_name', [id])
    const sources: WordSource[] = sourceRows.map((row) => ({ id: row.id, wordId: row.word_id,
      sourceName: row.source_name, sourceGroup: row.source_group, sourceRank: row.source_rank,
      isHighPriority: Boolean(row.is_high_priority) }))
    const stateRows = await this.database.select<{
      word_id: string; status: UserWordState['status']; is_favorite: number; is_difficult: number;
      total_reviews: number; correct_reviews: number; incorrect_reviews: number; last_reviewed_at: string | null;
      next_review_at: string | null; fsrs_state: number | null; fsrs_step: number | null; fsrs_stability: number | null;
      fsrs_difficulty: number | null; fsrs_due: string | null; fsrs_last_review: string | null;
      fsrs_scheduled_days: number | null; fsrs_elapsed_days: number | null; fsrs_reps: number | null; fsrs_lapses: number | null
    }>('SELECT * FROM user_word_state WHERE word_id = ?', [id])
    const row = stateRows[0]
    const studyState: UserWordState | null = row ? { wordId: row.word_id, status: row.status,
      isFavorite: Boolean(row.is_favorite), isDifficult: Boolean(row.is_difficult), totalReviews: row.total_reviews,
      correctReviews: row.correct_reviews, incorrectReviews: row.incorrect_reviews, lastReviewedAt: row.last_reviewed_at,
      nextReviewAt: row.next_review_at, fsrsState: row.fsrs_state, fsrsStep: row.fsrs_step,
      fsrsStability: row.fsrs_stability, fsrsDifficulty: row.fsrs_difficulty, fsrsDue: row.fsrs_due,
      fsrsLastReview: row.fsrs_last_review, fsrsScheduledDays: row.fsrs_scheduled_days,
      fsrsElapsedDays: row.fsrs_elapsed_days, fsrsReps: row.fsrs_reps, fsrsLapses: row.fsrs_lapses } : null
    return { word, sources, studyState }
  }

  async updateNotes(id: string, notes: string | null): Promise<void> {
    const result = await this.database.execute('UPDATE words SET notes = ?, updated_at = ? WHERE id = ?',
      [notes, new Date().toISOString(), id])
    if (result.rowsAffected !== 1) throw new Error('Word not found')
  }

  async import(records: MergedVocabularyRecord[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0
    let updated = 0
    await this.database.execute('BEGIN IMMEDIATE')
    try {
      for (const record of records) {
        let word = await this.findByLemma(record.lemma)
        const now = new Date().toISOString()
        if (!word) {
          const id = crypto.randomUUID()
          await this.database.execute(
            `INSERT INTO words (id, lemma, part_of_speech, ipa, definition_en, definition_zh, example_sentence, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, record.lemma, record.partOfSpeech ?? null, record.ipa ?? null, record.definitionEn ?? null,
              record.definitionZh ?? null, record.exampleSentence ?? null, now, now],
          )
          word = await this.findById(id)
          inserted += 1
        } else {
          await this.database.execute(
            `UPDATE words SET
              part_of_speech = COALESCE(NULLIF(part_of_speech, ''), ?),
              ipa = COALESCE(NULLIF(ipa, ''), ?), definition_en = COALESCE(NULLIF(definition_en, ''), ?),
              definition_zh = COALESCE(NULLIF(definition_zh, ''), ?),
              example_sentence = COALESCE(NULLIF(example_sentence, ''), ?), updated_at = ? WHERE id = ?`,
            [record.partOfSpeech ?? null, record.ipa ?? null, record.definitionEn ?? null,
              record.definitionZh ?? null, record.exampleSentence ?? null, now, word.id],
          )
          updated += 1
        }
        if (!word) throw new Error(`Failed to persist ${record.lemma}`)
        for (const source of record.sources) {
          await this.database.execute(
            `INSERT INTO word_sources (id, word_id, source_name, source_group, source_rank, is_high_priority)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(word_id, source_name) DO UPDATE SET
              source_group=COALESCE(word_sources.source_group, excluded.source_group),
              source_rank=COALESCE(word_sources.source_rank, excluded.source_rank),
              is_high_priority=MAX(word_sources.is_high_priority, excluded.is_high_priority)`,
            [crypto.randomUUID(), word.id, source.sourceName, source.sourceGroup ?? null,
              source.sourceRank ?? null, source.isHighPriority ? 1 : 0],
          )
        }
        const storedSources = await this.database.select<{ source_name: string; is_high_priority: number }>(
          'SELECT source_name, is_high_priority FROM word_sources WHERE word_id = ?', [word.id],
        )
        const score = calculatePriorityScore(mergeSources(storedSources.map((source) => ({
          sourceName: source.source_name, isHighPriority: Boolean(source.is_high_priority),
        }))))
        await this.database.execute('UPDATE words SET priority_score = ? WHERE id = ?', [score, word.id])
      }
      await this.database.execute('COMMIT')
      return { inserted, updated }
    } catch (error) {
      await this.database.execute('ROLLBACK')
      throw error
    }
  }
}
