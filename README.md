# oCIS Field Guide

**Visual, verified walkthroughs of [ownCloud Infinite Scale](https://github.com/owncloud/ocis) Web.**
Every step is a screenshot from a real end-to-end test — captured, not mocked — so the
documentation can never drift from the actual product.

🔗 **Live:** https://dj4oc.github.io/ocis-field-guide/

---

## The idea

ownCloud Web has a large Playwright end-to-end suite. Those tests already *drive the real UI* —
they just throw the screenshots away. This project keeps them: each test becomes a
step-by-step visual tutorial, and the whole catalogue is meant to be **regenerated on every
full CI run**, so the guide is always in lockstep with the shipping product.

This repo is the **flagship example**: one walkthrough (*Searching your files*), captured against
oCIS 8.0.1 Community / Web UI 12.3.2, with the UX and data contract that the full database will use.

## How it works

A tiny static site (no build step — vanilla HTML/CSS/JS), so GitHub Pages can serve it directly
and CI can regenerate it by rewriting one JSON file and dropping in screenshots.

```
index.html        page shell + fonts
styles.css        the design system
app.js            hash-router + renderer (reads tutorials.json)
tutorials.json    ← the data the CI pipeline regenerates
assets/<id>/*.png ← screenshots captured during the e2e run
```

### Data contract (`tutorials.json`)

```jsonc
{
  "meta": { "brand", "tagline", "ocisVersion", "webUiVersion", "updated", "repo" },
  "tutorials": [
    {
      "id": "search",                         // → route #/search
      "category": "Search",
      "title": "Searching your files",
      "summary": "…",
      "source": "owncloud/web · tests/e2e/specs/search/search.spec.ts",
      "thumb": "assets/search/03-…png",
      "steps": [
        { "img": "assets/search/01-…png", "title": "…", "caption": "…" }
        // caption may contain inline <mark> <code> <kbd> <em> <strong>
      ]
    }
  ],
  "upcoming": [ { "category": "Sharing", "title": "…" } ]   // ghost cards
}
```

### Adding a walkthrough

1. During the e2e run, capture an ordered set of screenshots into `assets/<id>/`.
2. Append a `tutorials[]` entry pointing at them, with a title + caption per step.
3. Commit. The site renders it automatically — no code changes.

## The intended CI loop (next step, not built yet)

```
full e2e run ──▶ capture step screenshots ──▶ regenerate tutorials.json
            └──▶ commit assets/ + tutorials.json ──▶ GitHub Pages redeploys
```

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(Serve over HTTP — `app.js` fetches `tutorials.json`, which the `file://` protocol blocks.)

---

*Screenshots captured with the Playwright MCP browser driving a live `ocis_full` deployment.
Tutorial content is for end users; no test fixtures or internal identifiers are exposed.*
