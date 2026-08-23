import { create } from 'zustand'
import { openAppDatabase } from '../../db/tauriDatabase'
import { SqliteStudyRepository } from '../../db/sqliteStudyRepository'
import { defaultAppSettings, SqliteSettingsRepository } from '../../db/sqliteSettingsRepository'
import type { StudyRating } from '../../fsrs/scheduler'
import type { AppSettings, StudyWord } from '../../types/models'

interface StudyState {
  queue: StudyWord[]
  loading: boolean
  error: string | null
  settings: AppSettings
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
  queue: [], loading: false, error: null, settings: defaultAppSettings,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const database = await openAppDatabase()
      try {
        const settings = await new SqliteSettingsRepository(database).get()
        const queue = await new SqliteStudyRepository(database).getDailyQueue(new Date(), {
          newLimit: settings.newWordsPerDay, reviewLimit: settings.maxReviewsPerDay,
        })
        set({ queue, settings, loading: false })
      } finally { await database.close() }
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
