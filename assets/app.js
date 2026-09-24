/* Sigmund:re — static game portal. Data: games.json (generated from UGS-Files + thumbnails). */
(() => {
'use strict';

const CONFIG = {
  brand: ['Sigmund', ':re'], // logo: name + highlighted suffix
  lineupCount: 4,           // Daily Drop list next to the Game of the Day
  freshCount: 12,           // "Fresh today" grid
  shelfCount: 6,            // category shelves on the home page
  pageSize: 48
};

// name, icon, accent color (bright, readable on paper and ink)
const GENRES = [
  ['Action',            'zap',       '#ff5a36'],
  ['Shooter',           'crosshair', '#ff8a3d'],
  ['Racing',            'flag',      '#ffc93c'],
  ['Sports',            'trophy',    '#5fd07a'],
  ['Puzzle',            'puzzle',    '#57b7ff'],
  ['Platformer',        'stairs',    '#a992ff'],
  ['Adventure & RPG',   'map',       '#c9a2ff'],
  ['Fighting',          'swords',    '#ff6f91'],
  ['Horror',            'ghost',     '#9aa0a6'],
  ['Strategy & Defense','castle',    '#3fbf9a'],
  ['Idle & Clicker',    'click',     '#f2b36b'],
  ['.io & Multiplayer', 'users',     '#35c6d6'],
  ['Simulation',        'building',  '#86a8ff'],
  ['Arcade',            'joystick',  '#ff8ad8'],
  ['Casual',            'dice',      '#b4dc6a']
];
const PLATFORMS = [
  ['Web',   'globe',   '#57b7ff', 'Web Games',   'HTML5 games that run right in your browser.'],
  ['Flash', 'monitor', '#ffc93c', 'Flash Games', 'The Flash classics, brought back with Ruffle.'],
  ['Retro', 'gamepad', '#ff8ad8', 'Retro',       'Console and arcade legends in an emulator.']
];

/* ---------- themes & settings ----------
   To add a theme: drop a CSS file in assets/themes/ and add it here (see assets/themes/README.md). */
const THEMES = [
  { id: 'black', name: 'Black', note: 'Deep black with bright accents. The default.', swatch: ['#0b0b0c', '#18181b', '#f2f0ea'] },
  { id: 'paper', name: 'Paper', note: 'Warm off-white with bold ink outlines.', swatch: ['#f4efe6', '#fffaf1', '#17130f'] },
  { id: 'system', name: 'Match device', note: 'Black or Paper, following your device setting.', swatch: ['#0b0b0c', '#f4efe6', '#ffc93c'] }
];
const ACCENTS = [['mustard', '#ffc93c'], ['tomato', '#ff5a36'], ['teal', '#1fc7b2'], ['lilac', '#b39cff'], ['sky', '#57b7ff'], ['lime', '#b8e05a'], ['pink', '#ff8ad8']];
const SETTINGS_DEFAULTS = { theme: 'black', accent: 'mustard', size: 'm', names: true, motion: true, autostart: false, newtab: false };

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  sparkles: '<path d="M11 3.5 12.8 8.2 17.5 10l-4.7 1.8L11 16.5l-1.8-4.7L4.5 10l4.7-1.8z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  flame: '<path d="M12 21.5c3.9 0 7-2.8 7-6.7 0-3.3-2-5.5-3.8-7.3-.3 1.9-1.2 3.1-2.5 3.7.1-3.4-1.4-6.4-3.9-8.7.1 3.1-1.6 5-3.1 6.7C4.6 10.6 5 12.4 5 14.8c0 3.9 3.1 6.7 7 6.7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  heart: '<path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 4.5 6.6 4.5c2.1 0 3.4 1.1 4.4 2.5 1-1.4 2.3-2.5 4.4-2.5 3.6 0 5.4 3.8 3.8 6.9C19 15.6 12 20 12 20z"/>',
  star: '<path d="M12 3.2l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  crosshair: '<circle cx="12" cy="12" r="8.5"/><path d="M12 2v4.5M12 17.5V22M2 12h4.5M17.5 12H22"/><circle cx="12" cy="12" r="1.2" class="dot"/>',
  flag: '<path d="M5 21.5V3.5"/><path d="M5 4h13.5l-2.8 4.5 2.8 4.5H5"/><path d="M9.5 4v9M14 4v9"/>',
  trophy: '<path d="M8 21h8M12 16.5V21"/><path d="M7 3.5h10V9a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5a3 3 0 0 0 3 4.3M17 5.5h2.5a3 3 0 0 1-3 4.3"/>',
  puzzle: '<path d="M4 8h3.5a2 2 0 1 1 4 0H15v3.5a2 2 0 1 1 0 4V20H4z"/>',
  stairs: '<path d="M3 20.5h4.5V16H12v-4.5h4.5V7H21"/><path d="M3 20.5h18"/><path d="M17 3.5l2 2 2-2"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 18 3h3v3l-3.5 8.5"/><path d="m5 14 4 4M7 17l-3 3M3 19l2 2"/>',
  ghost: '<path d="M5 21V10.5a7 7 0 0 1 14 0V21l-2.3-1.8L14.3 21 12 19.2 9.7 21l-2.4-1.8z"/><circle cx="9.5" cy="10.5" r="1.2" class="dot"/><circle cx="14.5" cy="10.5" r="1.2" class="dot"/>',
  castle: '<path d="M4 21V7h3v3h3V7h4v3h3V7h3v14z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  click: '<path d="M9.2 9.2 20 13.6l-4.7 1.3-1.4 4.8z"/><path d="M7.2 2.5 8 5.2M4.9 8.1 2.2 7.3M13.8 4.3 12 6.1M6 12.2 4.2 14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  building: '<path d="M4.5 21V4.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V21"/><path d="M13.5 9.5h5a1 1 0 0 1 1 1V21"/><path d="M2.5 21h19M8 7.5h2M8 11.5h2M8 15.5h2M16.5 13.5h0M16.5 17h0"/>',
  joystick: '<circle cx="12" cy="5.5" r="2.5"/><path d="M12 8v6"/><path d="M4.5 14h15a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5A1.5 1.5 0 0 1 4.5 14z"/><path d="M7 17.5h2"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" class="dot"/><circle cx="15.5" cy="15.5" r="1.2" class="dot"/><circle cx="12" cy="12" r="1.2" class="dot"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M10.2 8.3v5.4l4.3-2.7z"/>',
  gamepad: '<path d="M6.5 7h11A4.5 4.5 0 0 1 22 11.5v1.2a3.8 3.8 0 0 1-6.8 2.3L14 13.5h-4L8.8 15A3.8 3.8 0 0 1 2 12.7v-1.2A4.5 4.5 0 0 1 6.5 7z"/><path d="M6 11.3h4M8 9.3v4"/><circle cx="15.5" cy="10.5" r="1.1" class="dot"/><circle cx="17.8" cy="12.5" r="1.1" class="dot"/>'
};
Object.assign(ICONS, {
  play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>',
  shuffle: '<path d="M3 7h3.5c2.5 0 4 1.3 5.2 3.4l.6 1.2C13.5 13.7 15 15 17.5 15H21"/><path d="M3 17h3.5c1.5 0 2.6-.5 3.5-1.3M14 8.3c.9-.8 2-1.3 3.5-1.3H21"/><path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 12.5l2.5 2.5-2.5 2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  restart: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  download: '<path d="M12 3.5v11.5M7 10.5l5 5 5-5"/><path d="M4 16.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2.5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'
});
const ic = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.gamepad}</svg>`;

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
const encPath = p => p.split('/').map(encodeURIComponent).join('/');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

const settings = Object.assign({}, SETTINGS_DEFAULTS, store.get('sig:settings', {}));
function resolvedTheme() {
  const t = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'paper' : 'black') : settings.theme;
  return THEMES.some(x => x.id === t && t !== 'system') ? t : 'black';
}
function applySettings() {
  const h = document.documentElement, t = resolvedTheme();
  h.dataset.theme = t; h.dataset.accent = settings.accent; h.dataset.size = settings.size;
  h.dataset.names = settings.names ? 'on' : 'off'; h.dataset.motion = settings.motion ? 'on' : 'off';
  let link = document.getElementById('themeCss');
  if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.id = 'themeCss'; document.head.appendChild(link); }
  const href = `assets/themes/${t}.css`;
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = (THEMES.find(x => x.id === t) || THEMES[0]).swatch[0];
}
function setSetting(k, v) { settings[k] = v; store.set('sig:settings', settings); applySettings(); }
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (settings.theme === 'system') applySettings(); });

let GAMES = [], BY_SLUG = new Map();
const BRAND = CONFIG.brand.join('');
const app = $('#app');

/* ---------- seeded daily randomness ---------- */
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function dayOfYear() { const d = new Date(), s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 864e5); }
function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffled(arr, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function dailyDrop() {
  const key = todayKey();
  const top = shuffled(GAMES.filter(g => g.pop), 'gotd' + key)[0];
  const lineup = shuffled(GAMES.filter(g => g !== top && g.c === 'good' && !g.pop), 'lineup' + key).slice(0, CONFIG.lineupCount);
  const used = new Set([top, ...lineup]);
  const fresh = shuffled(GAMES.filter(g => !used.has(g) && g.c !== 'check'), 'fresh' + key).slice(0, CONFIG.freshCount);
  return { top, lineup, fresh };
}
function msToMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; }

/* ---------- favorites & recent ---------- */
const favs = new Set(store.get('gs:favs', []));
let recent = store.get('gs:recent', []);
function toggleFav(slug) { favs.has(slug) ? favs.delete(slug) : favs.add(slug); store.set('gs:favs', [...favs]); }
function pushRecent(slug) { recent = [slug, ...recent.filter(s => s !== slug)].slice(0, 40); store.set('gs:recent', recent); }
const fromSlugs = arr => arr.map(s => BY_SLUG.get(s)).filter(Boolean);

/* ---------- small renderers ---------- */
const genreInfo = n => GENRES.find(x => x[0] === n) || [n, 'gamepad', '#ffc93c'];
const platLabel = g => g.k === 'Retro' ? g.pl : g.k === 'Web' ? 'Web' : 'Flash';
const img = (src, extra = '') => `<img src="${encPath(src)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.style.visibility='hidden'" ${extra}>`;
function card(g) {
  const sticker = g.pop ? '<span class="sticker hot">Hot</span>' : '';
  const fav = favs.has(g.slug) ? `<span class="fav-mark">${ic('heart')}</span>` : '';
  return `<a class="card" href="#/play/${g.slug}" title="${esc(g.t)}">
    <div class="thumb">${sticker}${fav}${img(g.i)}</div>
    <div class="meta"><span class="name">${esc(g.t)}</span><span class="sub">${esc(platLabel(g))} · ${esc(g.g[0])}</span></div></a>`;
}
function head(label, title, href, hrefText = 'See all') {
  return `<div class="head"><div><div class="label">${label}</div><h2>${title}</h2></div>${href ? `<a class="see" href="${href}">${hrefText}${ic('chevron')}</a>` : ''}</div>`;
}
function footer() {
  return `<footer class="footer"><span>${esc(BRAND)} · ${GAMES.length.toLocaleString()} games · a remake of the original Sigmund</span><span>The Daily Drop changes every night at midnight.</span></footer>`;
}

/* ---------- header rail ---------- */
function renderRail(active) {
  const pill = (href, icon, color, label) =>
    `<a class="pill${active === href ? ' active' : ''}" href="${href}" style="--c:${color}">${ic(icon)}${esc(label)}</a>`;
  $('#rail').innerHTML =
    pill('#/', 'home', '#ff5a36', 'Home') +
    pill('#/today', 'sparkles', '#ffc93c', 'Daily Drop') +
    pill('#/popular', 'flame', '#ff5a36', 'Popular') +
    pill('#/recent', 'clock', '#57b7ff', 'Recent') +
    pill('#/favorites', 'heart', '#ff6f91', 'Favorites') +
    '<span class="sep"></span>' +
    PLATFORMS.map(([n, i, c, label]) => pill('#/p/' + slugify(n), i, c, label)).join('') +
    '<span class="sep"></span>' +
    GENRES.map(([n, i, c]) => pill('#/c/' + slugify(n), i, c, n)).join('');
  const a = $('#rail .active'); if (a) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---------- home ---------- */
function pageHome() {
  const { top, lineup, fresh } = dailyDrop();
  const key = todayKey();
  const d = new Date();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const shelves = shuffled(GENRES.filter(g => g[0] !== 'Casual'), 'shelves' + key).slice(0, CONFIG.shelfCount);
  const charts = shuffled(GAMES.filter(g => g.pop), 'chart' + key).slice(0, 10);
  const recentGames = fromSlugs(recent).slice(0, 6);
  app.innerHTML = `
    <section class="drop">
      <a class="drop-main" href="#/play/${top.slug}">
        <div class="art"><img src="${encPath(top.i)}" alt=""></div>
        <span class="stamp"><small>DAY ${dayOfYear()}</small><b>${month} ${d.getDate()}</b><small>GAME OF THE DAY</small></span>
        <div class="body">
          <div><div class="label">Daily Drop · ${esc(platLabel(top))}</div><h1>${esc(top.t)}</h1></div>
          <span class="go">${ic('play')}Play</span>
        </div>
      </a>
      <div class="lineup">
        <div class="lineup-head"><h2>Also dropping today</h2><span class="clock" id="clock"></span></div>
        <ol>${lineup.map((g, i) => `<li><a href="#/play/${g.slug}"><span class="num">0${i + 1}</span>${img(g.i)}<span><b>${esc(g.t)}</b><span class="label">${esc(platLabel(g))} · ${esc(g.g[0])}</span></span></a></li>`).join('')}</ol>
      </div>
    </section>

    ${recentGames.length ? `<section class="block">${head('Pick up where you left off', 'Jump back in', '#/recent')}<div class="grid">${recentGames.map(card).join('')}</div></section>` : ''}

    <section class="block">${head('Shuffled fresh every day', 'Fresh picks', '#/today')}<div class="grid">${fresh.map(card).join('')}</div></section>

    <section class="block">${head('Three ways to play', 'Pick a platform')}
      <div class="plats">${PLATFORMS.map(([n, i, c, label, desc]) => `<a class="plat" href="#/p/${slugify(n)}" style="--c:${c}"><div><h3>${label}</h3><p>${desc}</p></div><span class="count">${GAMES.filter(g => g.k === n).length.toLocaleString()} games →</span><span class="big-ico">${ic(i)}</span></a>`).join('')}</div>
    </section>

    <section class="block">${head('The ones everyone keeps playing', 'Top 10 today', '#/popular')}
      <div class="charts">${charts.map((g, i) => `<a class="chart-row" href="#/play/${g.slug}"><span class="rank">${i + 1}</span>${img(g.i)}<span><b>${esc(g.t)}</b><span class="label">${esc(platLabel(g))} · ${esc(g.g[0])}</span></span></a>`).join('')}</div>
    </section>

    <section class="block">${head('Browse the shelves', 'By category')}
      ${shelves.map(([n, i, c]) => {
        const list = GAMES.filter(g => g.g.includes(n));
        return `<div class="shelf" style="--c:${c}">
          <a class="shelf-tag" href="#/c/${slugify(n)}"><div><span class="badge-ico">${ic(i)}</span><h3>${esc(n)}</h3><span class="label">${list.length} games</span></div><span class="see">Open shelf${ic('chevron')}</span></a>
          <div class="grid">${shuffled(list, n + key).slice(0, 4).map(card).join('')}</div></div>`;
      }).join('')}
    </section>

    <section class="block">${head('Everything else', 'All categories')}
      <div class="cloud">${GENRES.map(([n, i, c]) => `<a class="pill" href="#/c/${slugify(n)}" style="--c:${c}">${ic(i)}${esc(n)} <span class="n">${GAMES.filter(g => g.g.includes(n)).length}</span></a>`).join('')}</div>
    </section>
    ${footer()}`;
  tickClock();
}
function tickClock() {
  const el = $('#clock'); if (!el) return;
  const ms = msToMidnight(), h = Math.floor(ms / 3.6e6), m = Math.floor(ms % 3.6e6 / 6e4);
  el.textContent = `next drop in ${h}h ${String(m).padStart(2, '0')}m`;
}
let lastDay = todayKey();
setInterval(() => { tickClock(); if (lastDay !== todayKey()) { lastDay = todayKey(); if (!location.hash || location.hash === '#/') route(); } }, 30000);

/* ---------- list pages ---------- */
const SORTS = [['popular', 'Top'], ['az', 'A–Z'], ['shuffle', 'Shuffle']];
function pageList({ label, title, sub, icon, color, games, chips = '', key, defaultSort = 'popular' }) {
  const sortKey = store.get('gs:sort', defaultSort);
  const sorters = {
    popular: a => a.slice().sort((x, y) => (y.pop || 0) - (x.pop || 0) || (x.c === 'check') - (y.c === 'check') || x.t.localeCompare(y.t)),
    az: a => a.slice().sort((x, y) => x.t.localeCompare(y.t)),
    shuffle: a => shuffled(a, key + todayKey())
  };
  const list = (sorters[sortKey] || sorters.popular)(games);
  let shown = 0;
  app.innerHTML = `
    <section class="banner" style="--c:${color}">
      <span class="badge-ico">${ic(icon)}</span>
      <div><div class="label">${esc(label)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
      <div class="total"><b>${list.length.toLocaleString()}</b>games</div>
    </section>
    <div class="toolbar"><div class="chips">${chips}</div>
      <div class="seg" role="group" aria-label="Sort">${SORTS.map(([k, t]) => `<button data-sort="${k}" class="${k === sortKey ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    ${list.length ? '<div class="grid" id="grid"></div><button class="more-btn" id="more">Load more</button>' : '<div class="empty"><b>Nothing here yet</b>Play a few games and they will show up here.</div>'}
    ${footer()}`;
  app.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { store.set('gs:sort', b.dataset.sort); route(); });
  if (!list.length) return;
  const grid = $('#grid'), more = $('#more');
  const add = () => { grid.insertAdjacentHTML('beforeend', list.slice(shown, shown + CONFIG.pageSize).map(card).join('')); shown += CONFIG.pageSize; more.hidden = shown >= list.length; };
  add(); more.onclick = add;
  new IntersectionObserver(e => { if (e[0].isIntersecting && !more.hidden) add(); }, { rootMargin: '700px' }).observe(more);
}
function pageCategory(slug) {
  const gi = GENRES.find(g => slugify(g[0]) === slug); if (!gi) return pageNotFound();
  const [name, icon, color] = gi;
  pageList({ label: 'Category', title: name, sub: `Free ${name.toLowerCase()} games you can play right now.`, icon, color, games: GAMES.filter(g => g.g.includes(name)), key: slug });
}
function pagePlatform(slug, sub) {
  const p = PLATFORMS.find(x => slugify(x[0]) === slug); if (!p) return pageNotFound();
  const [name, icon, color, label, desc] = p;
  let games = GAMES.filter(g => g.k === name), chips = '', title = label;
  if (name === 'Retro') {
    const counts = {}; games.forEach(g => counts[g.pl] = (counts[g.pl] || 0) + 1);
    const plats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    chips = `<a class="pill${!sub ? ' active' : ''}" href="#/p/retro">All consoles</a>` + plats.map(pl => `<a class="pill${sub === slugify(pl) ? ' active' : ''}" href="#/p/retro/${slugify(pl)}">${esc(pl)}</a>`).join('');
    if (sub) { games = games.filter(g => slugify(g.pl) === sub); title = games[0]?.pl || 'Retro'; }
    else title = 'Retro Consoles';
  }
  pageList({ label: 'Platform', title, sub: desc, icon, color, games, chips, key: slug + (sub || '') });
}
function pageSearch(q) {
  const ql = q.toLowerCase(), words = ql.split(/\s+/).filter(Boolean);
  const res = GAMES.map(g => {
    const t = g.t.toLowerCase(); let s = 0;
    if (t === ql) s += 100; if (t.startsWith(ql)) s += 40;
    for (const w of words) { if (t.includes(w)) s += 10; else if ((g.pl + ' ' + g.g.join(' ')).toLowerCase().includes(w)) s += 3; else return null; }
    return [g, s + (g.pop ? 5 : 0)];
  }).filter(Boolean).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  app.innerHTML = `
    <section class="banner" style="--c:#57b7ff"><span class="badge-ico"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
      <div><div class="label">Search</div><h1>“${esc(q)}”</h1></div><div class="total"><b>${res.length}</b>matches</div></section>
    ${res.length ? `<div class="grid">${res.slice(0, 300).map(card).join('')}</div>` : '<div class="empty"><b>No games found</b>Try another spelling, or browse a category from the bar above.</div>'}
    ${footer()}`;
}

/* ---------- play ---------- */
function similarGames(g, n) {
  const key = g.slug + todayKey();
  const same = GAMES.filter(x => x !== g && x.g.some(t => g.g.includes(t)));
  const base = g.t.replace(/\s*[\d:(-].*$/, '').toLowerCase();
  const series = base.length > 3 ? GAMES.filter(x => x !== g && x.t.toLowerCase().startsWith(base)) : [];
  const sameKind = same.filter(x => x.k === g.k && (g.k !== 'Retro' || x.pl === g.pl));
  return [...new Set([...series.slice(0, 5), ...shuffled(sameKind, key), ...shuffled(same, key)])].slice(0, n);
}
/* ---------- persistent player ----------
   One iframe lives in #stage, outside the page content, so it is never moved or reloaded.
   Modes: 'docked' (sits over the play page's screen), 'expanded' (fills the browser window),
   'mini' (small live window in the corner while you browse). */
const player = { g: null, mode: 'off' };
function stageEl() {
  let st = $('#stage');
  if (st) return st;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="stage" class="stage" data-mode="off">
      <div class="stage-frame" id="stageFrame"></div>
      <div class="stage-dock" aria-label="Game controls">
        <button class="tbtn icon-only" data-stage="shrink" title="Exit full window (Esc)">${ic('shrink')}</button>
      </div>
      <div class="stage-mini">
        <span class="mini-title" id="miniTitle"></span>
        <button class="tbtn icon-only" data-stage="expand" title="Full window">${ic('expand')}</button>
        <button class="tbtn icon-only" data-stage="resume" title="Back to game page">${ic('external')}</button>
        <button class="tbtn icon-only" data-stage="close" title="Close game">${ic('close')}</button>
      </div>
    </div>`);
  st = $('#stage');
  st.addEventListener('click', e => {
    const b = e.target.closest('[data-stage]'); if (!b) return;
    const a = b.dataset.stage;
    if (a === 'shrink') { onPlayPage() ? setMode('docked') : setMode('mini'); }
    else if (a === 'expand') { setMode('expanded'); }
    else if (a === 'resume') { location.hash = '#/play/' + player.g.slug; }
    else if (a === 'close') { closeGame(); }
  });
  new ResizeObserver(positionDock).observe(document.body);
  addEventListener('resize', positionDock);
  addEventListener('keydown', e => { if (e.key === 'Escape' && player.mode === 'expanded') onPlayPage() ? setMode('docked') : setMode('mini'); });
  return st;
}
function onPlayPage() { return !!player.g && location.hash === '#/play/' + player.g.slug; }
function launch(g) {
  const st = stageEl();
  if (player.g !== g) {
    $('#stageFrame').innerHTML = `<iframe src="${encPath(g.p)}" title="${esc(g.t)}" allow="autoplay; fullscreen; gamepad; clipboard-write" allowfullscreen></iframe>`;
    player.g = g;
    $('#miniTitle').textContent = g.t;
  }
  st.hidden = false;
}
function setMode(m) {
  const st = stageEl();
  player.mode = m;
  st.dataset.mode = m;
  document.body.classList.toggle('stage-open', m === 'expanded');
  if (m === 'docked') positionDock();
  if (m === 'expanded' || m === 'docked') setTimeout(() => $('#stageFrame iframe')?.focus(), 50);
}
function positionDock() {
  if (player.mode !== 'docked') return;
  const slot = $('#screen'), st = $('#stage');
  if (!slot || !st) return;
  const r = slot.getBoundingClientRect();
  Object.assign(st.style, { top: `${r.top + scrollY}px`, left: `${r.left + scrollX}px`, width: `${r.width}px`, height: `${r.height}px` });
}
function closeGame() {
  const st = $('#stage'); if (!st) return;
  $('#stageFrame').innerHTML = '';
  player.g = null; setMode('off');
  if (location.hash.startsWith('#/play/')) route();
}

function pagePlay(slug) {
  const g = BY_SLUG.get(slug); if (!g) return pageNotFound();
  pushRecent(slug);
  const sim = similarGames(g, 14);
  const bg = encPath(g.i).replace(/'/g, '%27');
  app.innerHTML = `
    <div class="play">
      <div>
        <div class="cabinet">
          <div class="cab-top">
            <div><div class="label">${esc(platLabel(g))} · Now playing</div><h1>${esc(g.t)}</h1></div>
            <div class="cab-actions">
              <button class="tbtn icon-only${favs.has(slug) ? ' on' : ''}" id="favBtn" title="Favorite">${ic('heart')}</button>
              <button class="tbtn icon-only" id="reloadBtn" title="Restart">${ic('restart')}</button>
              <a class="tbtn icon-only" href="${encPath(g.p)}" download="${esc(g.t.replace(/[\\/:*?"<>|]/g, ''))}.html" title="Download game">${ic('download')}</a>
              <a class="tbtn icon-only" href="${encPath(g.p)}" target="_blank" rel="noopener" title="Open in new tab">${ic('external')}</a>
              <button class="tbtn" id="fsBtn" title="Fill the browser window">${ic('expand')}<span class="tbtn-label">Full window</span></button>
            </div>
          </div>
          <div class="screen" id="screen">
            <div class="insert" id="insert"><div class="bg" style="background-image:url('${bg}')"></div>
              <div class="inner"><img src="${encPath(g.i)}" alt=""><span class="go">${ic('play')}Start game</span></div></div>
          </div>
          <div class="cab-foot"><span class="label">Filed under</span>
            ${g.g.map(t => { const [n, i, c] = genreInfo(t); return `<a class="pill" href="#/c/${slugify(n)}" style="--c:${c}">${ic(i)}${esc(n)}</a>`; }).join('')}
            ${g.k === 'Retro' ? `<a class="pill" href="#/p/retro/${slugify(g.pl)}" style="--c:#ff8ad8">${ic('gamepad')}${esc(g.pl)}</a>` : (p => `<a class="pill" href="#/p/${slugify(p[0])}" style="--c:${p[2]}">${ic(p[1])}${p[3]}</a>`)(PLATFORMS.find(p => p[0] === g.k))}
          </div>
        </div>
        <section class="block" style="margin-top:40px">${head('If you like this one', 'More like it')}<div class="grid g4">${sim.slice(6, 14).map(card).join('')}</div></section>
      </div>
      <aside class="upnext"><h2>Up next</h2>${sim.slice(0, 6).map(x => `<a href="#/play/${x.slug}">${img(x.i)}<span><b>${esc(x.t)}</b><small>${esc(platLabel(x))}</small></span></a>`).join('')}</aside>
    </div>${footer()}`;
  const start = () => {
    if (settings.newtab) { window.open(encPath(g.p), '_blank', 'noopener'); return false; }
    $('#insert')?.remove();
    launch(g); setMode('docked');
    return true;
  };
  const ins = $('#insert'); if (ins) ins.onclick = start;
  if (player.g === g) { ins?.remove(); stageEl(); setMode('docked'); requestAnimationFrame(positionDock); }
  else if (settings.autostart && !settings.newtab) start();
  $('#reloadBtn').onclick = () => { if (player.g === g) { const f = $('#stageFrame iframe'); f.src = f.src; } else start(); };
  $('#fsBtn').onclick = () => { if (player.g === g || start()) setMode('expanded'); };
  $('#favBtn').onclick = e => { toggleFav(slug); e.currentTarget.classList.toggle('on', favs.has(slug)); };
  document.title = `${g.t} · ${BRAND}`;
}
function pageNotFound() {
  app.innerHTML = `<div class="empty"><b>That page doesn't exist</b><a class="see" href="#/" style="margin-top:14px">Back home${ic('chevron')}</a></div>`;
}

