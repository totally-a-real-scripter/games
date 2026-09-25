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
  { id: 'black', name: 'Black', note: 'Deep black with bright accents. The default.', swatch: ['#0b0b0c', '#18181b', '#f2f0ea'], dark: true, c: { paper: '#0b0b0c', surface: '#18181b', ink: '#f2f0ea', line: '#34343a', shadow: '#000000', muted: '#9a9aa3' } },
  { id: 'paper', name: 'Paper', note: 'Warm off-white with bold ink outlines.', swatch: ['#f4efe6', '#fffaf1', '#17130f'], dark: false, c: { paper: '#f4efe6', surface: '#fffaf1', ink: '#17130f', line: '#17130f', shadow: '#17130f', muted: '#6f655a' } },
  { id: 'system', name: 'Match device', note: 'Black or Paper, following your device setting.', swatch: ['#0b0b0c', '#f4efe6', '#ffc93c'] },
  // Theme Store themes (store: true): hidden in Settings until "bought" in the store (#/store). They're all free.
  { id: 'midnight', name: 'Midnight', note: 'Deep navy blue, like a late-night study session.', swatch: ['#0d1321', '#18223a', '#e8ecf6'], store: true, dark: true, c: { paper: '#0d1321', surface: '#18223a', ink: '#e8ecf6', line: '#2c3a5c', shadow: '#05080f', muted: '#8b97b3' } },
  { id: 'forest', name: 'Forest', note: 'Dark pine greens with soft moss text.', swatch: ['#0e1712', '#19281f', '#e7f0e6'], store: true, dark: true, c: { paper: '#0e1712', surface: '#19281f', ink: '#e7f0e6', line: '#2d4435', shadow: '#050a07', muted: '#8fa596' } },
  { id: 'mocha', name: 'Mocha', note: 'Warm coffee browns. Cozy.', swatch: ['#1a1411', '#2a211c', '#f3e9df'], store: true, dark: true, c: { paper: '#1a1411', surface: '#2a211c', ink: '#f3e9df', line: '#4a3a31', shadow: '#0c0806', muted: '#b09c8c' } },
  { id: 'slate', name: 'Slate', note: 'Calm, cool grays that are easy on the eyes.', swatch: ['#1e2226', '#2c3238', '#eceff2'], store: true, dark: true, c: { paper: '#1e2226', surface: '#2c3238', ink: '#eceff2', line: '#444c55', shadow: '#111417', muted: '#9aa4ad' } },
  { id: 'terminal', name: 'Terminal', note: 'Green-on-black hacker mode, all in monospace.', swatch: ['#000000', '#07150b', '#7dff9b'], store: true, dark: true, c: { paper: '#000000', surface: '#07150b', ink: '#7dff9b', line: '#1f5a2d', shadow: '#000000', muted: '#3fae5c' } },
  { id: 'arcade', name: 'Arcade', note: 'Neon pink outlines on deep purple.', swatch: ['#140a24', '#231440', '#fbeaff'], store: true, dark: true, c: { paper: '#140a24', surface: '#231440', ink: '#fbeaff', line: '#ff4fd8', shadow: '#05010c', muted: '#b69bd6' } },
  { id: 'candy', name: 'Candy', note: 'Bubblegum pink with bold outlines.', swatch: ['#fff0f6', '#fffafc', '#3a1030'], store: true, dark: false, c: { paper: '#fff0f6', surface: '#fffafc', ink: '#3a1030', line: '#3a1030', shadow: '#3a1030', muted: '#8a5a78' } },
  { id: 'seafoam', name: 'Seafoam', note: 'Light, breezy blue-greens.', swatch: ['#e9f6f4', '#f7fdfc', '#0d2b33'], store: true, dark: false, c: { paper: '#e9f6f4', surface: '#f7fdfc', ink: '#0d2b33', line: '#0d2b33', shadow: '#0d2b33', muted: '#4f6f75' } },
  { id: 'oled', name: 'OLED', note: 'True black everywhere. Saves battery on OLED screens.', swatch: ['#000000', '#000000', '#ffffff'], store: true, dark: true, c: { paper: '#000000', surface: '#000000', ink: '#ffffff', line: '#262626', shadow: '#000000', muted: '#8c8c8c' } },
  { id: 'vampire', name: 'Vampire', note: 'Dark purple and blood red. Spooky season, all year.', swatch: ['#16111c', '#241b2e', '#f4ecff'], store: true, dark: true, c: { paper: '#16111c', surface: '#241b2e', ink: '#f4ecff', line: '#4a3560', shadow: '#07040a', muted: '#a894c0' } },
  { id: 'frost', name: 'Frost', note: 'Cool arctic blues, calm and clean.', swatch: ['#1f2430', '#2c3344', '#e5ecf6'], store: true, dark: true, c: { paper: '#1f2430', surface: '#2c3344', ink: '#e5ecf6', line: '#434c60', shadow: '#11141b', muted: '#96a3b8' } },
  { id: 'sunset', name: 'Sunset', note: 'Peach and orange, like the end of a summer day.', swatch: ['#ffe9d6', '#fff6ee', '#3a1a0c'], store: true, dark: false, c: { paper: '#ffe9d6', surface: '#fff6ee', ink: '#3a1a0c', line: '#3a1a0c', shadow: '#3a1a0c', muted: '#8a5a42' } },
  { id: 'lavender', name: 'Lavender', note: 'Soft purple, light and relaxing.', swatch: ['#efe9fb', '#faf7ff', '#2a1d45'], store: true, dark: false, c: { paper: '#efe9fb', surface: '#faf7ff', ink: '#2a1d45', line: '#2a1d45', shadow: '#2a1d45', muted: '#6d5e8e' } },
  { id: 'matcha', name: 'Matcha', note: 'Creamy green tea tones.', swatch: ['#e7efd9', '#f6f9ef', '#1f2e14'], store: true, dark: false, c: { paper: '#e7efd9', surface: '#f6f9ef', ink: '#1f2e14', line: '#1f2e14', shadow: '#1f2e14', muted: '#5a6b48' } },
  { id: 'retro-98', name: 'Retro 98', note: 'Gray boxes and teal desktop, like an old PC.', swatch: ['#008080', '#c0c0c0', '#000000'], store: true, dark: false, c: { paper: '#008080', surface: '#c0c0c0', ink: '#000000', line: '#000000', shadow: '#000000', muted: '#404040' } }
];
const STORE_PRICE = 'FREE';
const ACCENTS = [['mustard', '#ffc93c'], ['tomato', '#ff5a36'], ['teal', '#1fc7b2'], ['lilac', '#b39cff'], ['sky', '#57b7ff'], ['lime', '#b8e05a'], ['pink', '#ff8ad8']];
const SETTINGS_DEFAULTS = { theme: 'black', accent: 'mustard', size: 'm', names: true, motion: true, autostart: false, newtab: false, autoblank: false, cloak: 'off', customCloak: null };

/* ---------- tab cloak ----------
   Changes only this browser tab's title and icon. Icons come from Google's favicon service.
   To add one: { id, name, title (tab text), icon (favicon URL) }. */
