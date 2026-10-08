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
  // Theme Store themes (store: true): hidden in Settings until "bought" in the store (#/store). 
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
  // Secret themes: hidden until unlocked with a code (see EGGS, "codes & easter eggs").
  { id: 'gold', name: 'Gold', note: 'Everything you touch turns to gold.', swatch: ['#0d0a04', '#1c160b', '#ffcc33'], secret: true, dark: true, c: { paper: '#0d0a04', surface: '#1c160b', ink: '#fff3cf', line: '#d4a82a', shadow: '#000000', muted: '#c4ab6c' } },
  { id: 'rainbow', name: 'Rainbow', note: 'Outlines and accents that cycle through every color.', swatch: ['#0c0c12', '#ff5ab4', '#57b7ff'], secret: true, dark: true, c: { paper: '#0c0c12', surface: '#181822', ink: '#f5f3ff', line: '#b39cff', shadow: '#2a1f55', muted: '#a3a0b8' } },
  { id: 'doomsday', name: 'Doomsday', note: 'Cold iron, an emerald cloak and a green glow. Kneel.', swatch: ['#070a09', '#151a18', '#45e08a'], logoText: ['Doomsday', ''], logo: 'doomsday-logo.svg', secret: true, dark: true, c: { paper: '#070a09', surface: '#151a18', ink: '#e2ebe5', line: '#2f7a4d', shadow: '#03160c', muted: '#8c9c93' } },
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
const ownsTheme = id => { const t = THEMES.find(x => x.id === id); return !!t && (t.secret ? hasEgg(id) : (!t.store || t.mine || ownedThemes.has(id))); };
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
  applyEggs();
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

/* ---------- navigation ----------
   The current page ("#/play/tetris" etc.) is kept here instead of in the address bar, so the address bar
   always shows just the domain. Back/forward still work through history entries with the same address. */
let CUR = '#/';
function nav(h, replace) {
  h = h && h !== '#' ? h : '#/';
  if (h === CUR && !replace) return route();
  CUR = h;
  try { history[replace ? 'replaceState' : 'pushState']({ sig: h }, '', location.pathname + location.search); } catch (e) {}
  route();
}
// Open a game in a new tab whose address reads about:blank (so its file path never shows).
function openGameTab(g) {
  const w = window.open('about:blank', '_blank');
  if (!w) return toast('Pop-up blocked. Allow pop-ups for this site and try again.');
  const cl = store.get('sig:cloak', null), src = new URL(encPath(g.p), location.href).href;
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(cl && cl.title ? cl.title : g.t)}</title>` +
    (cl && cl.icon ? `<link rel="icon" href="${esc(cl.icon)}">` : '') +
    `<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}iframe{display:block;border:0;width:100%;height:100%}</style></head>` +
    `<body><iframe src="${esc(src)}" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowfullscreen></iframe></body></html>`);
  w.document.close();
}

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
// Game pictures are 480x270, but most are shown far smaller, and a browser keeps every decoded picture in
// memory (480x270 = ~0.5 MB each). The Docker build makes 240px and 360px copies in thumbs/ (see Dockerfile);
// srcset lets the browser pick the smallest one that is still sharp for the card's size and the screen's pixel
// density. If a copy is missing, the picture falls back to the original.
const THUMB_WIDTHS = [240, 360];
const CARD_SIZES = '(max-width: 620px) 48vw, (max-width: 1200px) 300px, 230px';
function thumbSrcset(src) {
  if (typeof src !== 'string' || !src.startsWith('thumbnails/')) return '';
  const rest = src.slice('thumbnails/'.length);
  return THUMB_WIDTHS.map(w => `${encPath(`thumbs/${w}/${rest}`)} ${w}w`).join(', ') + `, ${encPath(src)} 480w`;
}
const THUMB_FALLBACK = "if(this.hasAttribute('srcset')){this.removeAttribute('srcset')}else{this.style.visibility='hidden'}";
const img = (src, sizes = CARD_SIZES) => {
  const set = thumbSrcset(src);
  return `<img src="${encPath(src)}"${set ? ` srcset="${set}" sizes="${sizes}"` : ''} alt="" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="${THUMB_FALLBACK}">`;
};
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
  requestAnimationFrame(updateRailArrows);
}
function updateRailArrows() {
  const rail = $('#rail'), wrap = $('#railWrap'); if (!rail || !wrap) return;
  const max = rail.scrollWidth - rail.clientWidth;
  wrap.classList.toggle('can-l', rail.scrollLeft > 2);
  wrap.classList.toggle('can-r', rail.scrollLeft < max - 2);
}
// The tab row scrolls sideways with its scrollbar hidden, which a mouse can't do on its own:
// turn the wheel into sideways scrolling, allow click-and-drag, and add edge arrows.
function setupRail() {
  const rail = $('#rail'); if (!rail) return;
  rail.addEventListener('scroll', updateRailArrows, { passive: true });
  addEventListener('resize', updateRailArrows);
  rail.addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // pinch zoom, or a sideways touchpad swipe (native)
    const max = rail.scrollWidth - rail.clientWidth; if (max <= 0) return;
    const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rail.clientWidth : 1);
    if ((d < 0 && rail.scrollLeft <= 0) || (d > 0 && rail.scrollLeft >= max - 1)) return; // at the end: let the page scroll
    e.preventDefault();
    rail.scrollLeft += d;
  }, { passive: false });
  const step = dir => rail.scrollBy({ left: dir * Math.max(160, rail.clientWidth * 0.7), behavior: settings.motion === false ? 'auto' : 'smooth' });
  $('#railL').innerHTML = $('#railR').innerHTML = `<span class="ra">${ic('chevron')}</span>`;
  $('#railL').onclick = () => step(-1);
  $('#railR').onclick = () => step(1);
  // Click-and-drag with the mouse (touch already swipes natively).
  let drag = null;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: rail.scrollLeft, id: e.pointerId, moved: false };
  });
  rail.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; rail.classList.add('dragging'); try { rail.setPointerCapture(drag.id); } catch (err) {} }
    if (drag.moved) rail.scrollLeft = drag.left - dx;
  });
  const end = () => {
    if (!drag) return;
    if (drag.moved) {
      // Swallow the click that ends a drag so it doesn't open a tab.
      const block = ev => { ev.preventDefault(); ev.stopPropagation(); };
      addEventListener('click', block, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', block, { capture: true }), 0);
    }
    rail.classList.remove('dragging'); drag = null;
  };
  rail.addEventListener('pointerup', end);
  rail.addEventListener('pointercancel', end);
  rail.addEventListener('dragstart', e => e.preventDefault());
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
        <ol>${lineup.map((g, i) => `<li><a href="#/play/${g.slug}"><span class="num">0${i + 1}</span>${img(gi(g), '110px')}<span><b>${esc(g.t)}</b><span class="label">${esc(platLabel(g))} · ${esc(g.g[0])}</span></span></a></li>`).join('')}</ol>
      </div>
    </section>

    ${recentGames.length ? `<section class="block">${head('Pick up where you left off', 'Jump back in', '#/recent')}<div class="grid">${recentGames.map(card).join('')}</div></section>` : ''}

    <section class="block">${head('Shuffled fresh every day', 'Fresh picks', '#/today')}<div class="grid">${fresh.map(card).join('')}</div></section>

    <section class="block">${head('Three ways to play', 'Pick a platform')}
      <div class="plats">${PLATFORMS.map(([n, i, c, label, desc]) => `<a class="plat" href="#/p/${slugify(n)}" style="--c:${c}"><div><h3>${label}</h3><p>${desc}</p></div><span class="count">${GAMES.filter(g => g.k === n).length.toLocaleString()} games →</span><span class="big-ico">${ic(i)}</span></a>`).join('')}</div>
    </section>

    <section class="block">${head('The ones everyone keeps playing', 'Top 10 today', '#/popular')}
      <div class="charts">${charts.map((g, i) => `<a class="chart-row" href="#/play/${g.slug}"><span class="rank">${i + 1}</span>${img(gi(g), '120px')}<span><b>${esc(g.t)}</b><span class="label">${esc(platLabel(g))} · ${esc(g.g[0])}</span></span></a>`).join('')}</div>
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
setInterval(() => { tickClock(); if (lastDay !== todayKey()) { lastDay = todayKey(); if (CUR === '#/') route(); } }, 30000);

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
    else if (a === 'resume') { nav('#/play/' + player.g.slug); }
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
  else nav('#/play/' + player.g.slug);   // the play page re-docks the running game without reloading it
}
function onPlayPage() { return !!player.g && CUR === '#/play/' + player.g.slug; }
function launch(g) {
  const st = stageEl();
  if (player.g !== g) {
    $('#stageFrame').innerHTML = `<iframe src="${encPath(g.p)}" title="${esc(g.t)}" allow="autoplay; fullscreen; gamepad; clipboard-write" allowfullscreen></iframe>`;
    player.g = g;
    $('#miniTitle').textContent = g.t;
    watchGameFrame();
  }
  st.hidden = false;
}
function setMode(m) {
  const st = stageEl();
  player.mode = m;
  st.dataset.mode = m;
  document.body.classList.toggle('stage-open', m === 'expanded');
  if (m === 'docked') positionDock();
  requestAnimationFrame(layoutCheatTab);
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
  resetScan(); CHEAT.list = []; if (CHEAT.open) renderCheatPanel();
  if (CUR.startsWith('#/play/')) route();
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
              <button class="tbtn icon-only" id="tabBtn" title="Open in new tab">${ic('external')}</button>
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
      <aside class="upnext"><h2>Up next</h2>${sim.slice(0, 6).map(x => `<a href="#/play/${x.slug}">${img(gi(x), '115px')}<span><b>${esc(x.t)}</b><small>${esc(platLabel(x))}</small></span></a>`).join('')}</aside>
    </div>${footer()}`;
  const start = () => {
    if (settings.newtab) { openGameTab(g); return false; }
    $('#insert')?.remove();
    launch(g); setMode('docked');
    return true;
  };
  const ins = $('#insert'); if (ins) ins.onclick = start;
  if (player.g === g) { ins?.remove(); stageEl(); setMode('docked'); requestAnimationFrame(positionDock); }
  else if (settings.autostart && !settings.newtab) start();
  $('#reloadBtn').onclick = () => { if (player.g === g) { const f = $('#stageFrame iframe'); f.src = f.src; watchGameFrame(); } else start(); };
  $('#fsBtn').onclick = () => { if (player.g === g || start()) setMode('expanded'); };
  $('#favBtn').onclick = e => { toggleFav(slug); e.currentTarget.classList.toggle('on', favs.has(slug)); };
  $('#tabBtn').onclick = () => openGameTab(g);
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
  const logoPic = t.spec?.images?.logo || t.logo;
  if (logo && logoPic) {
    if (!li) { li = document.createElement('img'); li.className = 'logo-img'; li.alt = ''; logo.appendChild(li); }
    if (li.getAttribute('src') !== themeUrl(logoPic)) li.src = themeUrl(logoPic);
  } else if (li) li.remove();
  const lt = Array.isArray(t.spec?.logoText) ? t.spec.logoText : Array.isArray(t.logoText) ? t.logoText : [];
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
          <label class="mk-field"><span>Joke price</span><input data-k="price" maxlength="40" placeholder="3 potatoes"></label>
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
          <button class="tbtn" type="button" data-act="share">${ic('download')}Download</button>
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
      store.set('sig:settings', settings); DRAFT_ON = false; applySettings(); toast('Theme deleted'); nav('#/store');
    }
    else if (b.dataset.act === 'save') {
      if (!String(spec.name || '').trim()) { toast('Give your theme a name first'); return $('[data-k="name"]', form).focus(); }
      const clean = cleanSpec(spec);
      const newId = specToTheme(clean, 'mine').id;
      const list = myThemesRaw().filter(r => { const id = specToTheme(r, 'mine')?.id; return id !== newId && id !== editingMine; });
      list.unshift(clean);
      try { localStorage.setItem(MY_THEMES_KEY, JSON.stringify(list)); }
      catch (err) { return toast('Too big to save here. Use smaller pictures, or use Download.'); }
      addSpecThemes(); DRAFT_ON = false;
      settings.theme = newId; store.set('sig:settings', settings); applySettings();
      toast(`Saved “${clean.name}” and switched to it`); nav('#/store');
    }
    else if (b.dataset.act === 'share') showShare();
  });

  // "Download": the theme file (themes.json, including the site's other themes) and any uploaded pictures.
  function showShare() {
    const clean = cleanSpec(spec, names);
    const pics = [...new Set([].concat(spec.images.background, spec.images.logo, spec.images.cursor, spec.images.games, spec.images.icons['*']).filter(u => u && u.startsWith('data:')))];
    const others = PACK_RAW.filter(r => slugify(String(r.id || r.name || '')) !== clean.id);
    const file = { _readme: THEMES_JSON_README, themes: [...others, clean] };
    const text = JSON.stringify(file, null, 2);
    const box = $('#mkShare');
    box.hidden = false;
    box.innerHTML = `<h3>Download “${esc(clean.name)}”</h3>
      <div class="mk-dl-list">
        <button class="tbtn" type="button" data-dl="json">${ic('download')}Theme file</button>
        ${pics.map(u => `<button class="tbtn mk-dlpic" type="button" data-dl="${esc(names.get(u))}">${ic('download')}${esc(names.get(u))}</button>`).join('')}
      </div>`;
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

/* ---------- codes & easter eggs ----------
   Settings > Codes. The right code unlocks an easter egg on this device for good (saved as sig:eggs).
   Codes are stored as hashes so they can't be read from this file. To add one:
     1. Open the site, press F12, and in the Console type:  codeHash('YOUR CODE')
     2. Copy the result into `hash` below and give the egg an id, name and note.
   Kinds: 'theme' (unlocks the secret theme with the same id; it gets a CSS file in assets/themes/),
          'toggle' (an on/off effect in Settings), 'action' (a button you can press again). */
const EGGS = [
  { id: 'gold', kind: 'theme', hash: 'bi0l3rz3ei', name: 'Gold theme', note: 'Everything you touch turns to gold.' },
  { id: 'rainbow', kind: 'theme', hash: '1uhbkcb7oau', name: 'Rainbow theme', note: 'Outlines and accents that cycle through every color.' },
  { id: 'doomsday', kind: 'theme', hash: '1mg2n0v8nl3', name: 'Doomsday theme', note: 'Cold iron, an emerald cloak and a green glow. Kneel.' },
  { id: 'snow', kind: 'toggle', hash: '1xqjpcm6irs', name: 'Snowfall', note: 'Snow gently falls over the whole site.' },
  { id: 'confetti', kind: 'toggle', hash: 'rp4c7kacet', name: 'Confetti clicks', note: 'Every click pops a little burst of confetti.' },
  { id: 'cheats', kind: 'toggle', hash: '1y3wiblx9cn', name: 'Cheat engine', note: 'A Cheats button on the play page: speed hack, memory scanner, save editor and emulator codes.' },
  { id: 'barrelroll', kind: 'action', hash: '2bmjxr0gbsu', name: 'Barrel roll', note: 'The whole site does a barrel roll.', button: 'Do it again' }
];
function codeHash(code, seed = 0x5169) {
  const str = 'sig|' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
window.codeHash = codeHash;   // for making new codes from the browser console
const eggs = new Set(store.get('sig:eggs', []));
const hasEgg = id => eggs.has(id);

// Returns 'new', 'again' or 'nope'.
function redeemCode(code) {
  const egg = EGGS.find(e => e.hash === codeHash(code));
  if (!egg) return 'nope';
  if (eggs.has(egg.id)) return 'again';
  eggs.add(egg.id); store.set('sig:eggs', [...eggs]);
  if (egg.kind === 'toggle') { settings[egg.id] = true; store.set('sig:settings', settings); }
  applyEggs();
  if (egg.kind === 'action') runEgg(egg.id);
  confettiBurst(innerWidth / 2, innerHeight / 3, 40);
  return 'new';
}
function runEgg(id) {
  if (id === 'barrelroll' && document.body.animate) document.body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 1200, easing: 'cubic-bezier(.6,.05,.3,1)' });
}
function applyEggs() {
  toggleSnow(hasEgg('snow') && !!settings.snow);
  document.documentElement.dataset.confetti = hasEgg('confetti') && settings.confetti ? 'on' : 'off';
  const ch = cheatsOn(); document.documentElement.dataset.cheats = ch ? 'on' : 'off';
  if (ch && player.g) ensureCheatTimer();
  if (!ch && CHEAT.open) toggleCheatPanel(false);
  layoutCheatTab();
}

