/* oCIS Field Guide, data-driven renderer + hash router + i18n.
   Base data: tutorials.json (language-neutral). Text: lang/<code>.json. */

const main = document.getElementById('main');
const buildBadge = document.getElementById('buildBadge');
const footerMeta = document.getElementById('footerMeta');
const footerLede = document.getElementById('footerLede');
const langMount = document.getElementById('langSwitch');

const STORE = 'fg-lang';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const sep = ' <span class="sep">·</span> ';
const lockIcon = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg>';
const globeIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>';

let BASE = null;
let L = null;
let EN = null;
let LANG = 'en';

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : ''));
const ui = (key, vars) => { const s = (L && L.ui && L.ui[key] != null) ? L.ui[key] : key; return vars ? fill(s, vars) : s; };

init();

async function init() {
  try {
    BASE = await (await fetch('tutorials.json')).json();
    LANG = pickLang();
    L = await loadLangMerged(LANG);
    buildSwitcher();
    applyChrome();
    route();
    window.addEventListener('hashchange', route);
  } catch (e) {
    main.innerHTML = `<div class="wrap"><p class="loading">${esc((L && L.ui && L.ui.loadError) || 'Could not load content. Serve this folder over HTTP.')} (${esc(e.message)})</p></div>`;
  }
}

function loadLang(code) {
  return fetch('lang/' + code + '.json').then((r) => { if (!r.ok) throw new Error('lang ' + code); return r.json(); });
}

/* Load a language, falling back to English (per id) for any text not yet translated,
   so a partially-translated tutorial degrades to English instead of breaking the page. */
async function loadLangMerged(code) {
  const lang = await loadLang(code);
  if (code !== 'en') {
    if (!EN) EN = await loadLang('en');
    lang.ui = { ...EN.ui, ...(lang.ui || {}) };
    lang.content = { ...EN.content, ...(lang.content || {}) };
    lang.upcoming = { ...(EN.upcoming || {}), ...(lang.upcoming || {}) };
  }
  return lang;
}

function pickLang() {
  const avail = BASE.languages.map((l) => l.code);
  const stored = localStorage.getItem(STORE);
  if (stored && avail.includes(stored)) return stored;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return avail.includes(nav) ? nav : 'en';
}

function buildSwitcher() {
  const opts = BASE.languages.map((l) => `<option value="${l.code}"${l.code === LANG ? ' selected' : ''}>${esc(l.label)}</option>`).join('');
  langMount.innerHTML = `<span class="lang__globe" aria-hidden="true">${globeIcon}</span><select id="langSelect" aria-label="Language">${opts}</select>`;
  document.getElementById('langSelect').addEventListener('change', async (e) => {
    LANG = e.target.value;
    localStorage.setItem(STORE, LANG);
    L = await loadLangMerged(LANG);
    applyChrome();
    route();
  });
}

function applyChrome() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = (L.ui.dir || 'ltr');
  const m = BASE.meta;
  buildBadge.innerHTML = `oCIS <b>${esc(m.ocisVersion)}</b>${sep}${esc(ui('webUiLabel'))} <b>${esc(m.webUiVersion)}</b><br>${esc(ui('capturedLabel'))} ${esc(m.updated)}`;
  footerLede.textContent = ui('footerLede');
  footerMeta.innerHTML = `${esc(ui('footerMeta', { ocis: m.ocisVersion, web: m.webUiVersion }))}<br><a href="${esc(m.repo)}">${esc(ui('sourceLink'))}</a>${sep}<a href="https://owncloud.com">owncloud.com</a>`;
}

/* merge neutral base + translated text for one tutorial */
function tut(id) {
  const base = BASE.tutorials.find((t) => t.id === id);
  const c = L.content[id];
  if (!base || !c) return null;
  return {
    id, source: base.source, thumb: base.thumb, category: c.category, title: c.title, summary: c.summary,
    steps: base.steps.map((s, i) => ({ img: s.img, title: c.steps[i].title, caption: c.steps[i].caption }))
  };
}

