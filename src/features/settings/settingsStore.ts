import { create } from 'zustand'
import { openAppDatabase } from '../../db/tauriDatabase'
import { defaultAppSettings, SqliteSettingsRepository } from '../../db/sqliteSettingsRepository'
import type { AppSettings } from '../../types/models'

interface SettingsState {
  settings: AppSettings
  loading: boolean
  saved: boolean
  error: string | null
  load: () => Promise<void>
  save: (settings: AppSettings) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultAppSettings, loading: false, saved: false, error: null,
  load: async () => {
    set({ loading: true, error: null, saved: false })
    let database
    try {
      database = await openAppDatabase()
      const settings = await new SqliteSettingsRepository(database).get()
      set({ settings, loading: false })
    } catch (error) { set({ loading: false, error: error instanceof Error ? error.message : String(error) }) }
    finally { await database?.close() }
  },
  save: async (value) => {
    set({ loading: true, error: null, saved: false })
    let database
    try {
      database = await openAppDatabase()
      const settings = await new SqliteSettingsRepository(database).save(value)
      set({ settings, loading: false, saved: true })
    } catch (error) { set({ loading: false, error: error instanceof Error ? error.message : String(error) }) }
    finally { await database?.close() }
  },
}))
