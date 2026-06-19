import { Page, expect } from '@playwright/test'
import { dismissOverlays } from './support/oc'

/**
 * A single captured step: `run` drives the UI into the state to capture, and
 * the runner screenshots it as `assets/<tour.id>/NN-<shot>.png`. `title` and
 * `caption` become the Field Guide step text (English source).
 */
export interface Step {
  shot: string
  title: string
  caption: string
  run: (page: Page) => Promise<void>
}

export interface Tour {
  id: string
  source: string
  category: string
  title: string
  summary: string
  steps: Step[]
}

/**
 * Tours derived from the ownCloud Web end-user documentation
 * (doc.owncloud.com/webui/latest/owncloud_web/web_for_users.html).
 *
 * Each tour is one Field Guide walkthrough. Add a tour here, run `npm run
 * capture`, and the screenshots plus the English walkthrough text are produced
 * from the live UI. New tours need only data + the `run` actions below.
 */
export const tours: Tour[] = [
  {
    id: 'webtour',
    source: 'doc.owncloud.com · ownCloud Web for users',
    category: 'Getting started',
    title: 'Getting around ownCloud Web',
    summary:
      'A tour of the ownCloud Web interface for everyday use: where your files live, how to switch apps, search everything, and find your account, storage and appearance settings. Re-captured automatically from a live oCIS instance so it never drifts from the product.',
    steps: [
      {
        shot: 'files',
        title: 'Your files',
        caption:
          'After signing in you land in <strong>Personal</strong>, your private space. The left sidebar switches between <strong>Personal</strong>, <strong>Shares</strong>, <strong>Spaces</strong> and <strong>Deleted files</strong>; the main area lists whatever is in the current location.',
        run: async (page) => {
          await expect(page.getByRole('heading', { level: 1, name: 'Personal' })).toBeVisible()
        }
      },
      {
        shot: 'app-switcher',
        title: 'Switch applications',
        caption:
          'The <strong>application switcher</strong> in the top-left corner jumps between Files and the other apps enabled for you, such as the text editor, admin settings or installed extensions.',
        run: async (page) => {
          await page.getByRole('button', { name: 'Application Switcher' }).click()
          await page.waitForTimeout(400)
        }
      },
      {
        shot: 'search',
        title: 'Search everything',
        caption:
          'The <strong>search bar</strong> at the top finds files by name across everything you can access, and by their content when full-text search is enabled. Filters let you narrow a search to a space or file type.',
        run: async (page) => {
          await dismissOverlays(page)
          const search = page.getByRole('combobox', { name: 'Enter search term' })
          await search.click()
          await search.fill('elmo')
          await page.waitForTimeout(600)
        }
      },
      {
        shot: 'account',
        title: 'Your account and storage',
        caption:
          'The <strong>account menu</strong> in the top-right shows how much storage you have used, opens your <strong>Preferences</strong>, and lets you log out.',
        run: async (page) => {
          const search = page.getByRole('combobox', { name: 'Enter search term' })
          await search.fill('')
          await dismissOverlays(page)
          await page.getByRole('button', { name: 'My Account' }).click()
          await expect(page.getByRole('link', { name: 'Preferences' })).toBeVisible()
        }
      },
      {
        shot: 'preferences',
        title: 'Preferences and appearance',
        caption:
          'Open <strong>Preferences</strong> to set your language, switch between light and dark mode, and review your account details.',
        run: async (page) => {
          await page.goto('/account')
          await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible({
            timeout: 30_000
          })
          await page.waitForTimeout(500)
        }
      }
    ]
  }
]
