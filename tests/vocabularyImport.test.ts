import { describe, expect, it } from 'vitest'
import {
  calculatePriorityScore,
  deduplicateVocabulary,
  mergeSources,
  normalizeLemma,
  parseVocabularyCsv,
  type VocabularyImportRecord,
} from '../src/import/vocabularyImport'

describe('vocabulary import pipeline', () => {
  it('normalizes Unicode, capitalization, apostrophes, and whitespace', () => {
    expect(normalizeLemma('  Non\u2011Committal  ')).toBe('non‐committal')
    expect(normalizeLemma('  DON’T   ')).toBe("don't")
  })

  it('deduplicates normalized lemmas and keeps complementary metadata', () => {
    const records: VocabularyImportRecord[] = [
      { lemma: ' Equivocal ', definitionEn: 'ambiguous', sourceName: 'GregMat', isHighPriority: true },
      { lemma: 'EQUIVOCAL', definitionZh: '模棱两可的', sourceName: 'PowerScore', isHighPriority: true },
    ]
    const result = deduplicateVocabulary(records)
    expect(result.duplicateRows).toBe(1)
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({ lemma: 'equivocal', definitionEn: 'ambiguous', definitionZh: '模棱两可的' })
    expect(result.records[0]?.sources).toHaveLength(2)
  })

  it('merges repeated sources and retains the strongest source metadata', () => {
    const result = mergeSources([
      { sourceName: 'Magoosh Common', isHighPriority: false },
      { sourceName: 'magoosh-common', isHighPriority: true, sourceRank: 3 },
    ])
    expect(result).toEqual([{ sourceName: 'magoosh_common', sourceGroup: undefined, sourceRank: 3, isHighPriority: true }])
  })

  it('scores each unique source and high-priority source once', () => {
    expect(calculatePriorityScore([
      { sourceName: 'gregmat', isHighPriority: true },
      { sourceName: 'gregmat', isHighPriority: true },
      { sourceName: 'barrons', isHighPriority: false },
    ])).toBe(8)
  })

  it('parses the minimum CSV format and reports duplicate rows', () => {
    const parsed = parseVocabularyCsv(`lemma,part_of_speech,definition_en,definition_zh,ipa,example_sentence,source_name
Equivocal,adj,ambiguous,模棱两可的,/test/,Example,gregmat
equivocal,adj,,,,,powerscore`)
    expect(parsed.records).toHaveLength(1)
    expect(parsed.duplicateRows).toBe(1)
  })
})
