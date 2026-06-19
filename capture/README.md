# Field Guide capture harness

Automates the ownCloud Web end-user flows from the official documentation
([Web for users](https://doc.owncloud.com/webui/latest/owncloud_web/web_for_users.html))
and (re)generates Field Guide walkthroughs from **live** screenshots, so the guide never
drifts from the product.

Each "tour" in [`tours.ts`](./tours.ts) is one walkthrough: ordered steps with a title,
caption (the English source text) and a `run` action that drives the UI into the state to
capture. Running the harness screenshots every step into `../assets/<tour-id>/NN-<shot>.png`
and upserts the tour into `../tutorials.json` and `../lang/en.json`.

## Run

```bash
cd capture
npm install
npx playwright install chromium

# Point at a live oCIS instance (defaults shown):
OCIS_URL=https://localhost:9200 OCIS_USER=admin OCIS_PASSWORD=admin npm run capture
```

The instance should have a normal user session available (the demo `admin/admin` works) and,
for steps that show files, at least one file in the personal space.

Only tours whose screenshots were all produced are written back, so a failed capture never
publishes a broken walkthrough.

## Add a tour

Append an entry to `tours.ts` with `id`, `category`, `title`, `summary`, and `steps`
(each `{ shot, title, caption, run }`), then run the capture. No site code changes are
needed — the renderer picks up `tutorials.json`.

## Translations

The harness regenerates the **English** source. Other languages
(`lang/{de,es,nl,fr,ja}.json`) are translated separately; until a new tour is translated the
site falls back to English for it.