/* ---------- router ---------- */
function route() {
  const parts = decodeURIComponent(location.hash.replace(/^#/, '')).split('/').filter(Boolean);
  document.title = `${BRAND} · Free Online Games`;
  renderRail(parts.length ? '#/' + (parts[0] === 'p' ? parts.slice(0, 2) : parts.slice(0, 2)).join('/') : '#/');
  $('#suggest').hidden = true;
  if (player.g && !(parts[0] === 'play' && parts[1] === player.g.slug)) setMode('mini');
  switch (parts[0]) {
    case undefined: pageHome(); break;
    case 'play': pagePlay(parts[1]); break;
    case 'c': pageCategory(parts[1]); break;
    case 'p': pagePlatform(parts[1], parts[2]); break;
    case 'search': pageSearch(parts.slice(1).join('/')); break;
    case 'popular': pageList({ label: 'Most played', title: 'Popular', sub: 'The games everyone keeps coming back to.', icon: 'flame', color: '#ff5a36', games: GAMES.filter(g => g.pop), key: 'pop', defaultSort: 'shuffle' }); break;
    case 'today': case 'new': { const d = dailyDrop(); pageList({ label: 'Changes every day', title: 'Daily Drop', sub: "Today's Game of the Day, lineup and fresh picks, all in one place.", icon: 'sparkles', color: '#ffc93c', games: [d.top, ...d.lineup, ...d.fresh], key: 'drop' }); break; }
    case 'recent': pageList({ label: 'Your history', title: 'Recently played', sub: 'Saved in this browser only.', icon: 'clock', color: '#57b7ff', games: fromSlugs(recent), key: 'recent' }); break;
    case 'favorites': pageList({ label: 'Your collection', title: 'Favorites', sub: 'Hit the heart on any game to keep it here.', icon: 'heart', color: '#ff6f91', games: fromSlugs([...favs]), key: 'favs' }); break;
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
      `<a class="s-all" href="#/search/${encodeURIComponent(input.value.trim())}">See every match for “${esc(input.value.trim())}”</a>`;
    box.hidden = false;
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!items.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('active', i === sel));
    } else if (e.key === 'Enter') {
      const q = input.value.trim(); if (!q) return;
      location.hash = sel >= 0 ? items[sel].getAttribute('href') : '#/search/' + encodeURIComponent(q);
      box.hidden = true; input.blur();
    } else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) box.hidden = true; });
  box.addEventListener('click', () => { box.hidden = true; input.value = ''; });
  document.addEventListener('keydown', e => { if (e.key === '/' && !e.target.closest('input,textarea')) { e.preventDefault(); input.focus(); } });
}

