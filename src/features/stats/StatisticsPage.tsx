import { useEffect } from 'react'
import { useProgressStore } from '../progress/progressStore'

function formatAccuracy(value: number | null): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`
}

export function StatisticsPage() {
  const { statistics, loading, error, loadStatistics } = useProgressStore()
  useEffect(() => { void loadStatistics() }, [loadStatistics])
  if (error) return <p className="notice error">{error}</p>
  if (!statistics) return <p>{loading ? 'Calculating statistics…' : 'No statistics available.'}</p>
  const cards = [
    ['Words introduced', statistics.wordsIntroduced], ['Words reviewed', statistics.wordsReviewed],
    ['Words mastered', statistics.wordsMastered], ['Reviews today', statistics.reviewsToday],
    ['Accuracy today', formatAccuracy(statistics.accuracyToday)], ['Current streak', `${statistics.currentStreak} days`],
  ]
  return <section>
    <header className="page-header"><h1>Statistics</h1><p>A concise view of your learning activity.</p></header>
    <div className="stats-grid">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="panel lifetime-panel"><h2>All-time reviews</h2><div><strong>{statistics.totalReviews}</strong><span>Overall accuracy {formatAccuracy(statistics.overallAccuracy)}</span></div></div>
  </section>
}
