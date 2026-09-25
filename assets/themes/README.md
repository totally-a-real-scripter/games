# Themes

Each theme is one CSS file in this folder plus one line in the `THEMES` list at the top of `assets/app.js`.

1. Copy `black.css` to `mytheme.css` and change `data-theme="black"` to `data-theme="mytheme"` everywhere in it.
2. Set the color tokens (`--paper`, `--surface`, `--ink`, `--line`, `--shadow-c`, `--muted`, `--dots`).
3. Add `{ id: 'mytheme', name: 'My Theme', note: 'Short description', swatch: ['#bg', '#card', '#text'] }` to `THEMES` in `assets/app.js`.

It shows up in Settings right away. Only the selected theme's file is loaded.

A theme can change more than colors. Every rule in its file is scoped to `:root[data-theme="…"]`, so it can
swap fonts (`--sans`, `--mono`), corner radius (`--r`), border width (`--bw`), or restyle whole components
(`.card`, `.drop`, `.top`, `.rail`, `.cabinet`, …) without affecting other themes.
The `<html>` element also carries the visitor's other settings as attributes
(`data-accent`, `data-size`, `data-names`, `data-motion`), so a theme can react to those too.

## Theme Store

Themes with `store: true` in `THEMES` only show up in Settings after they're "bought" (for free) on the
Theme Store page (`#/store`). Owned themes are saved in this browser under `sig:themes`.
For the store preview card, also give the theme a `c: { paper, surface, ink, line, shadow, muted }` object
with the same colors as its CSS file, and `dark: true/false`. Leave out `store: true` to make a theme free
for everyone without visiting the store.
