import Database from '@tauri-apps/plugin-sql'
import type { BindParams, DatabaseConnection } from './types'

export async function openAppDatabase(): Promise<DatabaseConnection> {
  if (import.meta.env.MODE === 'e2e') {
    return (await import('./browserTestDatabase')).openBrowserTestDatabase()
  }
  const database = await Database.load('sqlite:gre-vocabulary.db')
  return {
    execute: async (sql: string, bindValues?: BindParams) => {
      const result = await database.execute(sql, bindValues)
      return { rowsAffected: result.rowsAffected }
    },
    select: <T>(sql: string, bindValues?: BindParams) => database.select<T[]>(sql, bindValues),
    close: async () => { await database.close() },
  }
}
