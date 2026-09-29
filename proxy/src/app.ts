/**
 * HTTP router. Routes:
 *
 *   GET  /                    UI shell
 *   GET  /__px/               UI shell (alias used by internal links)
 *   GET  /__px/static/*       UI assets
 *   GET  /__px/client.js      runtime injected into proxied pages
 *   GET  /__px/go?q=...       non-JS entry point: normalise input, redirect to /p/...
 *   POST /__px/cookie         document.cookie writes from proxied pages
 *   POST /__px/clear          wipe the server-side session + browser storage
 *   GET  /healthz             liveness/readiness probe
 *   ANY  /p/<scheme>/<host>/… the proxy itself (+ WebSocket upgrades)
 *   *                         root-relative requests from proxied pages are
 *                             redirected back under /p/ using the Referer
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Duplex } from 'node:stream';
import type { Config } from './config.js';
import { clientIp } from './security/clientip.js';
import { ConcurrencyGate, ConnectionCounter, LimitError, RateLimiter } from './security/limits.js';
import { HostPolicy, PolicyError, systemResolver } from './security/ssrf.js';
import { SessionStore } from './session/store.js';
import {
  readCookie,
  currentSession,
  ensureSession,
  proxyOrigin,
  sendError,
  setUiSecurityHeaders,
  siteOf,
  type AppContext,
  type Deps,
} from './proxy/context.js';
import { expireSessionCookie, handleProxy } from './proxy/handler.js';
import { setClientScriptVersion } from './rewrite/html.js';
import { handleUpgrade } from './proxy/websocket.js';
import { decodeProxyPath, encodeProxyPath, realUrlFromProxyUrl } from './proxy/urlcodec.js';
import { firstHeader } from './proxy/headers.js';
import { log } from './util/log.js';
import { AiService } from './ai/chat.js';
import { AdBlocker } from './adblock/index.js';
import ipaddr from 'ipaddr.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/src/app.js -> <root>/public ; src/app.ts (tsx) -> <root>/public
const PUBLIC_DIR = [path.resolve(here, '../../public'), path.resolve(here, '../public')].find((p) => {
  try {
    readFileSync(path.join(p, 'index.html'));
    return true;
  } catch {
    return false;
  }
});

interface StaticFile {
  body: Buffer;
  type: string;
  cache: string;
}

/** Static assets are loaded into memory once from a fixed allowlist: no path traversal possible. */
function loadStatic(): Map<string, StaticFile> {
  if (!PUBLIC_DIR) throw new Error('public/ directory not found');
  const files: [string, string, string, string][] = [
    ['/', 'index.html', 'text/html; charset=utf-8', 'no-cache'],
    ['/__px/static/app.css', 'app.css', 'text/css; charset=utf-8', 'public, max-age=3600'],
    ['/__px/static/app.js', 'app.js', 'text/javascript; charset=utf-8', 'public, max-age=3600'],
    ['/__px/static/ai.js', 'ai.js', 'text/javascript; charset=utf-8', 'public, max-age=3600'],
    ['/__px/static/favicon.svg', 'favicon.svg', 'image/svg+xml', 'public, max-age=86400'],
    ['/__px/client.js', 'client.js', 'text/javascript; charset=utf-8', 'public, max-age=3600'],
  ];
  const map = new Map<string, StaticFile>();
  for (const [route, file, type, cache] of files) {
    map.set(route, { body: readFileSync(path.join(PUBLIC_DIR, file)), type, cache });
  }
  map.set('/__px/', map.get('/')!);
  // The AI page is a client-side view of the same app shell.
  map.set('/ai', map.get('/')!);
  map.set('/ai/', map.get('/')!);
  // Embedded under /__px/ in a host site (see the games portal integration).
  map.set('/__px/ai', map.get('/')!);
  map.set('/__px/ai/', map.get('/')!);
  map.set('/favicon.ico', map.get('/__px/static/favicon.svg')!);
  map.set('/robots.txt', { body: Buffer.from('User-agent: *\nDisallow: /\n'), type: 'text/plain; charset=utf-8', cache: 'public, max-age=86400' });
  return map;
}

