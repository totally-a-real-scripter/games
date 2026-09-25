# Themes

There are two ways to make a theme. The easy way needs no code at all.

## The easy way: the Theme Maker

1. On the site, open **Theme Store** → **Make your own theme** (or go to `#/make`).
2. Pick colors, fonts and pictures. The whole site shows your theme as you go.
3. Choose what to do with it:
   - **Save & use** keeps it in your browser only (it shows up under "Made by you").
   - **Add to the site** gives you a new `themes.json` to download, plus any pictures you picked.
     Put `themes.json` in this folder (replace the old one), put the pictures in `images/`, then commit, push and redeploy.
     Now it's in the Theme Store for everyone.

Every theme in the store has a **Remix** link that opens it in the Theme Maker, so you can start from one you like.

## The simple-file way: `themes.json`

Each theme is one `{ ... }` in the `"themes"` list. Copy one of the examples (Potato Mode, Party Mode, Mirror World)
and change it. Put a comma between themes. Only `"name"` is required; leave out anything you don't want.

```json
{
  "id": "cheese",
  "name": "Cheese Mode",
  "note": "Everything is cheese.",
  "price": "1 cheese wheel",
  "dark": false,
  "colors": {
    "background": "#ffe28a", "background2": "#ffd45c", "card": "#fff6d6",
    "text": "#3a2a00", "lines": "#3a2a00", "shadow": "#3a2a00", "muted": "#7a6320",
    "accent": "#ff9f1c"
  },
  "font": "Comic Neue",
  "headingFont": "Bangers",
  "logoText": ["Cheese", ":re"],
  "images": {
    "background": "images/cheese-tile.png",
    "backgroundStyle": "tile",
    "backgroundSize": 160,
    "logo": "images/cheese-logo.png",
    "cursor": "images/cheese-cursor.png",
    "games": ["images/cheese1.png", "images/cheese2.gif"],
    "icons": { "*": "images/cheese-icon.png", "home": "images/house.png" }
  },
  "layout": {
    "radius": 20, "border": 3, "shadows": true,
    "wobble": true, "spin": false, "roundThumbs": false, "tilt": 0, "mirror": false
  },
  "css": ""
}
```

| Option | What it does |
| --- | --- |
| `id` | Short name with no spaces (made from `name` if left out). |
| `name`, `note` | Shown in the Theme Store and Settings. |
| `price` | A joke price, shown crossed out next to FREE. |
| `dark` | `true` for a dark theme, `false` for a light one. Missing colors use Black or Paper's colors. |
| `colors` | `background`, `background2` (panels), `card`, `text`, `lines` (outlines), `shadow`, `muted` (faded text), `accent` (leave out to keep each visitor's own accent color). Any CSS color works. |
| `font`, `headingFont` | Any font name from [Google Fonts](https://fonts.google.com), for example `Comic Neue`, `Press Start 2P`, `Bangers`, `Creepster`. |
| `logoText` | Changes the logo words: `["Main", "ending"]`. |
| `images.background` | Picture behind everything. `backgroundStyle`: `tile` (repeat), `cover` (fill the screen) or `stretch`. `backgroundSize`: tile width in pixels. |
| `images.logo` | Picture that replaces the whole logo (about 150×44). |
| `images.cursor` | Mouse pointer picture. Keep it 32×32 (browsers ignore anything bigger than 128×128). `cursorHover` sets a different one over buttons and links. |
| `images.games` | One picture or a list. Every game's thumbnail becomes one of these. |
| `images.icons` | `"*"` replaces every small icon. You can also replace single icons by name: `home`, `sparkles`, `flame`, `clock`, `heart`, `bag`, `gear`, `shuffle`, `play`, `globe`, `monitor`, `gamepad`, and the rest in the `ICONS` list in `assets/app.js`. |
| `layout.radius` | Corner roundness in pixels (0–60). |
| `layout.border` | Outline thickness in pixels (0–8). |
| `layout.shadows` | `false` removes the chunky shadows. |
| `layout.wobble` | Crooked game cards. |
| `layout.spin` | Cards spin when you point at them. |
| `layout.roundThumbs` | Round game pictures. |
| `layout.tilt` | Tilts the whole site, in degrees (-10 to 10). |
| `layout.mirror` | Flips the whole site backwards. |
| `css` | Extra CSS for anything else. Start rules with `:root[data-theme="your-id"]`. |

Pictures can be PNG, JPG, GIF (animated works) or SVG. Put them in `images/` and write them as `"images/name.png"`,
or use a full `https://` address.

If a theme doesn't show up, `themes.json` probably has a typo: a missing comma between themes, or a missing quote.
Paste it into any online "JSON validator" to find the spot.

Themes in `themes.json` are in the Theme Store: visitors press **Get** (it's free) and then they can use it.
Owned themes are saved in each browser.

## The old way: a CSS file

Black, Paper and the other built-in themes are CSS files in this folder, listed in `THEMES` at the top of `assets/app.js`.

1. Copy `black.css` to `mytheme.css` and change `data-theme="black"` to `data-theme="mytheme"` everywhere in it.
2. Set the color tokens (`--paper`, `--paper-2`, `--surface`, `--ink`, `--line`, `--shadow-c`, `--muted`, `--dots`).
3. Add `{ id: 'mytheme', name: 'My Theme', note: 'Short description', swatch: ['#bg', '#card', '#text'], store: true, dark: true, c: { paper, surface, ink, line, shadow, muted } }` to `THEMES`.
   Leave out `store: true` to make it available to everyone without the store.