// Confetti: a quick burst of little pieces at (x, y).
const CONFETTI_COLORS = ['#ff5a36', '#ffc93c', '#1fc7b2', '#57b7ff', '#b39cff', '#ff8ad8', '#b8e05a'];
function confettiBurst(x, y, n = 14) {
  if (settings.motion === false) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.className = 'confetto';
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * (n > 20 ? 220 : 90);
    p.style.cssText = `left:${x}px;top:${y}px;background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 40}px;--r:${Math.random() * 720 - 360}deg`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 1000);
  }
}
addEventListener('pointerdown', e => { if (document.documentElement.dataset.confetti === 'on' && e.button === 0) confettiBurst(e.clientX, e.clientY); }, true);

// Snow: a see-through canvas over the page that clicks pass through.
let snow = null;
function toggleSnow(on) {
  if (!on || settings.motion === false) { if (snow) { cancelAnimationFrame(snow.raf); snow.c.remove(); snow = null; } return; }
  if (snow) return;
  const c = document.createElement('canvas'); c.className = 'snow'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
  const ctx = c.getContext('2d'), flakes = [];
  const size = () => { c.width = innerWidth; c.height = innerHeight; };
  size(); addEventListener('resize', size);
  for (let i = 0; i < 90; i++) flakes.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 1 + Math.random() * 2.6, s: .4 + Math.random() * 1.1, w: Math.random() * 6 });
  snow = { c, raf: 0 };
  const tick = () => {
    ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const f of flakes) {
      f.y += f.s; f.w += .01; f.x += Math.sin(f.w) * .4;
      if (f.y > c.height + 5) { f.y = -5; f.x = Math.random() * c.width; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
    }
    snow.raf = requestAnimationFrame(tick);
  };
  tick();
}

// The Codes section in Settings.
function codesSettingsHtml() {
  const found = EGGS.filter(e => hasEgg(e.id));
  const row = e => {
    let ctl = '';
    if (e.kind === 'toggle') ctl = `<button class="switch" role="switch" aria-checked="${!!settings[e.id]}" data-toggle="${e.id}" aria-label="${esc(e.name)}"></button>`;
    else if (e.kind === 'action') ctl = `<button class="tbtn egg-btn" type="button" data-egg-act="${e.id}">${esc(e.button || 'Do it')}</button>`;
    else if (e.kind === 'theme') ctl = resolvedTheme() === e.id ? `<button class="tbtn egg-btn" type="button" disabled>${ic('check')}In use</button>` : `<button class="tbtn egg-btn" type="button" data-theme-id="${e.id}">Use</button>`;
    return `<div class="opt-row egg-row"><span><b>${ic('sparkles')}${esc(e.name)}</b><small>${esc(e.note)}</small></span>${ctl}</div>`;
  };
  return `<div class="set-group"><span class="label">Codes</span>
      <form class="code-form" data-code-form autocomplete="off">
        <input name="code" placeholder="Enter a secret code" maxlength="40" spellcheck="false" autocapitalize="characters" aria-label="Secret code">
        <button class="tbtn" type="submit">Redeem</button>
      </form>
      <p class="set-note">Unlocked secrets stay unlocked on this device.</p>
      ${found.map(row).join('')}
    </div>`;
}

/* ---------- cheat engine (secret: unlocked with a code in Settings > Codes) ----------
   Games run in an iframe from this same site, so the page can reach inside them:
   - Speed: slows down or speeds up the game's clock (performance.now, Date.now, requestAnimationFrame, timers).
   - Memory: Cheat Engine-style scanner for WebAssembly games (Unity, Godot, and other engines compiled to wasm).
     First scan for a number you can see, change it in the game, scan again, then edit or freeze what's left.
   - Variables: the same idea for plain JavaScript games (GameMaker, Phaser, PICO-8 wrappers, …), by walking the
     game's global objects. Hit-or-miss: many games keep their numbers where it can't see them.
   - Save data: edit the game's saved values in browser storage (games share this site's storage).
   - Emulator: Game Genie / Action Replay / GameShark codes and fast-forward for emulated retro games (EmulatorJS).
   Nothing here can change games whose data lives on someone else's server, or games that load from another website. */
const CHEAT = {
  open: false, tab: 'speed', speed: 1,
  scan: null,          // current scan: { kind: 'mem'|'var', type, hits, prev, count } or, for "unknown value", { dense, snap, mask }
  history: [],         // earlier scans, for Undo
  list: [],            // saved values (the List tab): { id, name, kind, type, i | o,k,path, frozen, fx }
  form: { mode: 'exact', type: 'any', val: '', val2: '' },
  saveSnap: null,      // localStorage values when the game started, to mark what the game changed
  cheats: [],          // emulator codes: { code, desc, on }
  busy: false, progress: 0, cancel: false, timer: 0, live: 0, nextId: 1,
  picked: new Set()    // ticked scan results, for acting on several at once
};
const cheatsOn = () => hasEgg('cheats') && settings.cheats !== false;
const SITE_KEY = k => /^(sig|gs):/.test(k);

// The game's window (and any same-site frames inside it). Throws away frames from other websites.
function gameWindows() {
  const f = $('#stageFrame iframe'); if (!f) return [];
  const out = [];
  const walk = (w, depth) => {
    try { void w.document; } catch (e) { return; }
    out.push(w);
    if (depth < 3) for (let i = 0; i < w.frames.length; i++) walk(w.frames[i], depth + 1);
  };
  try { walk(f.contentWindow, 0); } catch (e) {}
  return out;
}
function blockedFrames() {
  let n = 0;
  const f = $('#stageFrame iframe'); if (!f) return 0;
  try { const w = f.contentWindow; for (let i = 0; i < w.frames.length; i++) { try { void w.frames[i].document; } catch (e) { n++; } } } catch (e) { n++; }
  return n;
}

