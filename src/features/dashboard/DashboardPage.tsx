import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProgressStore } from '../progress/progressStore'

export function DashboardPage() {
  const { dashboard, loading, error, loadDashboard } = useProgressStore()
  useEffect(() => { void loadDashboard() }, [loadDashboard])
  if (error) return <p className="notice error">{error}</p>
  if (!dashboard) return <p>{loading ? 'Loading today’s plan…' : 'No dashboard data.'}</p>

  const progress = dashboard.totalWords ? Math.round((dashboard.introduced / dashboard.totalWords) * 100) : 0
  return <section>
    <header className="page-header"><h1>Dashboard</h1><p>Everything that needs your attention today.</p></header>
    {dashboard.totalWords === 0 ? <div className="panel empty-state">
      <span className="eyebrow">First-time setup</span>
      <h2>Build your local vocabulary</h2>
      <p>Your words and learning progress stay on this device. Start by importing a UTF-8 CSV file.</p>
      <ol className="setup-steps">
        <li><strong>Prepare a CSV</strong><span>Include the required <code>lemma</code> and <code>source_name</code> columns.</span></li>
        <li><strong>Import vocabulary</strong><span>Existing words are merged safely instead of replacing your progress.</span></li>
        <li><strong>Start reviewing</strong><span>Your first daily queue is created automatically.</span></li>
      </ol>
      <Link className="button link-button" to="/vocabulary">Import vocabulary</Link>
    </div> : <>
      <div className="summary-grid" aria-label="Today's study summary">
        <div><span>New</span><strong>{dashboard.newWords}</strong></div>
        <div><span>Due</span><strong>{dashboard.due}</strong></div>
        <div><span>Overdue</span><strong>{dashboard.overdue}</strong></div>
        <div className="summary-total"><span>Total</span><strong>{dashboard.total}</strong></div>
      </div>
      <Link className="button primary-cta" to="/study">Start review</Link>
      <div className="panel progress-panel">
        <div className="panel-heading"><div><h2>Vocabulary progress</h2><p>{dashboard.introduced} of {dashboard.totalWords} words introduced</p></div><strong>{progress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-breakdown"><span>{dashboard.learning} learning</span><span>{dashboard.inReview} in review</span><span>{dashboard.mastered} mastered</span></div>
      </div>
    </>}
  </section>
}
