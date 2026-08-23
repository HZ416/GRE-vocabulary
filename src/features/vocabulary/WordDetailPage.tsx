import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { openAppDatabase } from '../../db/tauriDatabase'
import { SqliteVocabularyRepository } from '../../db/sqliteVocabularyRepository'
import type { WordDetail } from '../../types/models'
import { useI18n } from '../../i18n'

export function WordDetailPage() {
  const { t } = useI18n()
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<WordDetail | null>()
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  useEffect(() => {
    let active = true
    void (async () => {
      let database
      try {
        database = await openAppDatabase()
        const result = await new SqliteVocabularyRepository(database).getDetail(id)
        if (active) { setDetail(result); setNotes(result?.word.notes ?? '') }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : String(cause)) }
      finally { await database?.close() }
    })()
    return () => { active = false }
  }, [id])
  if (error) return <p className="notice error">{error}</p>
  if (detail === undefined) return <p>{t('Loading…')}</p>
  if (detail === null) return <p>{t('Word not found.')} <Link to="/vocabulary">{t('Back to vocabulary')}</Link></p>
  const { word, sources, studyState } = detail
  const saveNotes = async () => {
    setNotesStatus('saving')
    let database
    try {
      database = await openAppDatabase()
      await new SqliteVocabularyRepository(database).updateNotes(word.id, notes.trim() || null)
      setNotesStatus('saved')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { await database?.close() }
  }
  return <section className="word-detail">
    <Link className="back-link" to="/vocabulary">← {t('Vocabulary')}</Link>
    <header><h1>{word.lemma}</h1><p className="pronunciation">{word.ipa || t('Pronunciation not provided')} · {word.partOfSpeech || t('part of speech not provided')}</p></header>
    <div className="detail-grid">
      <article className="panel"><h2>{t('Meaning')}</h2><h3>{t('English')}</h3><p>{word.definitionEn || t('Not provided')}</p><h3>中文</h3><p>{word.definitionZh || t('未提供')}</p></article>
      <aside className="panel"><h2>{t('Study')}</h2><dl><dt>{t('Status')}</dt><dd>{t(studyState?.status || 'new')}</dd><dt>{t('Priority')}</dt><dd>{word.priorityScore}</dd><dt>{t('Reviews')}</dt><dd>{studyState?.totalReviews || 0}</dd></dl></aside>
    </div>
    <article className="panel"><h2>{t('Example')}</h2><p>{word.exampleSentence || t('No example provided.')}</p></article>
    <article className="panel"><h2>{t('Sources')}</h2><div className="chips">{sources.map((source) => <span key={source.id}>{source.sourceName}</span>)}</div></article>
    <article className="panel notes-panel"><h2>{t('Personal notes')}</h2>
      <textarea aria-label={t('Personal notes')} value={notes} onChange={(event) => { setNotes(event.target.value); setNotesStatus('idle') }} placeholder={t('Add a mnemonic, distinction, or reminder…')} />
      <div><button className="button" type="button" disabled={notesStatus === 'saving'} onClick={() => void saveNotes()}>{t(notesStatus === 'saving' ? 'Saving…' : 'Save notes')}</button>{notesStatus === 'saved' && <span aria-live="polite">{t('Saved locally.')}</span>}</div>
    </article>
  </section>
}