// Hooks put into each game window as early as possible: a controllable clock and WebAssembly memory capture.
function hookGameWindow(w) {
  if (w.__sigHooked) return;
  try {
    const f = $('#stageFrame iframe');
    if (f && f.contentWindow === w) w.addEventListener('mousemove', e => {
      const r = f.getBoundingClientRect(); cheatTabMouse(r.left + e.clientX, r.top + e.clientY);
    }, { passive: true });
  } catch (e) {}
  try {
    w.__sigHooked = true;
    const P = w.performance, rn = P.now.bind(P), dn = w.Date.now.bind(w.Date);
    const st = { speed: CHEAT.speed, rb: rn(), vb: rn(), drb: dn(), dvb: dn() };
    const vnow = () => st.vb + (rn() - st.rb) * st.speed;
    const vdate = () => st.dvb + (dn() - st.drb) * st.speed;
    P.now = vnow; w.Date.now = vdate;
    const raf = w.requestAnimationFrame.bind(w), sto = w.setTimeout.bind(w), sin = w.setInterval.bind(w);
    w.requestAnimationFrame = cb => raf(() => cb(vnow()));
    w.setTimeout = (fn, d, ...a) => sto(fn, (+d || 0) / st.speed, ...a);
    w.setInterval = (fn, d, ...a) => sin(fn, (+d || 0) / st.speed, ...a);
    w.__sigSpeed = s => { const r = rn(), v = vnow(), dr = dn(), dv = vdate(); Object.assign(st, { rb: r, vb: v, drb: dr, dvb: dv, speed: s }); };
  } catch (e) {}
  try {
    const WA = w.WebAssembly; if (!WA || WA.__sig) return;
    const mems = w.__sigMem = w.__sigMem || [], OM = WA.Memory;
    const grab = r => { try { const ex = (r.instance || r).exports || {}; for (const k in ex) if (ex[k] instanceof OM) mems.push(ex[k]); } catch (e) {} return r; };
    WA.Memory = function (d) { const m = new OM(d); mems.push(m); return m; }; WA.Memory.prototype = OM.prototype;
    const oi = WA.instantiate; WA.instantiate = function () { return oi.apply(this, arguments).then(grab); };
    if (WA.instantiateStreaming) { const os = WA.instantiateStreaming; WA.instantiateStreaming = function () { return os.apply(this, arguments).then(grab); }; }
    const OI = WA.Instance; WA.Instance = function (m, i) { const r = new OI(m, i); grab(r); return r; }; WA.Instance.prototype = OI.prototype;
    WA.__sig = 1;
  } catch (e) {}
}
// Called when a game starts or restarts: forget the last game's cheats and hook the new frame early
// (it gets a new window when the game page loads, so keep checking).
function watchGameFrame() {
  // Addresses and variables belong to the old game, so results and the List start empty.
  resetScan(); CHEAT.list = []; CHEAT.cheats = []; CHEAT.speed = 1;
  CHEAT.saveSnap = snapshotSaves();
  clearInterval(CHEAT.timer); CHEAT.timer = 0;
  if (cheatsOn()) ensureCheatTimer(true);
  if (CHEAT.open) renderCheatPanel();
}
function ensureCheatTimer(fast) {
  if (CHEAT.timer && !fast) return;
  clearInterval(CHEAT.timer);
  let n = 0;
  const run = () => { for (const w of gameWindows()) hookGameWindow(w); applyFrozen(); };
  CHEAT.timer = setInterval(() => {
    if (!player.g) { clearInterval(CHEAT.timer); CHEAT.timer = 0; return; }
    run();
    if (fast && ++n > 400) { clearInterval(CHEAT.timer); CHEAT.timer = setInterval(() => { if (player.g) run(); }, 100); }
  }, fast ? 25 : 100);
}
function setGameSpeed(s) {
  CHEAT.speed = s;
  for (const w of gameWindows()) { hookGameWindow(w); try { w.__sigSpeed && w.__sigSpeed(s); } catch (e) {} }
  const emu = findEmulator();
  if (emu) try {
    const gm = emu.gameManager;
    if (s > 1 && gm.setFastForwardRatio) { gm.setFastForwardRatio(s); gm.toggleFastForward(1); gm.toggleSlowMotion && gm.toggleSlowMotion(0); }
    else if (s < 1 && gm.setSlowMotionRatio) { gm.setSlowMotionRatio(1 / s); gm.toggleSlowMotion(1); gm.toggleFastForward && gm.toggleFastForward(0); }
    else { gm.toggleFastForward && gm.toggleFastForward(0); gm.toggleSlowMotion && gm.toggleSlowMotion(0); }
  } catch (e) {}
}

// What the game is made of, for the panel header and to pick the default tab.
function findEmulator() { for (const w of gameWindows()) { try { if (w.EJS_emulator && w.EJS_emulator.gameManager) return w.EJS_emulator; } catch (e) {} } return null; }
function findMemory() {
  const bufs = new Set();
  // (The game's buffers come from its own window, so instanceof checks against ours would fail.)
  const add = x => { try { const b = x && x.buffer, t = b && Object.prototype.toString.call(b); if ((t === '[object ArrayBuffer]' || t === '[object SharedArrayBuffer]') && b.byteLength > 1 << 20) bufs.add(b); } catch (e) {} };
  for (const w of gameWindows()) {
    try { (w.__sigMem || []).forEach(add); } catch (e) {}
    for (const n of ['Module', 'unityInstance', 'gameInstance', 'myGameInstance', 'engine', 'instance', 'game', 'wasmMemory', 'HEAPU8']) {
      let o; try { o = w.eval(`typeof ${n} !== 'undefined' ? ${n} : undefined`); } catch (e) { continue; }
      if (!o) continue;
      add(o); add(o.HEAPU8); add(o.wasmMemory);
      try { add(o.Module && o.Module.HEAPU8); add(o.rtenv && o.rtenv.HEAPU8); add(o.asm && o.asm.memory); add(o.Module && o.Module.asm && o.Module.asm.memory); } catch (e) {}
    }
  }
  return [...bufs].sort((a, b) => b.byteLength - a.byteLength)[0] || null;
}
function detectEngine() {
  const ws = gameWindows(); if (!ws.length) return blockedFrames() ? 'blocked' : 'none';
  if (findEmulator()) return 'emulator';
  for (const w of ws) {
    try {
      if (w.createUnityInstance || w.UnityLoader || w.document.querySelector('#unity-canvas,#unityContainer,#gameContainer')) return 'unity';
      if (w.RufflePlayer || w.document.querySelector('ruffle-player,ruffle-embed')) return 'flash';
      if (w.Engine && w.document.querySelector('#canvas') && findMemory()) return 'godot';
    } catch (e) {}
  }
  if (findMemory()) return 'wasm';
  if (blockedFrames() && ws.length === 1 && ws[0].document.body && ws[0].document.body.children.length <= 3) return 'blocked';
  return 'js';
}
const ENGINE_NAMES = { unity: 'Unity game', godot: 'Godot game', wasm: 'WebAssembly game', flash: 'Flash game (Ruffle)', emulator: 'Emulated retro game', js: 'JavaScript game', blocked: 'Loads from another website', none: 'Game not started' };

/* --- scanner (works like Cheat Engine) ---
   First scan finds every place holding a value (an exact number, a range, or "unknown": remember everything).
   Each Next scan keeps only the places that match what happened in the game (went up, became 37, …).
   Undo steps back one scan; New scan throws the results away and starts over. Values worth keeping go to
   the List tab, where they can be named, changed and frozen, and they stay there through new scans. */
const MEM_TYPES = {
  i32: { name: '4-byte number', bytes: 4, arr: Int32Array }, f32: { name: 'Decimal (float)', bytes: 4, arr: Float32Array },
  f64: { name: 'Decimal (double)', bytes: 8, arr: Float64Array }, i16: { name: '2-byte number', bytes: 2, arr: Int16Array },
  u8: { name: '1-byte number', bytes: 1, arr: Uint8Array }
};
const MAX_HITS = 5e6;              // results kept as a list of addresses
const MAX_SNAPSHOT = 256 << 20;    // "unknown initial value" copies the game's memory: refuse when it is bigger
const MAX_SHOWN = 300;             // results listed one by one
const MAX_HISTORY = 3;             // scans kept for Undo
const SCAN_FIRST = [['exact', 'Exact value'], ['group', 'Several numbers in a row…'], ['bigger', 'Bigger than…'], ['smaller', 'Smaller than…'], ['between', 'Between…'], ['unknown', 'Unknown initial value']];
const SCAN_NEXT = [['exact', 'Exact value'], ['up', 'Increased'], ['down', 'Decreased'], ['changed', 'Changed'], ['same', 'Unchanged'],
  ['upBy', 'Increased by…'], ['downBy', 'Decreased by…'], ['bigger', 'Bigger than…'], ['smaller', 'Smaller than…'], ['between', 'Between…']];
const NEEDS_VALUE = new Set(['exact', 'group', 'bigger', 'smaller', 'between', 'upBy', 'downBy']);
const tick = () => new Promise(r => setTimeout(r, 0));
const cancelled = () => { const e = new Error('Scan cancelled'); e.cancelled = true; return e; };

// One test for every scan type. v = value now, p = value at the last scan. Decimals match loosely
// (typing 100 finds 99.6 and 100.4; typing 1.25 finds 1.2501), because games rarely show exact decimals.
function scanTest(mode, loose, a, b) {
  const eq = loose ? (v, x) => (Number.isInteger(x) ? Math.abs(v - x) < 0.5 : Math.abs(v - x) < 1e-3) : (v, x) => v === x;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  switch (mode) {
    case 'exact': return v => eq(v, a);
    case 'bigger': return v => v > a;
    case 'smaller': return v => v < a;
    case 'between': return v => v >= lo && v <= hi;
    case 'up': return (v, p) => v > p;
    case 'down': return (v, p) => v < p;
    case 'upBy': return (v, p) => eq(v - p, a);
    case 'downBy': return (v, p) => eq(p - v, a);
    case 'changed': return (v, p) => v !== p && (v === v || p === p);
    case 'same': return (v, p) => v === p || (v !== v && p !== p);
  }
  throw new Error('Unknown scan type');
}

