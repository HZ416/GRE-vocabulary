import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { runMigrations } from './migrations'
import type { BindParams, DatabaseConnection } from './types'

let connectionPromise: Promise<DatabaseConnection> | undefined

async function createConnection(): Promise<DatabaseConnection> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const database: SqlJsDatabase = new SQL.Database()
  const connection: DatabaseConnection = {
    execute: async (sql, bindings) => {
      if (bindings) database.run(sql, bindings)
      else database.run(sql)
      return { rowsAffected: database.getRowsModified() }
    },
    select: async <T>(sql: string, bindings?: BindParams) => {
      const statement = database.prepare(sql)
      if (bindings) statement.bind(bindings)
      const rows: T[] = []
      while (statement.step()) rows.push(statement.getAsObject() as T)
      statement.free()
      return rows
    },
    // Feature stores open and close short-lived Tauri handles. The browser E2E
    // adapter shares one in-memory database for the lifetime of a test page.
    close: async () => undefined,
  }
  await runMigrations(connection)
  return connection
}

export function openBrowserTestDatabase(): Promise<DatabaseConnection> {
  connectionPromise ??= createConnection()
  return connectionPromise
}
