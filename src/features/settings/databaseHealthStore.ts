import { create } from 'zustand'
import { checkDatabaseHealth, type DatabaseHealth } from '../../db/health'
import { openAppDatabase } from '../../db/tauriDatabase'

interface HealthState {
  status: 'idle' | 'checking' | 'healthy' | 'error'
  health: DatabaseHealth | null
  error: string | null
  check: () => Promise<void>
}

export const useDatabaseHealthStore = create<HealthState>((set) => ({
  status: 'idle',
  health: null,
  error: null,
  check: async () => {
    set({ status: 'checking', error: null })
    let database
    try {
      database = await openAppDatabase()
      const health = await checkDatabaseHealth(database)
      set({ status: 'healthy', health })
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      await database?.close()
    }
  },
}))