// "Any number" scans the three types games use most, side by side. (BitLife, like many Unity games, keeps its
// money and stats as decimals, which a whole-number scan never finds.)
const ANY_TYPES = ['i32', 'f32', 'f64'];
const typeName = t => t === 'any' ? 'Any number' : MEM_TYPES[t].name;
// A memory scan is a list of parts, one per value type: { type, hits, prev, count } or, while it is
// remembering every value ("unknown initial value"), { type, dense, snap, mask, count }.
function memScan(parts, extra) {
  return Object.assign({ kind: 'mem', parts, count: parts.reduce((n, p) => n + p.count, 0), dense: parts.some(p => p.dense), capped: parts.some(p => p.capped) }, extra);
}
async function memFirstScan(type, mode, a, b, progress, group) {
  const buf = findMemory(); if (!buf) throw new Error('No game memory found yet. Wait for the game to finish loading.');
  const mb = Math.round(buf.byteLength / 1048576);
  const types = type === 'any' ? ANY_TYPES : [type];
  if (mode === 'unknown') {
    if (type === 'any') throw new Error('Pick a value type for an unknown-value scan (for BitLife: Decimal (float)).');
    if (buf.byteLength > MAX_SNAPSHOT) throw new Error(`This game uses ${mb} MB of memory, too much to remember all of it. Scan for a value instead.`);
    progress(.5); await tick();
    const view = new MEM_TYPES[type].arr(buf);
    return memScan([{ type, dense: true, snap: view.slice(), mask: null, count: view.length }], { type, mb });
  }
  const parts = [];
  for (let t = 0; t < types.length; t++) {
    const ty = types[t], T = MEM_TYPES[ty], view = new T.arr(buf), n = view.length, loose = ty[0] === 'f';
    const sub = x => progress((t + x) / types.length);
    let hits = new Uint32Array(1 << 16), c = 0;
    const push = i => { if (c === hits.length) { const h = new Uint32Array(c * 2); h.set(hits); hits = h; } hits[c++] = i; };
    const CH = 1 << 22;
    if (group) {
      // Several numbers in a row: every value in the group must match, one after another.
      const tests = group.map(x => scanTest('exact', loose, x, x)), g = group.length;
      for (let s = 0; s < n - g && c < MAX_HITS; s += CH) {
        const e = Math.min(n - g, s + CH);
        for (let i = s; i < e; i++) {
          if (!tests[0](view[i])) continue;
          let k = 1; while (k < g && tests[k](view[i + k])) k++;
          if (k === g) for (k = 0; k < g; k++) push(i + k);
        }
        sub(e / n); await tick(); if (CHEAT.cancel) throw cancelled();
      }
    } else {
      const test = scanTest(mode, loose, a, b), fastExact = mode === 'exact' && !loose;
      for (let s = 0; s < n && c < MAX_HITS; s += CH) {
        const e = Math.min(n, s + CH);
        for (let i = s; i < e; i++) {
          if (fastExact ? view[i] !== a : !test(view[i])) continue;
          push(i); if (c >= MAX_HITS) break;
        }
        sub(e / n); await tick(); if (CHEAT.cancel) throw cancelled();
      }
    }
    hits = hits.slice(0, c);
    const prev = new T.arr(c); for (let i = 0; i < c; i++) prev[i] = view[hits[i]];
    parts.push({ type: ty, hits, prev, count: c, capped: c >= MAX_HITS });
  }
  return memScan(parts, { type, mb });
}
async function memNextScan(scan, mode, a, b, progress) {
  const buf = findMemory(); if (!buf) throw new Error('The game memory is gone. Did the game reload? Press New scan.');
  const CH = 1 << 22, parts = [];
  for (let t = 0; t < scan.parts.length; t++) {
    const pt = scan.parts[t], T = MEM_TYPES[pt.type], view = new T.arr(buf), test = scanTest(mode, pt.type[0] === 'f', a, b);
    const sub = x => progress((t + x) / scan.parts.length);
    if (pt.dense) {
      // Still remembering everything: compare each place with its remembered value.
      const { snap, mask } = pt, n = Math.min(view.length, snap.length), nmask = new Uint8Array(n);
      let hits = new Uint32Array(1 << 16), c = 0, total = 0;
      for (let s = 0; s < n; s += CH) {
        const e = Math.min(n, s + CH);
        for (let i = s; i < e; i++) {
          if (mask && !mask[i]) continue;
          if (!test(view[i], snap[i])) continue;
          nmask[i] = 1; total++;
          if (c <= MAX_HITS) { if (c === hits.length) { const h = new Uint32Array(c * 2); h.set(hits); hits = h; } hits[c++] = i; }
        }
        sub(e / n); await tick(); if (CHEAT.cancel) throw cancelled();
      }
      if (total > MAX_HITS) { parts.push({ type: pt.type, dense: true, snap: view.slice(0, n), mask: nmask, count: total }); continue; }
      hits = hits.slice(0, c);
      const prev = new T.arr(c); for (let i = 0; i < c; i++) prev[i] = view[hits[i]];
      parts.push({ type: pt.type, hits, prev, count: c });
      continue;
    }
    const keep = new Uint32Array(pt.count), nprev = new T.arr(pt.count); let c = 0;
    for (let j = 0; j < pt.count; j++) {
      const i = pt.hits[j]; if (i >= view.length) continue;
      const v = view[i];
      if (test(v, pt.prev[j])) { keep[c] = i; nprev[c] = v; c++; }
      if ((j & 0x3fffff) === 0x3fffff) { sub(j / pt.count); await tick(); if (CHEAT.cancel) throw cancelled(); }
    }
    parts.push({ type: pt.type, hits: keep.slice(0, c), prev: nprev.slice(0, c), count: c });
  }
  return memScan(parts, { type: scan.type, mb: scan.mb });
}

/* --- JavaScript variable search (games without WebAssembly memory) --- */
const VAR_SKIP = new Set(['window', 'self', 'top', 'parent', 'frames', 'opener', 'globalThis', 'document', 'location', 'navigator', 'history', 'screen', 'performance', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'crypto', 'console', 'WebAssembly', 'customElements', 'visualViewport', 'speechSynthesis', 'external', 'clientInformation', 'chrome', 'trustedTypes', 'cookieStore', 'scheduler', 'navigation', '__sigMem', '__sigSpeed', '__sigHooked', '__sigVar']);
const VAR_MAX_NODES = 400000, VAR_MAX_HITS = 200000;
async function varFirstScan(mode, a, b, progress) {
  const ws = gameWindows(); if (!ws.length) throw new Error('Start the game first.');
  const test = mode === 'unknown' ? () => true : scanTest(mode, true, a, b);
  const hits = [], seen = new WeakSet(), queue = []; let nodes = 0, head = 0;
  for (const w of ws) {
    let keys = []; try { keys = Object.keys(w); } catch (e) {}
    for (const k of keys) if (!VAR_SKIP.has(k) && !(k in window) && !k.startsWith('on')) queue.push([w, k, k, 0]);
  }
  while (head < queue.length && nodes < VAR_MAX_NODES && hits.length < VAR_MAX_HITS) {
    const [o, k, path, depth] = queue[head++]; nodes++;
    let v; try { v = o[k]; } catch (e) { continue; }
    if (typeof v === 'number') { if (test(v)) hits.push({ o, k, path, prev: v }); continue; }
    if (!v || typeof v !== 'object' || depth >= 6 || seen.has(v)) continue;
    seen.add(v);
    try { if (v.nodeType || v.window === v || ArrayBuffer.isView(v) || /ArrayBuffer\]$/.test(Object.prototype.toString.call(v))) continue; } catch (e) { continue; }
    let ks; try { ks = Array.isArray(v) ? (v.length > 5000 ? [] : Object.keys(v)) : Object.keys(v); } catch (e) { continue; }
    for (const kk of ks.slice(0, 2000)) if (!VAR_SKIP.has(kk)) queue.push([v, kk, Array.isArray(v) ? `${path}[${kk}]` : `${path}.${kk}`, depth + 1]);
    if ((nodes & 16383) === 0) { progress(Math.min(.95, nodes / VAR_MAX_NODES)); await tick(); if (CHEAT.cancel) throw cancelled(); }
  }
  return { kind: 'var', type: 'var', hits, count: hits.length, capped: nodes >= VAR_MAX_NODES || hits.length >= VAR_MAX_HITS };
}
function varNextScan(scan, mode, a, b) {
  const test = scanTest(mode, true, a, b), hits = [];
  for (const h of scan.hits) {
    let v; try { v = h.o[h.k]; } catch (e) { continue; }
    if (typeof v === 'number' && test(v, h.prev)) hits.push({ o: h.o, k: h.k, path: h.path, prev: v });
  }
  return { kind: 'var', type: 'var', hits, count: hits.length };
}

// Running a scan from the panel: First/Next, Undo and New scan.
function resetScan() { CHEAT.scan = null; CHEAT.history = []; CHEAT.picked.clear(); CHEAT.form.mode = 'exact'; CHEAT.cancel = true; CHEAT.scanLabel = ''; }
async function runScan(next) {
  const f = CHEAT.form, mode = f.mode;
  const group = mode === 'group' ? String(f.val).split(/[\s,;]+/).filter(Boolean).map(Number) : null;
  const a = group ? group[0] : f.val === '' ? NaN : +f.val, b = f.val2 === '' ? NaN : +f.val2;
  if (group && (group.length < 2 || group.some(x => !isFinite(x)))) return toast('Type two or more numbers, separated by spaces');
  if (group && !findMemory()) return toast('This game has no memory to search for numbers in a row. Use Exact value.');
  if (!group && NEEDS_VALUE.has(mode) && !isFinite(a)) return toast('Type the number you see in the game');
  if (mode === 'between' && !isFinite(b)) return toast('Type both ends of the range');
  CHEAT.busy = true; CHEAT.cancel = false; CHEAT.progress = 0; renderCheatPanel();
  const progress = x => { CHEAT.progress = x; const bar = $('#chProg'); if (bar) bar.style.setProperty('--p', Math.round(x * 100) + '%'); };
  try {
    let res;
    if (!next) res = findMemory() ? await memFirstScan(f.type, mode, a, b, progress, group) : await varFirstScan(mode, a, b, progress);
    else {
      const s = CHEAT.scan;
      res = s.kind === 'mem' ? await memNextScan(s, mode, a, b, progress) : varNextScan(s, mode, a, b);
      CHEAT.history.push(s); if (CHEAT.history.length > MAX_HISTORY) CHEAT.history.shift();
    }
    res.n = next ? (CHEAT.scan.n || 1) + 1 : 1;
    CHEAT.scan = res; CHEAT.picked.clear();
    if (!next) CHEAT.form.mode = 'exact';
  } catch (err) { if (!err.cancelled) toast(err.message || 'Scan failed'); }
  CHEAT.busy = false; CHEAT.cancel = false; renderCheatPanel();
  const v = $('[data-scan-val]'); if (v) v.focus();
}
function undoScan() {
  if (!CHEAT.history.length) return;
  CHEAT.scan = CHEAT.history.pop(); CHEAT.picked.clear(); renderCheatPanel();
}