export function createApp(cfg: Config, deps: Partial<Deps> = {}) {
  const ctx: AppContext = {
    cfg,
    policy: new HostPolicy(cfg),
    sessions: new SessionStore(cfg.sessionTtlMs, cfg.maxSessions, cfg.maxJarBytesPerSession),
    rate: new RateLimiter(cfg.rateLimitPerMinute, cfg.rateLimitBurst),
    sessionRate: new RateLimiter(cfg.sessionsPerIpPerHour / 60, cfg.sessionsPerIpPerHour),
    gate: new ConcurrencyGate(cfg.maxConcurrent, cfg.maxConcurrentPerIp, cfg.maxQueue, cfg.queueTimeoutMs),
    wsCounter: new ConnectionCounter(cfg.maxWebSockets, cfg.maxWebSocketsPerIp),
    adblock: new AdBlocker(cfg.adblock),
    deps: { resolver: deps.resolver ?? systemResolver, dial: deps.dial },
  };
  const statics = loadStatic();
  setClientScriptVersion(createHash('sha256').update(statics.get('/__px/client.js')!.body).digest('hex').slice(0, 10));
  const ai = new AiService(cfg.ai);
  ctx.adblock.start(); // downloads extra blocklists in the background
  const startedAt = Date.now();

  async function onRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const rawUrl = req.url ?? '/';
    const qi = rawUrl.indexOf('?');
    const pathname = qi >= 0 ? rawUrl.slice(0, qi) : rawUrl;
    const method = (req.method ?? 'GET').toUpperCase();
    const ip = rateKey(clientIp(req, cfg));
    const started = Date.now();
    if (cfg.logRequests) {
      res.on('finish', () =>
        // Only the host is logged, never full URLs, query strings or cookies.
        log.info('request', { ip, method, status: res.statusCode, ms: Date.now() - started, host: hostForLog(pathname) }),
      );
    }

    // ---- health ----
    if (pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(
        JSON.stringify({
          status: 'ok',
          uptime: Math.round((Date.now() - startedAt) / 1000),
          inFlight: ctx.gate.inFlight,
          sessions: ctx.sessions.size,
        }),
      );
      return;
    }

    // ---- proxy ----
    const decoded = decodeProxyPath(rawUrl);
    if (decoded) {
      const wait = ctx.rate.take(ip);
      if (wait > 0) {
        return sendError(
          res,
          { status: 429, title: 'Slow down', message: 'Too many requests. Please wait a moment and try again.' },
          { 'retry-after': String(wait) },
        );
      }
      let release: (() => void) | undefined;
      try {
        release = await ctx.gate.acquire(ip);
      } catch (err) {
        if (err instanceof LimitError) {
          return sendError(res, { status: err.status, title: 'Proxy busy', message: err.message }, { 'retry-after': String(err.retryAfter ?? 5) });
        }
        throw err;
      }
      // Hold the slot until the response is fully sent or aborted.
      res.once('close', release);
      await handleProxy(ctx, req, res, decoded, ip);
      return;
    }

    if (rawUrl.startsWith('/p/')) {
      return sendError(res, { status: 400, title: 'Invalid address', message: 'That proxy address is malformed.' });
    }

    // ---- internal endpoints ----
    if (pathname === '/__px/go' && (method === 'GET' || method === 'HEAD')) {
      const q = new URL(rawUrl, 'http://x').searchParams.get('q') ?? '';
      const dest = normalizeInput(q, cfg.searchUrl);
      if (!dest) {
        res.writeHead(302, { location: '/', 'cache-control': 'no-store' });
        res.end();
        return;
      }
      try {
        ctx.policy.validateUrl(dest.href);
      } catch (err) {
        if (err instanceof PolicyError) {
          return sendError(res, { status: err.status, title: 'Destination blocked', message: err.message, target: dest.href, code: err.code });
        }
        throw err;
      }
      // Always a relative path on this origin: not an open redirect.
      res.writeHead(302, { location: encodeProxyPath(dest), 'cache-control': 'no-store' });
      res.end();
      return;
    }

    if (pathname === '/__px/cookie' && method === 'POST') return handleCookieWrite(ctx, req, res, ip);
    if (pathname === '/__px/ai/status' && method === 'GET') return json(res, 200, ai.status());
    if (pathname === '/__px/adblock/status' && method === 'GET') {
      return json(res, 200, { ...ctx.adblock.status(), on: ctx.adblock.activeFor(readCookie(req, 'px_ab')) });
    }
    if (pathname === '/__px/ai/chat' && method === 'POST') {
      if (!sameOriginApiRequest(ctx, req)) return json(res, 403, { error: 'forbidden' });
      return ai.handleChat(req, res, ip);
    }
    if (pathname === '/__px/clear' && method === 'POST') {
      if (!sameOriginApiRequest(ctx, req)) return json(res, 403, { error: 'forbidden' });
      ctx.sessions.destroy(currentSession(ctx, req)?.id);
      expireSessionCookie(ctx, req, res);
      // Wipes localStorage/IndexedDB that proxied pages created on this origin.
      // ("cookies" is deliberately omitted: it clears cookies for the whole
      // registrable domain, which could affect other apps on a shared parent
      // domain. The only browser cookie we set is expired above.)
      res.setHeader('clear-site-data', '"storage"');
      return json(res, 200, { ok: true });
    }

    // ---- root-relative fallback ----
    // Scripts often build URLs like "/api/x" from location.origin. Those hit the
    // proxy root; if the Referer is a proxied page, send them to the same path
    // on that page's real origin. The redirect target is always a local /p/ path.
    const refererReal = realUrlFromProxyUrl(firstHeader(req.headers.referer), proxyOrigin(ctx, req));
    const isInternal = pathname === '/__px/' || pathname.startsWith('/__px/') || pathname === '/favicon.ico' || pathname === '/robots.txt';
    if (refererReal && !isInternal) {
      try {
        const dest = new URL(rawUrl, refererReal.origin);
        res.writeHead(307, { location: encodeProxyPath(dest), 'cache-control': 'no-store', vary: 'Referer' });
        res.end();
        return;
      } catch {
        /* fall through */
      }
    }

    // ---- static UI ----
    const file = statics.get(pathname);
    if (file && (method === 'GET' || method === 'HEAD')) {
      setUiSecurityHeaders(res);
      res.writeHead(200, {
        'content-type': file.type,
        'content-length': file.body.length,
        'cache-control': file.cache,
        ...(pathname === '/__px/client.js' ? { 'cross-origin-resource-policy': 'cross-origin' } : {}),
      });
      res.end(method === 'HEAD' ? undefined : file.body);
      return;
    }

    sendError(res, { status: 404, title: 'Not found', message: 'There is nothing at this address.' });
  }

  function onUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
    const decoded = decodeProxyPath(req.url ?? '');
    if (!decoded) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n', () => socket.destroy());
      return;
    }
    handleUpgrade(ctx, req, socket, head, decoded, rateKey(clientIp(req, cfg))).catch((err) => {
      log.error('websocket error', { err: String(err) });
      socket.destroy();
    });
  }

  const server = http.createServer((req, res) => {
    onRequest(req, res).catch((err) => {
      log.error('unhandled request error', { err: err instanceof Error ? err.stack : String(err) });
      sendError(res, { status: 500, title: 'Something went wrong', message: 'The proxy hit an unexpected error.' });
    });
  });
  server.on('upgrade', onUpgrade);
  // Client-side limits (slowloris etc.).
  server.headersTimeout = 20_000;
  server.requestTimeout = 120_000;
  server.keepAliveTimeout = 10_000;
  server.maxHeadersCount = 200;

  const close = () => {
    ctx.rate.stop();
    ctx.sessionRate.stop();
    ctx.sessions.stop();
    ai.stop();
    ctx.adblock.stop();
  };
  return { server, ctx, close };
}

