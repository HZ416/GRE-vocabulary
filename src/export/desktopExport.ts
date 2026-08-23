import { BaseDirectory } from '@tauri-apps/api/path'
import { save } from '@tauri-apps/plugin-dialog'
import { copyFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { openAppDatabase } from '../db/tauriDatabase'
import { prettyJson, SqliteDataExportRepository, vocabularyToCsv } from './dataExport'

export type ExportKind = 'vocabulary-csv' | 'vocabulary-json' | 'progress-json' | 'database-backup'

const exportOptions: Record<ExportKind, { fileName: string; extension: string; name: string }> = {
  'vocabulary-csv': { fileName: 'gre-vocabulary.csv', extension: 'csv', name: 'CSV' },
  'vocabulary-json': { fileName: 'gre-vocabulary.json', extension: 'json', name: 'JSON' },
  'progress-json': { fileName: 'gre-progress.json', extension: 'json', name: 'JSON' },
  'database-backup': { fileName: 'gre-vocabulary-backup.db', extension: 'db', name: 'SQLite database' },
}

export async function saveExport(kind: ExportKind): Promise<string | null> {
  const option = exportOptions[kind]
  const path = await save({ defaultPath: option.fileName, filters: [{ name: option.name, extensions: [option.extension] }] })
  if (!path) return null

  const database = await openAppDatabase()
  let databaseClosed = false
  try {
    if (kind === 'database-backup') {
      await database.execute('PRAGMA wal_checkpoint(FULL)')
      await database.close()
      databaseClosed = true
      await copyFile('gre-vocabulary.db', path, { fromPathBaseDir: BaseDirectory.AppConfig })
      return path
    }
    const exports = new SqliteDataExportRepository(database)
    const content = kind === 'progress-json'
      ? prettyJson(await exports.progress())
      : kind === 'vocabulary-json'
        ? prettyJson(await exports.vocabulary())
        : vocabularyToCsv(await exports.vocabulary())
    await writeTextFile(path, content)
    return path
  } finally {
    if (!databaseClosed) await database.close()
  }
}