/* --- results and the List --- */
function partAt(scan, j) { for (const pt of scan.parts) { if (j < pt.count) return [pt, j]; j -= pt.count; } return [scan.parts[0], 0]; }
function hitEntry(scan, j) {
  if (scan.kind === 'mem') { const [pt, k] = partAt(scan, j); return { kind: 'mem', type: pt.type, i: pt.hits[k] }; }
  const h = scan.hits[j]; return { kind: 'var', type: 'var', o: h.o, k: h.k, path: h.path };
}
function hitPrev(scan, j) { if (scan.kind === 'mem') { const [pt, k] = partAt(scan, j); return pt.prev[k]; } return scan.hits[j].prev; }
function entryKey(e) { return e.kind === 'mem' ? `m:${e.type}:${e.i}` : `v:${e.path}`; }
function entryRead(e) {
  if (e.kind === 'mem') { const b = findMemory(); if (!b) return NaN; const v = new MEM_TYPES[e.type].arr(b); return e.i < v.length ? v[e.i] : NaN; }
  try { const v = e.o[e.k]; return typeof v === 'number' ? v : NaN; } catch (err) { return NaN; }
}
function entryWrite(e, x) {
  if (e.kind === 'mem') { const b = findMemory(); if (!b) return; const v = new MEM_TYPES[e.type].arr(b); if (e.i < v.length) v[e.i] = x; }
  else try { e.o[e.k] = x; } catch (err) {}
}
function entryAddr(e) { return e.kind === 'mem' ? '0x' + (e.i * MEM_TYPES[e.type].bytes).toString(16).toUpperCase().padStart(8, '0') : e.path; }
function entryType(e) { return e.kind === 'mem' ? MEM_TYPES[e.type].name : 'Variable'; }
const fmtVal = v => typeof v !== 'number' || v !== v ? '?' : Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
function addToList(e, opts = {}) {
  const key = entryKey(e);
  let item = CHEAT.list.find(x => entryKey(x) === key);
  if (!item) { item = Object.assign({ id: CHEAT.nextId++, name: opts.name || `Value ${CHEAT.nextId - 1}`, frozen: false, fx: 0 }, e); CHEAT.list.push(item); }
  if (opts.set !== undefined) { entryWrite(item, opts.set); item.fx = opts.set; }
  if (opts.freeze) { item.frozen = true; item.fx = opts.set !== undefined ? opts.set : entryRead(item); ensureCheatTimer(); }
  return item;
}
// BitLife: its four stats sit side by side as decimals (Happiness, Health, Smarts, Looks), so typing the
// four percentages finds them in one go. Money is a decimal somewhere else and needs a normal two-step scan.
const isBitLife = () => !!player.g && /bitlife/i.test(player.g.t);
async function bitlifeFindStats(text) {
  const vals = String(text).split(/[\s,;%]+/).filter(Boolean).map(Number);
  if (vals.length !== 4 || vals.some(x => !isFinite(x))) return toast('Type the four stats as numbers: Happiness Health Smarts Looks');
  CHEAT.busy = true; CHEAT.cancel = false; renderCheatPanel();
  try {
    const r = await memFirstScan('f32', 'group', 0, 0, () => {}, vals);
    const pt = r.parts[0], groups = pt.count / 4;
    if (!groups) toast('Stats not found. Check the numbers (just the percentages) and try again.');
    else {
      ['Happiness', 'Health', 'Smarts', 'Looks'].forEach((name, k) => addToList({ kind: 'mem', type: 'f32', i: pt.hits[k] }, { name }));
      toast(groups === 1 ? 'Found your stats. They’re in your List.' : `Found ${groups} matches; added the first. If it’s wrong, age up and try again.`);
      CHEAT.tab = 'list';
    }
  } catch (err) { toast(err.message || 'Search failed'); }
  CHEAT.busy = false; renderCheatPanel();
}
function applyFrozen() { for (const e of CHEAT.list) if (e.frozen) try { entryWrite(e, e.fx); } catch (err) {} }

/* --- save data --- */
function snapshotSaves() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SITE_KEY(k)) o[k] = localStorage.getItem(k); } } catch (e) {} return o; }


/* The Cheats tab: a little tab tucked behind the left edge of the game cabinet. It peeks out further the closer
   the mouse gets, and opens the Cheats menu beside the game when clicked. In full window it hangs off the
   left edge of the screen instead. */
const CTAB = { side: 'cab', ax: 0, ay: 0, mx: -1e4, my: -1e4, raf: 0, show: false };
function cheatTabEl() {
  let el = $('#ctab');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', `<div class="ctab" id="ctab" hidden><button class="ctab-btn" type="button" title="Cheats" aria-label="Cheats">${ic('zap')}</button></div>`);
    el = $('#ctab');
    el.querySelector('button').onclick = () => toggleCheatPanel();
  }
  return el;
}
function layoutCheatTab() {
  const el = cheatTabEl();
  const mode = player.g ? player.mode : 'off';
  let show = cheatsOn() && (mode === 'docked' || mode === 'expanded');
  if (show && mode === 'docked') {
    const cab = $('.cabinet'); if (!cab) show = false;
    else {
      const r = cab.getBoundingClientRect();
      // Hide once the top of the game box scrolls up under the sticky header (the tab would float over it).
      const hb = ($('.top') || { getBoundingClientRect: () => ({ bottom: 0 }) }).getBoundingClientRect().bottom;
      if (r.top + 16 < hb + 4 || r.top > innerHeight - 40) show = false;
      CTAB.ay = r.top + 16; CTAB.cabTop = Math.max(r.top, hb + 8); CTAB.cabH = r.bottom - CTAB.cabTop; CTAB.hb = hb;
      if (r.left > 70) { CTAB.side = 'cab'; CTAB.ax = r.left; } else { CTAB.side = 'edge'; CTAB.ax = 0; }
    }
  } else if (show) { CTAB.side = 'edge'; CTAB.ax = 0; CTAB.ay = 76; CTAB.cabTop = 60; CTAB.cabH = innerHeight - 80; }
  if (!show && CHEAT.open && mode !== 'docked' && mode !== 'expanded') toggleCheatPanel(false);
  CTAB.show = show; el.hidden = !show;
  if (!show) { if (CHEAT.open && mode === 'docked') placeCheatPanel(); return; }
  el.dataset.side = CTAB.side;
  el.style.top = CTAB.ay + 'px';
  el.style.left = CTAB.side === 'cab' ? (CTAB.ax - 60) + 'px' : '0px';
  el.classList.toggle('open', CHEAT.open);
  placeCheatPanel(); updateCheatPeek();
}
// The menu goes in the empty space left of the game when there's room; otherwise it slides over the page.
function placeCheatPanel() {
  const p = $('#cheatPanel'); if (!p) return;
  const w = Math.min(400, innerWidth - 24);
  const room = CTAB.side === 'cab' && CTAB.ax - 24 >= 240;
  const pw = room ? Math.min(w, CTAB.ax - 24) : w;
  const top = Math.max(room ? CTAB.cabTop : CTAB.ay + 56, player.mode === 'expanded' ? 70 : (CTAB.hb || 70) + 8);
  p.dataset.side = room ? 'cab' : 'edge';
  Object.assign(p.style, { width: pw + 'px', top: top + 'px', left: (room ? CTAB.ax - 12 - pw : 12) + 'px',
    maxHeight: Math.max(240, Math.min(innerHeight - top - 12, room ? Math.max(CTAB.cabH, 420) : innerHeight)) + 'px' });
}
function updateCheatPeek() {
  if (!CTAB.show) return;
  const el = $('#ctab');
  const d = Math.hypot(CTAB.mx - CTAB.ax, CTAB.my - (CTAB.ay + 22));
  const peek = CHEAT.open ? 1 : Math.max(0, Math.min(1, (280 - d) / 230));
  el.style.setProperty('--peek', peek.toFixed(3));
  el.classList.toggle('near', peek > .75);
}
function cheatTabMouse(x, y) {
  CTAB.mx = x; CTAB.my = y;
  if (!CTAB.raf) CTAB.raf = requestAnimationFrame(() => { CTAB.raf = 0; updateCheatPeek(); });
}
addEventListener('mousemove', e => cheatTabMouse(e.clientX, e.clientY), { passive: true });
addEventListener('scroll', () => { if (CTAB.show || CHEAT.open) layoutCheatTab(); }, { passive: true });
addEventListener('resize', () => layoutCheatTab());
setInterval(() => { if (player.g) layoutCheatTab(); }, 500);

