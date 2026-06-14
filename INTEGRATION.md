# Integrating the Field Guide into the owncloud/web release process

**Audience:** owncloud/web maintainers and release engineers.
**Goal:** turn the existing Playwright end-to-end suite into a living, multilingual
tutorial database that is regenerated automatically on every release, so user-facing
documentation can never drift from the shipping UI.

This document describes what owncloud/web would need to add. It assumes the static site
in this repo (`index.html`, `styles.css`, `app.js`, the `tutorials.json` + `lang/<code>.json`
data contract) as the rendering target. See `README.md` for the data contract.

---

## TL;DR

Today the walkthroughs in this repo were captured by hand. To make them generate
themselves, owncloud/web needs four things:

1. A **capture step** that screenshots the page and records a caption, callable from specs.
2. A small set of **tutorial "story" specs** (or annotations on existing specs) that say
   which steps are tutorial steps and what their captions are.
3. A **generator** that turns the captured artifacts into `tutorials.json`,
   `lang/en.json`, and `assets/<id>/*.png`.
4. A **CI job** that runs the tutorial specs against the standard oCIS backend on release,
   regenerates the content, and publishes it.

Nothing about the product changes. This rides on top of the e2e suite that already exists.

---

## Why this is a good fit for owncloud/web

The e2e suite already drives the real UI through structured step functions and then throws
the screenshots away. Two properties make it ideal as a tutorial source:

- **Specs are written as readable steps.** Each spec composes `ui.*` and `api.*` step
  functions and carries Gherkin-style comments that already describe each action in plain
  language, for example:

  ```ts
  // When "Alice" shares the following resource using the sidebar panel
  await ui.userSharesResources({ world, stepUser: 'Alice', actionType: fileAction.sideBarPanel, shares: [ ... ] })
  ```

  Those comments are most of a caption already.

- **The UI is real.** The suite runs against a live oCIS, so a screenshot taken mid-test is
  a faithful capture of the shipping product at that version.

---

## How the suite is structured today (for context)

- Specs live in `tests/e2e/specs/<area>/*.spec.ts` and import:
  - `test` from `tests/e2e/environment/test` (a `world` fixture per scenario),
  - `api` from `tests/e2e/steps/api`,
  - `ui` from `tests/e2e/steps/ui`.
- `ui.*` steps drive the browser through page objects in `tests/e2e/support/objects/*`.
- Specs are tagged, for example `{ tag: '@predefined-users' }`.
- The Playwright config is `tests/e2e/playwright.config.ts`; the runner is
  `tests/e2e/run-e2e.sh`; CI runs it from `.github/workflows`.

The proposal adds to this without changing it.

---

## Phase 0: decide where the guide lives and how it publishes

Two options:

- **A. In-repo, GitHub Pages.** Keep the static site under `docs/field-guide/` in
  owncloud/web and publish it with the existing Pages setup. Simplest provenance, one repo.
- **B. Separate repo (like this one).** CI pushes generated content to a dedicated
  `field-guide` repo that serves Pages. Keeps the web repo clean and lets the guide have its
  own release cadence.

Recommendation: start with **A** (in-repo `docs/`), since it keeps capture and content in one
place and avoids cross-repo tokens.

Also decide the **publish trigger**: on every `master` push, on tagged releases only, or
nightly. Recommendation: on tagged releases, plus a manual `workflow_dispatch`.

---

## Phase 1: a capture step

Add one screenshot helper that specs can call at meaningful moments. It records an ordered
screenshot plus a caption for the current scenario.

```ts
// tests/e2e/steps/ui/tutorial.ts  (sketch)
import { World } from '../../environment/world'

type CaptureArgs = { world: World; stepUser: string; title: string; caption: string }

export const captureStep = async ({ world, stepUser, title, caption }: CaptureArgs): Promise<void> => {
  // Reuse the suite's existing actor/page accessor (see how other ui.* steps obtain the page).
  const { page } = world.actorsEnvironment.getActor({ key: stepUser })
  const tut = world.tutorial            // initialised in a fixture, see below
  const n = tut.steps.length + 1
  const file = `${tut.id}/${String(n).padStart(2, '0')}-${slug(title)}.png`
  await page.screenshot({ path: `${tut.outDir}/${file}` })
  tut.steps.push({ img: `assets/${file}`, title, caption })
}
```

A tiny fixture initialises `world.tutorial` for specs that opt in (tagged `@tutorial`) and
writes the per-tutorial step list to disk at the end of the scenario:

```ts
// in tests/e2e/environment/test.ts (sketch, only active for @tutorial specs)
test.beforeEach(async ({ world }, testInfo) => {
  if (!testInfo.tags.includes('@tutorial')) return
  world.tutorial = { id: tutorialIdFor(testInfo), outDir: process.env.TUTORIAL_OUT, steps: [] }
})
test.afterEach(async ({ world }, testInfo) => {
  if (!world.tutorial) return
  writeFileSync(`${world.tutorial.outDir}/${world.tutorial.id}.steps.json`,
    JSON.stringify(world.tutorial, null, 2))
})
```

No production code is touched. `captureStep` is just another `ui.*` step.

## Phase 2: tutorial "story" specs

Author a handful of short specs that compose existing steps and call `captureStep` where a
screenshot belongs. These double as real e2e tests, so they are covered by CI like any other
spec. Example mirroring the Search walkthrough in this repo:

