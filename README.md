# Sigmund:re

A static game portal for the games in `UGS-Files/`, with thumbnails from `thumbnails/`.
There's no backend: nginx serves the files, and the page loads its catalog from `games.json`.

## What's in here

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The site (layout, styles, app logic) |
| `games.json` | Catalog: title, game file, thumbnail, platform, categories |
| `UGS-Files/` | The game pages (loaded in an iframe on the play page) |
| `thumbnails/` | One 480×270 JPG per game, same name and subfolder as the game |
| `login.html` | Sign-in page (see *Password* below) |
| `Dockerfile`, `nginx.conf`, `docker/` | Container image; nginx listens on **port 3847** and checks the password |
| `docker-compose.yml` | Optional, only for Coolify's Docker Compose build pack |

## Deploy on Coolify (Dockerfile build pack)

1. Push this folder to a Git repo (GitHub, Gitea, etc.) and add it as a resource in Coolify.
2. Set **Build Pack** to **Dockerfile** (Dockerfile location: `/Dockerfile`).
3. Set **Ports Exposes** to `3847`. You don't need to publish a host port because Coolify's proxy routes your domain to it.
4. Add an environment variable `SITE_PASSWORD` with the password visitors must enter.
5. Add your domain and deploy. The health check is at `/healthz`.

To use a different port, change `listen 3847` in `nginx.conf` and `EXPOSE` / the `HEALTHCHECK` URL in the `Dockerfile`, then update Ports Exposes to match.

### Large games (parked in `_large-games/`)

GitHub rejects any file larger than 100 MB, so three games have been moved out of `UGS-Files/` into `_large-games/`:
Rabbit Hole 106 (≈488 MB), Colorbox Mustard (≈169 MB) and Geometry Dash Wave (Full) (≈121 MB).
That folder is left out of Git and the Docker image, and the three games have been removed from `games.json`. Their thumbnails are still in `thumbnails/`.

To add them back later (for example with Git LFS: `git lfs track "UGS-Files/html5-games/*.html"`):
1. Move the files from `_large-games/html5-games/` back to `UGS-Files/html5-games/`.
2. Copy their three entries from `_large-games/large-games.json` into `games.json` (it's a JSON array, so add them anywhere inside the `[ ]`).

The rest of the library is about 0.4 GB, so the first build and push will still take a little while.

## Password (sign-in page)

The whole site sits behind one shared password. Visitors who aren't signed in see a sign-in page right at the site's address (`/`). Its design is a neutral "Lanternwise" learning portal kept in `login.html`. Any other address sends them back to `/`. Once they're signed in, `/` shows the normal site.

- **Set the password** with the `SITE_PASSWORD` environment variable. In Coolify: your resource → **Environment Variables** → add `SITE_PASSWORD`, then redeploy. Locally: `docker run --rm -p 3847:3847 -e SITE_PASSWORD='your password' sigmund-re`.
- **Change it** by changing the variable and restarting. Everyone who was signed in has to sign in again.
- If `SITE_PASSWORD` isn't set, the site stays locked for everyone (the container log says so).
- **Sign out:** Settings → *Sign out*, or open `/logout`. Visitors are also signed out when they close the browser.
- **Rename or restyle the sign-in page:** edit `login.html` (name, text, colors). It's a single self-contained file.

How it works: the sign-in page hashes the password (SHA-256 with a fixed salt) into a `lw_session` cookie and asks `/auth-check` whether it's right. At startup `docker/40-site-password.sh` hashes `SITE_PASSWORD` the same way and writes the nginx rule that compares the two. The password itself is never stored in the repo or the image. Wrong guesses are rate-limited to about 30 requests a minute.
This is a simple shared password, not user accounts: use something longer than a single word, and serve the site over HTTPS (Coolify does this for you) so the cookie can't be read in transit.

## Run locally

```bash
docker build -t sigmund-re .
docker run --rm -p 3847:3847 -e SITE_PASSWORD='letmein' sigmund-re
# open http://localhost:3847
```

You can also serve the folder with any static server, for example `python -m http.server 3847`, but then there's no password check (it lives in nginx). Opening `index.html` directly from disk won't work because the page has to fetch `games.json`.

## Customising

- **Name:** change `brand` at the top of `assets/app.js` and the `<title>` in `index.html`.
- **Featured games:** the page picks them fresh each day, seeded by the date. Everyone sees the same picks that day, and they rotate at midnight. The Game of the Day always comes from the "popular" list. Tune `featuredCount`, `picksCount` and `rowSize` in `CONFIG`.
- **Popular games:** set `"pop":1` on any entry in `games.json`.
- **Categories:** each game has up to 3 genres in its `g` field in `games.json`, and you can edit them freely.
- **Adding a game:** put the `.html` file in `UGS-Files/...` and a 16:9 image in `thumbnails/...`. Then add an entry to `games.json`:
  `{"t":"Title","p":"UGS-Files/html5-games/Title.html","i":"thumbnails/html5-games/Title.jpg","k":"Web","pl":"Web","g":["Arcade"],"c":"good"}`
  (`k` is `Web`, `Flash` or `Retro`; for Retro, `pl` is the console name).

Favorites and recently played are saved in each visitor's own browser.

## Settings and themes

Visitors open **Settings** with the gear button. Their choices are saved in their own browser (`localStorage` key `sig:settings`):
theme, accent color, card size, game names on/off, animations on/off, auto-start games, and open games in a new tab.
They can also clear their favorites and history there.

The default theme is **Black**. Themes live in `assets/themes/`. Each theme is one CSS file plus an entry in `THEMES` in `assets/app.js`, and only the active theme's file is loaded.
A theme can restyle the whole site, not just its colors. See `assets/themes/README.md`.
If you change the defaults, update both `SETTINGS_DEFAULTS` in `assets/app.js` and the small script in the `<head>` of `index.html`.
