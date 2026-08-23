import { useEffect } from 'react'
import { useProgressStore } from '../progress/progressStore'
import { useI18n } from '../../i18n'

function formatAccuracy(value: number | null): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`
}

export function StatisticsPage() {
  const { t } = useI18n()
  const { statistics, loading, error, loadStatistics } = useProgressStore()
  useEffect(() => { void loadStatistics() }, [loadStatistics])
  if (error) return <p className="notice error">{error}</p>
  if (!statistics) return <p>{t(loading ? 'Calculating statistics…' : 'No statistics available.')}</p>
  const cards = [
    [t('Words introduced'), statistics.wordsIntroduced], [t('Words reviewed'), statistics.wordsReviewed],
    [t('Words mastered'), statistics.wordsMastered], [t('Reviews today'), statistics.reviewsToday],
    [t('Accuracy today'), formatAccuracy(statistics.accuracyToday)], [t('Current streak'), t('{count} days', { count: statistics.currentStreak })],
  ]
  return <section>
    <header className="page-header"><h1>{t('Statistics')}</h1><p>{t('A concise view of your learning activity.')}</p></header>
    <div className="stats-grid">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="panel lifetime-panel"><h2>{t('All-time reviews')}</h2><div><strong>{statistics.totalReviews}</strong><span>{t('Overall accuracy {value}', { value: formatAccuracy(statistics.overallAccuracy) })}</span></div></div>
  </section>
}