const CLOAKS = [
  { id: 'off', name: 'Off', note: 'Show the real name and icon.' },
  { id: 'classroom', name: 'Google Classroom', title: 'Classes', icon: 'https://ssl.gstatic.com/classroom/ic_product_classroom_32.png' },
  { id: 'canvas', name: 'Canvas', title: 'Dashboard', icon: 'https://canvas.instructure.com/favicon.ico' },
  { id: 'google', name: 'Google', title: 'Google', icon: 'https://www.google.com/favicon.ico' },
  { id: 'docs', name: 'Google Docs', title: 'Google Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  { id: 'drive', name: 'Google Drive', title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_32dp.png' },
  { id: 'custom', name: 'Custom', note: 'Your own name and icon.' },
  { id: 'invisible', name: 'Invisible', note: 'Blank tab name and no icon.' }
];
const favUrl = d => `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(d)}`;
const BLANK_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const BLANK_TITLE = '\u2800';   // a blank character browsers don't trim, so the tab shows nothing

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
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  bag: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  check: '<path d="M5 12.5 10 17.5 19.5 7"/>'
});
let ACTIVE_SPEC = null;   // the active JSON / Theme Maker theme (null for CSS-file themes); see theme engine below
const ic = name => {
  const icons = ACTIVE_SPEC?.images?.icons, pic = icons && (icons[name] || icons['*']);
  if (pic) return `<img class="i ti" src="${esc(themeUrl(pic))}" alt="" aria-hidden="true">`;
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.gamepad}</svg>`;
};
// A game's picture, or one of the active theme's "games" pictures (the same game always gets the same one).
function gi(g) {
  let pics = ACTIVE_SPEC?.images?.games;
  if (typeof pics === 'string') pics = [pics];
  pics = Array.isArray(pics) ? pics.filter(Boolean) : [];
  if (!pics.length) return g.i;
  let h = 0; for (const ch of (g.slug || g.t || '')) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return themeUrl(pics[Math.abs(h) % pics.length]);
}

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
const encPath = p => /^(https?:|data:|blob:)/i.test(p) ? p : p.split('/').map(encodeURIComponent).join('/');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

const settings = Object.assign({}, SETTINGS_DEFAULTS, store.get('sig:settings', {}));
/* Themes "bought" in the Theme Store, saved on this device. Themes without store: true are always owned. */
const ownedThemes = new Set(store.get('sig:themes', []));
const ownsTheme = id => { const t = THEMES.find(x => x.id === id); return !!t && (!t.store || t.mine || ownedThemes.has(id)); };
function buyTheme(id) { ownedThemes.add(id); store.set('sig:themes', [...ownedThemes]); }
function resolvedTheme() {
  const t = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'paper' : 'black') : settings.theme;
  return t !== 'system' && ownsTheme(t) ? t : 'black';
}
function applySettings() {
  const h = document.documentElement, t = resolvedTheme();
  h.dataset.theme = t; h.dataset.accent = settings.accent; h.dataset.size = settings.size;
  h.dataset.names = settings.names ? 'on' : 'off'; h.dataset.motion = settings.motion ? 'on' : 'off';
  const changed = DRAFT_ON ? false : paintTheme(THEMES.find(x => x.id === t) || THEMES[0]);
  applyCloak();
  return changed;
}
// Returns after redrawing the page when the new theme swaps game pictures or icons.
function setSetting(k, v) { settings[k] = v; store.set('sig:settings', settings); if (applySettings() && GAMES.length) route(); }
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (settings.theme === 'system') applySettings(); });

let GAMES = [], BY_SLUG = new Map();
const BRAND = CONFIG.brand.join('');
let realTitle = `${BRAND} · Free Online Games`;
function setTitle(t) { realTitle = t; applyCloak(); }
function applyCloak(force) {
  const c = CLOAKS.find(x => x.id === settings.cloak) || CLOAKS[0];
  let title = realTitle, icon = 'assets/favicon.svg';
  if (c.id === 'invisible') { title = BLANK_TITLE; icon = BLANK_ICON; }
  else if (c.id === 'custom') {
    const cc = customCloak();
    if (cc) { title = cc.title || BLANK_TITLE; icon = cc.icon || BLANK_ICON; }
  }
  else if (c.icon) { title = c.title; icon = c.icon; }
  if (document.title !== title) document.title = title;
  const links = document.querySelectorAll('link[rel~="icon"]'), old = links[0];
  if (force || links.length > 1 || !old || old.getAttribute('href') !== icon) {
    links.forEach((l, i) => { if (i) l.remove(); });
    // Swap in a fresh <link>: some browsers ignore an href change on the existing one.
    const l = document.createElement('link'); l.rel = 'icon'; l.href = icon;
    if (icon.endsWith('.svg')) l.type = 'image/svg+xml';
    old ? old.replaceWith(l) : document.head.appendChild(l);
  }
  // Remembered so index.html can apply the cloak before the page even loads (no flash of the real title).
  store.set('sig:cloak', c.id === 'off' ? null : { title, icon });
  // Inside the about:blank tab the real tab is the outer page, so mirror the cloak there.
  if (IN_BLANK) try {
    const td = window.top.document;
    td.title = c.id === 'off' ? '' : title;   // empty title: the tab just reads "about:blank"
    td.querySelectorAll('link[rel~="icon"]').forEach(l => l.remove());
    if (c.id !== 'off') { const l = td.createElement('link'); l.rel = 'icon'; l.href = icon; td.head.appendChild(l); }
  } catch (e) {}
}

/* Custom cloak (Settings > Tab cloak > Make your own): { title, icon }, or null when not set. */
function customCloak() {
  const cc = settings.customCloak;
  return cc && (cc.title || cc.icon) ? cc : null;
}
// Only web or inline-image addresses are accepted as icons.
const okIconUrl = u => /^https?:\/\/\S+$/i.test(u) || /^data:image\//i.test(u);

/* ---------- about:blank ----------
   Opens the site inside a frame on an about:blank tab, so the address bar and history show about:blank.
   This tab then moves to BLANK_EXIT (going back to the sign-in page would sign the about:blank tab out).
   Keep writeBlankPage in sync with the copy in login.html. */
const BLANK_EXIT = 'https://www.google.com';
const IN_BLANK = (() => { try { return window.top !== window && window.top.document.documentElement.hasAttribute('data-sig-blank'); } catch (e) { return false; } })();
function writeBlankPage(w) {
  const cl = store.get('sig:cloak', null), d = w.document;
  d.open();
  d.write(`<!DOCTYPE html><html data-sig-blank><head><meta charset="utf-8"><title>${cl && cl.title ? esc(cl.title) : ''}</title>` +
    (cl && cl.icon ? `<link rel="icon" href="${esc(cl.icon)}">` : '') +
    `<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}iframe{display:block;border:0;width:100%;height:100%}</style></head>` +
    `<body><iframe src="${esc(location.origin + '/app')}" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowfullscreen></iframe></body></html>`);
  d.close();
}
function openInBlank() {
  if (IN_BLANK) return toast('Already open in about:blank');
  const w = window.open('about:blank', '_blank');
  if (!w) return toast('Pop-up blocked. Allow pop-ups for this site and try again.');
  writeBlankPage(w);
  location.replace(BLANK_EXIT);
}
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
    <div class="thumb">${sticker}${fav}${img(gi(g))}</div>
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
    pill('#/store', 'bag', '#1fc7b2', 'Theme Store') +
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
        <div class="art"><img src="${encPath(gi(top))}" alt=""></div>
        <span class="stamp"><small>GAME OF THE DAY</small><b>${month} ${d.getDate()}</b></span>
        <div class="body">
          <div><div class="label">Daily Drop · ${esc(platLabel(top))}</div><h1>${esc(top.t)}</h1></div>
          <span class="go">${ic('play')}Play</span>
        </div>
      </a>
      <div class="lineup">
        <div class="lineup-head"><h2>Also dropping today</h2><span class="clock" id="clock"></span></div>
        <ol>${lineup.map((g, i) => `<li><a href="#/play/${g.slug}"><span class="num">0${i + 1}</span>${img(gi(g))}<span><b>${esc(g.t)}</b><span class="label">${esc(platLabel(g))} · ${esc(g.g[0])}</span></span></a></li>`).join('')}</ol>
      </div>
    </section>

    ${recentGames.length ? `<section class="block">${head('Pick up where you left off', 'Jump back in', '#/recent')}<div class="grid">${recentGames.map(card).join('')}</div></section>` : ''}

    <section class="block">${head('Shuffled fresh every day', 'Fresh picks', '#/today')}<div class="grid">${fresh.map(card).join('')}</div></section>

    <section class="block">${head('Three ways to play', 'Pick a platform')}
      <div class="plats">${PLATFORMS.map(([n, i, c, label, desc]) => `<a class="plat" href="#/p/${slugify(n)}" style="--c:${c}"><div><h3>${label}</h3><p>${desc}</p></div><span class="count">${GAMES.filter(g => g.k === n).length.toLocaleString()} games →</span><span class="big-ico">${ic(i)}</span></a>`).join('')}</div>
    </section>

    <section class="block">${head('The ones everyone keeps playing', 'Top 10 today', '#/popular')}
      <div class="charts">${charts.map((g, i) => `<a class="chart-row" href="#/play/${g.slug}"><span class="rank">${i + 1}</span>${img(gi(g))}<span><b>${esc(g.t)}</b><span class="label">${esc(platLabel(g))} · ${esc(g.g[0])}</span></span></a>`).join('')}</div>
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
    if (a === 'shrink') { exitFullWindow(); }
    else if (a === 'expand') { setMode('expanded'); }
    else if (a === 'resume') { location.hash = '#/play/' + player.g.slug; }
    else if (a === 'close') { closeGame(); }
  });
  new ResizeObserver(positionDock).observe(document.body);
  addEventListener('resize', positionDock);
  addEventListener('keydown', e => { if (e.key === 'Escape' && player.mode === 'expanded') exitFullWindow(); });
  return st;
}
/* Leaving full window always goes back to the game's own page and its normal player.
   (The small corner window is only for when you browse to another page.) */
function exitFullWindow() {
  if (!player.g) return;
  if (onPlayPage()) setMode('docked');
  else location.hash = '#/play/' + player.g.slug;   // the play page re-docks the running game without reloading it
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
  const bg = encPath(gi(g)).replace(/'/g, '%27');
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
              <div class="inner"><img src="${encPath(gi(g))}" alt=""><span class="go">${ic('play')}Start game</span></div></div>
          </div>
          <div class="cab-foot"><span class="label">Filed under</span>
            ${g.g.map(t => { const [n, i, c] = genreInfo(t); return `<a class="pill" href="#/c/${slugify(n)}" style="--c:${c}">${ic(i)}${esc(n)}</a>`; }).join('')}
            ${g.k === 'Retro' ? `<a class="pill" href="#/p/retro/${slugify(g.pl)}" style="--c:#ff8ad8">${ic('gamepad')}${esc(g.pl)}</a>` : (p => `<a class="pill" href="#/p/${slugify(p[0])}" style="--c:${p[2]}">${ic(p[1])}${p[3]}</a>`)(PLATFORMS.find(p => p[0] === g.k))}
          </div>
        </div>
        <section class="block" style="margin-top:40px">${head('If you like this one', 'More like it')}<div class="grid g4">${sim.slice(6, 14).map(card).join('')}</div></section>
      </div>
      <aside class="upnext"><h2>Up next</h2>${sim.slice(0, 6).map(x => `<a href="#/play/${x.slug}">${img(gi(x))}<span><b>${esc(x.t)}</b><small>${esc(platLabel(x))}</small></span></a>`).join('')}</aside>
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
  setTitle(`${g.t} · ${BRAND}`);
}
/* ---------- theme engine ----------
   Themes can be a CSS file (assets/themes/<id>.css, listed in THEMES above) or a simple JSON "spec":
   - in assets/themes/themes.json (shows up in the Theme Store for everyone), or
   - made in the Theme Maker (#/make) and saved in this browser ("Made by you").
   A spec is turned into CSS here, so no CSS knowledge is needed. See assets/themes/README.md. */
const THEME_DIR = 'assets/themes/';
const MY_THEMES_KEY = 'sig:myThemes';
const DARK_BASE = { background: '#0b0b0c', background2: '#151517', card: '#18181b', text: '#f2f0ea', lines: '#34343a', shadow: '#000000', muted: '#9a9aa3' };
const LIGHT_BASE = { background: '#f4efe6', background2: '#ebe4d7', card: '#fffaf1', text: '#17130f', lines: '#17130f', shadow: '#17130f', muted: '#6f655a' };
let PACK_RAW = [];        // themes.json as loaded (the Theme Maker's download adds to it)
let DRAFT_ON = false;     // the Theme Maker is previewing a theme on the whole site

// Picture paths in a theme are relative to assets/themes/ ("images/cat.png"), or a full web address.
const themeUrl = u => !u ? '' : /^(https?:|data:|blob:|\/)/i.test(u) ? u : THEME_DIR + String(u).replace(/^\.?\//, '');
const cssUrl = u => `url("${themeUrl(u).replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")`;
const cssVal = v => typeof v === 'string' && v.trim() && !/[;{}<>]/.test(v) ? v.trim() : null;
const cssFont = v => typeof v === 'string' && v.trim() ? v.trim().replace(/["\\;{}<>]/g, '') : null;
const numOr = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v) ? +v : d);

// A theme spec (from JSON or the maker) -> an entry in THEMES.
function specToTheme(raw, source) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  let id = slugify(String(raw.id || raw.name || ''));
  if (!id || id === 'game') return null;
  if (source === 'mine' && !id.startsWith('my-')) id = 'my-' + id;
  const dark = raw.dark !== false && raw.dark !== 'false';
  const base = dark ? DARK_BASE : LIGHT_BASE, col = raw.colors || {};
  const colors = {};
  for (const k of Object.keys(base)) colors[k] = cssVal(col[k]) || base[k];
  colors.accent = cssVal(col.accent); colors.dots = cssVal(col.dots);
  return {
    id, name: String(raw.name || id).slice(0, 60), note: String(raw.note || '').slice(0, 160),
    price: raw.price ? String(raw.price).slice(0, 40) : '', dark, store: true, mine: source === 'mine', source,
    spec: raw, colors, swatch: [colors.background, colors.card, colors.text],
    c: { paper: colors.background, surface: colors.card, ink: colors.text, line: colors.lines, shadow: colors.shadow, muted: colors.muted }
  };
}

// The CSS for a spec theme. Everything is scoped to :root[data-theme="<id>"].
function themeCss(t) {
  const s = t.spec, c = t.colors, im = s.images || {}, L = s.layout || {}, R = `:root[data-theme="${t.id}"]`;
  const font = cssFont(s.font), hfont = cssFont(s.headingFont);
  let css = `${R}{--paper:${c.background};--paper-2:${c.background2};--surface:${c.card};--ink:${c.text};--line:${c.lines};` +
    `--shadow-c:${L.shadows === false ? 'transparent' : c.shadow};--muted:${c.muted};` +
    `--dots:${c.dots || (t.dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)')};color-scheme:${t.dark ? 'dark' : 'light'};` +
    (font ? `--sans:"${font}",system-ui,sans-serif;` : '') +
    `--r:${Math.max(0, Math.min(60, numOr(L.radius, 12)))}px;--bw:${Math.max(0, Math.min(8, numOr(L.border, 2)))}px}`;
  if (c.accent) css += `${R}[data-accent]{--accent:${c.accent}}`;
  if (hfont) css += `${R} h1,${R} h2{font-family:"${hfont}",var(--sans)}`;
  if (im.background) {
    const mode = im.backgroundStyle || 'tile', size = numOr(im.backgroundSize, 0);
    css += `${R} body{background-image:${cssUrl(im.background)};` + (
      mode === 'cover' ? 'background-size:cover;background-position:center;background-repeat:no-repeat;background-attachment:fixed}' :
      mode === 'stretch' ? 'background-size:100% 100%;background-repeat:no-repeat;background-attachment:fixed}' :
      `background-size:${size > 0 ? size + 'px' : 'auto'};background-repeat:repeat}`);
  }
  if (im.logo) css += `${R} .logo-box{display:none}${R} .logo-img{display:block}`;
  if (im.cursor) {
    const cur = cssUrl(im.cursor), hov = cssUrl(im.cursorHover || im.cursor);
    css += `${R},${R} *{cursor:${cur} 4 4,auto!important}${R} a,${R} a *,${R} button,${R} button *,${R} [role=switch]{cursor:${hov} 4 4,pointer!important}`;
  }
  if (L.wobble) css += `${R} .card:nth-child(odd){rotate:-2deg}${R} .card:nth-child(even){rotate:1.5deg}${R} .card:nth-child(3n){rotate:3deg}`;
  if (L.spin) css += `${R} .card{transition:transform .12s,box-shadow .12s,rotate .8s}${R} .card:hover{rotate:360deg}`;
  if (L.roundThumbs) css += `${R} .card .thumb{aspect-ratio:1;border-radius:50%;margin:10px 10px 0;border:var(--bw) solid var(--line)}`;
  const tilt = Math.max(-10, Math.min(10, numOr(L.tilt, 0)));
  if (tilt || L.mirror) css += `${R}{overflow-x:hidden}${R} body{overflow-x:hidden;${tilt ? `rotate:${tilt}deg;` : ''}${L.mirror ? 'scale:-1 1;' : ''}}`;
  if (typeof s.css === 'string') css += '\n' + s.css.replace(/<\/?style/gi, '');
  return css;
}

// Put a theme on the page: its CSS file or generated CSS, font, logo, logo text and header icons.
function paintTheme(t) {
  const h = document.documentElement;
  h.dataset.theme = t.id;
  let link = document.getElementById('themeCss');
  if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.id = 'themeCss'; document.head.appendChild(link); }
  let style = document.getElementById('themeStyle');
  if (!style) { style = document.createElement('style'); style.id = 'themeStyle'; document.head.appendChild(style); }
  const prevSpec = ACTIVE_SPEC;
  ACTIVE_SPEC = t.spec || null;
  if (t.spec) {
    link.removeAttribute('href');
    const css = themeCss(t);
    if (style.textContent !== css) style.textContent = css;
    // Remembered so index.html can paint this theme before the page loads (no flash of the default theme).
    if (t.id !== 'draft') { try { localStorage.setItem('sig:themeCss', JSON.stringify({ id: t.id, css })); } catch (e) {} }
  } else {
    const href = `${THEME_DIR}${t.id}.css`;
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    style.textContent = '';
    try { localStorage.removeItem('sig:themeCss'); } catch (e) {}
  }
  // Google Font, if the theme names one.
  const fonts = [cssFont(t.spec?.font), cssFont(t.spec?.headingFont)].filter(Boolean);
  let fl = document.getElementById('themeFont');
  if (fonts.length) {
    const href = 'https://fonts.googleapis.com/css2?' + fonts.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+')).join('&') + '&display=swap';
    if (!fl) { fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.id = 'themeFont'; document.head.appendChild(fl); }
    if (fl.getAttribute('href') !== href) fl.setAttribute('href', href);
  } else if (fl) fl.remove();
  // Logo picture and logo text.
  const logo = $('.logo'); let li = $('.logo-img');
  const logoPic = t.spec?.images?.logo;
  if (logo && logoPic) {
    if (!li) { li = document.createElement('img'); li.className = 'logo-img'; li.alt = ''; logo.appendChild(li); }
    if (li.getAttribute('src') !== themeUrl(logoPic)) li.src = themeUrl(logoPic);
  } else if (li) li.remove();
  const lt = Array.isArray(t.spec?.logoText) ? t.spec.logoText : [];
  const a = $('#brandA'), b = $('#brandB');
  if (a) a.textContent = lt[0] ? String(lt[0]) : CONFIG.brand[0];
  if (b) b.textContent = lt[0] || lt[1] ? String(lt[1] || '') : CONFIG.brand[1];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.swatch?.[0] || '#0b0b0c';
  // Icons/game pictures changed: redraw the header icons now, and the page if it's showing.
  if (prevSpec !== ACTIVE_SPEC) {
    const rb = $('#randomBtn'); if (rb && rb.firstElementChild && !rb.firstElementChild.classList.contains('tbtn-label')) rb.firstElementChild.outerHTML = ic('shuffle');
    const sb = $('#settingsBtn'); if (sb && sb.innerHTML) sb.innerHTML = ic('gear');
  }
  return prevSpec !== ACTIVE_SPEC;
}

