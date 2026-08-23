import { z } from 'zod'

export const wordStatusSchema = z.enum(['new', 'learning', 'review', 'mastered', 'suspended'])
export type WordStatus = z.infer<typeof wordStatusSchema>

export interface Word {
  id: string
  lemma: string
  partOfSpeech: string | null
  ipa: string | null
  definitionEn: string | null
  definitionZh: string | null
  exampleSentence: string | null
  mnemonic: string | null
  roots: string | null
  difficulty: number
  frequencyTier: string
  priorityScore: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface WordSource {
  id: string
  wordId: string
  sourceName: string
  sourceGroup: string | null
  sourceRank: number | null
  isHighPriority: boolean
}

export interface Tag { id: string; name: string }
export interface WordTag { wordId: string; tagId: string }

export interface UserWordState {
  wordId: string
  status: WordStatus
  isFavorite: boolean
  isDifficult: boolean
  totalReviews: number
  correctReviews: number
  incorrectReviews: number
  lastReviewedAt: string | null
  nextReviewAt: string | null
  fsrsState: number | null
  fsrsStep: number | null
  fsrsStability: number | null
  fsrsDifficulty: number | null
  fsrsDue: string | null
  fsrsLastReview: string | null
  fsrsScheduledDays: number | null
  fsrsElapsedDays: number | null
  fsrsReps: number | null
  fsrsLapses: number | null
}

export interface ReviewLog {
  id: string
  wordId: string
  reviewedAt: string
  rating: 1 | 2 | 3 | 4
  responseMs: number | null
  mode: string
  previousDue: string | null
  nextDue: string | null
  previousStability: number | null
  newStability: number | null
  previousDifficulty: number | null
  newDifficulty: number | null
}

export interface VocabularyListItem extends Word {
  status: WordStatus
  nextReviewAt: string | null
  isFavorite: boolean
  isDifficult: boolean
}

export interface WordDetail {
  word: Word
  sources: WordSource[]
  studyState: UserWordState | null
}

export interface StudyWord extends Word {
  studyState: UserWordState | null
}

export interface DashboardSummary {
  newWords: number
  due: number
  overdue: number
  total: number
  totalWords: number
  introduced: number
  learning: number
  inReview: number
  mastered: number
}

export interface StatisticsSummary {
  wordsIntroduced: number
  wordsReviewed: number
  wordsMastered: number
  reviewsToday: number
  accuracyToday: number | null
  currentStreak: number
  totalReviews: number
  overallAccuracy: number | null
}

export interface AppSettings {
  newWordsPerDay: number
  maxReviewsPerDay: number
  showEnglish: boolean
  showChinese: boolean
  showIpa: boolean
  showExamples: boolean
}
