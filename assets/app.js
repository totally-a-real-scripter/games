/* Game Stash — static game portal. Data: games.json (generated from UGS-Files + thumbnails). */
(() => {
'use strict';

const CONFIG = {
  brand: 'Game Stash',
  featuredCount: 5,     // hero: 1 big + 4 small
  picksCount: 18,       // "Today's picks" row
  rowSize: 18,
  pageSize: 60
};

const GENRES = [
  ['Action',           '⚡', '#ff6b6b'],
  ['Shooter',          '🎯', '#ff8f3d'],
  ['Racing',           '🏎️', '#ffc53d'],
  ['Sports',           '⚽', '#3ddc97'],
  ['Puzzle',           '🧩', '#4dc9ff'],
  ['Platformer',       '🍄', '#7c5cff'],
  ['Adventure & RPG',  '🗺️', '#b47cff'],
  ['Fighting',         '🥊', '#ff4d7e'],
  ['Horror',           '👻', '#8a8aa8'],
  ['Strategy & Defense','🏰', '#57c785'],
  ['Idle & Clicker',   '🍪', '#e0a458'],
  ['.io & Multiplayer','👥', '#4dd4c9'],
  ['Simulation',       '🏗️', '#6fa8ff'],
  ['Arcade',           '👾', '#ff7ae0'],
  ['Casual',           '🎈', '#9ad16f']
];
const PLATFORMS = [
  ['Web',   '🌐', '#4dc9ff', 'HTML5 games that run in any browser'],
  ['Flash', '💥', '#ff8f3d', 'Classic Flash games, revived with Ruffle'],
  ['Retro', '🕹️', '#b47cff', 'Console & arcade classics in an emulator']
];

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
const encPath = p => p.split('/').map(encodeURIComponent).join('/');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

let GAMES = [], BY_SLUG = new Map();
const app = $('#app');

/* ---------- seeded daily randomness ---------- */
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffled(arr, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function dailyFeatured() {
  const key = todayKey();
  // Hero pool: games with confident artwork, weighted toward popular titles.
  const pool = GAMES.filter(g => g.c === 'good' || g.pop);
  const pop = shuffled(GAMES.filter(g => g.pop), 'pop' + key);
  const rest = shuffled(pool.filter(g => !g.pop), 'feat' + key);
  const hero = [pop[0], ...rest.slice(0, CONFIG.featuredCount - 1)].filter(Boolean);
  const used = new Set(hero);
  const picks = shuffled(GAMES.filter(g => !used.has(g) && g.c !== 'check'), 'picks' + key).slice(0, CONFIG.picksCount);
  return { hero, picks };
}
function msToMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; }

/* ---------- favorites & recent ---------- */
const favs = new Set(store.get('gs:favs', []));
let recent = store.get('gs:recent', []);
function toggleFav(slug) { favs.has(slug) ? favs.delete(slug) : favs.add(slug); store.set('gs:favs', [...favs]); }
function pushRecent(slug) { recent = [slug, ...recent.filter(s => s !== slug)].slice(0, 40); store.set('gs:recent', recent); }
const fromSlugs = arr => arr.map(s => BY_SLUG.get(s)).filter(Boolean);

/* ---------- rendering helpers ---------- */
const iconPlay = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const iconHeart = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 4.5 6.6 4.5c2.1 0 3.4 1.1 4.4 2.5 1-1.4 2.3-2.5 4.4-2.5 3.6 0 5.4 3.8 3.8 6.9C19 15.6 12 20 12 20z"/></svg>';
function platLabel(g) { return g.k === 'Retro' ? g.pl : g.k; }
function card(g, opts = {}) {
  const tag = opts.tag ? `<span class="tag${opts.hot ? ' hot' : ''}">${esc(opts.tag)}</span>` : '';
  const fav = favs.has(g.slug) ? `<span class="fav-dot">${iconHeart}</span>` : '';
  return `<a class="card${opts.big ? ' big' : ''}" href="#/play/${g.slug}" title="${esc(g.t)}">
    <div class="thumb">${tag}${fav}<img src="${encPath(g.i)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.style.display='none'"></div>
    <div class="title">${esc(g.t)}</div></a>`;
}
function row(title, games, moreHref, icon = '') {
  if (!games.length) return '';
  return `<section class="section">
    <div class="section-head"><h2>${icon}${esc(title)}</h2>${moreHref ? `<a class="more" href="${moreHref}">View all →</a>` : ''}</div>
    <div class="row-wrap"><button class="row-nav prev" aria-label="Scroll left">‹</button>
    <div class="row">${games.map(g => card(g, { tag: g.pop ? 'Hot' : '', hot: g.pop })).join('')}</div>
    <button class="row-nav next" aria-label="Scroll right">›</button></div></section>`;
}
function wireRows() {
  app.querySelectorAll('.row-wrap').forEach(w => {
    const r = $('.row', w);
    $('.prev', w).onclick = () => r.scrollBy({ left: -r.clientWidth * .9, behavior: 'smooth' });
    $('.next', w).onclick = () => r.scrollBy({ left: r.clientWidth * .9, behavior: 'smooth' });
  });
}
function footer() {
  return `<footer class="footer"><span>${esc(CONFIG.brand)} · ${GAMES.length.toLocaleString()} games</span><span>Featured games refresh every day at midnight.</span></footer>`;
}
function genreInfo(name) { return GENRES.find(x => x[0] === name) || [name, '🎮', '#7c5cff']; }

/* ---------- sidebar ---------- */
function renderSidebar(active) {
  const count = n => GAMES.filter(n).length;
  const link = (href, ico, color, label, n) =>
    `<a class="nav-link${active === href ? ' active' : ''}" href="${href}"><span class="ico" style="background:${color}22;color:${color}">${ico}</span>${esc(label)}${n != null ? `<span class="count">${n}</span>` : ''}</a>`;
  $('#sidebar').innerHTML = `
    <div class="nav-group">
      ${link('#/', '🏠', '#7c5cff', 'Home')}
      ${link('#/new', '✨', '#ffc53d', "Today's Picks")}
      ${link('#/popular', '🔥', '#ff4d7e', 'Popular')}
      ${link('#/recent', '🕘', '#4dc9ff', 'Recently Played', recent.length || null)}
      ${link('#/favorites', '❤️', '#ff4d7e', 'Favorites', favs.size || null)}
    </div>
    <div class="nav-group"><div class="nav-title">Categories</div>
      ${GENRES.map(([n, i, c]) => link('#/c/' + slugify(n), i, c, n, count(g => g.g.includes(n)))).join('')}
    </div>
    <div class="nav-group"><div class="nav-title">Platforms</div>
      ${PLATFORMS.map(([n, i, c]) => link('#/p/' + slugify(n), i, c, n === 'Web' ? 'Web Games' : n === 'Flash' ? 'Flash Games' : 'Retro Consoles', count(g => g.k === n))).join('')}
    </div>`;
}

/* ---------- pages ---------- */
function pageHome() {
  const { hero, picks } = dailyFeatured();
  const [main, ...side] = hero;
  const key = todayKey();
  const genreRows = shuffled(GENRES.filter(g => g[0] !== 'Casual'), 'rows' + key).slice(0, 8).map(([n, i]) =>
    row(n, shuffled(GAMES.filter(g => g.g.includes(n)), n + key).slice(0, CONFIG.rowSize), '#/c/' + slugify(n), `<span>${i}</span>`)).join('');
  const recentGames = fromSlugs(recent).slice(0, CONFIG.rowSize);
  app.innerHTML = `
    <section class="hero">
      <a class="hero-main" href="#/play/${main.slug}">
        <img src="${encPath(main.i)}" alt="">
        <div class="hero-info">
          <span class="badge">★ Game of the Day</span>
          <h1>${esc(main.t)}</h1>
          <p>${esc(platLabel(main))} · ${esc(main.g.join(' · '))}</p>
          <span class="play-btn">${iconPlay}Play now</span>
        </div>
      </a>
      <div class="hero-side">${side.map(g => card(g, { big: true, tag: 'Featured' })).join('')}</div>
    </section>
    ${recentGames.length ? row('Continue Playing', recentGames, '#/recent', '<span>🕘</span>') : ''}
    <section class="section">
      <div class="section-head"><h2><span>✨</span>Today's Picks</h2><span class="countdown" id="countdown"></span></div>
      <div class="row-wrap"><button class="row-nav prev">‹</button><div class="row">${picks.map(g => card(g)).join('')}</div><button class="row-nav next">›</button></div>
    </section>
    ${row('Popular Right Now', shuffled(GAMES.filter(g => g.pop), 'popr' + key).slice(0, CONFIG.rowSize), '#/popular', '<span>🔥</span>')}
    ${genreRows}
    ${row('Flash Classics', shuffled(GAMES.filter(g => g.k === 'Flash' && g.c !== 'check'), 'fl' + key).slice(0, CONFIG.rowSize), '#/p/flash', '<span>💥</span>')}
    ${row('Retro Consoles', shuffled(GAMES.filter(g => g.k === 'Retro' && g.c === 'good'), 'rt' + key).slice(0, CONFIG.rowSize), '#/p/retro', '<span>🕹️</span>')}
    <section class="section">
      <div class="section-head"><h2><span>🗂️</span>All Categories</h2></div>
      <div class="cat-tiles">${GENRES.map(([n, i, c]) => `<a class="cat-tile" href="#/c/${slugify(n)}"><span class="ico" style="background:${c}22;color:${c}">${i}</span><span>${esc(n)}<small>${GAMES.filter(g => g.g.includes(n)).length} games</small></span></a>`).join('')}</div>
    </section>
    ${footer()}`;
  wireRows();
  tickCountdown();
}
function tickCountdown() {
  const el = $('#countdown'); if (!el) return;
  const ms = msToMidnight(), h = Math.floor(ms / 3.6e6), m = Math.floor(ms % 3.6e6 / 6e4);
  el.textContent = `New picks in ${h}h ${m}m`;
}
setInterval(() => { tickCountdown(); if (location.hash === '' || location.hash === '#/') { if (window.__day && window.__day !== todayKey()) route(); } window.__day = todayKey(); }, 30000);

function pageList({ title, sub, games, chips = '', key, defaultSort = 'popular' }) {
  const sortKey = store.get('gs:sort', defaultSort);
  const sorters = {
    popular: a => a.slice().sort((x, y) => (y.pop || 0) - (x.pop || 0) || (x.c === 'check') - (y.c === 'check') || x.t.localeCompare(y.t)),
    az: a => a.slice().sort((x, y) => x.t.localeCompare(y.t)),
    za: a => a.slice().sort((x, y) => y.t.localeCompare(x.t)),
    shuffle: a => shuffled(a, key + todayKey())
  };
  const list = (sorters[sortKey] || sorters.popular)(games);
  let shown = 0;
  app.innerHTML = `
    <h1 class="page-title">${title}</h1>
    <p class="page-sub">${sub}</p>
    ${chips}
    <div class="toolbar"><span class="page-sub" style="margin:0">${list.length.toLocaleString()} games</span>
      <select class="select" id="sort">
        <option value="popular">Popular first</option><option value="az">A → Z</option><option value="za">Z → A</option><option value="shuffle">Shuffle</option>
      </select></div>
    ${list.length ? '<div class="grid" id="grid"></div><button class="load-more" id="more">Load more</button>' : '<div class="empty"><b>Nothing here yet</b>Play some games and they will show up here.</div>'}
    ${footer()}`;
  const sel = $('#sort'); sel.value = sortKey; sel.onchange = () => { store.set('gs:sort', sel.value); route(); };
  if (!list.length) return;
  const grid = $('#grid'), more = $('#more');
  const add = () => {
    grid.insertAdjacentHTML('beforeend', list.slice(shown, shown + CONFIG.pageSize).map(g => card(g, { tag: g.pop ? 'Hot' : '', hot: g.pop })).join(''));
    shown += CONFIG.pageSize; more.hidden = shown >= list.length;
  };
  add(); more.onclick = add;
  const io = new IntersectionObserver(e => { if (e[0].isIntersecting && !more.hidden) add(); }, { rootMargin: '600px' });
  io.observe(more);
}

function pageCategory(slug) {
  const gi = GENRES.find(g => slugify(g[0]) === slug); if (!gi) return pageNotFound();
  const [name, icon] = gi;
  pageList({ title: `${icon} ${esc(name)} Games`, sub: `Play free ${esc(name.toLowerCase())} games online — no downloads.`, games: GAMES.filter(g => g.g.includes(name)), key: slug });
}
function pagePlatform(slug, sub) {
  const p = PLATFORMS.find(x => slugify(x[0]) === slug); if (!p) return pageNotFound();
  const [name, icon, , desc] = p;
  let games = GAMES.filter(g => g.k === name), chips = '';
  if (name === 'Retro') {
    const plats = [...new Set(games.map(g => g.pl))].sort((a, b) => games.filter(g => g.pl === b).length - games.filter(g => g.pl === a).length);
    chips = `<div class="chips"><a class="chip${!sub ? ' active' : ''}" href="#/p/retro">All consoles</a>${plats.map(pl => `<a class="chip${sub === slugify(pl) ? ' active' : ''}" href="#/p/retro/${slugify(pl)}">${esc(pl)}</a>`).join('')}</div>`;
    if (sub) games = games.filter(g => slugify(g.pl) === sub);
  }
  const title = name === 'Retro' ? (sub ? esc(games[0]?.pl || 'Retro') + ' Games' : 'Retro Console Games') : `${name} Games`;
  pageList({ title: `${icon} ${title}`, sub: desc, games, chips, key: slug + (sub || '') });
}
function pageSearch(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const res = GAMES.map(g => {
    const t = g.t.toLowerCase(); let s = 0;
    if (t === q.toLowerCase()) s += 100;
    if (t.startsWith(q.toLowerCase())) s += 40;
    for (const w of words) { if (t.includes(w)) s += 10; else if ((g.pl + ' ' + g.g.join(' ')).toLowerCase().includes(w)) s += 3; else return null; }
    return [g, s + (g.pop ? 5 : 0)];
  }).filter(Boolean).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  app.innerHTML = `<h1 class="page-title">Results for “${esc(q)}”</h1><p class="page-sub">${res.length} games found</p>
    ${res.length ? `<div class="grid">${res.slice(0, 300).map(g => card(g)).join('')}</div>` : '<div class="empty"><b>No games found</b>Try a different spelling or browse the categories.</div>'}${footer()}`;
}

function similarGames(g, n) {
  const key = g.slug + todayKey();
  const same = GAMES.filter(x => x !== g && x.g.some(t => g.g.includes(t)) && (g.k !== 'Retro' || x.pl === g.pl || x.k !== 'Retro'));
  const base = g.t.replace(/\s*[\d:(-].*$/, '').toLowerCase();
  const series = GAMES.filter(x => x !== g && base.length > 3 && x.t.toLowerCase().startsWith(base));
  const sameKind = same.filter(x => x.k === g.k), other = same.filter(x => x.k !== g.k);
  return [...new Set([...series.slice(0, 6), ...shuffled(sameKind, key), ...shuffled(other, key)])].slice(0, n);
}
function pagePlay(slug) {
  const g = BY_SLUG.get(slug); if (!g) return pageNotFound();
  pushRecent(slug);
  const sim = similarGames(g, 14);
  const isFav = favs.has(slug);
  app.innerHTML = `
    <div class="play-layout">
      <div>
        <div class="player">
          <div class="player-frame" id="frame">
            <div class="player-cover" id="cover">
              <div class="bg" style="background-image:url('${encPath(g.i).replace(/'/g, '%27')}')"></div>
              <div class="inner"><img src="${encPath(g.i)}" alt=""><span class="play-btn">${iconPlay}Play ${esc(g.t)}</span></div>
            </div>
          </div>
          <div class="player-bar">
            <img class="pthumb" src="${encPath(g.i)}" alt="">
            <div><h1>${esc(g.t)}</h1><div class="meta">${esc(platLabel(g))}</div></div>
            <div class="actions">
              <button class="icon-btn${isFav ? ' on' : ''}" id="favBtn" title="Favorite">${iconHeart}</button>
              <button class="icon-btn" id="reloadBtn" title="Restart"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg></button>
              <a class="icon-btn" id="newTab" title="Open in new tab" href="${encPath(g.p)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>
              <button class="icon-btn" id="fsBtn" title="Fullscreen"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
            </div>
          </div>
        </div>
        <div class="play-tags">${g.g.map(t => `<a class="chip" href="#/c/${slugify(t)}">${genreInfo(t)[1]} ${esc(t)}</a>`).join('')}${g.k === 'Retro' ? `<a class="chip" href="#/p/retro/${slugify(g.pl)}">🕹️ ${esc(g.pl)}</a>` : `<a class="chip" href="#/p/${slugify(g.k)}">${g.k === 'Flash' ? '💥' : '🌐'} ${g.k} Games</a>`}</div>
        ${row('More like this', sim.slice(6), null, '<span>🎮</span>')}
      </div>
      <aside><div class="section-head"><h2 style="font-size:17px">You may also like</h2></div>
        <div class="side-list">${sim.slice(0, 6).map(x => `<a class="side-item" href="#/play/${x.slug}"><img src="${encPath(x.i)}" alt="" loading="lazy"><span><b>${esc(x.t)}</b><small>${esc(platLabel(x))}</small></span></a>`).join('')}</div>
      </aside>
    </div>${footer()}`;
  wireRows();
  const frame = $('#frame');
  const start = () => {
    $('#cover')?.remove();
    frame.insertAdjacentHTML('beforeend', `<iframe src="${encPath(g.p)}" allow="autoplay; fullscreen; gamepad; clipboard-write" allowfullscreen></iframe>`);
    $('iframe', frame).focus();
  };
  $('#cover').onclick = start;
  $('#reloadBtn').onclick = () => { const f = $('iframe', frame); if (f) f.src = f.src; else start(); };
  $('#fsBtn').onclick = () => { if (!$('iframe', frame)) start(); (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame); };
  $('#favBtn').onclick = e => { toggleFav(slug); e.currentTarget.classList.toggle('on', favs.has(slug)); renderSidebar(location.hash); };
  document.title = `${g.t} — ${CONFIG.brand}`;
}
function pageNotFound() {
  app.innerHTML = `<div class="empty"><b>Page not found</b><a class="play-btn" href="#/" style="margin-top:14px">Back home</a></div>`;
}

/* ---------- router ---------- */
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  const parts = h.split('/').filter(Boolean);
  document.title = `${CONFIG.brand} — Free Online Games`;
  document.body.classList.remove('nav-open');
  const active = '#' + (parts[0] === 'p' && parts[1] === 'retro' ? '/p/retro' : '/' + parts.slice(0, 2).join('/'));
  renderSidebar(parts.length ? active : '#/');
  $('#suggest').hidden = true;
  switch (parts[0]) {
    case undefined: pageHome(); break;
    case 'play': pagePlay(parts[1]); break;
    case 'c': pageCategory(parts[1]); break;
    case 'p': pagePlatform(parts[1], parts[2]); break;
    case 'search': pageSearch(parts.slice(1).join('/')); break;
    case 'popular': pageList({ title: '🔥 Popular Games', sub: 'The games everyone keeps coming back to.', games: GAMES.filter(g => g.pop), key: 'pop', defaultSort: 'shuffle' }); break;
    case 'new': { const d = dailyFeatured(); pageList({ title: "✨ Today's Picks", sub: 'A fresh set of games, hand-shuffled every day.', games: [...d.hero, ...d.picks], key: 'picks' }); break; }
    case 'recent': pageList({ title: '🕘 Recently Played', sub: 'Pick up where you left off.', games: fromSlugs(recent), key: 'recent', defaultSort: 'popular' }); break;
    case 'favorites': pageList({ title: '❤️ Favorites', sub: 'Games you saved. Tap the heart on any game to add it here.', games: fromSlugs([...favs]), key: 'favs' }); break;
    default: pageNotFound();
  }
  window.scrollTo(0, 0);
}

/* ---------- search box ---------- */
function wireSearch() {
  const input = $('#search'), box = $('#suggest');
  let sel = -1;
  const render = () => {
    const q = input.value.trim().toLowerCase(); sel = -1;
    if (q.length < 2) { box.hidden = true; return; }
    const hits = GAMES.filter(g => g.t.toLowerCase().includes(q)).sort((a, b) => (b.t.toLowerCase().startsWith(q)) - (a.t.toLowerCase().startsWith(q)) || (b.pop || 0) - (a.pop || 0)).slice(0, 7);
    box.innerHTML = hits.map(g => `<a href="#/play/${g.slug}"><img src="${encPath(g.i)}" alt=""><span>${esc(g.t)}<div class="s-meta">${esc(platLabel(g))}</div></span></a>`).join('') +
      `<a class="s-all" href="#/search/${encodeURIComponent(input.value.trim())}">See all results for “${esc(input.value.trim())}”</a>`;
    box.hidden = false;
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('active', i === sel));
    } else if (e.key === 'Enter') {
      const q = input.value.trim(); if (!q) return;
      location.hash = sel >= 0 ? items[sel].getAttribute('href') : '#/search/' + encodeURIComponent(q);
      box.hidden = true; input.blur();
    } else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) box.hidden = true; });
  box.addEventListener('click', () => { box.hidden = true; input.value = ''; });
  document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== input && !e.target.closest('input,textarea')) { e.preventDefault(); input.focus(); } });
}

