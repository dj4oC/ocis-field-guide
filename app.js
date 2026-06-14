/* oCIS Field Guide — data-driven renderer + hash router.
   CI regenerates tutorials.json + assets/; this file renders it. */

const main = document.getElementById('main');
const buildBadge = document.getElementById('buildBadge');
const footerMeta = document.getElementById('footerMeta');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const sep = ' <span class="sep">·</span> ';
const lockIcon = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg>';

let DATA = null;

fetch('tutorials.json')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => {
    DATA = data;
    const m = data.meta;
    buildBadge.innerHTML = `oCIS <b>${esc(m.ocisVersion)}</b>${sep}Web <b>${esc(m.webUiVersion)}</b><br>captured ${esc(m.updated)}`;
    footerMeta.innerHTML =
      `Captured against ownCloud Infinite Scale ${esc(m.ocisVersion)}${sep}Web UI ${esc(m.webUiVersion)}` +
      `<br><a href="${esc(m.repo)}">source on GitHub</a>${sep}<a href="https://owncloud.com">owncloud.com</a>`;
    route();
  })
  .catch((e) => {
    main.innerHTML = `<div class="wrap"><p class="loading">Could not load tutorials.json (${esc(e.message)}).<br>Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>).</p></div>`;
  });

window.addEventListener('hashchange', route);

function route() {
  if (!DATA) return;
  const id = (location.hash.replace(/^#\/?/, '') || '').trim();
  const tut = DATA.tutorials.find((t) => t.id === id);
  window.scrollTo(0, 0);
  if (tut) renderTutorial(tut); else renderCatalog();
}

/* ---------- catalog ---------- */
function renderCatalog() {
  const m = DATA.meta;
  const cards = DATA.tutorials.map((t) => `
    <a class="card load d3" href="#/${esc(t.id)}">
      <div class="card__thumb"><img src="${esc(t.thumb)}" alt="" loading="lazy"></div>
      <div class="card__body">
        <span class="tag">${esc(t.category)}</span>
        <h3 class="card__title">${esc(t.title)}</h3>
        <p class="card__summary">${esc(t.summary)}</p>
        <div class="card__foot">
          <span>${t.steps.length} steps</span>
          <span class="card__cta">View walkthrough &rarr;</span>
        </div>
      </div>
    </a>`).join('');

  const ghosts = (DATA.upcoming || []).map((g) => `
    <div class="card card--ghost load d4">
      <div class="ghost__inner">
        <span class="tag">${esc(g.category)}</span>
        <h3 class="card__title">${esc(g.title)}</h3>
        <span class="ghost__soon">◷ from an upcoming e2e spec</span>
      </div>
    </div>`).join('');

  main.innerHTML = `
    <section class="hero">
      <div class="wrap hero__inner">
        <p class="kicker load d1">Generated from end-to-end tests</p>
        <h1 class="load d2">A field guide to <span class="u">ownCloud&nbsp;Web</span>.</h1>
        <p class="hero__lede load d3">${esc(m.tagline)}</p>
        <p class="hero__short load d3">open source. <b>original.</b> yours.</p>
        <div class="hero__strip load d4">
          <span><span class="live"></span> <b>${DATA.tutorials.length}</b>&nbsp;live walkthrough${DATA.tutorials.length === 1 ? '' : 's'}</span>
          <span>oCIS <b>${esc(m.ocisVersion)}</b></span>
          <span>Web&nbsp;UI <b>${esc(m.webUiVersion)}</b></span>
          <span>updated <b>${esc(m.updated)}</b></span>
        </div>
      </div>
    </section>
    <section class="catalog">
      <div class="wrap">
        <p class="section-label">Walkthroughs</p>
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
      <a class="back load d1" href="#/">&larr; All walkthroughs</a>
      <p class="kicker load d1">${esc(t.category)}</p>
      <h1 class="load d2">${esc(t.title)}</h1>
      <p class="tut-head__summary load d3">${esc(t.summary)}</p>
      <div class="tut-head__meta load d4">
        <span><b>${t.steps.length}</b> steps</span>
        <span>oCIS <b>${esc(DATA.meta.ocisVersion)}</b></span>
        <span>captured <b>${esc(DATA.meta.updated)}</b></span>
      </div>
    </section>
    <section class="wrap tut-body">
      <nav class="rail" aria-label="Steps"><ol>${rail}</ol></nav>
      <div class="steps">${steps}</div>
    </section>
    <section class="wrap tut-foot">
      <p class="tut-foot__src">Generated from <b>${esc(t.source)}</b> and re-captured on every full CI run.</p>
      <a class="btn" href="#/">&larr; Back to all walkthroughs</a>
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
