/**
 * The HTTP proxy request pipeline for /p/<scheme>/<host>/<path>.
 *
 *  1. decode + canonicalise the path, validate the destination (ssrf.ts)
 *  2. loop / service-worker / method checks
 *  3. resolve DNS once, verify every address is public, pin it
 *  4. forward a filtered request with cookies from the server-side jar
 *  5. store Set-Cookie in the jar, rewrite Location, filter response headers
 *  6. rewrite HTML/CSS bodies (bounded + decompressed) or stream everything
 *     else through with a byte cap
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Transform, pipeline, type Readable } from 'node:stream';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { PolicyError, resolveAndPin } from '../security/ssrf.js';
import { BodyTooLargeError, UnsupportedEncodingError, decodeText, readDecoded } from './body.js';
import {
  PERMISSIONS_POLICY,
  appendSetCookie,
  currentSession,
  ensureSession,
  proxyOrigin,
  sendError,
  sessionCookie,
  siteOf,
  type AppContext,
} from './context.js';
import { buildUpstreamRequestHeaders, copyResponseHeaders, firstHeader, safeSet } from './headers.js';
import { UpstreamError, upstreamRequest } from './upstream.js';
import { encodeProxyPath, realUrlFromProxyUrl, type DecodedPath } from './urlcodec.js';
import { rewriteHtml } from '../rewrite/html.js';
import { rewriteCss } from '../rewrite/css.js';
import { SESSION_COOKIE } from '../session/store.js';

const gzip = promisify(zlib.gzip);
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

export async function handleProxy(
  ctx: AppContext,
  req: IncomingMessage,
  res: ServerResponse,
  decoded: DecodedPath,
  ip: string,
): Promise<void> {
  const { cfg, policy } = ctx;
  const method = (req.method ?? 'GET').toUpperCase();
  const retryPath = req.url;

  // --- 1. validate destination ------------------------------------------
  let target: URL;
  try {
    target = policy.validateUrl(decoded.target);
  } catch (err) {
    return policyErrorPage(res, err, decoded.target);
  }
  const canonical = encodeProxyPath(target);
  if (decoded.needsSlash) {
    // Relative Location (path only) - never an absolute URL built from Host.
    res.writeHead(308, { location: canonical, 'cache-control': 'no-store' });
    res.end();
    return;
  }

  // --- 2. structural checks -----------------------------------------------
  if (!METHODS.has(method)) {
    return sendError(res, { status: 405, title: 'Method not allowed', message: `The ${method} method is not supported.` });
  }
  // SECURITY: a service worker registered on the proxy origin could intercept
  // every future request for every proxied site. Browsers mark SW script
  // fetches with `Service-Worker: script`; refuse them.
  if (req.headers['service-worker']) {
    return sendError(res, { status: 403, title: 'Blocked', message: 'Service workers are disabled on this proxy.' });
  }
  // SECURITY: request loops (the proxy fetching itself through a public name).
  const via = String(req.headers['via'] ?? '');
  const selfHost = (req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
  if (via.includes(cfg.instanceId) || (selfHost && target.hostname.toLowerCase() === selfHost)) {
    return sendError(res, { status: 508, title: 'Loop detected', message: 'The proxy cannot fetch itself.' });
  }
  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (contentLength > cfg.maxRequestBodyBytes) {
    return sendError(res, { status: 413, title: 'Upload too large', message: 'The request body exceeds the configured limit.' });
  }

  // --- 3. DNS resolution + pinning ------------------------------------------
  let pinned;
  try {
    pinned = await resolveAndPin(policy, target, ctx.deps.resolver, cfg.connectTimeoutMs);
  } catch (err) {
    return policyErrorPage(res, err, target.href, retryPath);
  }
  const dial = ctx.deps.dial?.(target);
  if (dial) pinned = { address: dial.address, family: 4 as const };

  // --- 4. build upstream request ---------------------------------------------
  const origin = proxyOrigin(ctx, req);
  const refererReal = realUrlFromProxyUrl(firstHeader(req.headers.referer), origin);
  const sameSite = sameSiteContext(req, method, target, refererReal);
  let session = currentSession(ctx, req);
  const cookie = session ? await ctx.sessions.cookieHeader(session, target, sameSite) : '';

  const headers = buildUpstreamRequestHeaders(req.headers, {
    host: target.host,
    origin: req.headers.origin ? upstreamOrigin(req.headers.origin, origin, refererReal, target) : undefined,
    referer: upstreamReferer(refererReal, target),
    cookie: cookie || undefined,
    userAgent: cfg.userAgent || undefined,
    via: `1.1 px-${cfg.instanceId}`,
  });

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? limitStream(req, cfg.maxRequestBodyBytes) : null;
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) abort.abort();
  });

  let up;
  try {
    up = await upstreamRequest({
      url: target,
      pinned,
      method,
      headers,
      body,
      connectTimeoutMs: cfg.connectTimeoutMs,
      responseTimeoutMs: cfg.responseTimeoutMs,
      idleTimeoutMs: cfg.idleTimeoutMs,
      portOverride: dial?.port,
      signal: abort.signal,
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      if (err.code === 'aborted') return;
      return sendError(res, {
        status: err.status,
        title: 'Could not load this page',
        message: err.message,
        target: target.href,
        retryPath,
        code: err.code,
      });
    }
    throw err;
  }
  const upRes = up.res;
  const status = upRes.statusCode ?? 502;

  // --- 5. cookies, redirects, headers -----------------------------------------
  const setCookies = upRes.headers['set-cookie'];
  if (setCookies && setCookies.length > 0 && cfg.enableCookies) {
    session = session ?? ensureSession(ctx, req, res, ip);
    if (session) await ctx.sessions.setCookies(session, setCookies, target, { http: true, sameSiteContext: sameSite });
  }

  const noBody = method === 'HEAD' || status === 204 || status === 304 || (status >= 100 && status < 200);
  let contentType = String(upRes.headers['content-type'] ?? '').toLowerCase();
  if (!contentType && !noBody) {
    // SECURITY: browsers sniff untyped responses, and HTML sniffed that way
    // would render without our rewriting. Sniff it ourselves instead, so it is
    // either rewritten as HTML or served with an explicit non-HTML type.
    contentType = await sniffContentType(upRes);
  }
  const kind = rewriteKind(contentType);
  const rewrite = kind !== null && !noBody && status !== 206;

  copyResponseHeaders(upRes.headers, res, { passthrough: !rewrite });
  applyProxySecurityHeaders(ctx, req, res);
  if (contentType && !upRes.headers['content-type']) res.setHeader('content-type', contentType);

  const location = firstHeader(upRes.headers.location);
  if (location && status >= 300 && status < 400) {
    // SECURITY: never pass an upstream Location through. Resolve it against the
    // real URL and route it back through the proxy (as a relative path), so a
    // redirect can neither escape the proxy nor become an open redirect.
    try {
      const next = new URL(location, target);
      if (next.protocol === 'http:' || next.protocol === 'https:') {
        res.setHeader('location', encodeProxyPath(next));
      }
    } catch {
      /* invalid Location: drop it */
    }
  }
  const refresh = firstHeader(upRes.headers.refresh);
  if (refresh) {
    const m = /^\s*(\d+)\s*[;,]\s*url\s*=\s*(.+)$/i.exec(refresh);
    if (m) {
      try {
        safeSet(res, 'refresh', `${m[1]}; url=${encodeProxyPath(new URL(m[2]!.trim().replace(/^['"]|['"]$/g, ''), target))}`);
      } catch {
        /* ignore */
      }
    }
  }

  res.statusCode = status;
  if (upRes.statusMessage && /^[\t\x20-\x7e]*$/.test(upRes.statusMessage)) res.statusMessage = upRes.statusMessage;

  if (noBody) {
    upRes.resume();
    res.end();
    return;
  }

  // --- 6a. rewritten bodies -----------------------------------------------------
  if (rewrite) {
    let text: string;
    try {
      const buf = await readDecoded(upRes, firstHeader(upRes.headers['content-encoding']), cfg.maxRewriteBytes);
      text = decodeText(buf, contentType, kind);
    } catch (err) {
      if (err instanceof BodyTooLargeError) {
        return sendError(res, {
          status: 502,
          title: 'Page too large',
          message: 'This page is larger than the proxy is configured to process.',
          target: target.href,
          code: 'too_large',
        });
      }
      if (err instanceof UnsupportedEncodingError) {
        return sendError(res, { status: 502, title: 'Unsupported response', message: err.message, target: target.href });
      }
      return sendError(res, {
        status: 502,
        title: 'Could not load this page',
        message: 'The response from the destination was incomplete or corrupt.',
        target: target.href,
        retryPath,
        code: 'bad_body',
      });
    }

    let output: string;
    if (kind === 'html') {
      const jsCookies = session ? await ctx.sessions.scriptVisibleCookies(session, target) : '';
      output = rewriteHtml(text, {
        url: target,
        clientConfig: {
          url: target.href,
          cookies: jsCookies,
          mode: cfg.isolationMode,
          cookieApi: cfg.enableCookies,
          frameGuard: frameGuard(upRes.headers),
        },
      });
      res.setHeader('content-type', 'text/html; charset=utf-8');
      // Rewritten documents embed per-session data: don't let browsers
      // revalidate them against the upstream validators.
      res.removeHeader('etag');
      res.removeHeader('last-modified');
      res.setHeader('cache-control', 'private, no-cache');
    } else {
      output = rewriteCss(text, target);
      res.setHeader('content-type', 'text/css; charset=utf-8');
      res.removeHeader('etag');
    }

    let payload = Buffer.from(output, 'utf8');
    if (payload.length > 1024 && /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      payload = await gzip(payload, { level: 6 });
      res.setHeader('content-encoding', 'gzip');
    }
    res.setHeader('vary', 'Accept-Encoding, Cookie');
    res.setHeader('content-length', payload.length);
    res.end(payload);
    return;
  }

  // --- 6b. streamed bodies (images, scripts, media, downloads...) ---------------
  const declared = Number(upRes.headers['content-length'] ?? -1);
  if (declared > cfg.maxResponseBytes) {
    upRes.destroy();
    return sendError(res, {
      status: 502,
      title: 'File too large',
      message: 'This resource is larger than the proxy is configured to transfer.',
      target: target.href,
      code: 'too_large',
    });
  }
  // Byte counting on the raw (possibly compressed) stream bounds bandwidth; the
  // browser does its own decompression for passthrough content.
  pipeline(upRes, limitStream(upRes, cfg.maxResponseBytes, true), res, () => {
    /* errors (client abort, limit exceeded) simply end the connection */
  });
}