/* ---------- boot ---------- */
async function boot() {
  $('#brand').textContent = CONFIG.brand;
  app.innerHTML = '<div class="empty"><b>Loading games…</b></div>';
  try {
    GAMES = await fetch('games.json', { cache: 'no-cache' }).then(r => r.json());
  } catch (e) {
    app.innerHTML = '<div class="empty"><b>Could not load games.json</b>Make sure the site is served over http(s), not opened as a file.</div>';
    return;
  }
  const used = new Set();
  for (const g of GAMES) {
    let s = slugify(g.t), base = s, n = 2;
    if (g.k === 'Retro' && used.has(s)) s = base = slugify(g.t + ' ' + g.pl);
    while (used.has(s)) s = `${base}-${n++}`;
    used.add(s); g.slug = s; BY_SLUG.set(s, g);
    if (!g.g.includes('Action') && g.g.some(t => ['Shooter', 'Fighting'].includes(t))) g.g.push('Action');
  }
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
  $('#scrim').onclick = () => document.body.classList.remove('nav-open');
  $('#randomBtn').onclick = () => { const pool = GAMES.filter(g => g.c !== 'check'); location.hash = '#/play/' + pool[Math.floor(Math.random() * pool.length)].slug; };
  wireSearch();
  window.addEventListener('hashchange', route);
  route();
}
boot();
})();
