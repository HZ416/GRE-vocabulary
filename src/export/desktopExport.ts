import { BaseDirectory } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { ask, open, save } from '@tauri-apps/plugin-dialog'
import { copyFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { openAppDatabase } from '../db/tauriDatabase'
import { prettyJson, SqliteDataExportRepository, vocabularyToCsv } from './dataExport'
import { vocabularyCsvTemplate } from '../import/vocabularyImport'

export type ExportKind = 'vocabulary-csv' | 'vocabulary-json' | 'progress-json' | 'database-backup'

export interface RestoreSummary {
  wordCount: number
  reviewCount: number
  rollbackPath: string
}

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

export async function saveVocabularyCsvTemplate(): Promise<string | null> {
  const path = await save({ defaultPath: 'gre-vocabulary-template.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] })
  if (!path) return null
  await writeTextFile(path, `\uFEFF${vocabularyCsvTemplate}`)
  return path
}

export async function restoreDatabaseBackup(): Promise<RestoreSummary | null> {
  const path = await open({ multiple: false, directory: false,
    filters: [{ name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] }] })
  if (!path) return null
  const approved = await ask(
    'Restoring this backup will replace all current vocabulary, notes, settings, and review progress. A before-restore safety copy will be created automatically. Continue?',
    { title: 'Restore database backup', kind: 'warning', okLabel: 'Restore backup', cancelLabel: 'Cancel' },
  )
  if (!approved) return null

  const database = await openAppDatabase()
  try {
    await database.execute('PRAGMA wal_checkpoint(FULL)')
  } finally {
    await database.close()
  }
  return invoke<RestoreSummary>('restore_database', { sourcePath: path })
}
