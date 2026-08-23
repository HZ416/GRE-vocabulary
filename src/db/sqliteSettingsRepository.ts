import { z } from 'zod'
import type { SettingsRepository } from '../services/repositories'
import type { AppSettings } from '../types/models'
import type { DatabaseConnection } from './types'

export const appSettingsSchema = z.object({
  interfaceLanguage: z.enum(['en', 'zh']),
  newWordsPerDay: z.number().int().min(0).max(200),
  maxReviewsPerDay: z.number().int().min(1).max(1000),
  showEnglish: z.boolean(),
  showChinese: z.boolean(),
  showIpa: z.boolean(),
  showExamples: z.boolean(),
}).refine((settings) => settings.showEnglish || settings.showChinese, {
  message: 'At least one definition language must remain visible',
})

export const defaultAppSettings: AppSettings = {
  interfaceLanguage: 'en',
  newWordsPerDay: 20,
  maxReviewsPerDay: 200,
  showEnglish: true,
  showChinese: true,
  showIpa: true,
  showExamples: true,
}

interface SettingsRow {
  interface_language: 'en' | 'zh'
  new_words_per_day: number
  max_reviews_per_day: number
  show_english: number
  show_chinese: number
  show_ipa: number
  show_examples: number
}

function mapSettings(row: SettingsRow): AppSettings {
  return appSettingsSchema.parse({
    interfaceLanguage: row.interface_language,
    newWordsPerDay: row.new_words_per_day, maxReviewsPerDay: row.max_reviews_per_day,
    showEnglish: Boolean(row.show_english), showChinese: Boolean(row.show_chinese),
    showIpa: Boolean(row.show_ipa), showExamples: Boolean(row.show_examples),
  })
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async get(): Promise<AppSettings> {
    const row = (await this.database.select<SettingsRow>('SELECT * FROM app_settings WHERE id = 1'))[0]
    if (!row) throw new Error('Application settings are missing')
    return mapSettings(row)
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    const value = appSettingsSchema.parse(settings)
    await this.database.execute(`UPDATE app_settings SET interface_language = ?, new_words_per_day = ?, max_reviews_per_day = ?,
      show_english = ?, show_chinese = ?, show_ipa = ?, show_examples = ?, updated_at = ? WHERE id = 1`,
    [value.interfaceLanguage, value.newWordsPerDay, value.maxReviewsPerDay, value.showEnglish ? 1 : 0, value.showChinese ? 1 : 0,
      value.showIpa ? 1 : 0, value.showExamples ? 1 : 0, new Date().toISOString()])
    return this.get()
  }
}
