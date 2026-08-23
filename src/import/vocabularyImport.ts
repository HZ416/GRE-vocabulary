import Papa from 'papaparse'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional(),
)

const csvRowSchema = z.object({
  lemma: z.string().trim().min(1, 'lemma is required'),
  part_of_speech: optionalString,
  definition_en: optionalString,
  definition_zh: optionalString,
  ipa: optionalString,
  example_sentence: optionalString,
  source_name: z.string().trim().min(1, 'source_name is required'),
  source_group: optionalString,
  source_rank: z.preprocess((value) => value === '' || value == null ? undefined : Number(value), z.number().int().nonnegative().optional()),
  is_high_priority: z.preprocess(
    (value) => value === '' || value == null ? undefined : ['1', 'true', 'yes'].includes(String(value).toLowerCase()),
    z.boolean().optional(),
  ),
})

export interface VocabularyImportRecord {
  lemma: string
  partOfSpeech?: string
  definitionEn?: string
  definitionZh?: string
  ipa?: string
  exampleSentence?: string
  sourceName: string
  sourceGroup?: string
  sourceRank?: number
  isHighPriority: boolean
}

export interface ImportSource {
  sourceName: string
  sourceGroup?: string
  sourceRank?: number
  isHighPriority: boolean
}

export interface MergedVocabularyRecord extends Omit<VocabularyImportRecord, 'sourceName' | 'sourceGroup' | 'sourceRank' | 'isHighPriority'> {
  sources: ImportSource[]
}

export interface ParsedVocabularyImport {
  records: MergedVocabularyRecord[]
  duplicateRows: number
}

const defaultHighPrioritySources = new Set(['gregmat', 'magoosh_common', 'powerscore'])

export function normalizeLemma(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[‘’]/g, "'").replace(/\s+/g, ' ')
}

export function normalizeSourceName(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[\s-]+/g, '_')
}

export function calculatePriorityScore(sources: Pick<ImportSource, 'sourceName' | 'isHighPriority'>[]): number {
  const unique = mergeSources(sources)
  return 3 * unique.length + 2 * unique.filter(({ isHighPriority }) => isHighPriority).length
}

export function mergeSources<T extends Pick<ImportSource, 'sourceName' | 'isHighPriority'> & Partial<ImportSource>>(sources: T[]): ImportSource[] {
  const merged = new Map<string, ImportSource>()
  for (const source of sources) {
    const sourceName = normalizeSourceName(source.sourceName)
    const current = merged.get(sourceName)
    merged.set(sourceName, {
      sourceName,
      sourceGroup: current?.sourceGroup ?? source.sourceGroup,
      sourceRank: current?.sourceRank ?? source.sourceRank,
      isHighPriority: Boolean(current?.isHighPriority || source.isHighPriority || defaultHighPrioritySources.has(sourceName)),
    })
  }
  return [...merged.values()]
}

export function deduplicateVocabulary(records: VocabularyImportRecord[]): { records: MergedVocabularyRecord[]; duplicateRows: number } {
  const words = new Map<string, MergedVocabularyRecord>()
  let duplicateRows = 0
  for (const record of records) {
    const lemma = normalizeLemma(record.lemma)
    const current = words.get(lemma)
    const source: ImportSource = {
      sourceName: record.sourceName,
      sourceGroup: record.sourceGroup,
      sourceRank: record.sourceRank,
      isHighPriority: record.isHighPriority,
    }
    if (current) {
      duplicateRows += 1
      current.partOfSpeech ??= record.partOfSpeech
      current.definitionEn ??= record.definitionEn
      current.definitionZh ??= record.definitionZh
      current.ipa ??= record.ipa
      current.exampleSentence ??= record.exampleSentence
      current.sources = mergeSources([...current.sources, source])
    } else {
      words.set(lemma, {
        lemma,
        partOfSpeech: record.partOfSpeech,
        definitionEn: record.definitionEn,
        definitionZh: record.definitionZh,
        ipa: record.ipa,
        exampleSentence: record.exampleSentence,
        sources: mergeSources([source]),
      })
    }
  }
  return { records: [...words.values()], duplicateRows }
}

export function parseVocabularyCsv(csv: string): ParsedVocabularyImport {
  const result = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() })
  if (result.errors.length > 0) {
    const first = result.errors[0]
    throw new Error(`CSV row ${Number(first?.row ?? 0) + 2}: ${first?.message ?? 'invalid CSV'}`)
  }
  const records = result.data.map((row, index): VocabularyImportRecord => {
    const parsed = csvRowSchema.safeParse(row)
    if (!parsed.success) throw new Error(`CSV row ${index + 2}: ${parsed.error.issues[0]?.message ?? 'invalid data'}`)
    const value = parsed.data
    const sourceName = normalizeSourceName(value.source_name)
    return {
      lemma: normalizeLemma(value.lemma),
      partOfSpeech: value.part_of_speech,
      definitionEn: value.definition_en,
      definitionZh: value.definition_zh,
      ipa: value.ipa,
      exampleSentence: value.example_sentence,
      sourceName,
      sourceGroup: value.source_group,
      sourceRank: value.source_rank,
      isHighPriority: value.is_high_priority ?? defaultHighPrioritySources.has(sourceName),
    }
  })
  return { ...deduplicateVocabulary(records) }
}
