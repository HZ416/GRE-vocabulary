import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SqliteStudyRepository } from '../../db/sqliteStudyRepository'
import { openAppDatabase } from '../../db/tauriDatabase'
import { SqliteVocabularyRepository } from '../../db/sqliteVocabularyRepository'
import type { VocabularyListItem } from '../../types/models'
import { useI18n } from '../../i18n'

export function FlaggedVocabularyPage({ flag }: { flag: 'favorite' | 'difficult' }) {
  const { t } = useI18n()
  const [words, setWords] = useState<VocabularyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const title = flag === 'favorite' ? 'Favorites' : 'Difficult'

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const database = await openAppDatabase()
    try { setWords(await new SqliteVocabularyRepository(database).listFlagged(flag)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { await database.close(); setLoading(false) }
  }, [flag])

  useEffect(() => { void load() }, [load])

  const remove = async (wordId: string) => {
    const database = await openAppDatabase()
    try {
      const repository = new SqliteStudyRepository(database)
      if (flag === 'favorite') await repository.toggleFavorite(wordId)
      else await repository.toggleDifficult(wordId)
    } finally { await database.close() }
    await load()
  }

  return <section>
    <header className="page-header"><h1>{t(title)}</h1><p>{t(flag === 'favorite' ? 'Words saved for quick access.' : 'Words that deserve extra attention.')}</p></header>
    {error && <p className="notice error">{error}</p>}
    <div className="table-wrap flagged-table">
      <table><thead><tr><th>{t('Word')}</th><th>{t('Meaning')}</th><th>{t('Status')}</th><th>{t('Priority')}</th><th>{t('Action')}</th></tr></thead>
        <tbody>{words.map((word) => <tr key={word.id}>
          <td><Link to={`/vocabulary/${word.id}`}>{word.lemma}</Link></td>
          <td>{word.definitionZh || word.definitionEn || '—'}</td><td>{t(word.status)}</td><td>{word.priorityScore}</td>
          <td><button className="text-button" onClick={() => void remove(word.id)}>{t('Remove')}</button></td>
        </tr>)}</tbody>
      </table>
      {!loading && words.length === 0 && <div className="empty">{t('No {type} words yet.', { type: t(title).toLowerCase() })}</div>}
      {loading && <div className="empty">{t('Loading…')}</div>}
    </div>
  </section>
}
