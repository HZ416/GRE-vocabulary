import { useDatabaseHealthStore } from './databaseHealthStore'

export function SettingsPage() {
  const { status, health, error, check } = useDatabaseHealthStore()
  const statusClass = status === 'healthy' ? 'ok' : status === 'error' ? 'error' : ''

  return (
    <section>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Application preferences and local database diagnostics.</p>
      </header>
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