/* ---------- settings panel ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
function renderSettings() {
  const dlg = $('#settings');
  const sw = (k, label, hint) => `<div class="opt-row"><span><b>${label}</b><small>${hint}</small></span>
    <button class="switch" role="switch" aria-checked="${!!settings[k]}" data-toggle="${k}" aria-label="${label}"></button></div>`;
  dlg.innerHTML = `
    <div class="set-head"><div><div class="label">Saved on this device</div><h2 id="setTitle">Settings</h2></div>
      <button class="tbtn icon-only" data-close title="Close">${ic('close')}</button></div>
    <div class="set-body">
      <div class="set-group"><span class="label">Theme</span>
        <div class="themes">${THEMES.map(t => `<button class="theme-opt" data-theme-id="${t.id}" aria-pressed="${settings.theme === t.id}">
          <span class="sw">${t.swatch.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(t.name)}</b><small>${esc(t.note)}</small></button>`).join('')}</div>
      </div>
      <div class="set-group"><span class="label">Accent color</span>
        <div class="swatches">${ACCENTS.map(([id, c]) => `<button class="swatch" style="--sw:${c}" data-accent-id="${id}" aria-pressed="${settings.accent === id}" title="${id}" aria-label="${id}"></button>`).join('')}</div>
      </div>
      <div class="set-group"><span class="label">Layout</span>
        <div class="opt-row"><span><b>Card size</b><small>How many games fit on a row.</small></span>
          <div class="seg">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, t]) => `<button data-size-id="${k}" class="${settings.size === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        ${sw('names', 'Show game names', 'Titles under every thumbnail.')}
        ${sw('motion', 'Animations', 'Hover lifts, button presses and smooth scrolling.')}
      </div>
      <div class="set-group"><span class="label">Playing</span>
        ${sw('autostart', 'Start games right away', 'Skip the “Start game” screen.')}
        ${sw('newtab', 'Open games in a new tab', 'Instead of playing inside the page.')}
      </div>
      <div class="set-group"><span class="label">Your data</span>
        <div class="danger">
          <button class="tbtn" data-clear="recent">${ic('clock')}Clear recently played</button>
          <button class="tbtn" data-clear="favs">${ic('heart')}Clear favorites</button>
          <button class="tbtn" data-clear="settings">${ic('restart')}Reset settings</button>
        </div>
        <p class="set-note">Settings, favorites and history are stored in this browser only. Nothing is sent to a server.</p>
      </div>
    </div>`;
}
function wireSettings() {
  const dlg = $('#settings');
  $('#settingsBtn').innerHTML = ic('gear');
  $('#settingsBtn').onclick = () => { renderSettings(); dlg.showModal(); };
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.themeId) setSetting('theme', b.dataset.themeId);
    else if (b.dataset.accentId) setSetting('accent', b.dataset.accentId);
    else if (b.dataset.sizeId) setSetting('size', b.dataset.sizeId);
    else if (b.dataset.toggle) setSetting(b.dataset.toggle, !settings[b.dataset.toggle]);
    else if (b.dataset.clear === 'recent') { recent = []; store.set('gs:recent', recent); toast('History cleared'); }
    else if (b.dataset.clear === 'favs') { favs.clear(); store.set('gs:favs', []); toast('Favorites cleared'); }
    else if (b.dataset.clear === 'settings') { Object.assign(settings, SETTINGS_DEFAULTS); store.set('sig:settings', settings); applySettings(); toast('Settings reset'); }
    else return;
    const y = $('.set-body', dlg).scrollTop; renderSettings(); $('.set-body', dlg).scrollTop = y;
    if (b.dataset.clear) route();
  });
  dlg.addEventListener('close', () => { if (/^#?\/?$/.test(location.hash) || /#\/(recent|favorites)/.test(location.hash)) route(); });
}

/* ---------- boot ---------- */
async function boot() {
  $('#brandA').textContent = CONFIG.brand[0]; $('#brandB').textContent = CONFIG.brand[1];
  $('#randomIco').outerHTML = ic('shuffle');
  applySettings();
  wireSettings();
  app.innerHTML = '<div class="empty"><b>Loading games…</b></div>';
  try {
    GAMES = await fetch('games.json', { cache: 'no-cache' }).then(r => r.json());
  } catch (e) {
    app.innerHTML = '<div class="empty"><b>Could not load games.json</b>Serve the site over http(s) instead of opening the file directly.</div>';
    return;
  }
  const used = new Set();
  for (const g of GAMES) {
    let s = slugify(g.t), base = s, n = 2;
    if (g.k === 'Retro' && used.has(s)) s = base = slugify(g.t + ' ' + g.pl);
    while (used.has(s)) s = `${base}-${n++}`;
    used.add(s); g.slug = s; BY_SLUG.set(s, g);
    if (!g.g.includes('Action') && g.g.some(t => t === 'Shooter' || t === 'Fighting')) g.g.push('Action');
  }
  $('#randomBtn').onclick = () => { const pool = GAMES.filter(g => g.c !== 'check'); location.hash = '#/play/' + pool[Math.floor(Math.random() * pool.length)].slug; };
  wireSearch();
  window.addEventListener('hashchange', route);
  route();
}
boot();
})();