function route() {
  if (!BASE || !L) return;
  const id = (location.hash.replace(/^#\/?/, '') || '').trim();
  const t = id ? tut(id) : null;
  window.scrollTo(0, 0);
  if (t) renderTutorial(t); else renderCatalog();
}

/* ---------- catalog ---------- */
function renderCatalog() {
  const cards = BASE.tutorials.map((bt) => {
    const t = tut(bt.id);
    return `
    <a class="card load d3" href="#/${esc(t.id)}">
      <div class="card__thumb"><img src="${esc(t.thumb)}" alt="" loading="lazy"></div>
      <div class="card__body">
        <span class="tag">${esc(t.category)}</span>
        <h3 class="card__title">${esc(t.title)}</h3>
        <p class="card__summary">${esc(t.summary)}</p>
        <div class="card__foot">
          <span>${esc(ui('stepsCount', { n: t.steps.length }))}</span>
          <span class="card__cta">${esc(ui('viewWalkthrough'))} &rarr;</span>
        </div>
      </div>
    </a>`;
  }).join('');

  const ghosts = (BASE.upcoming || []).map((g) => {
    const u = (L.upcoming && L.upcoming[g.id]) || { category: g.id, title: '' };
    return `
    <div class="card card--ghost load d4">
      <div class="ghost__inner">
        <span class="tag">${esc(u.category)}</span>
        <h3 class="card__title">${esc(u.title)}</h3>
        <span class="ghost__soon">◷ ${esc(ui('comingSoon'))}</span>
      </div>
    </div>`;
  }).join('');

  const m = BASE.meta;
  main.innerHTML = `
    <section class="hero">
      <div class="wrap hero__inner">
        <p class="kicker load d1">${esc(ui('kicker'))}</p>
        <h1 class="load d2">${ui('heroTitle')}</h1>
        <p class="hero__lede load d3">${esc(ui('lede'))}</p>
        <p class="hero__short load d3">open source. <b>original.</b> yours.</p>
        <div class="hero__strip load d4">
          <span><span class="live"></span> ${ui('liveWalkthroughs', { n: '<b>' + BASE.tutorials.length + '</b>' })}</span>
          <span>oCIS <b>${esc(m.ocisVersion)}</b></span>
          <span>${esc(ui('webUiLabel'))} <b>${esc(m.webUiVersion)}</b></span>
          <span>${esc(ui('updatedLabel'))} <b>${esc(m.updated)}</b></span>
        </div>
      </div>
    </section>
    <section class="catalog">
      <div class="wrap">
        <p class="section-label">${esc(ui('walkthroughs'))}</p>
        <div class="grid">${cards}${ghosts}</div>
      </div>
    </section>`;
}

/* ---------- walkthrough ---------- */
function renderTutorial(t) {
  const steps = t.steps.map((s, i) => `
    <article class="step reveal" id="step-${i + 1}" data-step="${i + 1}">
      <div class="step__head">
        <span class="step__num">${pad(i + 1)}</span>
        <h2 class="step__title">${esc(s.title)}</h2>
      </div>
      <p class="step__caption">${s.caption}</p>
      <figure class="frame">
        <div class="frame__bar">
          <span class="frame__dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="frame__url">${lockIcon} ocis.owncloud.test</span>
        </div>
        <img src="${esc(s.img)}" alt="${esc(s.title)}" loading="lazy">
      </figure>
    </article>`).join('');

  const rail = t.steps.map((s, i) => `
    <li data-target="step-${i + 1}"><a href="#step-${i + 1}">
      <span class="num">${pad(i + 1)}</span><span class="txt">${esc(s.title)}</span>
    </a></li>`).join('');

  main.innerHTML = `
    <section class="wrap tut-head">
      <a class="back load d1" href="#/">&larr; ${esc(ui('allWalkthroughs'))}</a>
      <p class="kicker load d1">${esc(t.category)}</p>
      <h1 class="load d2">${esc(t.title)}</h1>
      <p class="tut-head__summary load d3">${esc(t.summary)}</p>
      <div class="tut-head__meta load d4">
        <span>${ui('stepsCount', { n: '<b>' + t.steps.length + '</b>' })}</span>
        <span>oCIS <b>${esc(BASE.meta.ocisVersion)}</b></span>
        <span>${esc(ui('capturedLabel'))} <b>${esc(BASE.meta.updated)}</b></span>
      </div>
    </section>
    <section class="wrap tut-body">
      <nav class="rail" aria-label="${esc(ui('walkthroughs'))}"><ol>${rail}</ol></nav>
      <div class="steps">${steps}</div>
    </section>
    <section class="wrap tut-foot">
      <p class="tut-foot__src">${ui('sourceNote', { source: '<b>' + esc(t.source) + '</b>' })}</p>
      <a class="btn" href="#/">&larr; ${esc(ui('backToAll'))}</a>
    </section>`;

  setupReveal();
  setupRail();
}

/* ---------- scroll behaviours ---------- */
function setupReveal() {
  const els = main.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  els.forEach((el) => io.observe(el));
}

function setupRail() {
  const railItems = main.querySelectorAll('.rail li');
  const steps = main.querySelectorAll('.step');
  if (!railItems.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      railItems.forEach((li) => li.classList.toggle('active', li.dataset.target === e.target.id));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));
}
