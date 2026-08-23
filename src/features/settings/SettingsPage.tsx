import { type FormEvent, useEffect, useState } from 'react'
import type { AppSettings } from '../../types/models'
import { useDatabaseHealthStore } from './databaseHealthStore'
import { useSettingsStore } from './settingsStore'

export function SettingsPage() {
  const { status, health, error, check } = useDatabaseHealthStore()
  const { settings, loading, saved, error: settingsError, load, save } = useSettingsStore()
  const [draft, setDraft] = useState<AppSettings>(settings)
  const statusClass = status === 'healthy' ? 'ok' : status === 'error' ? 'error' : ''
  useEffect(() => { void load() }, [load])
  useEffect(() => { setDraft(settings) }, [settings])

  const submit = (event: FormEvent) => { event.preventDefault(); void save(draft) }
  const setNumber = (field: 'newWordsPerDay' | 'maxReviewsPerDay', value: string) => {
    setDraft((current) => ({ ...current, [field]: Number(value) }))
  }
  const setBoolean = (field: 'showEnglish' | 'showChinese' | 'showIpa' | 'showExamples', value: boolean) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <section>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Application preferences and local database diagnostics.</p>
      </header>
      <form className="panel settings-form" onSubmit={submit}>
        <h2>Study preferences</h2>
        <label><span>New words per day<small>0–200</small></span><input type="number" min="0" max="200" value={draft.newWordsPerDay} onChange={(event) => setNumber('newWordsPerDay', event.target.value)} /></label>
        <label><span>Maximum reviews per day<small>1–1000</small></span><input type="number" min="1" max="1000" value={draft.maxReviewsPerDay} onChange={(event) => setNumber('maxReviewsPerDay', event.target.value)} /></label>
        <fieldset><legend>Answer content</legend>
          <label><span>English definition</span><input type="checkbox" checked={draft.showEnglish} onChange={(event) => setBoolean('showEnglish', event.target.checked)} /></label>
          <label><span>Chinese definition</span><input type="checkbox" checked={draft.showChinese} onChange={(event) => setBoolean('showChinese', event.target.checked)} /></label>
          <label><span>IPA pronunciation</span><input type="checkbox" checked={draft.showIpa} onChange={(event) => setBoolean('showIpa', event.target.checked)} /></label>
          <label><span>Example sentences</span><input type="checkbox" checked={draft.showExamples} onChange={(event) => setBoolean('showExamples', event.target.checked)} /></label>
        </fieldset>
        {settingsError && <p className="notice error">{settingsError}</p>}
        {saved && <p className="save-message" aria-live="polite">Settings saved locally.</p>}
        <button className="button" type="submit" disabled={loading}>Save preferences</button>
      </form>
      <div className="panel">
        <h2>Database health</h2>
        <div className={`status ${statusClass}`} aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>
            {status === 'idle' && 'Not checked'}
            {status === 'checking' && 'Checking local database…'}
            {status === 'healthy' && `Healthy · SQLite ${health?.sqliteVersion}`}
            {status === 'error' && `Unavailable · ${error}`}
          </span>
        </div>
        <button className="button" type="button" onClick={() => void check()} disabled={status === 'checking'}>
          Run health check
        </button>
      </div>
    </section>
  )
}
