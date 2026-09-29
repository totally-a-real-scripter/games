# Veil: a hardened, self-hosted web proxy

Veil is a browser-based web proxy. Enter an address or a search, and the page is fetched by the server, rewritten so that links, forms, scripts, stylesheets, images, redirects and WebSockets keep routing through the proxy, and shown in a clean dark interface with navigation controls.

It is built to **not** become an open server-side request relay: every destination is validated, resolved once, checked against private and reserved address space, and pinned before a socket is opened.

- **Backend:** Node.js 22 + TypeScript, no web framework (`node:http`)
- **Frontend:** plain HTML/CSS/JS (no build step)
- **Runtime dependencies:** `parse5` (spec-compliant HTML tokenizer), `tough-cookie` (RFC 6265 cookie jar), `ipaddr.js`, `tldts`
- **Deployment:** a single Docker image, configured through environment variables

---

## Contents

1. [Quick start](#quick-start)
2. [Project structure](#project-structure)
3. [How it works](#how-it-works)
4. [Configuration](#configuration)
5. [Deploying with Docker](#deploying-with-docker)
6. [Deploying on Coolify](#deploying-on-coolify)
7. [AI assistant](#ai-assistant)
8. [Behind Nginx](#behind-nginx)
9. [Behind Cloudflare](#behind-cloudflare)
10. [Security model](#security-model)
11. [Security review checklist](#security-review-checklist)
12. [Limitations](#limitations)
13. [Development and tests](#development-and-tests)

---

## Quick start

### Docker (recommended)

```bash
cp .env.example .env          # optional: edit settings
docker build -t veil-proxy .
docker run -d --name veil --env-file .env -p 127.0.0.1:43117:43117 \
  --read-only --cap-drop ALL --security-opt no-new-privileges veil-proxy
```

Open http://localhost:43117. Health check: `curl http://localhost:43117/healthz`.

The app uses a dedicated port, **43117**, rather than a common default like 8080, so it won't collide with other services. To use a different one:

```bash
# build-time default baked into the image
docker build --build-arg PORT=51820 -t veil-proxy .
# or override at run time (container port and published port)
docker run -d --env-file .env -e PORT=51820 -p 127.0.0.1:51820:51820 veil-proxy
```

With Compose, set `PORT` (container) and `HOST_PORT` (host) in `.env`.

Or with Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

### Without Docker

Requires Node.js 22 or newer.

```bash
npm ci
npm run build
npm start                      # listens on 0.0.0.0:43117
# or, loading .env automatically:
npm run dev
```

---

## Project structure

```
.
├── Dockerfile                 multi-stage build, runs as the non-root "node" user
├── docker-compose.yml         hardened example (read-only FS, dropped caps)
├── .dockerignore
├── .env.example               every setting, documented
├── deploy/
│   └── nginx.conf             TLS reverse-proxy example (incl. WebSockets)
├── public/                    static UI (served from memory, fixed allowlist)
│   ├── index.html             shell: toolbar, address bar, landing page, viewport
│   ├── app.css                dark glass theme, responsive
│   ├── app.js                 shell behaviour (navigation, loading state, menu, reactive background)
│   ├── ai.js                  AI chat panel (streaming, safe Markdown rendering)
│   ├── client.js              runtime injected into proxied pages
│   └── favicon.svg
├── src/
│   ├── server.ts              entry point, graceful shutdown
│   ├── app.ts                 router, internal endpoints, root-relative fallback
│   ├── config.ts              env parsing with strict validation
│   ├── security/
│   │   ├── ssrf.ts            URL validation, host policy, DNS resolution + pinning
│   │   ├── limits.ts          rate limiter, concurrency gate, connection counter
│   │   └── clientip.ts        trusted client-IP / HTTPS detection
│   ├── proxy/
│   │   ├── handler.ts         the HTTP proxy pipeline
│   │   ├── upstream.ts        outbound requests (pinned DNS, timeouts, TLS)
│   │   ├── websocket.ts       WebSocket relay
│   │   ├── headers.ts         request denylist / response allowlist
│   │   ├── body.ts            bounded reads, decompression, charset decoding
│   │   ├── urlcodec.ts        /p/<scheme>/<host>/<path> <-> real URL
│   │   └── context.ts         shared context, sessions, security headers
│   ├── rewrite/
│   │   ├── html.ts            parse5-based HTML rewriter
│   │   └── css.ts             url() / @import rewriter
│   ├── ai/chat.ts             AI assistant backend (streaming, failover, cooldowns)
│   ├── ai/providers.ts        free-tier presets + custom OpenAI-compatible providers
│   ├── session/store.ts       server-side cookie jars
│   ├── pages/errors.ts        escaped error pages
│   └── util/log.ts            JSON logger
└── test/
    ├── security.test.ts       SSRF matrix, codecs, rewriters, limits
    ├── ai.test.ts             AI endpoint: streaming, failover, cooldowns, validation, CSRF, quotas
    └── integration.test.ts    end-to-end proxy against a live local upstream
```

---

## How it works

### URL scheme

```
https://example.com:8443/a/b?q=1   ->   /p/https/example.com:8443/a/b?q=1
```

The readable, hierarchical form means the browser's own relative-URL resolution keeps working (`img.png` on `/p/https/example.com/a/` resolves to `/p/https/example.com/a/img.png`), and GET forms append their query string in the right place without any help.

### Request pipeline (`src/proxy/handler.ts`)

1. **Decode** the path into a destination URL, canonicalise it (missing trailing slash gets a 308).
2. **Validate** the destination (scheme, credentials, port, allow/block lists, reserved names, IP literals).
3. **Structural checks:** method allowlist, service-worker script fetches refused, loop detection, body-size precheck.
4. **Resolve DNS once**, check that every returned address is public, and **pin** the chosen address.
5. **Forward** a filtered request: hop-by-hop and infrastructure headers removed, `Origin`/`Referer` translated to real URLs, cookies taken from the server-side jar with emulated SameSite rules.
6. **Handle the response:** `Set-Cookie` goes to the jar; `Location`/`Refresh` are rewritten back under `/p/`; response headers pass an allowlist; the proxy adds its own CSP, `nosniff`, `Permissions-Policy`, etc.
7. **Body:** HTML and CSS are decompressed (gzip/deflate/brotli) within strict size limits, rewritten, and re-compressed. Everything else streams through with a byte cap. Responses with no `Content-Type` are sniffed server-side so HTML is never left for the browser to render unrewritten.

### Rewriting

- **Server-side HTML** (`src/rewrite/html.ts`): `href`, `src`, `srcset` (including CDN URLs containing commas), `action`, `formaction`, `poster`, `data`, `background`, SVG `href`/`xlink:href`, `<base>`, `<meta http-equiv=refresh>`, inline `style=""`, `<style>` blocks, import maps and `<iframe srcdoc>`. `integrity` and `ping` are removed, and upstream CSP `<meta>` tags are dropped.
- **Server-side CSS** (`src/rewrite/css.ts`): `url(...)` and `@import`.
- **Client runtime** (`public/client.js`), injected first in `<head>`: patches `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `Worker`, `sendBeacon`, `window.open`, `history.pushState/replaceState`, DOM URL properties and `setAttribute`, fixes markup inserted with `innerHTML` (MutationObserver), catches link clicks and form submissions, intercepts script-driven navigations via the Navigation API (Chromium), translates `postMessage` origins, emulates `document.cookie` against the server jar and namespaces `localStorage`/`sessionStorage` per site.
- **Root-relative fallback:** a request for `/api/x` coming from a proxied page (identified by its `Referer`) is redirected (307) to `/p/<scheme>/<that site>/api/x`. This rescues URLs that scripts build from `location.origin`.

### Sessions and cookies

The browser only ever holds one cookie: `__px_sid` (random 256-bit, `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS). Upstream cookies are stored server-side in a per-session `tough-cookie` jar that enforces domain, path, expiry, `Secure`, `__Host-`/`__Secure-` prefixes, public-suffix rules and SameSite. Page scripts can see only their own site's non-HttpOnly cookies. Sessions expire after `SESSION_TTL_MINUTES` of inactivity, are capped in number and bytes, and creation is rate-limited per IP. "Clear session data" in the menu destroys the jar, expires the session cookie and sends `Clear-Site-Data: "storage"` to wipe site storage on the proxy origin.

Sessions live in memory. When running several replicas, use sticky sessions at the load balancer, or accept that logins are per-replica.

---

## Configuration

All settings are environment variables. See [`.env.example`](.env.example) for the full, commented list. The most important ones:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `43117` / `0.0.0.0` | Listen address (dedicated default port) |
| `HOST_PORT` / `BIND_ADDR` | `43117` / `127.0.0.1` | Compose only: published host port and interface |
| `PUBLIC_HOSTNAMES` | *(empty)* | The proxy's own public names; always blocked as destinations (loop protection) |
| `ALLOWED_HOSTS` | *(empty = any public host)* | If set, only these hosts may be proxied. `*.example.com` wildcards |
| `BLOCKED_HOSTS` | *(empty)* | Hosts that may never be proxied |
| `BLOCKED_CIDRS` | *(empty)* | Extra IP ranges to block (e.g. your own public ranges) |
| `ALLOWED_PORTS` | `80,443` | Destination ports; `*` allows any (not recommended) |
| `TRUST_PROXY_HOPS` | `0` | Trusted reverse proxies in front (for client IP + HTTPS detection) |
| `CLIENT_IP_HEADER` | *(empty)* | Single trusted IP header, e.g. `cf-connecting-ip` |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_BURST` | `600` / `200` | Per-client token bucket |
| `MAX_CONCURRENT_REQUESTS` / `MAX_CONCURRENT_PER_IP` | `128` / `24` | In-flight upstream requests |
| `MAX_RESPONSE_BYTES` | 100 MiB | Per streamed response |
| `MAX_REWRITE_BYTES` | 8 MiB | Max decompressed HTML/CSS size to rewrite |
| `MAX_REQUEST_BODY_BYTES` | 10 MiB | Upload limit |
| `CONNECT_TIMEOUT_MS` / `RESPONSE_TIMEOUT_MS` / `IDLE_TIMEOUT_MS` | 10 s / 25 s / 30 s | Upstream timeouts |
| `ENABLE_COOKIES` | `true` | Server-side cookie jars (set `false` for a stateless proxy) |
| `COOKIE_SECURE` | `auto` | `Secure` flag on the session cookie |
| `ENABLE_WEBSOCKETS` | `true` | WebSocket relay |
| `ISOLATION_MODE` | `compat` | `compat` or `sandbox` (see [Security model](#security-model)) |
| `SEARCH_URL` | DuckDuckGo HTML | Search engine for non-URL input (`%s` = query) |
| `LOG_REQUESTS` | `false` | One JSON line per request (IP, method, status, destination host only) |

Invalid values make the process exit at startup instead of silently falling back.

**Memory sizing:** the worst case is roughly `MAX_CONCURRENT_REQUESTS × MAX_REWRITE_BYTES × ~4` for rewriting, plus `MAX_SESSIONS × MAX_COOKIE_BYTES_PER_SESSION` for cookie jars. The defaults fit comfortably in 1 GB under realistic load.

---

## Deploying with Docker

```bash
docker build -t veil-proxy .
docker run -d --name veil --restart unless-stopped \
  --env-file .env \
  -p 127.0.0.1:43117:43117 \
  --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges \
  --memory 1g --pids-limit 256 \
  veil-proxy
```

- The image runs as the unprivileged `node` user and needs no writable filesystem.
- A `HEALTHCHECK` polls `/healthz`. It returns `{"status":"ok","uptime":…,"inFlight":…,"sessions":…}`.
- `SIGTERM` triggers a graceful shutdown (in-flight requests finish, forced after 10 s).
- Bind to `127.0.0.1` and publish through a TLS-terminating reverse proxy.

> **Network egress:** the container needs outbound access to the internet on the allowed ports. For defence in depth, also block the container from reaching your private networks at the network layer (Docker network policy, host firewall or cloud security group). Consider this mandatory on cloud VMs, which expose metadata endpoints.

---

## Deploying on Coolify

Coolify builds the image from the `Dockerfile` and routes your domain to it through its own proxy (Traefik), which also handles HTTPS certificates and WebSockets.

1. **Put the project in a Git repository** (GitHub, GitLab, Gitea, …) and connect it in Coolify: *Projects → Add resource → Public/Private repository*.
2. **Build pack:** choose **Dockerfile** (Base directory `/`, Dockerfile location `/Dockerfile`).
3. **Network:**
   - *Ports Exposes:* `43117`
   - *Ports Mappings:* leave empty. Traefik reaches the container over Coolify's internal network, so no host port needs to be opened.
   - *Domains:* `https://proxy.example.com` (your domain; Coolify issues the certificate).
4. **Environment variables** (*Environment Variables* tab):
   ```
   PORT=43117
   TRUST_PROXY_HOPS=1
   COOKIE_SECURE=true
   BLOCKED_CIDRS=<your server's public IP>/32
   ```
   - `TRUST_PROXY_HOPS=1` makes rate limits apply to real visitors instead of Traefik's address.
   - `BLOCKED_CIDRS` stops the proxy from looping back into other apps on the same server via its public IP.
   - The app reads Coolify's `COOLIFY_FQDN` automatically and blocks its own domain as a destination, so `PUBLIC_HOSTNAMES` is only needed for extra names.
   - Add anything else from `.env.example` as needed.
5. **Health check** (*Health Checks* tab): enable it with path `/healthz`, port `43117`, scheme `http`. (The image's own `HEALTHCHECK` also works.)
6. **Hardening (optional):** under *Advanced → Custom Docker Options*, add
   `--cap-drop=ALL --security-opt=no-new-privileges --init`
7. **Deploy.** Open your domain, and check `https://proxy.example.com/healthz`.

**Using Cloudflare in front of Coolify?** Set the DNS record to proxied, SSL mode to **Full (strict)**, and replace `TRUST_PROXY_HOPS=1` with `CLIENT_IP_HEADER=cf-connecting-ip`. Only do that if the server's ports 80/443 accept traffic from Cloudflare IPs alone; otherwise visitors can fake the header.

**Why internal Coolify services are safe:** the container shares Docker networks with Coolify's own services and your other apps. Their private addresses (`10.x`, `172.16–31.x`) and single-label Docker service names (e.g. `coolify-db`) are refused by the destination policy, and only ports 80/443 are allowed, so the Coolify dashboard port can't be reached through the proxy.

Sessions are kept in memory, so keep the resource at **one replica** (the default); a redeploy signs everyone out of proxied sites.

---

## AI assistant

Veil includes a chat assistant on its own page at **`/ai`**. Open it with the **Ask AI** button on the home screen, the sparkle button in the browsing toolbar, **Ctrl+J** anywhere, or **Ctrl+Enter** in the search box to send what you typed. The AI page slides in from the right; the back arrow, **Esc**, the browser's Back button or a swipe from the left edge on touch screens slide back to browsing. The page you were browsing stays loaded underneath, so you return exactly where you left off. Answers stream in live with formatting, code blocks and copy buttons. Links in answers open through the proxy, and each answer shows which provider wrote it.

### Multiple free providers with automatic failover

Add a free API key for as many providers as you like. Veil tries them **in order, fastest first**. When one is rate-limited, out of free quota, erroring, or doesn't start answering within `AI_ATTEMPT_TIMEOUT_MS` (20 s), the **next provider answers the same message immediately**. The one that failed **rests** until its limit resets:

- Rate limits honour the provider's `Retry-After` / `x-ratelimit-reset-*` headers when it sends them. Otherwise the rest backs off 1 → 2 → 4 … up to 60 minutes, or at least an hour when the provider says a daily quota is used up.
- A rejected key or unknown model rests for 30 minutes (check the logs); server errors for 30 seconds.
- When every provider is resting, visitors are told roughly when to try again.

| Provider | Get a free key | Default model | Why it's in the chain |
|---|---|---|---|
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | `llama-3.3-70b-versatile` | Very fast; generous daily requests (tokens per minute is the real cap) |
| Cerebras | [cloud.cerebras.ai](https://cloud.cerebras.ai) | `gpt-oss-120b` | Very fast; large token budget |
| Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `gemini-2.5-flash` | Strong quality on Google's free tier |
| Mistral | [console.mistral.ai](https://console.mistral.ai) | `mistral-small-latest` | Large monthly token allowance |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | `meta-llama/llama-3.3-70b-instruct:free` | Many free models; low daily cap, good backup |
| Ollama (self-hosted) | no key | `llama3.2:3b` | Unlimited last resort on your own server |

Set just the keys you have, for example in Coolify's environment variables:

```
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=csk-...
GEMINI_API_KEY=AIza...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=sk-or-...
```

- **Order:** `AI_ORDER` changes the order (default `groq,cerebras,gemini,mistral,openrouter,custom,ollama`).
- **Load spreading:** `AI_STRATEGY=round-robin` spreads load across providers instead of always starting with the first. That helps stay under per-minute limits when many people use it at once.
- **Models:** each default can be overridden (`GROQ_MODEL`, `GEMINI_MODEL`, …). Free catalogs and limits change often, so if a provider starts returning "model not found", check its current free models and update the setting.
- **Privacy:** some free tiers may use prompts to improve their models; read each provider's terms if that matters to you.

**Other OpenAI-compatible APIs** (including PhotonAI when its API launches) can join the chain as `AI_1_*` … `AI_9_*`:

```
AI_1_NAME=PhotonAI
AI_1_BASE_URL=https://<their API>/v1
AI_1_API_KEY=...
AI_1_MODEL=<model>
```

> **About PhotonAI:** PHOTONAI ([photon-ai.com](https://photon-ai.com/)) is a Python library for training machine-learning pipelines, not a chat AI, so it can't power an assistant. PhotonAI ([photonai.ai](https://photonai.ai/platform/api)) plans an OpenAI-compatible chat API (listed as expected Q1 2027, paid per token). It can be added as above when available.

### Unlimited fallback: Ollama on your own server

Runs an open-source model on your server as the last link in the chain. `llama3.2:3b` needs roughly 3–4 GB of free RAM; on CPU it answers a few words per second (`llama3.2:1b` for small servers).

**Docker Compose:** set `OLLAMA_BASE_URL=http://ollama:11434`, then:
```bash
docker compose --profile ai up -d --build
docker compose exec ollama ollama pull llama3.2:3b     # one-time model download
```

**Coolify:**
1. Add a resource from the Docker image `ollama/ollama:latest` in the same project/environment.
   - Give it no domain or port mapping.
   - Add persistent storage at `/root/.ollama`.
2. Deploy it, open its **Terminal**, and run `ollama pull llama3.2:3b`.
3. On the Veil resource, set `OLLAMA_BASE_URL=http://<ollama container or service name>:11434` and redeploy. If Veil can't reach it, enable **Connect to predefined network** on both resources (the name varies by Coolify version).

### Keeping API usage low

Veil is tuned to make as few, and as small, API calls as possible:

- **Saved answers:** when a visitor's first question matches one already answered (ignoring case, spacing and trailing punctuation), the saved answer is shown instantly with **no API call** and it doesn't count toward their quota. The suggestion buttons benefit most. Follow-up questions are never reused, since they depend on the conversation. Answers are kept for `AI_CACHE_TTL_MINUTES` (default 24 h), in memory only; set it to `0` to turn this off.
- **Short context:** only the last `AI_MAX_HISTORY_MESSAGES` (12) messages and `AI_MAX_HISTORY_CHARS` (8,000) characters of a conversation are sent, so long chats don't resend everything.
- **Concise by default:** a short system prompt asks for brief answers, and `AI_MAX_TOKENS` (1024) caps answer length. Reasoning models are asked to think briefly.
- **No wasted calls:**
  - Stop, closing the panel or leaving the page cancels the request immediately.
  - Failover only calls the next provider after a failure.
  - Providers with a bad key or missing model are skipped, not retried.
  - The startup check lists models, which costs no quota.
- **Per-visitor cap:** `AI_REQUESTS_PER_HOUR` (30), one answer at a time.

### Troubleshooting the AI

At startup Veil checks every provider by listing its models (`GET /models`), which **doesn't use any free quota**. It writes one line per provider to the server log (in Coolify: the resource's **Logs** tab):

```
{"msg":"ai provider ready","provider":"groq","model":"llama-3.3-70b-versatile","ok":true}
{"msg":"ai provider problem","provider":"gemini","issue":"key rejected","hint":"The API key was rejected. Re-copy it ..."}
```

The chat panel also shows each provider's status (ready, or what's wrong), and error messages name the provider and the reason.

| Status | Meaning | Fix |
|---|---|---|
| API key rejected | The provider refused the key; it's never called again until you redeploy | Re-copy the key into the variable with no quotes or spaces, save, **redeploy** |
| model not available | Your account doesn't offer that model | If you didn't set `*_MODEL`, Veil switches to an available free model automatically; otherwise pick one from the list in the log `hint` |
| server can't reach it | The server couldn't connect (DNS, firewall, no outbound internet) | Check the server's outbound access; the `hint` has the exact network error |
| at its free limit, resting | Real rate or quota limit | Wait, or add more providers |

Coolify notes:
- Environment variables must be saved and the resource **redeployed** before they take effect.
- Don't tick "Build Variable" for API keys; they're needed at runtime.

### Limits and safety
- API keys and URLs stay on the server. The browser only sees provider names, models and whether each is currently available.
- Per-visitor quota (`AI_REQUESTS_PER_HOUR`, default 60), one answer at a time per visitor, `AI_MAX_CONCURRENT` answers overall, message and history size limits, a timeout, and a cap on answer length.
- Only your messages and the assistant's replies are accepted from the browser. The system prompt is fixed on the server (`AI_SYSTEM_PROMPT` to change it).
- Model output is rendered as text through a small Markdown renderer. It is never inserted as raw HTML, and only http(s) links are allowed.
- Conversations are kept in the browser tab only and aren't stored on the server. Upstream error details are logged for the operator, never shown to visitors.

---

## Behind Nginx

A complete example is in [`deploy/nginx.conf`](deploy/nginx.conf). The essentials:

```nginx
location / {
    proxy_pass http://127.0.0.1:43117;
    proxy_http_version 1.1;
    proxy_set_header Host $host;                       # required for same-origin checks
    proxy_set_header X-Forwarded-For $remote_addr;     # overwrite, don't append
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;            # WebSockets
    proxy_set_header Connection $connection_upgrade;
    proxy_buffering off;                               # stream downloads/media
    proxy_request_buffering off;
    proxy_read_timeout 180s;
    client_max_body_size 10m;                          # = MAX_REQUEST_BODY_BYTES
}
```

Then set in `.env`:

```
TRUST_PROXY_HOPS=1
PUBLIC_HOSTNAMES=proxy.example.com
COOKIE_SECURE=true
```

Add `Strict-Transport-Security` at Nginx for the proxy's own origin. Upstream HSTS headers are never forwarded, because they would apply to the proxy's whole domain.

## Behind Cloudflare

1. Proxy the DNS record through Cloudflare (orange cloud), with SSL/TLS mode set to **Full (strict)** if your origin has TLS, or use a **Cloudflare Tunnel** (`cloudflared`) pointing at `http://127.0.0.1:43117` so the origin isn't exposed at all.
2. Enable **WebSockets** (Network settings; on by default).
3. In `.env`:
   ```
   CLIENT_IP_HEADER=cf-connecting-ip
   PUBLIC_HOSTNAMES=proxy.example.com
   COOKIE_SECURE=true
   ```
   Only trust `cf-connecting-ip` if the origin is reachable **exclusively** through Cloudflare (a Tunnel, or a firewall allowing only Cloudflare IP ranges). Otherwise clients can forge it.
4. **Caching:** the proxy marks every proxied response `private`, strips `public`/`s-maxage`, and sends `Vary: Cookie` on rewritten documents, so Cloudflare won't share per-session content between users. Don't add "Cache Everything" page rules for this hostname.
5. If you put both Cloudflare and Nginx in front, use `CLIENT_IP_HEADER=cf-connecting-ip` (and keep Nginx passing that header through).

---

## Security model

### What is enforced on the server (security boundary)

- **SSRF protection** (`src/security/ssrf.ts`)
  - Only `http`/`https` (and `ws`/`wss` for WebSockets). URLs are parsed with the WHATWG parser and all decisions are made on the parsed object, which defeats `127.1`, `0x7f000001`, `2130706433`, `017700000001`, `user@host`, backslash and IPv6-mapped tricks.
  - Credentials in URLs are rejected. Ports are allowlisted (80/443 by default).
  - Reserved names are refused: `localhost`, `*.local`, `*.internal`, `*.lan`, `*.home.arpa`, single-label names, cloud metadata names.
  - **Every** DNS answer must be public unicast. Loopback, RFC 1918, link-local (incl. `169.254.169.254`), CGNAT (incl. `100.100.100.200`), multicast, reserved, benchmarking, `0.0.0.0/8`, ULA (`fd00::/8`, incl. `fd00:ec2::254`), IPv4-mapped/NAT64/6to4/Teredo and non-global IPv6 are all refused. A name that mixes public and private records is refused outright.
  - The validated address is **pinned**: the socket connects to exactly that IP through a custom `lookup`, so DNS rebinding between check and use is impossible. TLS still verifies the certificate against the real host name.
  - Redirects are **never followed server-side**. Each hop returns to the browser as a rewritten `/p/…` URL and goes through the full pipeline again.
  - Node's HTTP client ignores `HTTP(S)_PROXY` environment variables, so requests can't be diverted through an internal proxy.
- **Loops:** each outbound request carries a per-process `Via` marker, and requests bearing it are refused (508). The proxy's own `Host` and `PUBLIC_HOSTNAMES` are blocked as destinations.
- **Abuse limits:** per-IP token bucket (IPv6 clients are limited per /64), global and per-IP concurrency with a bounded wait queue, connect/response/idle timeouts, request- and response-size limits, decompression-bomb protection (limits apply to decompressed bytes), WebSocket connection caps with idle timeout and byte cap, plus Node server header and request timeouts against slow-loris attacks.
- **No leakage of server secrets:** static files come from a fixed in-memory allowlist (no filesystem path handling), environment variables are never rendered, errors never include stack traces, and `X-Forwarded-*`/`CF-*`/`Via`/`Authorization` from the client are stripped before forwarding.
- **Headers:** upstream response headers pass an allowlist. `Set-Cookie`, `Strict-Transport-Security`, `Clear-Site-Data`, `Alt-Svc`, `Service-Worker-Allowed`, CSP, CORS and `Link` never reach the browser. Header values are validated before being set.
- **Service workers** are refused (the `Service-Worker: script` request header is blocked). A service worker registered on the proxy origin could otherwise intercept every future request for every proxied site.
- **Browser permissions** (camera, microphone, geolocation, WebAuthn, …) are disabled with `Permissions-Policy`, because a grant to one proxied site would apply to all of them.
- **CSP on proxied pages** confines them to the proxy origin (`default-src 'self' …; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'`). Anything the rewriting misses fails closed instead of connecting directly to a third party.
- **CSRF:** the internal JSON endpoints require a custom header plus same-origin fetch metadata. The session cookie is `SameSite=Lax`, and WebSocket handshakes must come from the proxy's own origin.

### The shared-origin limitation, and the two isolation modes

Every proxied site is served from the proxy's single origin, which is inherent to path-based web proxies. In the browser's eyes they are all "the same site", so:

- In **`ISOLATION_MODE=compat`** (default, best compatibility), a malicious page viewed through the proxy can script other proxied pages open in the same browser, and make requests through the proxy that carry your server-side cookies for other sites. The proxy emulates SameSite rules, so passive cross-site requests (images, forms) from one proxied site to another don't carry Lax cookies, but a determined script can work around that.
- In **`ISOLATION_MODE=sandbox`**, every proxied document is served with `Content-Security-Policy: sandbox` (no `allow-same-origin`), which gives it an opaque origin. Pages can't touch the proxy origin's storage, the UI, or each other, and their fetches go out without the session cookie. The cost is that many sites break (`localStorage` throws, and most logins won't persist).

**Recommendation:** don't sign in to sensitive accounts (banking, email, admin consoles) through any web proxy that shares one origin across sites. Use "Clear session data" when you're done.

The client runtime (`public/client.js`) is a compatibility layer, not a security control. A page can undo it and gains nothing, since the server enforces every rule above.

---

## Security review checklist

This is a review of the specific risks the implementation was checked against. Most are covered by tests in `test/`.

| Risk | Mitigation | Where |
|---|---|---|
| **SSRF** | Scheme/port/credential checks, reserved names, all DNS answers must be public, IP classification incl. mapped/embedded IPv4 | `ssrf.ts` |
| **Open redirects** | Every redirect the proxy emits (`/__px/go`, upstream `Location`, root-relative fallback, canonical slash) is a **path** on the proxy's own origin (`/p/…`), never an absolute URL built from input or `Host` | `handler.ts`, `app.ts` |
| **URL parsing bypasses** | Decisions are made on the WHATWG-parsed URL. `@`, `\` and whitespace in the host segment are rejected before parsing; the parsed result is re-validated | `urlcodec.ts`, `ssrf.ts` |
| **DNS rebinding** | Resolve once, validate all answers, pin the address via custom `lookup`; TLS verifies against the host name | `ssrf.ts`, `upstream.ts` |
| **Header injection** | Header names/values validated (no CR/LF/NUL) before `setHeader`; status text validated; WebSocket handshake headers filtered; `Location` is always an encoded path | `headers.ts`, `websocket.ts` |
| **Cookie leakage** | Upstream `Set-Cookie` never forwarded; server-side jar with RFC 6265 + SameSite; browser cookies never forwarded upstream; `HttpOnly` session id; scripts only see their own non-HttpOnly cookies | `store.ts`, `headers.ts` |
| **XSS introduced by rewriting** | parse5 tokenizer + attribute escaping; unmodified tokens emitted verbatim; CSS emitted as quoted/escaped `url("…")` with `</` escaped inside `<style>`; import maps re-serialized with `<` escaped; runtime config in an escaped attribute; error pages fully escaped; upstream CSP meta removed but replaced by the proxy's CSP header | `html.ts`, `css.ts`, `errors.ts` |
| **Unbounded downloads** | Declared `Content-Length` precheck, streaming byte cap, bounded buffering for rewrites, upload cap, WebSocket byte cap | `handler.ts`, `body.ts` |
| **Decompression bombs** | Decompressed byte count enforced during inflation | `body.ts` |
| **Request loops** | `Via` instance marker, self-host and `PUBLIC_HOSTNAMES` blocked | `handler.ts`, `ssrf.ts` |
| **WebSocket issues** | Origin check (CSWSH), same SSRF pipeline + pinning, connection caps, idle timeout, byte cap, clean teardown of half-closed sockets, rejected handshakes fully closed | `websocket.ts` |
| **Compressed responses** | Only `gzip, deflate, br` requested; rewrites decode (incl. raw-deflate fallback) and re-encode; passthrough keeps the original encoding and length headers; unknown encodings fail closed for rewritten types | `body.ts`, `handler.ts` |
| **Broken relative URLs** | Hierarchical path scheme, `<base href>` honoured, trailing-slash canonicalisation, protocol-relative URLs resolved against the real page, root-relative fallback | `urlcodec.ts`, `html.ts`, `app.ts` |
| **Redirects escaping the proxy** | `Location` and `Refresh` resolved against the real URL and re-encoded under `/p/`; non-http(s) targets dropped; CSP `form-action`/`connect-src` prevent direct egress; Navigation API catch for script navigations | `handler.ts`, `client.js` |
| **AI endpoint abuse / key leakage** | Operator-configured upstream only (not user-controllable, so no SSRF), key never sent to clients, CSRF guard, per-client quota and concurrency, input/output caps, output rendered via DOM text APIs | `ai/chat.ts`, `ai.js` |
| **Untyped responses** | Sniffed server-side, so HTML without a `Content-Type` is rewritten, not rendered raw by the browser | `handler.ts` |

---

## Embedding in another site

The interface also works under `/__px/` inside another site on the same address. The games portal integration does this: nginx forwards `/p/` and `/__px/` to the proxy, and forwards root-relative requests whose `Referer` is a `/p/` page. The host page shows `/__px/` (Browse) or `/__px/ai` (AI) in an iframe. It can switch views with `postMessage({ veilCmd: 'ai' | 'browse' })`, and it hears `{ veilShell: 1, view }` back when the user switches inside.

## Limitations

- **JavaScript is not rewritten.** URLs assembled at runtime are handled by the client runtime and the root-relative fallback, but static `import` statements with absolute third-party URLs and scripts that assign `location.href` to an absolute URL (outside Chromium) can still break or be blocked by the CSP. Heavily scripted apps (Google Docs, some streaming sites) may not work.
- **Sites with bot protection** (CAPTCHAs, Cloudflare challenges) often detect datacenter IPs and proxies.
- **No HTTP/2 or HTTP/3 upstream.** Upstream connections use HTTP/1.1, which every site supports.
- **Sessions are in memory** and reset on restart. Multi-replica deployments need sticky sessions.
- **The shared-origin caveat** above applies in `compat` mode.

---

## Development and tests

```bash
npm ci
npm test          # compiles, then runs unit + end-to-end tests (node:test)
npm run typecheck
```

The end-to-end tests start a real proxy in front of a local upstream server. Because the proxy correctly refuses to connect to `127.0.0.1`, the tests resolve test host names to a public address (so every policy check runs for real) and use a test-only `dial` hook that redirects the already-validated socket to the local server. That hook is only reachable through `createApp()`'s second argument and is never wired to configuration.