// Load assets/themes/themes.json and the themes made in this browser, and add them to THEMES.
async function loadThemePacks() {
  try {
    const data = await fetch(THEME_DIR + 'themes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null);
    PACK_RAW = Array.isArray(data?.themes) ? data.themes : [];
  } catch (e) { PACK_RAW = []; console.warn('assets/themes/themes.json could not be read. Check it for a missing comma or quote.', e); }
  addSpecThemes();
}
function myThemesRaw() { try { const v = JSON.parse(localStorage.getItem(MY_THEMES_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function addSpecThemes() {
  for (let i = THEMES.length - 1; i >= 0; i--) if (THEMES[i].spec) THEMES.splice(i, 1);
  for (const [list, src] of [[myThemesRaw(), 'mine'], [PACK_RAW, 'pack']]) for (const raw of list) {
    const t = specToTheme(raw, src);
    if (t && !THEMES.some(x => x.id === t.id)) THEMES.push(t);
  }
}

/* ---------- theme maker (#/make, #/make/<theme id>) ---------- */
const MAKER_FONTS = ['Comic Neue', 'Press Start 2P', 'Bangers', 'Creepster', 'Pacifico', 'Lobster', 'Silkscreen', 'VT323', 'Luckiest Guy', 'Chewy', 'Permanent Marker', 'Rubik Glitch', 'Fredoka', 'Space Grotesk', 'JetBrains Mono'];
function blankSpec(dark = true) {
  return {
    name: 'My Theme', note: 'Made in the Theme Maker.', price: '1 high five', dark,
    colors: Object.assign({}, dark ? DARK_BASE : LIGHT_BASE, { accent: '' }),
    font: '', headingFont: '', logoText: ['', ''],
    images: { background: '', backgroundStyle: 'tile', backgroundSize: '', logo: '', cursor: '', games: [], icons: { '*': '' } },
    layout: { radius: 12, border: 2, shadows: true, wobble: false, spin: false, roundThumbs: false, tilt: 0, mirror: false },
    css: ''
  };
}
// Fill in anything missing so the form always has a value to show.
function fullSpec(raw) {
  const b = blankSpec(raw.dark !== false), s = JSON.parse(JSON.stringify(raw));
  const out = Object.assign({}, b, s);
  out.colors = Object.assign({}, b.colors, s.colors); out.images = Object.assign({}, b.images, s.images);
  out.images.icons = Object.assign({ '*': '' }, s.images?.icons); out.layout = Object.assign({}, b.layout, s.layout);
  if (typeof out.images.games === 'string') out.images.games = [out.images.games];
  if (!Array.isArray(out.logoText)) out.logoText = ['', ''];
  return out;
}
// A spec without empty values, ready to save or share.
function cleanSpec(spec, names) {
  const pic = u => names && names.get(u) ? 'images/' + names.get(u) : u;
  const s = JSON.parse(JSON.stringify(spec)), out = { id: slugify(s.name || 'my-theme'), name: s.name, note: s.note, price: s.price, dark: !!s.dark };
  out.colors = {}; for (const [k, v] of Object.entries(s.colors)) if (v) out.colors[k] = v;
  if (s.font) out.font = s.font; if (s.headingFont) out.headingFont = s.headingFont;
  if (s.logoText?.[0] || s.logoText?.[1]) out.logoText = s.logoText;
  const im = {};
  for (const k of ['background', 'logo', 'cursor']) if (s.images[k]) im[k] = pic(s.images[k]);
  if (im.background) { im.backgroundStyle = s.images.backgroundStyle || 'tile'; if (s.images.backgroundSize) im.backgroundSize = +s.images.backgroundSize; }
  if (s.images.games?.length) im.games = s.images.games.map(pic);
  const icons = {}; for (const [k, v] of Object.entries(s.images.icons || {})) if (v) icons[k] = pic(v);
  if (Object.keys(icons).length) im.icons = icons;
  if (Object.keys(im).length) out.images = im;
  out.layout = s.layout;
  if (s.css) out.css = s.css;
  return out;
}

function pageMaker(fromId) {
  setTitle(`Theme Maker · ${BRAND}`);
  const from = THEMES.find(t => t.id === fromId);
  let spec, editingMine = null;
  if (from?.spec) { spec = fullSpec(from.spec); if (from.mine) editingMine = from.id; else spec.name = from.name + ' Remix'; }
  else if (from?.c) { spec = blankSpec(from.dark !== false); Object.assign(spec.colors, { background: from.c.paper, card: from.c.surface, text: from.c.ink, lines: from.c.line, shadow: from.c.shadow, muted: from.c.muted }); spec.name = from.name + ' Remix'; }
  else spec = blankSpec(resolvedTheme() !== 'paper');
  const names = new Map();   // uploaded picture (data: URL) -> its file name, for sharing
  const sample = shuffled(GAMES.filter(g => g.c !== 'check'), 'maker').slice(0, 6);

  const colorRow = (k, label) => `<label class="mk-color"><input type="color" data-k="colors.${k}" value="${esc(/^#[0-9a-f]{6}$/i.test(spec.colors[k]) ? spec.colors[k] : '#888888')}"><span>${label}</span></label>`;
  const picField = (k, label, hint, multi) => `<div class="mk-pic" data-pic="${k}">
      <div class="mk-pic-head"><b>${label}</b><small>${hint}</small></div>
      <div class="mk-thumbs"></div>
      <div class="mk-pic-row"><label class="tbtn mk-file">${ic('download')}Choose picture${multi ? 's' : ''}<input type="file" accept="image/*" ${multi ? 'multiple' : ''} hidden></label>
        <input class="mk-url" type="text" placeholder="${multi ? 'images/a.png, images/b.png' : 'images/my-picture.png or https://…'}" spellcheck="false">
        <button class="tbtn mk-clear" type="button">Clear</button></div></div>`;
  const toggle = (k, label, hint) => `<div class="opt-row"><span><b>${label}</b><small>${hint}</small></span><button type="button" class="switch" role="switch" data-sw="layout.${k}" aria-label="${label}"></button></div>`;
  const range = (k, label, min, max, unit) => `<label class="mk-range"><span>${label} <output data-out="layout.${k}"></output>${unit}</span><input type="range" min="${min}" max="${max}" step="1" data-k="layout.${k}"></label>`;

  app.innerHTML = `
    <section class="banner" style="--c:#b39cff"><span class="badge-ico">${ic('sparkles')}</span>
      <div><div class="label">${editingMine ? 'Editing your theme' : 'Make a theme, no code needed'}</div><h1>Theme Maker</h1>
      <p>Everything you change shows up on the whole site right away. Pictures can be PNG, JPG, GIF or SVG.</p></div></section>
    <div class="maker">
      <form class="mk-form" id="mkForm" autocomplete="off" onsubmit="return false">
        <fieldset><legend>1 · The basics</legend>
          <label class="mk-field"><span>Theme name</span><input data-k="name" maxlength="60"></label>
          <label class="mk-field"><span>Description</span><input data-k="note" maxlength="160"></label>
          <label class="mk-field"><span>Joke price <small>(it's still free)</small></span><input data-k="price" maxlength="40" placeholder="3 potatoes"></label>
          <div class="opt-row"><span><b>Starting colors</b><small>Picks a dark or light set of colors to start from.</small></span>
            <div class="seg"><button type="button" data-base="dark">Dark</button><button type="button" data-base="light">Light</button></div></div>
        </fieldset>
        <fieldset><legend>2 · Colors</legend>
          <div class="mk-colors">${colorRow('background', 'Background')}${colorRow('background2', 'Background 2')}${colorRow('card', 'Cards')}${colorRow('text', 'Text')}${colorRow('lines', 'Outlines')}${colorRow('shadow', 'Shadows')}${colorRow('muted', 'Faded text')}
            <label class="mk-color"><input type="color" data-k="colors.accent" value="${esc(/^#[0-9a-f]{6}$/i.test(spec.colors.accent) ? spec.colors.accent : '#ffc93c')}"><span>Accent</span></label></div>
          <div class="opt-row"><span><b>Lock the accent color</b><small>Off: everyone keeps the accent they picked in Settings.</small></span><button type="button" class="switch" role="switch" data-accent-lock aria-label="Lock the accent color"></button></div>
        </fieldset>
        <fieldset><legend>3 · Fonts &amp; logo</legend>
          <datalist id="mkFonts">${MAKER_FONTS.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
          <label class="mk-field"><span>Font <small>(any Google Font name)</small></span><input data-k="font" list="mkFonts" placeholder="Site default"></label>
          <label class="mk-field"><span>Headings font</span><input data-k="headingFont" list="mkFonts" placeholder="Same as the font"></label>
          <div class="mk-two"><label class="mk-field"><span>Logo text</span><input data-k="logoText.0" placeholder="${esc(CONFIG.brand[0])}" maxlength="24"></label>
            <label class="mk-field"><span>Logo ending</span><input data-k="logoText.1" placeholder="${esc(CONFIG.brand[1])}" maxlength="12"></label></div>
          ${picField('logo', 'Logo picture', 'Replaces the whole logo. About 150×44 looks best.')}
        </fieldset>
        <fieldset><legend>4 · Pictures</legend>
          ${picField('background', 'Background', 'Behind everything.')}
          <div class="mk-two"><label class="mk-field"><span>Background style</span><select data-k="images.backgroundStyle"><option value="tile">Tile (repeat)</option><option value="cover">Fill the screen</option><option value="stretch">Stretch</option></select></label>
            <label class="mk-field"><span>Tile size <small>(px, blank = actual size)</small></span><input data-k="images.backgroundSize" type="number" min="8" max="2000" placeholder="auto"></label></div>
          ${picField('games', 'Game pictures', 'Replaces every game’s thumbnail. Add a few and they get mixed.', true)}
          ${picField('icons', 'Icon picture', 'Replaces every small icon (menu, buttons).')}
          ${picField('cursor', 'Mouse cursor', 'Keep it small: 32×32 works everywhere, 128×128 is the max.')}
        </fieldset>
        <fieldset><legend>5 · Layout</legend>
          ${range('radius', 'Corner roundness', 0, 40, 'px')}${range('border', 'Outline thickness', 0, 6, 'px')}${range('tilt', 'Tilt the whole site', -5, 5, '°')}
          ${toggle('shadows', 'Shadows', 'The chunky shadows under cards and buttons.')}
          ${toggle('wobble', 'Wobbly cards', 'Every game card is a little crooked.')}
          ${toggle('spin', 'Spin on hover', 'Cards do a full spin when you point at them.')}
          ${toggle('roundThumbs', 'Round thumbnails', 'Game pictures become circles.')}
          ${toggle('mirror', 'Mirror world', 'Flips the whole site backwards. Good luck reading.')}
        </fieldset>
        <details class="mk-adv"><summary>Advanced: extra CSS</summary>
          <p class="set-note">Anything here is added as-is. Start rules with <code>:root[data-theme="ID"]</code> so they only apply to this theme.</p>
          <textarea data-k="css" rows="6" spellcheck="false" placeholder=".card{border-style:dashed}"></textarea></details>
        <div class="mk-actions">
          <button class="tbtn mk-save" type="button" data-act="save">${ic('check')}${editingMine ? 'Save changes' : 'Save & use'}</button>
          <button class="tbtn" type="button" data-act="share">${ic('download')}Add to the site</button>
          <button class="tbtn" type="button" data-act="reset">${ic('restart')}Start over</button>
          ${editingMine ? `<button class="tbtn" type="button" data-act="delete">${ic('close')}Delete</button>` : ''}
        </div>
        <div class="mk-share" id="mkShare" hidden></div>
      </form>
      <aside class="mk-preview"><div class="label">Preview</div><div class="grid g3">${sample.map(card).join('')}</div>
        <p class="set-note">The whole site (menu, logo, background) is showing your theme too.</p></aside>
    </div>
    ${footer()}`;

  const form = $('#mkForm');
  const getK = k => k.split('.').reduce((o, x) => o?.[x], spec);
  const setK = (k, v) => { const ks = k.split('.'), last = ks.pop(); const o = ks.reduce((o, x) => o[x], spec); o[last] = v; };
  const picVal = k => k === 'icons' ? spec.images.icons['*'] : spec.images[k];
  const setPic = (k, v) => { if (k === 'icons') spec.images.icons['*'] = v; else spec.images[k] = v; };
  function fill() {
    form.querySelectorAll('[data-k]').forEach(el => { if (el.type === 'color' && el.dataset.k === 'colors.accent') return; const v = getK(el.dataset.k); el.value = v ?? ''; });
    form.querySelectorAll('[data-out]').forEach(el => { el.textContent = getK(el.dataset.out); });
    form.querySelectorAll('[data-sw]').forEach(el => el.setAttribute('aria-checked', !!getK(el.dataset.sw)));
    $('[data-accent-lock]', form).setAttribute('aria-checked', !!spec.colors.accent);
    form.querySelectorAll('[data-base]').forEach(el => el.classList.toggle('on', (el.dataset.base === 'dark') === !!spec.dark));
    form.querySelectorAll('[data-pic]').forEach(box => {
      const k = box.dataset.pic, v = picVal(k), list = Array.isArray(v) ? v : (v ? [v] : []);
      $('.mk-thumbs', box).innerHTML = list.map(u => `<span class="mk-thumb"><img src="${esc(themeUrl(u))}" alt="" onerror="this.parentNode.classList.add('bad')"><small>${esc(names.get(u) || u.slice(0, 40))}</small></span>`).join('');
      const typed = list.filter(u => !u.startsWith('data:'));
      const urlBox = $('.mk-url', box); if (document.activeElement !== urlBox) urlBox.value = typed.join(', ');
    });
  }
  let raf = 0;
  function preview() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const t = specToTheme(Object.assign({}, spec, { id: 'draft' }), 'draft'); t.id = 'draft';
      DRAFT_ON = true; paintTheme(t);
      renderRail('#/make');
      $('.mk-preview .grid', app).innerHTML = sample.map(card).join('');
    });
  }
  form.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.k) {
      let v = el.value;
      if (el.type === 'range') { v = +v; const o = $(`[data-out="${el.dataset.k}"]`, form); if (o) o.textContent = v; }
      if (el.dataset.k === 'colors.accent') { spec.colors.accent = v; $('[data-accent-lock]', form).setAttribute('aria-checked', 'true'); }
      else setK(el.dataset.k, v);
      preview();
    } else if (el.classList.contains('mk-url')) {
      const k = el.closest('[data-pic]').dataset.pic, typed = el.value.split(',').map(x => x.trim()).filter(Boolean);
      const uploads = [].concat(picVal(k) || []).filter(u => u.startsWith('data:'));
      setPic(k, k === 'games' ? [...uploads, ...typed] : (typed[0] || uploads[0] || ''));
      const box = el.closest('[data-pic]'); const v = picVal(k), list = Array.isArray(v) ? v : (v ? [v] : []);
      $('.mk-thumbs', box).innerHTML = list.map(u => `<span class="mk-thumb"><img src="${esc(themeUrl(u))}" alt="" onerror="this.parentNode.classList.add('bad')"><small>${esc(names.get(u) || u.slice(0, 40))}</small></span>`).join('');
      preview();
    }
  });
  form.addEventListener('change', e => {
    const el = e.target;
    if (el.type === 'file') {
      const k = el.closest('[data-pic]').dataset.pic, files = [...el.files].filter(f => f.type.startsWith('image/'));
      if (!files.length) return;
      Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.onload = () => { names.set(r.result, f.name.replace(/[^\w.\-]+/g, '-')); res(r.result); }; r.readAsDataURL(f); })))
        .then(urls => { setPic(k, k === 'games' ? [...(spec.images.games || []), ...urls] : urls[0]); el.value = ''; fill(); preview(); });
    } else if (el.tagName === 'SELECT' && el.dataset.k) { setK(el.dataset.k, el.value); preview(); }
  });
  form.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sw) { setK(b.dataset.sw, !getK(b.dataset.sw)); b.setAttribute('aria-checked', !!getK(b.dataset.sw)); preview(); }
    else if ('accentLock' in b.dataset) { spec.colors.accent = spec.colors.accent ? '' : $('[data-k="colors.accent"]', form).value; fill(); preview(); }
    else if (b.dataset.base) { const dark = b.dataset.base === 'dark'; spec.dark = dark; Object.assign(spec.colors, dark ? DARK_BASE : LIGHT_BASE); fill(); preview(); }
    else if (b.classList.contains('mk-clear')) { const k = b.closest('[data-pic]').dataset.pic; setPic(k, k === 'games' ? [] : ''); fill(); preview(); }
    else if (b.dataset.act === 'reset') { spec = blankSpec(true); names.clear(); fill(); preview(); toast('Started over'); }
    else if (b.dataset.act === 'delete') {
      const list = myThemesRaw().filter(r => specToTheme(r, 'mine')?.id !== editingMine);
      try { localStorage.setItem(MY_THEMES_KEY, JSON.stringify(list)); } catch (e) {}
      addSpecThemes(); if (settings.theme === editingMine) settings.theme = 'black';
      store.set('sig:settings', settings); DRAFT_ON = false; applySettings(); toast('Theme deleted'); location.hash = '#/store';
    }
    else if (b.dataset.act === 'save') {
      if (!String(spec.name || '').trim()) { toast('Give your theme a name first'); return $('[data-k="name"]', form).focus(); }
      const clean = cleanSpec(spec);
      const newId = specToTheme(clean, 'mine').id;
      const list = myThemesRaw().filter(r => { const id = specToTheme(r, 'mine')?.id; return id !== newId && id !== editingMine; });
      list.unshift(clean);
      try { localStorage.setItem(MY_THEMES_KEY, JSON.stringify(list)); }
      catch (err) { return toast('Too big to save here. Use smaller pictures, or “Add to the site”.'); }
      addSpecThemes(); DRAFT_ON = false;
      settings.theme = newId; store.set('sig:settings', settings); applySettings();
      toast(`Saved “${clean.name}” and switched to it`); location.hash = '#/store';
    }
    else if (b.dataset.act === 'share') showShare();
  });

  // "Add to the site": a ready-made themes.json to download, plus the pictures to put in the images folder.
  function showShare() {
    const clean = cleanSpec(spec, names);
    const pics = [...new Set([].concat(spec.images.background, spec.images.logo, spec.images.cursor, spec.images.games, spec.images.icons['*']).filter(u => u && u.startsWith('data:')))];
    const others = PACK_RAW.filter(r => slugify(String(r.id || r.name || '')) !== clean.id);
    const file = { _readme: THEMES_JSON_README, themes: [...others, clean] };
    const text = JSON.stringify(file, null, 2);
    const box = $('#mkShare');
    box.hidden = false;
    box.innerHTML = `<h3>Add “${esc(clean.name)}” to the site</h3>
      <ol>
        <li><button class="tbtn" type="button" data-dl="json">${ic('download')}Download themes.json</button> and put it in <code>assets/themes/</code>, replacing the old one. It already has your other ${others.length} theme${others.length === 1 ? '' : 's'} in it.</li>
        ${pics.length ? `<li>Put ${pics.length === 1 ? 'this picture' : 'these pictures'} in <code>assets/themes/images/</code>: ${pics.map(u => `<button class="tbtn mk-dlpic" type="button" data-dl="${esc(names.get(u))}">${ic('download')}${esc(names.get(u))}</button>`).join(' ')}</li>` : ''}
        <li>Commit, push and redeploy. It shows up in the Theme Store for everyone.</li>
      </ol>
      <details><summary>Or copy just this theme</summary><textarea readonly rows="10" spellcheck="false">${esc(JSON.stringify(clean, null, 2))}</textarea>
        <p class="set-note">Paste it inside the <code>"themes": [ … ]</code> list in themes.json, with a comma between themes.</p></details>`;
    box.onclick = e => {
      const d = e.target.closest('[data-dl]'); if (!d) return;
      const a = document.createElement('a');
      if (d.dataset.dl === 'json') a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a.download = 'themes.json';
      else { const u = pics.find(x => names.get(x) === d.dataset.dl); a.href = u; a.download = d.dataset.dl; }
      document.body.appendChild(a); a.click(); a.remove();
    };
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  fill(); preview();
}
const THEMES_JSON_README = [
  'Themes for the Theme Store. Each theme is one { ... } in the "themes" list; put a comma between themes.',
  'Pictures go in assets/themes/images/ and are written as "images/file.png" (or a full https:// address).',
  'Only "name" is required. Everything else is optional. The easiest way to make one is the Theme Maker on the site (Theme Store > Make your own).',
  'Full list of options: assets/themes/README.md'
];

