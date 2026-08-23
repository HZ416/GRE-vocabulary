import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { saveVocabularyCsvTemplate } from '../../export/desktopExport'
import { useVocabularyStore } from './vocabularyStore'

export function VocabularyPage() {
  const { words, loading, error, importMessage, load, importCsv } = useVocabularyStore()
  const [query, setQuery] = useState('')
  const [templateMessage, setTemplateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  useEffect(() => { void load() }, [load])

  const search = (event: FormEvent) => { event.preventDefault(); void load(query) }
  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) await importCsv(await file.text())
    event.target.value = ''
  }
  const saveTemplate = async () => {
    setTemplateMessage(null)
    try {
      const path = await saveVocabularyCsvTemplate()
      if (path) setTemplateMessage({ type: 'success', text: `Template saved to ${path}` })
    } catch (templateError) {
      setTemplateMessage({ type: 'error', text: templateError instanceof Error ? templateError.message : String(templateError) })
    }
  }

  const firstRun = !loading && words.length === 0 && query.trim() === ''

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
      {firstRun && <div className="panel import-guide">
        <span className="eyebrow">CSV quick start</span>
        <h2>Import your first words</h2>
        <p>Save the template, add one word per row, keep it as UTF-8 CSV, then choose <strong>Import CSV</strong>.</p>
        <div className="csv-requirements">
          <div><strong>Required columns</strong><code>lemma</code><code>source_name</code></div>
          <div><strong>Useful optional columns</strong><span><code>definition_en</code>, <code>definition_zh</code>, <code>part_of_speech</code>, <code>ipa</code>, <code>example_sentence</code></span></div>
        </div>
        <pre aria-label="CSV example">lemma,definition_en,definition_zh,source_name{`\n`}equivocal,open to several meanings,模棱两可的,gregmat</pre>
        <button className="button secondary-button" type="button" onClick={() => void saveTemplate()}>Save CSV template</button>
        {templateMessage && <p className={`notice ${templateMessage.type}`} aria-live="polite">{templateMessage.text}</p>}
      </div>}
      {!firstRun && <div className="table-wrap">
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
      </div>}
    </section>
  )
}
