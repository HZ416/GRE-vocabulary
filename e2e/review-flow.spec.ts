import { expect, test } from '@playwright/test'

const vocabularyCsv = `lemma,part_of_speech,definition_en,definition_zh,ipa,example_sentence,source_name
equivocal,adjective,open to more than one interpretation,模棱两可的,/ɪˈkwɪvəkəl/,His answer was deliberately equivocal.,gregmat
laconic,adjective,using very few words,言简意赅的,/ləˈkɒnɪk/,She gave a laconic reply.,barrons`

test('imports vocabulary and completes a keyboard-driven review', async ({ page }) => {
  await page.goto('/vocabulary')
  await expect(page.getByRole('heading', { name: 'Import your first words' })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-vocabulary.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(vocabularyCsv),
  })
  await expect(page.getByText('2 added, 0 updated, 0 duplicate rows merged')).toBeVisible()
  await expect(page.getByRole('link', { name: 'equivocal' })).toBeVisible()

  await page.getByRole('link', { name: 'Study' }).click()
  await expect(page.getByText('Today’s queue')).toBeVisible()
  await expect(page.locator('.study-header strong')).toHaveText('2')
  await expect(page.getByRole('heading', { name: 'equivocal' })).toBeVisible()

  const favorite = page.getByRole('button', { name: 'Toggle favorite' })
  await favorite.click()
  await expect(favorite).toHaveClass(/active/)

  await page.keyboard.press('Space')
  await expect(page.getByRole('heading', { name: 'open to more than one interpretation' })).toBeVisible()
  await expect(page.getByText('模棱两可的')).toBeVisible()
  await page.keyboard.press('3')

  await expect(page.locator('.study-header strong')).toHaveText('1')
  await expect(page.getByRole('heading', { name: 'laconic' })).toBeVisible()

  await page.getByRole('link', { name: 'Favorites' }).click()
  await expect(page.getByRole('link', { name: 'equivocal' })).toBeVisible()

  await page.getByRole('link', { name: 'Statistics' }).click()
  await expect(page.getByText('Reviews today').locator('..').getByRole('strong')).toHaveText('1')

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByText('1 of 2 words introduced')).toBeVisible()
})
