import { create } from 'zustand'
import { openAppDatabase } from '../../db/tauriDatabase'
import { SqliteStudyRepository } from '../../db/sqliteStudyRepository'
import type { StudyRating } from '../../fsrs/scheduler'
import type { StudyWord } from '../../types/models'

interface StudyState {
  queue: StudyWord[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  rate: (wordId: string, rating: StudyRating, responseMs: number) => Promise<void>
  toggleFavorite: (wordId: string) => Promise<void>
  toggleDifficult: (wordId: string) => Promise<void>
}

async function withStudyRepository<T>(action: (repository: SqliteStudyRepository) => Promise<T>): Promise<T> {
  const database = await openAppDatabase()
  try { return await action(new SqliteStudyRepository(database)) }
  finally { await database.close() }
}

export const useStudyStore = create<StudyState>((set, get) => ({
  queue: [], loading: false, error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const queue = await withStudyRepository((repository) => repository.getDailyQueue(new Date()))
      set({ queue, loading: false })
    } catch (error) { set({ loading: false, error: error instanceof Error ? error.message : String(error) }) }
  },
  rate: async (wordId, rating, responseMs) => {
    set({ loading: true, error: null })
    try {
      await withStudyRepository((repository) => repository.rate(wordId, rating, new Date(), responseMs))
      await get().load()
    } catch (error) { set({ loading: false, error: error instanceof Error ? error.message : String(error) }) }
  },
  toggleFavorite: async (wordId) => {
    await withStudyRepository((repository) => repository.toggleFavorite(wordId))
    await get().load()
  },
  toggleDifficult: async (wordId) => {
    await withStudyRepository((repository) => repository.toggleDifficult(wordId))
    await get().load()
  },
}))
