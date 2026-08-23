import { useCallback, useEffect, useRef, useState } from 'react'
import type { StudyRating } from '../../fsrs/scheduler'
import { useStudyStore } from './studyStore'
import { useI18n } from '../../i18n'

const ratingButtons: { rating: StudyRating; label: string; key: string }[] = [
  { rating: 1, label: 'Again', key: '1' }, { rating: 2, label: 'Hard', key: '2' },
  { rating: 3, label: 'Good', key: '3' }, { rating: 4, label: 'Easy', key: '4' },
]

export function StudyPage() {
  const { t } = useI18n()
  const { queue, loading, error, settings, load, rate, toggleFavorite, toggleDifficult } = useStudyStore()
  const [revealed, setRevealed] = useState(false)
  const startedAt = useRef(Date.now())
  const word = queue[0]

  useEffect(() => { void load() }, [load])
  useEffect(() => { setRevealed(false); startedAt.current = Date.now() }, [word?.id])

  const submitRating = useCallback((rating: StudyRating) => {
    if (!word || !revealed || loading) return
    void rate(word.id, rating, Date.now() - startedAt.current)
  }, [loading, rate, revealed, word])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') { event.preventDefault(); setRevealed(true); return }
      const rating = Number(event.key) as StudyRating
      if (rating >= 1 && rating <= 4) submitRating(rating)
      if (word && event.key.toLowerCase() === 'f') void toggleFavorite(word.id)
      if (word && event.key.toLowerCase() === 'd') void toggleDifficult(word.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [submitRating, toggleDifficult, toggleFavorite, word])

  if (error) return <p className="notice error">{error}</p>
  if (loading && !word) return <p>{t('Building today’s queue…')}</p>
  if (!word) return <section><header className="page-header"><h1>{t('Study')}</h1><p>{t('You are caught up for now.')}</p></header></section>

  return <section className="study-page">
    <header className="study-header"><div><span>{t('Today’s queue')}</span><strong>{queue.length}</strong></div><p>{t('Space to reveal · 1–4 to rate')}</p></header>
    <article className="review-card" aria-live="polite">
      <div className="word-flags">
        <button aria-label={t('Toggle favorite')} className={word.studyState?.isFavorite ? 'active' : ''} onClick={() => void toggleFavorite(word.id)}>F · {t('Favorite')}</button>
        <button aria-label={t('Toggle difficult')} className={word.studyState?.isDifficult ? 'active' : ''} onClick={() => void toggleDifficult(word.id)}>D · {t('Difficult')}</button>
      </div>
      <div className="prompt"><h1>{word.lemma}</h1>{settings.showIpa && word.ipa && <p>{word.ipa}</p>}</div>
      <div className={`answer ${revealed ? 'revealed' : ''}`}>
        {revealed ? <><span>{word.partOfSpeech || t('word')}</span>{settings.showEnglish && <h2>{word.definitionEn || t('English definition not provided')}</h2>}{settings.showChinese && <p>{word.definitionZh || t('中文释义未提供')}</p>}{settings.showExamples && word.exampleSentence && <blockquote>{word.exampleSentence}</blockquote>}</> :
          <button className="show-answer" type="button" onClick={() => setRevealed(true)}>{t('Show answer')} <kbd>{t('Space')}</kbd></button>}
      </div>
      <div className="rating-row">
        {ratingButtons.map((item) => <button key={item.rating} disabled={!revealed || loading} onClick={() => submitRating(item.rating)}>{t(item.label)}<kbd>{item.key}</kbd></button>)}
      </div>
    </article>
  </section>
}
