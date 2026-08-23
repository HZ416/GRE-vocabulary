import { describe, expect, it } from 'vitest'
import { Rating, State } from 'ts-fsrs'
import { scheduleReview, statusForCard, toFsrsRating } from '../src/fsrs/scheduler'

describe('FSRS scheduler mapping', () => {
  it('maps the four UI ratings to FSRS ratings', () => {
    expect([1, 2, 3, 4].map((rating) => toFsrsRating(rating as 1 | 2 | 3 | 4)))
      .toEqual([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy])
  })

  it('transitions a new word after Good and assigns a future due date', () => {
    const now = new Date('2026-08-23T03:00:00.000Z')
    const result = scheduleReview(null, 3, now)
    expect(result.card.state).not.toBe(State.New)
    expect(result.card.due.getTime()).toBeGreaterThan(now.getTime())
    expect(statusForCard(result.card, 1)).toMatch(/learning|review/)
  })
})