/** Turn free-form input into a destination URL (or a search). */
export function normalizeInput(input: string, searchUrl: string): URL | null {
  const q = input.trim();
  if (!q) return null;
  if (/^https?:\/\//i.test(q)) {
    try {
      return new URL(q);
    } catch {
      /* treat as search */
    }
  }
  // "example.com", "example.com/path", "sub.example.co.uk:8443/x"
  if (!/\s/.test(q) && /^[^/?#]+\.[a-z0-9-]{2,}(:\d+)?([/?#].*)?$/i.test(q)) {
    try {
      return new URL('https://' + q);
    } catch {
      /* treat as search */
    }
  }
  return new URL(searchUrl.replace('%s', encodeURIComponent(q)));
}

/**
 * CSRF guard for the JSON endpoints: require same-origin fetch metadata and a
 * custom header (which cross-origin pages can't send without a CORS preflight
 * that we never approve).
 */
function sameOriginApiRequest(ctx: AppContext, req: http.IncomingMessage): boolean {
  if (req.headers['x-px-req'] !== '1') return false;
  const sfs = firstHeader(req.headers['sec-fetch-site']);
  if (sfs && sfs !== 'same-origin') return false;
  const origin = firstHeader(req.headers.origin);
  if (origin && origin !== proxyOrigin(ctx, req)) return false;
  return true;
}

/** document.cookie writes from proxied pages land in the server-side jar. */
async function handleCookieWrite(ctx: AppContext, req: http.IncomingMessage, res: http.ServerResponse, ip: string): Promise<void> {
  if (!ctx.cfg.enableCookies) return json(res, 404, { error: 'disabled' });
  if (!sameOriginApiRequest(ctx, req)) return json(res, 403, { error: 'forbidden' });
  if (ctx.rate.take(ip) !== 0) return json(res, 429, { error: 'rate_limited' });
  let raw = '';
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 8192) return json(res, 413, { error: 'too_large' });
    }
    const body = JSON.parse(raw) as { url?: unknown; cookie?: unknown };
    if (typeof body.url !== 'string' || typeof body.cookie !== 'string') return json(res, 400, { error: 'bad_request' });
    const url = ctx.policy.validateUrl(body.url);
    // Hygiene check: a page may only write cookies for its own site.
    const pageUrl = realUrlFromProxyUrl(firstHeader(req.headers.referer), proxyOrigin(ctx, req));
    if (!pageUrl || siteOf(pageUrl) !== siteOf(url)) return json(res, 403, { error: 'forbidden' });
    const session = ensureSession(ctx, req, res, ip);
    if (!session) return json(res, 429, { error: 'no_session' });
    // http:false => scripts can't create HttpOnly cookies, same as a browser.
    await ctx.sessions.setCookies(session, [body.cookie], url, { http: false, sameSiteContext: 'strict' });
    return json(res, 204, null);
  } catch {
    return json(res, 400, { error: 'bad_request' });
  }
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  if (body === null) {
    res.end();
    return;
  }
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Key used for rate limiting / per-client caps. IPv6 clients usually control a
 * whole /64, so limits apply per /64 rather than per address.
 */
function rateKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  try {
    const parts = ipaddr.IPv6.parse(ip).parts;
    return parts.slice(0, 4).map((p) => p.toString(16)).join(':') + '::/64';
  } catch {
    return ip;
  }
}

function hostForLog(pathname: string): string | undefined {
  const d = decodeProxyPath(pathname);
  if (!d) return undefined;
  try {
    return new URL(d.target).host;
  } catch {
    return undefined;
  }
}
