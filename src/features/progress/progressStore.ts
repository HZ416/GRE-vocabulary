import { create } from 'zustand'
import { SqliteProgressRepository } from '../../db/sqliteProgressRepository'
import { openAppDatabase } from '../../db/tauriDatabase'
import type { DashboardSummary, StatisticsSummary } from '../../types/models'

interface ProgressState {
  dashboard: DashboardSummary | null
  statistics: StatisticsSummary | null
  loading: boolean
  error: string | null
  loadDashboard: () => Promise<void>
  loadStatistics: () => Promise<void>
}

async function loadProgress<T>(read: (repository: SqliteProgressRepository) => Promise<T>): Promise<T> {
  const database = await openAppDatabase()
  try { return await read(new SqliteProgressRepository(database)) }
  finally { await database.close() }
}

export const useProgressStore = create<ProgressState>((set) => ({
  dashboard: null, statistics: null, loading: false, error: null,
  loadDashboard: async () => {
    set({ loading: true, error: null })
    try {
      const dashboard = await loadProgress((repository) => repository.getDashboard(new Date()))
      set({ dashboard, loading: false })
    } catch (error) { set({ loading: false, error: error instanceof Error ? error.message : String(error) }) }
  },
  loadStatistics: async () => {
    set({ loading: true, error: null })
    try {
      const statistics = await loadProgress((repository) => repository.getStatistics(new Date()))
      set({ statistics, loading: false })
    } catch (error) { set({ loading: false, error: error instanceof Error ? error.message : String(error) }) }
  },
}))