// ---------------------------------------------------------------------------

/**
 * Decide a type for a response that arrived without Content-Type by peeking
 * at its first chunk (which is then pushed back onto the stream).
 */
function sniffContentType(upRes: IncomingMessage): Promise<string> {
  const enc = String(upRes.headers['content-encoding'] ?? '').trim();
  if (enc && enc !== 'identity') return Promise.resolve('application/octet-stream');
  return new Promise((resolve) => {
    const done = (chunk: Buffer | null) => {
      upRes.off('data', onData);
      upRes.off('end', onEnd);
      upRes.off('error', onEnd);
      upRes.pause();
      if (chunk) upRes.unshift(chunk);
      const head = chunk ? chunk.subarray(0, 512) : Buffer.alloc(0);
      const text = head.toString('latin1');
      if (/^\s*<(!doctype\s+html|html|head|body|script|iframe|title|div|p|a|table|meta|link|style|br|h[1-6])[\s>/]/i.test(text)) {
        resolve('text/html');
      } else if (!head.some((b) => b < 0x09 || (b > 0x0d && b < 0x20))) {
        resolve('text/plain; charset=utf-8');
      } else {
        resolve('application/octet-stream');
      }
    };
    const onData = (c: Buffer) => done(c);
    const onEnd = () => done(null);
    upRes.on('data', onData);
    upRes.once('end', onEnd);
    upRes.once('error', onEnd);
  });
}