/* ---------- theme store ---------- */
function pageStore() {
  setTitle(`Theme Store · ${BRAND}`);
  const list = THEMES.filter(t => t.c);
  const mine = list.filter(t => t.mine), shop = list.filter(t => t.store && !t.mine), included = list.filter(t => !t.store);
  const owned = list.filter(t => ownsTheme(t.id)).length;
  const button = t => {
    if (resolvedTheme() === t.id && settings.theme !== 'system') return `<button class="ts-btn in-use" disabled>${ic('check')}In use</button>`;
    if (ownsTheme(t.id)) return `<button class="ts-btn use" data-use="${t.id}">Use</button>`;
    return `<button class="ts-btn get" data-get="${t.id}">${ic('bag')}Get</button>`;
  };
  const price = t => t.mine ? 'Yours' : !t.store ? 'Included' : ownsTheme(t.id) ? 'Owned' : (t.price ? `<s>${esc(t.price)}</s> ${STORE_PRICE}` : STORE_PRICE);
  const card = t => {
    const im = t.spec?.images || {};
    let games = im.games; games = (typeof games === 'string' ? [games] : Array.isArray(games) ? games : []).filter(Boolean);
    const bg = im.background ? `background-image:${cssUrl(im.background)};background-size:${im.backgroundStyle === 'tile' || !im.backgroundStyle ? (numOr(im.backgroundSize, 0) > 0 ? numOr(im.backgroundSize, 0) / 3 + 'px' : 'auto') : 'cover'};` : '';
    const font = cssFont(t.spec?.font);
    return `<article class="ts-card" style="--p:${t.c.paper};--s:${t.c.surface};--k:${t.c.ink};--l:${t.c.line};--sh:${t.c.shadow};--m:${t.c.muted};${t.colors?.accent ? `--accent:${t.colors.accent};` : ''}">
      <div class="ts-prev" aria-hidden="true" style="${esc(bg)}">
        <div class="ts-top">${im.logo ? `<img class="ts-logo-img" src="${esc(themeUrl(im.logo))}" alt="">` : '<span class="ts-logo"></span>'}<span class="ts-search"></span></div>
        <div class="ts-grid">${[0, 1, 2].map(i => `<i><em${games.length ? ` style="${esc(`background:${cssUrl(games[i % games.length])} center/cover`)}"` : ''}></em><u></u></i>`).join('')}</div>
      </div>
      <div class="ts-body">
        <div class="ts-info"><b${font ? ` style="font-family:'${esc(font)}',var(--sans)"` : ''}>${esc(t.name)}</b><small>${esc(t.note)}</small></div>
        <div class="ts-buy"><span class="ts-price">${price(t)}</span>
          <span class="ts-kind">${t.dark ? 'Dark' : 'Light'}</span>${button(t)}</div>
        <div class="ts-more">${t.mine ? `<a href="#/make/${t.id}">Edit</a>` : `<a href="#/make/${t.id}">Remix in the Theme Maker</a>`}</div>
      </div></article>`;
  };
  const fonts = [...new Set(list.map(t => cssFont(t.spec?.font)).filter(Boolean))];
  app.innerHTML = `
    ${fonts.length ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+')).join('&')}&display=swap">` : ''}
    <section class="banner" style="--c:#1fc7b2"><span class="badge-ico">${ic('bag')}</span>
      <div><div class="label">Every theme is free</div><h1>Theme Store</h1><p>Get a theme and it’s yours on this device. Switch any time here or in Settings.</p></div>
      <div class="total"><b>${owned}/${list.length}</b>owned</div></section>
    <a class="ts-make" href="#/make"><span class="badge-ico">${ic('sparkles')}</span><span><b>Make your own theme</b><small>Pick colors, fonts and pictures (backgrounds, logos, cursors, game pictures). No code needed.</small></span>${ic('chevron')}</a>
    ${mine.length ? `<section class="block">${head('Saved in this browser', 'Made by you')}<div class="ts-grid-list">${mine.map(card).join('')}</div></section>` : ''}
    <section class="block">${head(`${shop.length} themes to collect`, 'New in the store')}
      <div class="ts-grid-list">${shop.map(card).join('')}</div></section>
    <section class="block">${head('Came with the site', 'Included')}
      <div class="ts-grid-list">${included.map(card).join('')}</div></section>
    ${footer()}`;
  app.onclick = e => {
    const b = e.target.closest('.ts-btn'); if (!b || b.disabled) return;
    if (b.dataset.get) {
      const t = THEMES.find(x => x.id === b.dataset.get);
      b.disabled = true; b.classList.add('buying'); b.textContent = 'Getting…';
      setTimeout(() => { buyTheme(t.id); toast(`${t.name} is yours. Free!`); pageStore(); }, 550);
    } else if (b.dataset.use) {
      const y = scrollY;
      setSetting('theme', b.dataset.use); toast(`Now using ${THEMES.find(x => x.id === b.dataset.use).name}`);
      if (location.hash === '#/store') { pageStore(); scrollTo(0, y); }
    }
  };
}
function pageNotFound() {
  app.innerHTML = `<div class="empty"><b>That page doesn't exist</b><a class="see" href="#/" style="margin-top:14px">Back home${ic('chevron')}</a></div>`;
}

