import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useProgressStore } from '../progress/progressStore'

export function DashboardPage() {
  const { t } = useI18n()
  const { dashboard, loading, error, loadDashboard } = useProgressStore()
  useEffect(() => { void loadDashboard() }, [loadDashboard])
  if (error) return <p className="notice error">{error}</p>
  if (!dashboard) return <p>{t(loading ? 'Loading today’s plan…' : 'No dashboard data.')}</p>

  const progress = dashboard.totalWords ? Math.round((dashboard.introduced / dashboard.totalWords) * 100) : 0
  return <section>
    <header className="page-header"><h1>{t('Dashboard')}</h1><p>{t('Everything that needs your attention today.')}</p></header>
    {dashboard.totalWords === 0 ? <div className="panel empty-state">
      <span className="eyebrow">{t('First-time setup')}</span>
      <h2>{t('Build your local vocabulary')}</h2>
      <p>{t('Your words and learning progress stay on this device. Start by importing a UTF-8 CSV file.')}</p>
      <ol className="setup-steps">
        <li><strong>{t('Prepare a CSV')}</strong><span>{t('Include the required {lemma} and {source} columns.', { lemma: 'lemma', source: 'source_name' })}</span></li>
        <li><strong>{t('Import vocabulary')}</strong><span>{t('Existing words are merged safely instead of replacing your progress.')}</span></li>
        <li><strong>{t('Start reviewing')}</strong><span>{t('Your first daily queue is created automatically.')}</span></li>
      </ol>
      <Link className="button link-button" to="/vocabulary">{t('Import vocabulary')}</Link>
    </div> : <>
      <div className="summary-grid" aria-label={t("Today's study summary")}>
        <div><span>{t('New')}</span><strong>{dashboard.newWords}</strong></div>
        <div><span>{t('Due')}</span><strong>{dashboard.due}</strong></div>
        <div><span>{t('Overdue')}</span><strong>{dashboard.overdue}</strong></div>
        <div className="summary-total"><span>{t('Total')}</span><strong>{dashboard.total}</strong></div>
      </div>
      <Link className="button primary-cta" to="/study">{t('Start review')}</Link>
      <div className="panel progress-panel">
        <div className="panel-heading"><div><h2>{t('Vocabulary progress')}</h2><p>{t('{introduced} of {total} words introduced', { introduced: dashboard.introduced, total: dashboard.totalWords })}</p></div><strong>{progress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-breakdown"><span>{t('{count} learning', { count: dashboard.learning })}</span><span>{t('{count} in review', { count: dashboard.inReview })}</span><span>{t('{count} mastered', { count: dashboard.mastered })}</span></div>
      </div>
    </>}
  </section>
}