```ts
// tests/e2e/specs/tutorials/search.tutorial.spec.ts  (sketch)
import { test } from '../../environment/test'
import * as api from '../../steps/api/api'
import * as ui from '../../steps/ui'

test.describe('tutorial: search', () => {
  test('Searching your files', { tag: '@tutorial' }, async ({ world }) => {
    await api.usersHaveBeenCreated({ world, stepUser: 'Admin', users: ['Alice'] })
    await api.userHasUploadedFilesInPersonalSpace({ world, stepUser: 'Alice', filesToUpload: [ /* fixtures */ ] })
    await ui.userLogsIn({ world, stepUser: 'Alice' })

    await ui.captureStep({ world, stepUser: 'Alice',
      title: 'Start from the search bar',
      caption: 'Wherever you are in ownCloud Web, the search bar sits at the very top.' })

    await ui.userSearchesGloballyWithFilter({ world, stepUser: 'Alice', keyword: 'report', filter: searchScope.allFiles })
    await ui.captureStep({ world, stepUser: 'Alice',
      title: 'It searches inside your files too',
      caption: "Results match on the file name and contents." })
    // ... more steps + captures
  })
})
```

Alternative if you prefer not to write captions inline: keep a sidecar
`search.tutorial.captions.json` keyed by step index, and have `captureStep` read titles and
captions from it. Either way the captions are version-controlled next to the spec.

## Phase 3: the generator

A small Node script collects every `*.steps.json` plus the screenshots and writes the data
contract this site consumes:

```
node tools/build-field-guide.mjs \
  --in artifacts/tutorials \      # *.steps.json + assets/<id>/*.png
  --out docs/field-guide          # tutorials.json + lang/en.json + assets/
```

It produces:

- `tutorials.json` (neutral): `meta` (oCIS and Web versions, date), `languages`, and one
  `tutorials[]` entry per story spec (`id`, `source` = spec path, `thumb`, `steps[].img`).
- `lang/en.json`: the `ui` strings (static, shipped with the generator) plus `content.<id>`
  built from each spec's titles and captions.
- `assets/<id>/*.png`: the screenshots.

Versions for `meta` come from the running backend (`/status.php` style) and the web
`package.json`.

## Phase 4: the CI job

Add a job to the e2e workflow (or a dedicated workflow). It reuses the same oCIS backend the
e2e suite already brings up.

```yaml
# .github/workflows/field-guide.yml  (sketch)
on:
  release: { types: [published] }
  workflow_dispatch:
jobs:
  field-guide:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: tests/e2e/run-e2e.sh   # bring up oCIS + web, same as e2e
      - run: pnpm playwright test --config=tests/e2e/ --grep @tutorial
        env: { TUTORIAL_OUT: artifacts/tutorials }
      - run: node tools/build-field-guide.mjs --in artifacts/tutorials --out docs/field-guide
      - uses: actions/upload-pages-artifact@v3
        with: { path: docs/field-guide }
      - uses: actions/deploy-pages@v4
```

If the guide lives in a separate repo (Phase 0 option B), replace the last two steps with a
commit and push to that repo using a deploy key or app token.

## Phase 5: translations

The `ui` strings and captions are English at authoring time. Other languages come from a
translation step, decoupled from capture:

- Reuse the project's existing localisation tooling (owncloud/web already localises the
  product via Transifex). Feed `lang/en.json` `content` strings through the same pipeline and
  write `lang/<code>.json`.
- Or seed translations with machine translation and have reviewers correct them.

Keep these strings **untranslated** in every language (brand-fixed): the tagline
`open source. original. yours.`, `a Kiteworks Company`, `Open Source. Original. Yours.`, and
on-screen UI labels referenced in captions while screenshots are English.

## Phase 6: localised screenshots (later)

Once the text pipeline is stable, capture per language by running the tutorial specs with the
web UI set to each locale (via the user language setting or a startup flag). The data contract
already supports this: a step in any `lang/<code>.json` may override its `img`, so a German run
writes `assets/de/<id>/*.png` and the German content points at them. No structural change.

---

## Decisions the team needs to make

- **Caption source:** inline in the spec (recommended), a sidecar JSON, or parsed from the
  existing Gherkin comments. Parsing comments is the least work to start but the most fragile.
- **Which flows become tutorials:** a curated set is better than every spec. Start with the
  highest-traffic user tasks.
- **Capture cadence in a step:** explicit `captureStep` calls (recommended, predictable) vs an
  automatic screenshot after every `ui.*` step (noisy, many near-duplicate frames).
- **Hosting:** in-repo Pages vs separate repo.
- **Versioning:** keep only the latest, or one guide per release.

## Non-goals

- This does not change product behaviour or the existing e2e assertions.
- It does not auto-translate the brand-fixed strings.
- Running the entire suite does not by itself produce tutorials; only `@tutorial` story specs
  that call `captureStep` do.

## Rough effort

- Phase 1 + 2 (capture step + a first story spec): about a day.
- Phase 3 (generator): about a day.
- Phase 4 (CI job + Pages): half a day to a day, mostly plumbing the existing e2e backend.
- Phases 5 and 6 (translations, localised images): incremental, after the loop is proven.

The result: open a tutorial, and every screenshot in it is a step from a test that passed on
the release you are reading about.
