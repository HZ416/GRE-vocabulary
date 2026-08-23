import { Rating, State, createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs'
import type { UserWordState, WordStatus } from '../types/models'

export type StudyRating = 1 | 2 | 3 | 4

const scheduler = fsrs({ enable_fuzz: false })

export function toFsrsRating(rating: StudyRating): Grade {
  const mapped = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy } as const
  return mapped[rating]
}

export function toFsrsCard(state: UserWordState | null, now: Date): Card {
  if (!state?.fsrsDue || state.fsrsState == null) return createEmptyCard(now)
  return {
    due: new Date(state.fsrsDue),
    stability: state.fsrsStability ?? 0,
    difficulty: state.fsrsDifficulty ?? 0,
    elapsed_days: state.fsrsElapsedDays ?? 0,
    scheduled_days: state.fsrsScheduledDays ?? 0,
    learning_steps: state.fsrsStep ?? 0,
    reps: state.fsrsReps ?? state.totalReviews,
    lapses: state.fsrsLapses ?? state.incorrectReviews,
    state: state.fsrsState as State,
    last_review: state.fsrsLastReview ? new Date(state.fsrsLastReview) : undefined,
  }
}

export function scheduleReview(state: UserWordState | null, rating: StudyRating, now: Date) {
  return scheduler.next(toFsrsCard(state, now), now, toFsrsRating(rating))
}

export function statusForCard(card: Card, totalReviews: number): WordStatus {
  if (totalReviews >= 4 && card.stability >= 30) return 'mastered'
  if (card.state === State.Review) return 'review'
  return 'learning'
}
