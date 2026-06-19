import { test } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { login } from './support/oc'
import { tours, Tour } from './tours'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const assetsRoot = path.join(repoRoot, 'assets')

const shotName = (index: number, shot: string) => `${String(index + 1).padStart(2, '0')}-${shot}.png`
const imgPath = (tour: Tour, index: number) => `assets/${tour.id}/${shotName(index, tour.steps[index].shot)}`

// Capture each tour: drive the UI step by step and screenshot the resulting state.
for (const tour of tours) {
  test(`capture: ${tour.id}`, async ({ page }) => {
    await login(page)
    const dir = path.join(assetsRoot, tour.id)
    fs.mkdirSync(dir, { recursive: true })
    for (let i = 0; i < tour.steps.length; i++) {
      const step = tour.steps[i]
      await step.run(page)
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(dir, shotName(i, step.shot)) })
    }
  })
}

// After capturing, regenerate the Field Guide data (tutorials.json + the English
// source strings) from the tour metadata, but only for tours whose screenshots
// were all produced — so a failed capture never publishes a broken walkthrough.
test.afterAll(() => {
  const captured = tours.filter((tour) =>
    tour.steps.every((_, i) => fs.existsSync(path.join(repoRoot, imgPath(tour, i))))
  )
  if (!captured.length) {
    console.warn('[capture] no fully-captured tours; skipping Field Guide regeneration')
    return
  }

  // tutorials.json (language-neutral structure). The captured doc tours lead the
  // catalog, in their tours.ts definition order; everything else keeps its order.
  const tutorialsFile = path.join(repoRoot, 'tutorials.json')
  const tutorials = JSON.parse(fs.readFileSync(tutorialsFile, 'utf8'))
  const capturedIds = new Set(captured.map((t) => t.id))
  const entries = captured.map((tour) => ({
    id: tour.id,
    source: tour.source,
    thumb: imgPath(tour, 0),
    steps: tour.steps.map((_, i) => ({ img: imgPath(tour, i) }))
  }))
  tutorials.tutorials = [
    ...entries,
    ...tutorials.tutorials.filter((t: { id: string }) => !capturedIds.has(t.id))
  ]
  fs.writeFileSync(tutorialsFile, JSON.stringify(tutorials, null, 2) + '\n')

  // lang/en.json (English source text)
  const enFile = path.join(repoRoot, 'lang', 'en.json')
  const en = JSON.parse(fs.readFileSync(enFile, 'utf8'))
  for (const tour of captured) {
    en.content[tour.id] = {
      category: tour.category,
      title: tour.title,
      summary: tour.summary,
      steps: tour.steps.map((s) => ({ title: s.title, caption: s.caption }))
    }
  }
  fs.writeFileSync(enFile, JSON.stringify(en, null, 2) + '\n')

  console.log(`[capture] regenerated Field Guide for: ${captured.map((t) => t.id).join(', ')}`)
})
