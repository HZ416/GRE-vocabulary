import { describe, expect, it } from 'vitest'
import { translate } from '../src/i18n'

describe('interface translations', () => {
  it('translates Chinese copy and interpolates dynamic values', () => {
    expect(translate('zh', 'Dashboard')).toBe('概览')
    expect(translate('zh', '{count} days', { count: 7 })).toBe('7 天')
  })

  it('keeps English copy and unknown data values intact', () => {
    expect(translate('en', 'Settings')).toBe('Settings')
    expect(translate('zh', 'custom-tier')).toBe('custom-tier')
  })
})
