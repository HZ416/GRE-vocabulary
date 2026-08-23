import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import type { BindParams, BindValue, DatabaseConnection } from '../src/db/types'

function normalizeBindings(bindings?: BindParams): BindValue[] | undefined {
  return bindings
}

export interface SqliteTestDatabase extends DatabaseConnection { export(): Uint8Array }

export async function createSqliteTestDatabase(data?: Uint8Array): Promise<SqliteTestDatabase> {
  const SQL = await initSqlJs()
  const database: SqlJsDatabase = new SQL.Database(data)

  return {
    execute: async (sql, bindings) => {
      if (bindings) database.run(sql, normalizeBindings(bindings))
      else database.run(sql)
      return { rowsAffected: database.getRowsModified() }
    },
    select: async <T>(sql: string, bindings?: BindParams) => {
      const statement = database.prepare(sql)
      if (bindings) statement.bind(normalizeBindings(bindings))
      const rows: T[] = []
      while (statement.step()) rows.push(statement.getAsObject() as T)
      statement.free()
      return rows
    },
    close: async () => database.close(),
    export: () => database.export(),
  }
}