/* --- the panel --- */
function toggleCheatPanel(force) {
  CHEAT.open = force ?? !CHEAT.open;
  let p = $('#cheatPanel');
  if (!CHEAT.open) { p?.remove(); clearInterval(CHEAT.live); CHEAT.live = 0; layoutCheatTab(); return; }
  if (!p) {
    document.body.insertAdjacentHTML('beforeend', `<aside class="cheat-panel" id="cheatPanel" role="dialog" aria-label="Cheats"></aside>`);
    p = $('#cheatPanel'); wireCheatPanel(p);
  }
  const eng = detectEngine();
  if (!p.dataset.picked) { CHEAT.tab = eng === 'emulator' ? 'emu' : 'speed'; p.dataset.picked = 1; }
  renderCheatPanel(); layoutCheatTab();
}
function renderCheatPanel() {
  const p = $('#cheatPanel'); if (!p) return;
  const eng = detectEngine(), mem = findMemory();
  CHEAT.eng = eng + (mem ? '+mem' : '');
  const frozen = CHEAT.list.filter(e => e.frozen).length;
  const tabs = [['speed', 'Speed'], ['scan', 'Scanner'], ['list', `List${CHEAT.list.length ? ` (${CHEAT.list.length})` : ''}`], ['save', 'Save data'], ['emu', 'Emulator']];
  const s = CHEAT.scan, f = CHEAT.form;
  let body = '';
  if (!player.g) body = `<p class="ch-note">Start a game, then open this again.</p>`;
  else if (eng === 'blocked') body = `<p class="ch-note">This game loads from another website, so cheats can’t reach inside it. Save data and speed may still work for parts of it.</p>`;
  if (player.g && CHEAT.tab === 'speed') {
    const sp = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
    body += `<p class="ch-note">Changes how fast the game’s clock runs. Works on most web games; music may not change speed.</p>
      <div class="ch-speeds">${sp.map(v => `<button class="ch-chip${CHEAT.speed === v ? ' on' : ''}" data-speed="${v}">${v}×</button>`).join('')}</div>
      <label class="ch-range"><span>Custom <output>${CHEAT.speed}×</output></span><input type="range" min="0.1" max="8" step="0.05" value="${CHEAT.speed}" data-speed-range></label>`;
  }
  if (player.g && CHEAT.tab === 'scan') {
    const kind = s ? s.kind : mem ? 'mem' : 'var';
    const modes = s ? SCAN_NEXT : SCAN_FIRST;
    if (!modes.some(([k]) => k === f.mode)) f.mode = 'exact';
    const needs = NEEDS_VALUE.has(f.mode);
    if (isBitLife() && mem) body += `<div class="ch-tip"><b>BitLife</b><p>BitLife keeps money and stats as decimal numbers, so these use <b>Decimal (float)</b>.</p>
        <div class="ch-row"><input class="ch-in" type="text" inputmode="decimal" placeholder="Happiness Health Smarts Looks, e.g. 90 100 5 58" data-bl-stats><button class="tbtn ch-go" data-bl="stats">Find stats</button></div>
        <div class="ch-row"><input class="ch-in" type="number" step="any" placeholder="Bank balance, e.g. 1234" data-bl-money><button class="tbtn ch-go" data-bl="money">Find money</button></div>
        ${CHEAT.scanLabel === 'Money' && s ? `<p class="ch-tip-next">${s.count === 1 ? 'Found it. Press <b>+</b> below to add Money to your List.' : 'Now change your money in the game (ask a parent, get paid, buy something), type the new balance in the box below and press <b>Next scan</b>.'}</p>`
          : '<small>Balance is $0? Ask a parent for money first, so there’s a number to search for.</small>'}
      </div>`;
    const where = kind === 'mem' ? `the game’s memory (${(s && s.mb) || Math.round((mem ? mem.byteLength : 0) / 1048576)} MB)` : 'the game’s JavaScript variables (hit-or-miss)';
    body += `<p class="ch-note">${s ? `<b>Scan ${s.n || 1}.</b> Change the value in the game, then tell the scanner what happened and press <b>Next scan</b>. Add the right result to your List.`
        : `Searching ${where}. Type a number you can see in the game (coins, health…) and press <b>First scan</b>. Don’t know the number? Use <b>Unknown initial value</b>.`}</p>
      <div class="ch-row">
        <select class="ch-in ch-sel ch-grow" data-scan-mode aria-label="Scan type">${modes.map(([k, n]) => `<option value="${k}"${f.mode === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
        ${kind === 'mem' ? `<select class="ch-in ch-sel" data-scan-type aria-label="Value type" ${s ? 'disabled title="Press New scan to change the value type"' : ''}>${['any', ...Object.keys(MEM_TYPES)].map(k => `<option value="${k}"${(s ? s.type : f.type) === k ? ' selected' : ''}>${typeName(k)}</option>`).join('')}</select>` : ''}
      </div>
      <div class="ch-row" data-vals ${needs ? '' : 'hidden'}>
        <input class="ch-in" ${f.mode === 'group' ? 'type="text" inputmode="decimal" placeholder="e.g. 90 100 5 58"' : `type="number" step="any" placeholder="${f.mode === 'upBy' || f.mode === 'downBy' ? 'By how much' : f.mode === 'between' ? 'From' : 'Value'}"`} data-scan-val value="${esc(f.val)}">
        <input class="ch-in" type="number" step="any" placeholder="To" data-scan-val2 value="${esc(f.val2)}" ${f.mode === 'between' ? '' : 'hidden'}>
      </div>
      ${CHEAT.busy ? `<div class="ch-busy"><div class="ch-prog" id="chProg" style="--p:${Math.round(CHEAT.progress * 100)}%"><i></i></div><button class="tbtn" data-scan-cancel>Cancel</button></div>`
        : `<div class="ch-row">${s ? `<button class="tbtn ch-go" data-scan="next">Next scan</button>
            <button class="tbtn" data-scan-undo ${CHEAT.history.length ? '' : 'disabled'} title="Go back to the previous results">Undo</button>
            <button class="tbtn" data-scan-new title="Clear the results and start over">New scan</button>`
          : `<button class="tbtn ch-go" data-scan="first">First scan</button>`}</div>`}
      ${s ? `<div class="ch-status">${s.count.toLocaleString()} result${s.count === 1 ? '' : 's'}${s.dense ? ' (remembering every value)' : ''}${s.capped ? ' — stopped early, too many: try a less common number' : ''}</div>` : ''}
      ${s && !s.dense && s.count && s.count <= MAX_SHOWN ? `<div class="ch-bulk">
          <label class="ch-freeze" title="Tick every result"><input type="checkbox" data-pick-all ${CHEAT.picked.size === s.count ? 'checked' : ''}>All</label>
          <button class="tbtn" data-bulk="add">Add ${CHEAT.picked.size || s.count} to List</button>
          <input class="ch-in" type="number" step="any" placeholder="Set to" data-bulk-val>
          <button class="tbtn ch-go" data-bulk="set">Set</button><button class="tbtn" data-bulk="freeze" title="Set, add to the List and keep it there">Freeze</button>
          <small class="ch-bulk-note">${CHEAT.picked.size ? `Acts on the ${CHEAT.picked.size} ticked` : `Nothing ticked: acts on all ${s.count}`}</small>
        </div>
        <div class="ch-table">
          <div class="ch-th"><span>Address</span><span>Now</span><span>Before</span><span></span></div>
          ${Array.from({ length: s.count }, (_, j) => {
            const e = hitEntry(s, j), inList = CHEAT.list.some(x => entryKey(x) === entryKey(e));
            const before = hitPrev(s, j);
            return `<div class="ch-tr${CHEAT.picked.has(j) ? ' picked' : ''}"><label class="ch-addr" title="${esc(entryAddr(e))}"><input type="checkbox" class="ch-pick" data-pick="${j}" ${CHEAT.picked.has(j) ? 'checked' : ''} aria-label="Tick">${esc(entryAddr(e))}</label>
              <span class="ch-cur" data-cur="${j}">${fmtVal(entryRead(e))}</span><span class="ch-prev">${fmtVal(before)}${s.type === 'any' ? `<small class="ch-ty">${e.type === 'i32' ? 'whole' : e.type === 'f32' ? 'float' : 'double'}</small>` : ''}</span>
              <button class="tbtn ch-add" data-add="${j}" ${inList ? 'disabled title="Already in your List"' : 'title="Add to your List"'}>${inList ? ic('check') : '+'}</button></div>`;
          }).join('')}
        </div>` : s && s.count > MAX_SHOWN ? `<p class="ch-note">Too many to list. Change the value in the game and do a Next scan to narrow it down.</p>`
        : s && !s.count ? `<p class="ch-note">Nothing matched. Press <b>Undo</b> to go back a step, or <b>New scan</b> to start over.</p>` : ''}`;
  }
  if (player.g && CHEAT.tab === 'list') {
    body += CHEAT.list.length ? `<p class="ch-note">Your saved values. Rename them, change them, or <b>freeze</b> one to keep it at a value. They stay here when you start a new scan.</p>
      <div class="ch-list">${CHEAT.list.map(e => `<div class="ch-item${e.frozen ? ' frozen' : ''}" data-id="${e.id}">
          <div class="ch-item-top"><input class="ch-in ch-name" value="${esc(e.name)}" data-name="${e.id}" aria-label="Name" maxlength="40"><span class="ch-cur" data-lcur="${e.id}">${fmtVal(entryRead(e))}</span></div>
          <div class="ch-item-sub"><code title="${esc(entryAddr(e))}">${esc(entryAddr(e))}</code><small>${esc(entryType(e))}</small></div>
          <div class="ch-row"><input class="ch-in" type="number" step="any" placeholder="New value" data-lset-val="${e.id}"><button class="tbtn ch-go" data-lset="${e.id}">Set</button>
            <label class="ch-freeze" title="Keep it at this value"><input type="checkbox" data-lfreeze="${e.id}" ${e.frozen ? 'checked' : ''}>Freeze${e.frozen ? ` at ${fmtVal(e.fx)}` : ''}</label>
            <button class="tbtn icon-only ch-del" data-ldel="${e.id}" title="Remove">${ic('close')}</button></div>
        </div>`).join('')}</div>
      <div class="ch-row"><button class="tbtn" data-list-clear>Clear list</button></div>`
      : `<p class="ch-note">Nothing saved yet. Find a value with the <b>Scanner</b>, then press <b>+</b> next to it to keep it here.</p>`;
  }
  if (player.g && CHEAT.tab === 'save') {
    const snap = CHEAT.saveSnap || {}, keys = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SITE_KEY(k)) keys.push(k); } } catch (e) {}
    keys.sort((a, b) => ((snap[b] === undefined || snap[b] !== localStorage.getItem(b)) - (snap[a] === undefined || snap[a] !== localStorage.getItem(a))) || a.localeCompare(b));
    body += `<p class="ch-note">Games save here. Keys marked <b>changed</b> were written since this game started. Edit a value, press Save, then restart the game. (Unity and Godot games often save somewhere this can’t edit.)</p>
      <div class="ch-row"><input class="ch-in" placeholder="Filter keys" data-save-filter></div>
      <div class="ch-saves">${keys.length ? keys.map(k => {
        const v = localStorage.getItem(k) || '', changed = snap[k] === undefined || snap[k] !== v;
        return `<details class="ch-save" data-key="${esc(k)}"><summary><code>${esc(k)}</code>${changed ? '<em>changed</em>' : ''}<small>${v.length.toLocaleString()} chars</small></summary>
          <textarea class="ch-in" rows="5" spellcheck="false">${esc(v.length > 200000 ? v.slice(0, 200000) : v)}</textarea>
          <div class="ch-row">${v.length > 200000 ? '<small>Too big to edit here.</small>' : `<button class="tbtn" data-save-put>Save</button>`}<button class="tbtn" data-save-del>Delete</button></div></details>`;
      }).join('') : '<p class="ch-note">No saved game data yet.</p>'}</div>
      <div class="ch-row"><button class="tbtn" data-restart>${ic('restart')}Restart game</button></div>`;
  }
  if (player.g && CHEAT.tab === 'emu') {
    const emu = findEmulator();
    body += emu ? `<p class="ch-note">Enter cheat codes for this console: Game Genie (NES, SNES, Genesis, Game Boy), Pro Action Replay (SNES), GameShark / Action Replay (GBA, N64, PS1). One code per box.</p>
      <div class="ch-row"><input class="ch-in" placeholder="Code, e.g. SXIOPO" data-emu-code spellcheck="false"><input class="ch-in" placeholder="What it does (optional)" data-emu-desc></div>
      <div class="ch-row"><button class="tbtn ch-go" data-emu-add>Add code</button></div>
      <div class="ch-hits">${CHEAT.cheats.map((c, i) => `<div class="ch-hit ch-code"><code>${esc(c.code)}</code><span>${esc(c.desc || '')}</span>
        <label class="ch-freeze"><input type="checkbox" data-emu-on="${i}" ${c.on ? 'checked' : ''}>On</label><button class="tbtn" data-emu-del="${i}">Remove</button></div>`).join('')}</div>`
      : `<p class="ch-note">${eng === 'none' ? 'Start the game first (press its Play button).' : 'This isn’t an emulated retro game. Use Speed, Scanner or Save data.'}</p>`;
  }
  p.innerHTML = `<div class="ch-head"><b>${ic('zap')}Cheats</b><span class="ch-eng">${esc(ENGINE_NAMES[eng] || '')}</span><button class="tbtn icon-only" data-ch-close title="Close">${ic('close')}</button></div>
    <div class="ch-tabs">${tabs.map(([k, n]) => `<button class="${CHEAT.tab === k ? 'on' : ''}" data-ch-tab="${k}">${n}</button>`).join('')}</div>
    <div class="ch-body">${body}</div>
    ${frozen ? `<div class="ch-foot">${frozen} frozen value${frozen === 1 ? '' : 's'} <button class="tbtn" data-unfreeze>Unfreeze all</button></div>` : ''}`;
}
function applyEmuCheats() {
  const emu = findEmulator(); if (!emu) return;
  const gm = emu.gameManager;
  try { gm.resetCheat && gm.resetCheat(); CHEAT.cheats.forEach((c, i) => gm.setCheat(i, c.on ? 1 : 0, c.code)); } catch (e) { toast('This emulator didn’t accept the code'); }
}
function wireCheatPanel(p) {
  const listItem = id => CHEAT.list.find(e => e.id === +id);
  p.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if ('scanCancel' in d) { CHEAT.cancel = true; return; }
    if (CHEAT.busy) return;
    if ('chClose' in d) return toggleCheatPanel(false);
    if (d.chTab) { CHEAT.tab = d.chTab; return renderCheatPanel(); }
    if (d.speed) { setGameSpeed(+d.speed); toast(`Game speed ${d.speed}×`); return renderCheatPanel(); }
    if ('unfreeze' in d) { CHEAT.list.forEach(x => { x.frozen = false; }); return renderCheatPanel(); }
    if ('restart' in d) { const f = $('#stageFrame iframe'); if (f) { f.src = f.src; watchGameFrame(); toast('Restarting the game'); } return renderCheatPanel(); }
    if (d.scan) return runScan(d.scan === 'next');
    if ('scanUndo' in d) return undoScan();
    if ('scanNew' in d) { resetScan(); CHEAT.cancel = false; toast('Results cleared. Ready for a first scan.'); renderCheatPanel(); $('[data-scan-val]', p)?.focus(); return; }
    if (d.add !== undefined) { const s = CHEAT.scan; if (s) { addToList(hitEntry(s, +d.add), s.count === 1 && CHEAT.scanLabel ? { name: CHEAT.scanLabel } : {}); toast('Added to your List'); } return renderCheatPanel(); }
    if (d.bl === 'stats') return bitlifeFindStats($('[data-bl-stats]', p).value);
    if (d.bl === 'money') {
      const raw = $('[data-bl-money]', p).value.trim();
      if (raw === '' || !isFinite(+raw)) return toast('Type your bank balance (just the number)');
      resetScan(); CHEAT.cancel = false;
      Object.assign(CHEAT.form, { type: 'f32', mode: 'exact', val: raw, val2: '' });
      await runScan(false);
      CHEAT.scanLabel = 'Money'; CHEAT.form.val = ''; renderCheatPanel();
      return;
    }
    if (d.bulk) {
      const s = CHEAT.scan; if (!s) return;
      const js = CHEAT.picked.size ? [...CHEAT.picked] : Array.from({ length: s.count }, (_, j) => j);
      if (d.bulk === 'add') { js.forEach(j => addToList(hitEntry(s, j))); toast(`Added ${js.length} to your List`); return renderCheatPanel(); }
      const raw = $('[data-bulk-val]', p).value.trim(), x = +raw;
      if (raw === '' || !isFinite(x)) return toast('Type the value to set first');
      for (const j of js) {
        const en = hitEntry(s, j);
        if (d.bulk === 'freeze') addToList(en, { set: x, freeze: true });
        else { entryWrite(en, x); const it = CHEAT.list.find(i => entryKey(i) === entryKey(en)); if (it) it.fx = x; }
      }
      toast(`${d.bulk === 'freeze' ? 'Froze' : 'Set'} ${js.length} value${js.length === 1 ? '' : 's'} at ${x}`);
      return renderCheatPanel();
    }
    if (d.lset) {
      const it = listItem(d.lset), raw = $(`[data-lset-val="${d.lset}"]`, p).value.trim(), x = +raw;
      if (!it || raw === '' || !isFinite(x)) return toast('Type a new value first');
      entryWrite(it, x); it.fx = x; toast(`${it.name} set to ${x}`); return renderCheatPanel();
    }
    if (d.ldel) { CHEAT.list = CHEAT.list.filter(x => x.id !== +d.ldel); return renderCheatPanel(); }
    if ('listClear' in d) { CHEAT.list = []; return renderCheatPanel(); }
    if ('savePut' in d || 'saveDel' in d) {
      const box = b.closest('[data-key]'), k = box.dataset.key;
      try { if ('saveDel' in d) localStorage.removeItem(k); else localStorage.setItem(k, $('textarea', box).value); } catch (err) { return toast('Couldn’t save that'); }
      toast('saveDel' in d ? 'Deleted. Restart the game to see it.' : 'Saved. Restart the game to see it.'); return renderCheatPanel();
    }
    if ('emuAdd' in d) {
      const code = $('[data-emu-code]', p).value.trim(), desc = $('[data-emu-desc]', p).value.trim();
      if (!code) return toast('Type a cheat code first');
      CHEAT.cheats.push({ code, desc, on: true }); applyEmuCheats(); toast('Code added'); return renderCheatPanel();
    }
    if (d.emuDel) { CHEAT.cheats.splice(+d.emuDel, 1); applyEmuCheats(); return renderCheatPanel(); }
  });
  p.addEventListener('change', e => {
    const el = e.target, d = el.dataset;
    if (d.lfreeze !== undefined) {
      const it = listItem(d.lfreeze); if (!it) return;
      it.frozen = el.checked; if (el.checked) { it.fx = entryRead(it); ensureCheatTimer(); }
      renderCheatPanel();
    } else if (d.name !== undefined) { const it = listItem(d.name); if (it) it.name = el.value.trim() || it.name; }
    else if (d.pick !== undefined) { el.checked ? CHEAT.picked.add(+d.pick) : CHEAT.picked.delete(+d.pick); renderCheatPanel(); }
    else if (d.pickAll !== undefined) { CHEAT.picked.clear(); if (el.checked && CHEAT.scan) for (let j = 0; j < CHEAT.scan.count; j++) CHEAT.picked.add(j); renderCheatPanel(); }
    else if (d.scanMode !== undefined) { CHEAT.form.mode = el.value; renderCheatPanel(); $('[data-scan-val]', p)?.focus(); }
    else if (d.scanType !== undefined) CHEAT.form.type = el.value;
    else if (d.emuOn !== undefined) { CHEAT.cheats[+d.emuOn].on = el.checked; applyEmuCheats(); }
  });
  p.addEventListener('input', e => {
    const el = e.target, d = el.dataset;
    if (d.scanVal !== undefined) CHEAT.form.val = el.value;
    else if (d.scanVal2 !== undefined) CHEAT.form.val2 = el.value;
    else if (d.speedRange !== undefined) { const v = Math.round(+el.value * 100) / 100; setGameSpeed(v); el.previousElementSibling.querySelector('output').textContent = v + '×'; p.querySelectorAll('[data-speed]').forEach(c => c.classList.toggle('on', +c.dataset.speed === v)); }
    else if (d.saveFilter !== undefined) { const q = el.value.toLowerCase(); p.querySelectorAll('.ch-save').forEach(x => { x.hidden = !x.dataset.key.toLowerCase().includes(q); }); }
  });
  p.addEventListener('keydown', e => {
    const d = e.target.dataset;
    if (e.key === 'Enter') {
      if (d.bulkVal !== undefined) { e.preventDefault(); p.querySelector('[data-bulk="set"]')?.click(); }
      else if (d.scanVal !== undefined || d.scanVal2 !== undefined) { e.preventDefault(); p.querySelector(CHEAT.scan ? '[data-scan="next"]' : '[data-scan="first"]')?.click(); }
      else if (d.lsetVal !== undefined) { e.preventDefault(); p.querySelector(`[data-lset="${d.lsetVal}"]`)?.click(); }
      else if (d.name !== undefined) { e.preventDefault(); e.target.blur(); }
    }
    e.stopPropagation();   // keys typed here must not reach the game
  });
  // Keep the shown values fresh while the menu is open, and redraw when the game finishes loading and turns out
  // to be a different kind (e.g. its memory appears). Stopped when the menu closes.
  clearInterval(CHEAT.live);
  CHEAT.live = setInterval(() => {
    if (!CHEAT.open || !document.body.contains(p)) { clearInterval(CHEAT.live); CHEAT.live = 0; return; }
    const eng = detectEngine() + (findMemory() ? '+mem' : '');
    const typing = p.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (eng !== CHEAT.eng && !typing && !CHEAT.busy) renderCheatPanel();
    if (CHEAT.tab === 'scan' && CHEAT.scan && !CHEAT.scan.dense) p.querySelectorAll('[data-cur]').forEach(el => { el.textContent = fmtVal(entryRead(hitEntry(CHEAT.scan, +el.dataset.cur))); });
    if (CHEAT.tab === 'list') p.querySelectorAll('[data-lcur]').forEach(el => { const it = listItem(el.dataset.lcur); if (it) el.textContent = fmtVal(entryRead(it)); });
  }, 500);
}

/* ---------- theme store ---------- */
function pageStore() {
  setTitle(`Theme Store · ${BRAND}`);
  const list = THEMES.filter(t => t.c);
  const mine = list.filter(t => t.mine), shop = list.filter(t => t.store && !t.mine), included = list.filter(t => !t.store && !t.secret);
  const secrets = list.filter(t => t.secret && ownsTheme(t.id));
  const owned = list.filter(t => !t.secret && ownsTheme(t.id)).length;
  const total = list.filter(t => !t.secret).length;
  const button = t => {
    if (resolvedTheme() === t.id && settings.theme !== 'system') return `<button class="ts-btn in-use" disabled>${ic('check')}In use</button>`;
    if (ownsTheme(t.id)) return `<button class="ts-btn use" data-use="${t.id}">Use</button>`;
    return `<button class="ts-btn get" data-get="${t.id}">${ic('bag')}Get</button>`;
  };
  const price = t => t.secret ? 'Secret' : t.mine ? 'Yours' : !t.store ? 'Included' : ownsTheme(t.id) ? 'Owned' : (t.price ? `<s>${esc(t.price)}</s> ${STORE_PRICE}` : STORE_PRICE);
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
      <div><div class="label">Themes</div><h1>Theme Store</h1><p>Get a theme and it’s yours on this device. Switch any time here or in Settings.</p></div>
      <div class="total"><b>${owned}/${total}</b>owned</div></section>
    <a class="ts-make" href="#/make"><span class="badge-ico">${ic('sparkles')}</span><span><b>Make your own theme</b><small>Pick colors, fonts and pictures (backgrounds, logos, cursors, game pictures). No code needed.</small></span>${ic('chevron')}</a>
    ${mine.length ? `<section class="block">${head('Saved in this browser', 'Made by you')}<div class="ts-grid-list">${mine.map(card).join('')}</div></section>` : ''}
    <section class="block">${head(`${shop.length} themes to collect`, 'New in the store')}
      <div class="ts-grid-list">${shop.map(card).join('')}</div></section>
    ${secrets.length ? `<section class="block">${head('Unlocked with a code', 'Secret themes')}<div class="ts-grid-list">${secrets.map(card).join('')}</div></section>` : ''}
    <section class="block">${head('Came with the site', 'Included')}
      <div class="ts-grid-list">${included.map(card).join('')}</div></section>
    ${footer()}`;
  app.onclick = e => {
    const b = e.target.closest('.ts-btn'); if (!b || b.disabled) return;
    if (b.dataset.get) {
      const t = THEMES.find(x => x.id === b.dataset.get);
      b.disabled = true; b.classList.add('buying'); b.textContent = 'Getting…';
      setTimeout(() => { buyTheme(t.id); toast(`${t.name} is yours`); pageStore(); }, 550);
    } else if (b.dataset.use) {
      const y = scrollY;
      setSetting('theme', b.dataset.use); toast(`Now using ${THEMES.find(x => x.id === b.dataset.use).name}`);
      if (CUR === '#/store') { pageStore(); scrollTo(0, y); }
    }
  };
}
function pageNotFound() {
  app.innerHTML = `<div class="empty"><b>That page doesn't exist</b><a class="see" href="#/" style="margin-top:14px">Back home${ic('chevron')}</a></div>`;
}

/* ---------- router ---------- */
/* ---------- Browse + AI ----------
   The Veil web proxy runs in the same container and is served from /__px/ (see nginx.conf).
   Its page lives in one iframe under the header that is kept alive while visitors switch tabs,
   so a site they're browsing (or an AI chat) is still there when they come back. Switching
   between Browse and AI tells the iframe to slide between its two views. */
const VEIL = { frame: null, view: null };
function veilStage() {
  let st = document.getElementById('veilStage');
  if (!st) {
    st = document.createElement('div');
    st.id = 'veilStage'; st.className = 'veil-stage'; st.hidden = true;
    document.body.appendChild(st);
  }
  return st;
}
function placeVeil() {
  const top = document.querySelector('.top');
  if (top) document.documentElement.style.setProperty('--veil-top', Math.round(top.getBoundingClientRect().bottom) + 'px');
}
function markVeilButtons(view) {
  for (const [id, v] of [['browseBtn', 'browse'], ['aiBtn', 'ai']]) {
    const b = document.getElementById(id);
    if (b) { b.classList.toggle('on', view === v); b.setAttribute('aria-pressed', view === v ? 'true' : 'false'); }
  }
}
// Leaving Browse/AI keeps the proxy (and the AI chat) alive, but the site you were browsing can be heavy:
// its videos and sounds are paused at once, and after VEIL_PARK_MS away it is unloaded ("parked") to free its
// memory. Coming back to Browse reopens the same page.
const VEIL_PARK_MS = 45000;
function veilInner() {
  try { return VEIL.frame.contentWindow.document.getElementById('frame'); } catch (e) { return null; }
}
function veilPauseMedia(win, depth = 0) {
  try {
    win.document.querySelectorAll('video, audio').forEach(m => { try { m.pause(); } catch (e) {} });
    for (let i = 0; i < win.frames.length && depth < 4; i++) veilPauseMedia(win.frames[i], depth + 1);
  } catch (e) {}
}
function veilPark() {
  const f = veilInner(); if (!f) return;
  let back = null;
  try {
    // The proxy knows the real address even when the site rewrote its own (e.g. YouTube's /watch?v=...).
    const main = VEIL.frame.contentWindow.Veil.mainUrl();
    const real = new URL(decodeURIComponent(main.split('#')[1] || ''));
    if (/^https?:$/.test(real.protocol)) back = '/p/' + real.protocol.slice(0, -1) + '/' + real.host + real.pathname + real.search + real.hash;
  } catch (e) {}
  if (!back) { try { const h = f.contentWindow.location; if (h.pathname.startsWith('/p/')) back = h.pathname + h.search + h.hash; } catch (e) {} }
  if (!back) return;
  VEIL.parked = back;
  f.src = 'about:blank';
}
function veilWake() {
  clearTimeout(VEIL.parkTimer);
  if (!VEIL.parked) return;
  const f = veilInner();
  if (f) f.src = VEIL.parked;
  VEIL.parked = null;
}
function showVeil(view) {
  const st = veilStage();
  document.documentElement.classList.toggle('veil-on', !!view);
  markVeilButtons(view);
  if (!view) {
    if (VEIL.frame && !st.hidden) {
      veilPauseMedia(VEIL.frame.contentWindow);
      clearTimeout(VEIL.parkTimer);
      VEIL.parkTimer = setTimeout(veilPark, VEIL_PARK_MS);
    }
    st.hidden = true; return;
  }
  clearTimeout(VEIL.parkTimer);
  if (view === 'browse') veilWake();
  setTitle((view === 'ai' ? 'AI' : 'Browse') + ' · ' + BRAND);
  placeVeil();
  st.hidden = false;
  if (!VEIL.frame) {
    const f = document.createElement('iframe');
    f.title = 'Browse and AI';
    f.allow = 'fullscreen; autoplay; clipboard-read; clipboard-write';
    f.setAttribute('allowfullscreen', '');
    f.src = view === 'ai' ? '/__px/ai' : '/__px/';
    st.appendChild(f);
    VEIL.frame = f;
  } else if (VEIL.view !== view) {
    try { VEIL.frame.contentWindow.postMessage({ veilCmd: view }, location.origin); } catch (e) {}
  }
  VEIL.view = view;
}
// The proxy tells us when it switches views itself (its back arrow, Esc, a swipe): keep the header in sync.
addEventListener('message', e => {
  if (!VEIL.frame || e.source !== VEIL.frame.contentWindow || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || d.veilShell !== 1 || (d.view !== 'ai' && d.view !== 'browse')) return;
  VEIL.view = d.view;
  if (d.view === 'browse') veilWake();
  if (CUR === '#/browse' || CUR === '#/ai') {
    CUR = '#/' + d.view;
    try { history.replaceState({ sig: CUR }, '', location.pathname + location.search); } catch (err) {}
    markVeilButtons(d.view);
    setTitle((d.view === 'ai' ? 'AI' : 'Browse') + ' · ' + BRAND);
  }
});
addEventListener('resize', () => { if (document.documentElement.classList.contains('veil-on')) placeVeil(); });

function route() {
  const parts = decodeURIComponent(CUR.replace(/^#/, '')).split('/').filter(Boolean);
  setTitle(`${BRAND} · Free Online Games`);
  renderRail(parts.length ? '#/' + (parts[0] === 'p' ? parts.slice(0, 2) : parts.slice(0, 2)).join('/') : '#/');
  $('#suggest').hidden = true;
  app.onclick = null;   // pages that need a click handler (the Theme Store) set their own
  if (DRAFT_ON && parts[0] !== 'make') { DRAFT_ON = false; applySettings(); }   // leaving the Theme Maker
  if (player.g && !(parts[0] === 'play' && parts[1] === player.g.slug)) setMode('mini');
  const veilView = parts[0] === 'browse' || parts[0] === 'ai' ? parts[0] : null;
  showVeil(veilView);
  if (veilView) return;
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
  requestAnimationFrame(layoutCheatTab);
}

/* ---------- search box ---------- */
function wireSearch() {
  const input = $('#search'), box = $('#suggest');
  let sel = -1;
  const render = () => {
    const q = input.value.trim().toLowerCase(); sel = -1;
    if (q.length < 2) { box.hidden = true; return; }
    const hits = GAMES.filter(g => g.t.toLowerCase().includes(q)).sort((a, b) => (b.t.toLowerCase().startsWith(q)) - (a.t.toLowerCase().startsWith(q)) || (b.pop || 0) - (a.pop || 0)).slice(0, 7);
    box.innerHTML = hits.map(g => `<a href="#/play/${g.slug}">${img(gi(g), '80px')}<span>${esc(g.t)}<div class="s-meta">${esc(platLabel(g))}</div></span></a>`).join('') +
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
      nav(sel >= 0 ? items[sel].getAttribute('href') : '#/search/' + encodeURIComponent(q));
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
        <p class="set-note">${THEMES.some(t => t.store && !ownsTheme(t.id)) ? 'Want more?' : 'You own every theme.'} <a class="ts-link" href="#/store" data-close>${ic('bag')}Theme Store</a></p>
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
      ${codesSettingsHtml()}
      <div class="set-group"><span class="label">Your data</span>
        <div class="danger">
          <button class="tbtn" data-clear="recent">${ic('clock')}Clear recently played</button>
          <button class="tbtn" data-clear="favs">${ic('heart')}Clear favorites</button>
          <button class="tbtn" data-clear="settings">${ic('restart')}Reset settings</button>
          <a class="tbtn" href="/logout">${ic('lock')}Sign out</a>
        </div>
        <p class="set-note">Settings, favorites and history are stored in this browser only. Nothing is sent to a server. Site version 2026-09-24-13.</p>
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
    else if (b.dataset.eggAct) runEgg(b.dataset.eggAct);
    else if (b.dataset.clear === 'recent') { recent = []; store.set('gs:recent', recent); toast('History cleared'); }
    else if (b.dataset.clear === 'favs') { favs.clear(); store.set('gs:favs', []); toast('Favorites cleared'); }
    else if (b.dataset.clear === 'settings') { Object.assign(settings, SETTINGS_DEFAULTS); store.set('sig:settings', settings); applySettings(); toast('Settings reset'); }
    else return;
    const y = $('.set-body', dlg).scrollTop; renderSettings(); $('.set-body', dlg).scrollTop = y;
    if (b.dataset.clear) route();
  });
  dlg.addEventListener('submit', e => {
    const cf = e.target.closest('[data-code-form]');
    if (cf) {
      e.preventDefault();
      const code = cf.elements.code.value.trim(); if (!code) return cf.elements.code.focus();
      const r = redeemCode(code);
      if (r === 'nope') {
        cf.classList.add('bad'); cf.classList.remove('shake'); void cf.offsetWidth; cf.classList.add('shake');
        cf.elements.code.select(); return toast('That code doesn’t do anything… yet');
      }
      const egg = EGGS.find(x => x.hash === codeHash(code));
      toast(r === 'new' ? `Unlocked: ${egg.name}!` : `You already unlocked ${egg.name}`);
      const y = $('.set-body', dlg).scrollTop; renderSettings(); $('.set-body', dlg).scrollTop = y;
      return;
    }
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
  dlg.addEventListener('close', () => { if (CUR === '#/' || /#\/(recent|favorites)/.test(CUR)) route(); });
}

/* ---------- boot ---------- */
async function boot() {
  $('#brandA').textContent = CONFIG.brand[0]; $('#brandB').textContent = CONFIG.brand[1];
  setupRail();
  $('#randomIco').outerHTML = ic('shuffle');
  $('#browseIco').outerHTML = ic('globe');
  $('#aiIco').outerHTML = ic('sparkles');
  $('#browseBtn').onclick = () => nav('#/browse');
  $('#aiBtn').onclick = () => nav('#/ai');
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
  $('#randomBtn').onclick = () => { const pool = GAMES.filter(g => g.c !== 'check'); nav('#/play/' + pool[Math.floor(Math.random() * pool.length)].slug); };
  wireSearch();
  // Pages live in memory, not in the address bar: it always shows just the domain.
  // Links still use "#/…" internally; clicks on them are caught here.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); nav(a.getAttribute('href'));
  });
  addEventListener('popstate', e => { CUR = e.state?.sig || '#/'; route(); });
  // Someone typed or pasted an address with "#/…": go there, then tidy the address bar.
  addEventListener('hashchange', () => { if (location.hash.length > 1) nav(location.hash, true); });
  CUR = location.hash.length > 1 ? location.hash : '#/';
  try { history.replaceState({ sig: CUR }, '', location.pathname + location.search); } catch (e) {}
  route();
}
boot();
})();