/* ---------- router ---------- */
function route() {
  const parts = decodeURIComponent(location.hash.replace(/^#/, '')).split('/').filter(Boolean);
  setTitle(`${BRAND} · Free Online Games`);
  renderRail(parts.length ? '#/' + (parts[0] === 'p' ? parts.slice(0, 2) : parts.slice(0, 2)).join('/') : '#/');
  $('#suggest').hidden = true;
  app.onclick = null;   // pages that need a click handler (the Theme Store) set their own
  if (DRAFT_ON && parts[0] !== 'make') { DRAFT_ON = false; applySettings(); }   // leaving the Theme Maker
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
    case 'store': pageStore(); break;
    case 'make': pageMaker(parts[1]); break;
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
    box.innerHTML = hits.map(g => `<a href="#/play/${g.slug}"><img src="${encPath(gi(g))}" alt=""><span>${esc(g.t)}<div class="s-meta">${esc(platLabel(g))}</div></span></a>`).join('') +
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
function cloakIcon(c) {
  if (c.id === 'off') return '<img src="assets/favicon.svg" alt="">';
  const icon = c.id === 'custom' ? customCloak()?.icon : c.icon;
  return icon ? `<img src="${esc(icon)}" alt="" referrerpolicy="no-referrer">` : '';
}
function cloakNote(c) {
  if (c.id === 'custom') { const cc = customCloak(); return cc ? `Tab shows “${esc(cc.title || 'nothing')}”` : 'Fill in the form below.'; }
  return c.icon ? `Tab shows “${esc(c.title)}”` : esc(c.note);
}
function renderSettings() {
  const dlg = $('#settings'), cc = customCloak();
  const sw = (k, label, hint) => `<div class="opt-row"><span><b>${label}</b><small>${hint}</small></span>
    <button class="switch" role="switch" aria-checked="${!!settings[k]}" data-toggle="${k}" aria-label="${label}"></button></div>`;
  dlg.innerHTML = `
    <div class="set-head"><div><div class="label">Saved on this device</div><h2 id="setTitle">Settings</h2></div>
      <button class="tbtn icon-only" data-close title="Close">${ic('close')}</button></div>
    <div class="set-body">
      <div class="set-group"><span class="label">Theme</span>
        <div class="themes">${THEMES.filter(t => ownsTheme(t.id)).map(t => `<button class="theme-opt" data-theme-id="${t.id}" aria-pressed="${settings.theme === t.id}">
          <span class="sw">${t.swatch.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(t.name)}</b><small>${esc(t.note)}</small></button>`).join('')}</div>
        <p class="set-note">${THEMES.some(t => t.store && !ownsTheme(t.id)) ? 'Want more?' : 'You own every theme.'} <a class="ts-link" href="#/store" data-close>${ic('bag')}Theme Store</a> (every theme is free)</p>
      </div>
      <div class="set-group"><span class="label">Tab cloak</span>
        <div class="cloaks">${CLOAKS.map(c => `<button class="cloak-opt" data-cloak-id="${c.id}" aria-pressed="${settings.cloak === c.id}">
          <span class="ci">${cloakIcon(c)}</span>
          <span><b>${esc(c.name)}</b><small>${cloakNote(c)}</small></span></button>`).join('')}</div>
        <form class="custom-cloak" data-custom-form>
          <b>Make your own</b>
          <label><span>Tab name</span><input name="title" maxlength="80" placeholder="e.g. Home - Khan Academy" value="${esc(cc?.title || '')}" autocomplete="off" spellcheck="false"></label>
          <label><span>Favicon URL</span><input name="icon" type="url" placeholder="https://example.com/favicon.ico" value="${esc(cc?.icon || '')}" autocomplete="off" spellcheck="false"></label>
          <div class="cc-actions"><button class="tbtn" type="submit">Save &amp; use</button>${cc ? '<button class="tbtn" type="button" data-custom-clear>Remove</button>' : ''}</div>
        </form>
        <p class="set-note">Changes only the name and icon of this browser tab. Saved on this device.</p>
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
      <div class="set-group"><span class="label">about:blank</span>
        <div class="opt-row"><span><b>Open in about:blank</b><small>${IN_BLANK ? 'You’re already in an about:blank tab.' : 'Moves the site into a new tab whose address reads about:blank.'}</small></span>
          <button class="tbtn" data-blank ${IN_BLANK ? 'disabled' : ''}>${ic('external')}Open</button></div>
        ${sw('autoblank', 'Auto-open in about:blank', 'After you sign in, the site opens in an about:blank tab.')}
        <p class="set-note">This tab goes to Google afterwards. Allow pop-ups for this site if nothing opens.</p>
      </div>
      <div class="set-group"><span class="label">Your data</span>
        <div class="danger">
          <button class="tbtn" data-clear="recent">${ic('clock')}Clear recently played</button>
          <button class="tbtn" data-clear="favs">${ic('heart')}Clear favorites</button>
          <button class="tbtn" data-clear="settings">${ic('restart')}Reset settings</button>
          <a class="tbtn" href="/logout">${ic('lock')}Sign out</a>
        </div>
        <p class="set-note">Settings, favorites and history are stored in this browser only. Nothing is sent to a server. Site version 2026-09-24-5.</p>
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
    else if (b.dataset.cloakId === 'custom' && !customCloak()) { $('[data-custom-form] input', dlg).focus(); return toast('Enter a tab name and favicon URL first'); }
    else if (b.dataset.cloakId) setSetting('cloak', b.dataset.cloakId);
    else if ('customClear' in b.dataset) { settings.customCloak = null; setSetting('cloak', settings.cloak === 'custom' ? 'off' : settings.cloak); toast('Custom cloak removed'); }
    else if (b.dataset.sizeId) setSetting('size', b.dataset.sizeId);
    else if (b.dataset.toggle) setSetting(b.dataset.toggle, !settings[b.dataset.toggle]);
    else if ('blank' in b.dataset) return openInBlank();
    else if (b.dataset.clear === 'recent') { recent = []; store.set('gs:recent', recent); toast('History cleared'); }
    else if (b.dataset.clear === 'favs') { favs.clear(); store.set('gs:favs', []); toast('Favorites cleared'); }
    else if (b.dataset.clear === 'settings') { Object.assign(settings, SETTINGS_DEFAULTS); store.set('sig:settings', settings); applySettings(); toast('Settings reset'); }
    else return;
    const y = $('.set-body', dlg).scrollTop; renderSettings(); $('.set-body', dlg).scrollTop = y;
    if (b.dataset.clear) route();
  });
  dlg.addEventListener('submit', e => {
    const f = e.target.closest('[data-custom-form]'); if (!f) return;
    e.preventDefault();
    const title = f.elements.title.value.trim(), icon = f.elements.icon.value.trim();
    if (!title && !icon) return toast('Enter a tab name or a favicon URL');
    if (icon && !okIconUrl(icon)) { f.elements.icon.focus(); return toast('The favicon URL should start with https://'); }
    settings.customCloak = { title, icon };
    setSetting('cloak', 'custom');
    toast('Custom cloak on');
    const y = $('.set-body', dlg).scrollTop; renderSettings(); $('.set-body', dlg).scrollTop = y;
  });
  dlg.addEventListener('close', () => { if (/^#?\/?$/.test(location.hash) || /#\/(recent|favorites)/.test(location.hash)) route(); });
}

/* ---------- boot ---------- */
async function boot() {
  $('#brandA').textContent = CONFIG.brand[0]; $('#brandB').textContent = CONFIG.brand[1];
  $('#randomIco').outerHTML = ic('shuffle');
  await loadThemePacks();
  applySettings();
  // After signing in, the sign-in page swaps this page in without a real page load, and Chrome keeps
  // showing the sign-in icon until the icon <link> is replaced again. Do that once things settle.
  setTimeout(() => applyCloak(true), 60); setTimeout(() => applyCloak(true), 800);
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
