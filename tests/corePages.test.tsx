// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../src/features/dashboard/DashboardPage'
import { SettingsPage } from '../src/features/settings/SettingsPage'
import { VocabularyPage } from '../src/features/vocabulary/VocabularyPage'

const mocks = vi.hoisted(() => ({
  loadDashboard: vi.fn(), loadVocabulary: vi.fn(), importCsv: vi.fn(), loadSettings: vi.fn(),
  saveSettings: vi.fn(), checkHealth: vi.fn(),
  progress: { dashboard: null as null | Record<string, number>, loading: false, error: null as string | null },
  vocabulary: { words: [] as Array<Record<string, unknown>>, loading: false, error: null as string | null, importMessage: null as string | null },
  settings: {
    settings: { interfaceLanguage: 'en' as const, newWordsPerDay: 20, maxReviewsPerDay: 200, showEnglish: true,
      showChinese: true, showIpa: true, showExamples: true },
    loading: false, saved: false, error: null as string | null,
  },
}))

vi.mock('../src/features/progress/progressStore', () => ({
  useProgressStore: () => ({ ...mocks.progress, loadDashboard: mocks.loadDashboard }),
}))
vi.mock('../src/features/vocabulary/vocabularyStore', () => ({
  useVocabularyStore: () => ({ ...mocks.vocabulary, load: mocks.loadVocabulary, importCsv: mocks.importCsv }),
}))
vi.mock('../src/features/settings/settingsStore', () => ({
  useSettingsStore: () => ({ ...mocks.settings, load: mocks.loadSettings, save: mocks.saveSettings }),
}))
vi.mock('../src/features/settings/databaseHealthStore', () => ({
  useDatabaseHealthStore: () => ({ status: 'idle', health: null, error: null, check: mocks.checkHealth }),
}))
vi.mock('../src/export/desktopExport', () => ({
  saveExport: vi.fn(), restoreDatabaseBackup: vi.fn(), saveVocabularyCsvTemplate: vi.fn(),
}))

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.progress.dashboard = null
  mocks.progress.error = null
  mocks.vocabulary.words = []
  mocks.vocabulary.error = null
  mocks.vocabulary.importMessage = null
})

describe('core pages', () => {
  it('guides a first-time user from the dashboard', () => {
    mocks.progress.dashboard = { newWords: 0, due: 0, overdue: 0, total: 0, totalWords: 0,
      introduced: 0, learning: 0, inReview: 0, mastered: 0 }
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(screen.getByText('Build your local vocabulary')).toBeTruthy()
    expect(screen.getByText('Prepare a CSV')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Import vocabulary' }).getAttribute('href')).toBe('/vocabulary')
  })

  it('shows CSV requirements and a template action for an empty vocabulary', () => {
    render(<MemoryRouter><VocabularyPage /></MemoryRouter>)
    expect(screen.getByText('Import your first words')).toBeTruthy()
    expect(screen.getByText('lemma,definition_en,definition_zh,source_name', { exact: false })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save CSV template' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('exposes export, restore, preferences, and database diagnostics in settings', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Full database backup' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restore database backup' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Run health check' })).toBeTruthy()
  })
})