function rewriteKind(contentType: string): 'html' | 'css' | null {
  const mime = contentType.split(';')[0]!.trim();
  if (mime === 'text/html' || mime === 'application/xhtml+xml') return 'html';
  if (mime === 'text/css') return 'css';
  return null;
}

/**
 * Emulate the browser's SameSite cookie rules for the server-side jar. All
 * requests look same-origin to the browser, so we reconstruct the real
 * initiator from Sec-Fetch-Site and the (proxy) Referer.
 */
function sameSiteContext(req: IncomingMessage, method: string, target: URL, refererReal: URL | null): 'strict' | 'lax' | 'none' {
  const sfs = firstHeader(req.headers['sec-fetch-site']);
  const mode = firstHeader(req.headers['sec-fetch-mode']);
  const isNav = mode === 'navigate';
  const safe = method === 'GET' || method === 'HEAD';
  if (sfs === 'cross-site' || sfs === 'same-site') {
    // A different real website linked to the proxy directly.
    return isNav && safe ? 'lax' : 'none';
  }
  if (sfs === 'none') return 'strict'; // typed URL, bookmark
  if (!refererReal) return 'strict'; // initiated from the proxy UI itself
  if (siteOf(refererReal) === siteOf(target)) return 'strict';
  return isNav && safe ? 'lax' : 'none';
}

