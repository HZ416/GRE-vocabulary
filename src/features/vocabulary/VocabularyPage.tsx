import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVocabularyStore } from './vocabularyStore'

export function VocabularyPage() {
  const { words, loading, error, importMessage, load, importCsv } = useVocabularyStore()
  const [query, setQuery] = useState('')
  useEffect(() => { void load() }, [load])

  const search = (event: FormEvent) => { event.preventDefault(); void load(query) }
  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) await importCsv(await file.text())
    event.target.value = ''
  }

  return (
    <section>
      <header className="page-header"><h1>Vocabulary</h1><p>Browse, search, and import the local GRE word collection.</p></header>
      <div className="toolbar">
        <form className="search" onSubmit={search}>
          <input aria-label="Search vocabulary" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search words or definitions" />
          <button className="button" type="submit">Search</button>
        </form>
        <label className="button file-button">Import CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event)} /></label>
      </div>
      {importMessage && <p className="notice success">{importMessage}</p>}
      {error && <p className="notice error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Word</th><th>Meaning</th><th>Tier</th><th>Status</th><th>Priority</th></tr></thead>
          <tbody>
            {words.map((word) => <tr key={word.id}>
              <td><Link to={`/vocabulary/${word.id}`}>{word.lemma}</Link></td>
              <td>{word.definitionZh || word.definitionEn || '—'}</td><td>{word.frequencyTier}</td>
              <td>{word.status}</td><td>{word.priorityScore}</td>
            </tr>)}
          </tbody>
        </table>
        {!loading && words.length === 0 && <div className="empty">No vocabulary yet. Import a CSV to begin.</div>}
        {loading && <div className="empty">Loading…</div>}
      </div>
    </section>
  )
}
