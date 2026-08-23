import type { DashboardSummary, ReviewLog, StatisticsSummary, StudyWord, Tag, UserWordState, VocabularyListItem, Word, WordDetail, WordSource } from '../types/models'
import type { MergedVocabularyRecord } from '../import/vocabularyImport'

export interface WordRepository {
  findById(id: string): Promise<Word | null>
  findByLemma(lemma: string): Promise<Word | null>
  save(word: Word): Promise<void>
}

export interface WordSourceRepository {
  listForWord(wordId: string): Promise<WordSource[]>
  save(source: WordSource): Promise<void>
}

export interface TagRepository {
  list(): Promise<Tag[]>
  setForWord(wordId: string, tagIds: string[]): Promise<void>
}

export interface StudyStateRepository {
  get(wordId: string): Promise<UserWordState | null>
  save(state: UserWordState): Promise<void>
}

export interface ReviewLogRepository {
  append(log: ReviewLog): Promise<void>
  listForWord(wordId: string): Promise<ReviewLog[]>
}

export interface VocabularyRepository extends WordRepository {
  list(query?: string): Promise<VocabularyListItem[]>
  listFlagged(flag: 'favorite' | 'difficult'): Promise<VocabularyListItem[]>
  getDetail(id: string): Promise<WordDetail | null>
  import(records: MergedVocabularyRecord[]): Promise<{ inserted: number; updated: number }>
}

export interface ProgressRepository {
  getDashboard(now: Date): Promise<DashboardSummary>
  getStatistics(now: Date): Promise<StatisticsSummary>
}

export interface StudyRepository {
  getDailyQueue(now: Date, options?: { newLimit?: number; reviewLimit?: number }): Promise<StudyWord[]>
  rate(wordId: string, rating: 1 | 2 | 3 | 4, now: Date, responseMs?: number): Promise<UserWordState>
  toggleFavorite(wordId: string): Promise<boolean>
  toggleDifficult(wordId: string): Promise<boolean>
}
