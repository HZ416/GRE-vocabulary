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
      <h2>Your vocabulary is empty</h2><p>Import a CSV deck before starting your first review.</p>
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
