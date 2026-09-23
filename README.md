# Game Stash

A static game portal for the games in `UGS-Files/`, with thumbnails from `thumbnails/`.
There's no backend: nginx serves the files, and the page loads its catalog from `games.json`.

## What's in here

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The site (layout, styles, app logic) |
| `games.json` | Catalog: title, game file, thumbnail, platform, categories |
| `UGS-Files/` | The game pages (loaded in an iframe on the play page) |
| `thumbnails/` | One 480×270 JPG per game, same name and subfolder as the game |
| `Dockerfile`, `nginx.conf` | Container image; nginx listens on **port 3847** |
| `docker-compose.yml` | Optional, only for Coolify's Docker Compose build pack |

## Deploy on Coolify (Dockerfile build pack)

1. Push this folder to a Git repo (GitHub, Gitea, etc.) and add it as a resource in Coolify.
2. Set **Build Pack** to **Dockerfile** (Dockerfile location: `/Dockerfile`).
3. Set **Ports Exposes** to `3847`. You don't need to publish a host port because Coolify's proxy routes your domain to it.
4. Add your domain and deploy. The health check is at `/healthz`.

To use a different port, change `listen 3847` in `nginx.conf` and `EXPOSE` / the `HEALTHCHECK` URL in the `Dockerfile`, then update Ports Exposes to match.

### Large games (parked in `_large-games/`)

GitHub rejects any file larger than 100 MB, so three games have been moved out of `UGS-Files/` into `_large-games/`:
Rabbit Hole 106 (≈488 MB), Colorbox Mustard (≈169 MB) and Geometry Dash Wave (Full) (≈121 MB).
That folder is left out of Git and the Docker image, and the three games have been removed from `games.json`. Their thumbnails are still in `thumbnails/`.

To add them back later (for example with Git LFS: `git lfs track "UGS-Files/html5-games/*.html"`):
1. Move the files from `_large-games/html5-games/` back to `UGS-Files/html5-games/`.
2. Copy their three entries from `_large-games/large-games.json` into `games.json` (it's a JSON array, so add them anywhere inside the `[ ]`).

The rest of the library is about 0.4 GB, so the first build and push will still take a little while.

## Run locally

```bash
docker build -t gamestash .
docker run --rm -p 3847:3847 gamestash
# open http://localhost:3847
```

You can also serve the folder with any static server, for example `python -m http.server 3847`. Opening `index.html` directly from disk won't work because the page has to fetch `games.json`.

## Customising

- **Name:** change `brand` at the top of `assets/app.js` and the `<title>` in `index.html`.
- **Featured games:** the page picks them fresh each day, seeded by the date. Everyone sees the same picks that day, and they rotate at midnight. The Game of the Day always comes from the "popular" list. Tune `featuredCount`, `picksCount` and `rowSize` in `CONFIG`.
- **Popular games:** set `"pop":1` on any entry in `games.json`.
- **Categories:** each game has up to 3 genres in its `g` field in `games.json`, and you can edit them freely.
- **Adding a game:** put the `.html` file in `UGS-Files/...` and a 16:9 image in `thumbnails/...`. Then add an entry to `games.json`:
  `{"t":"Title","p":"UGS-Files/html5-games/Title.html","i":"thumbnails/html5-games/Title.jpg","k":"Web","pl":"Web","g":["Arcade"],"c":"good"}`
  (`k` is `Web`, `Flash` or `Retro`; for Retro, `pl` is the console name).

Favorites and recently played are saved in each visitor's own browser.
