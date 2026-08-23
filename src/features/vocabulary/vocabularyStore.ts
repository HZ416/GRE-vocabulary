import { create } from 'zustand'
import { openAppDatabase } from '../../db/tauriDatabase'
import { SqliteVocabularyRepository } from '../../db/sqliteVocabularyRepository'
import { parseVocabularyCsv } from '../../import/vocabularyImport'
import type { VocabularyListItem } from '../../types/models'

interface VocabularyState {
  words: VocabularyListItem[]
  loading: boolean
  error: string | null
  importMessage: string | null
  load: (query?: string) => Promise<void>
  importCsv: (csv: string) => Promise<void>
}

export const useVocabularyStore = create<VocabularyState>((set, get) => ({
  words: [], loading: false, error: null, importMessage: null,
  load: async (query = '') => {
    set({ loading: true, error: null })
    let database
    try {
      database = await openAppDatabase()
      const words = await new SqliteVocabularyRepository(database).list(query)
      set({ words, loading: false })
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) })
    } finally { await database?.close() }
  },
  importCsv: async (csv) => {
    set({ loading: true, error: null, importMessage: null })
    let database
    try {
      const parsed = parseVocabularyCsv(csv)
      database = await openAppDatabase()
      const result = await new SqliteVocabularyRepository(database).import(parsed.records)
      set({ importMessage: `${result.inserted} added, ${result.updated} updated, ${parsed.duplicateRows} duplicate rows merged` })
      await database.close()
      database = undefined
      await get().load()
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) })
    } finally { await database?.close() }
  },
}))