function upstreamOrigin(browserOrigin: string | string[], proxyOriginStr: string, refererReal: URL | null, target: URL): string {
  const o = Array.isArray(browserOrigin) ? browserOrigin[0] : browserOrigin;
  if (o === proxyOriginStr || o === 'null') return refererReal ? refererReal.origin : target.origin;
  // A foreign origin posting to the proxy directly: pass as-is so the upstream
  // sees a cross-site request (its own CSRF defences then apply).
  return o ?? target.origin;
}

/** strict-origin-when-cross-origin, computed on real URLs. */
function upstreamReferer(refererReal: URL | null, target: URL): string | undefined {
  if (!refererReal) return undefined;
  if (refererReal.protocol === 'https:' && target.protocol === 'http:') return undefined;
  if (refererReal.origin === target.origin) {
    const r = new URL(refererReal.href);
    r.hash = '';
    return r.href;
  }
  return refererReal.origin + '/';
}

/** Translate X-Frame-Options / frame-ancestors into a hint for the client runtime. */
function frameGuard(h: IncomingMessage['headers']): 'deny' | 'sameorigin' | null {
  const xfo = String(h['x-frame-options'] ?? '').toLowerCase();
  const csp = String(h['content-security-policy'] ?? '').toLowerCase();
  const fa = /frame-ancestors([^;]*)/.exec(csp)?.[1]?.trim();
  if (xfo.includes('deny') || fa === "'none'") return 'deny';
  if (xfo.includes('sameorigin') || (fa !== undefined && fa.includes("'self'"))) return 'sameorigin';
  return null;
}

/** Security headers for every proxied response. */
function applyProxySecurityHeaders(ctx: AppContext, req: IncomingMessage, res: ServerResponse): void {
  // CSP confines proxied pages to the proxy origin: anything our rewriting
  // missed fails closed instead of connecting directly to third parties, forms
  // can't post off-proxy and <base> can't point elsewhere.
  let csp =
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "connect-src 'self' data: blob:; worker-src 'self' blob:; object-src 'self'; " +
    "form-action 'self'; base-uri 'self'; frame-ancestors 'self'";
  if (ctx.cfg.isolationMode === 'sandbox') {
    // Opaque origin: page scripts can't touch the proxy origin's storage,
    // other proxied frames or the proxy UI. Many sites lose logins/storage.
    csp +=
      '; sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals ' +
      'allow-downloads allow-pointer-lock allow-presentation allow-orientation-lock';
    const o = firstHeader(req.headers.origin);
    if (o === 'null') {
      // Sandboxed documents fetch the proxy cross-origin. Allow reads WITHOUT
      // credentials (no Access-Control-Allow-Credentials), so the session jar
      // is never usable from them.
      res.setHeader('access-control-allow-origin', 'null');
      res.setHeader('access-control-expose-headers', 'content-type, content-length, content-range');
    }
  } else {
    res.setHeader('cross-origin-resource-policy', 'same-origin');
  }
  res.setHeader('content-security-policy', csp);
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('x-frame-options', 'SAMEORIGIN');
  res.setHeader('permissions-policy', PERMISSIONS_POLICY);
  res.setHeader('x-robots-tag', 'noindex, nofollow');
}

function policyErrorPage(res: ServerResponse, err: unknown, target: string, retryPath?: string): void {
  if (err instanceof PolicyError) {
    return sendError(res, {
      status: err.status,
      title: err.status === 403 ? 'Destination blocked' : err.status >= 500 ? 'Could not reach this site' : 'Invalid address',
      message: err.message,
      target,
      retryPath: err.status >= 500 ? retryPath : undefined,
      code: err.code,
    });
  }
  throw err;
}

/** Pass-through stream that errors once more than `limit` bytes flow through it. */
function limitStream(src: Readable, limit: number, passthroughOnly = false): Transform {
  let total = 0;
  const t = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      total += chunk.length;
      if (total > limit) {
        src.destroy();
        cb(new BodyTooLargeError(limit));
        return;
      }
      cb(null, chunk);
    },
  });
  if (!passthroughOnly) src.pipe(t);
  return t;
}

/** Used by /__px/clear: expire the session cookie. */
export function expireSessionCookie(ctx: AppContext, req: IncomingMessage, res: ServerResponse): void {
  appendSetCookie(res, sessionCookie(ctx, req, '', 0));
}

export { SESSION_COOKIE };
