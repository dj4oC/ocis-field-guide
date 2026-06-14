# oCIS Field Guide

**Visual, verified walkthroughs of [ownCloud Infinite Scale](https://github.com/owncloud/ocis) Web.**
Every step is a screenshot from a real end-to-end test, captured, not mocked, so the
documentation can never drift from the actual product.

🔗 **Live:** https://dj4oc.github.io/ocis-field-guide/

Available in English, German, Spanish, Dutch, French and Japanese.

---

## The idea

ownCloud Web has a large Playwright end-to-end suite. Those tests already drive the real UI,
they just throw the screenshots away. This project keeps them: each test becomes a
step-by-step visual tutorial, and the whole catalogue is meant to be **regenerated on every
full CI run**, so the guide stays in lockstep with the shipping product.

Captured against oCIS 8.0.1 Community / Web UI 12.3.2.

## How it works

A tiny static site (no build step, vanilla HTML/CSS/JS), so GitHub Pages can serve it directly
and CI can regenerate it by rewriting JSON and dropping in screenshots.

```
index.html        page shell + fonts (Source Sans 3, Noto Sans JP)
styles.css        the ownCloud design system
app.js            hash-router + renderer + language switcher
tutorials.json    language-neutral data: ids, image paths, versions   <- CI regenerates
lang/<code>.json  UI strings + tutorial text per language              <- translations
assets/<id>/*.png screenshots captured during the e2e run
assets/brand/     the ownCloud logo
```

The data is split so screenshots and structure live once, and only text varies per language.

### `tutorials.json` (neutral)

```jsonc
{
  "meta": { "ocisVersion", "webUiVersion", "updated", "repo" },
  "languages": [ { "code": "en", "label": "English" }, ... ],
  "tutorials": [
    { "id": "search", "source": "...", "thumb": "assets/search/...png",
      "steps": [ { "img": "assets/search/01-...png" }, ... ] }
  ],
  "upcoming": [ { "id": "publiclinks" }, ... ]
}
```

### `lang/<code>.json` (text)

```jsonc
{
  "ui": { "kicker", "heroTitle", "viewWalkthrough", ... },
  "content": {
    "search": { "category", "title", "summary",
                "steps": [ { "title", "caption" }, ... ] }
  },
  "upcoming": { "publiclinks": { "category", "title" } }
}
```

`caption` may contain inline `<mark> <code> <kbd> <strong>`. The renderer merges each
neutral tutorial with its translated text by `id` and step index.

### Adding a walkthrough

1. During the e2e run, capture an ordered set of screenshots into `assets/<id>/`.
2. Add a neutral `tutorials[]` entry in `tutorials.json`.
3. Add the text under `content.<id>` in each `lang/<code>.json`.
4. Commit. The site renders it automatically, no code changes.

### Localised screenshots (later)

Today every language shares the same (English UI) screenshots. When localised captures are
ready, a step in a `lang/<code>.json` file can override its `img`, so each language can point
at its own screenshots without changing the structure.

## The intended CI loop (next step, not built yet)

```
full e2e run  ->  capture step screenshots  ->  regenerate tutorials.json + lang files
              ->  commit assets/ + json     ->  GitHub Pages redeploys
```

See [`INTEGRATION.md`](./INTEGRATION.md) for a concrete proposal of what owncloud/web would
add to wire this into its release process (capture step, story specs, generator, CI job).

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Serve over HTTP, since `app.js` fetches JSON which the `file://` protocol blocks.

---

*Screenshots captured with the Playwright MCP browser driving a live `ocis_full` deployment.
Tutorial content is for end users; no test fixtures or internal identifiers are exposed.*
