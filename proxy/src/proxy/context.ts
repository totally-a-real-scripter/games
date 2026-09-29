import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from '../config.js';
import { isHttps } from '../security/clientip.js';
import type { ConcurrencyGate, ConnectionCounter, RateLimiter } from '../security/limits.js';
import type { HostPolicy, Resolver } from '../security/ssrf.js';
import { SESSION_COOKIE, type Session, type SessionStore } from '../session/store.js';
import { renderErrorPage, type ErrorPageOptions } from '../pages/errors.js';
import { getDomain } from 'tldts';
import type { AdBlocker } from '../adblock/index.js';

export interface Deps {
  resolver: Resolver;
  /**
   * TEST HOOK ONLY - never wired to configuration. Runs AFTER all policy and
   * DNS checks have passed and redirects the socket to a local test server.
   */
  dial?: (url: URL) => { address: string; port: number } | undefined;
}

export interface AppContext {
  cfg: Config;
  policy: HostPolicy;
  sessions: SessionStore;
  rate: RateLimiter;
  sessionRate: RateLimiter;
  gate: ConcurrencyGate;
  wsCounter: ConnectionCounter;
  adblock: AdBlocker;
  deps: Deps;
}

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export function currentSession(ctx: AppContext, req: IncomingMessage): Session | undefined {
  if (!ctx.cfg.enableCookies) return undefined;
  return ctx.sessions.get(readCookie(req, SESSION_COOKIE));
}

/**
 * Get or lazily create a session. Creation is rate limited per client IP so a
 * single client can't churn through the global session cap.
 */
export function ensureSession(
  ctx: AppContext,
  req: IncomingMessage,
  res: ServerResponse,
  ip: string,
): Session | undefined {
  if (!ctx.cfg.enableCookies) return undefined;
  const existing = currentSession(ctx, req);
  if (existing) return existing;
  if (ctx.sessionRate.take(ip) !== 0) return undefined;
  const s = ctx.sessions.create();
  appendSetCookie(res, sessionCookie(ctx, req, s.id, Math.floor(ctx.cfg.sessionTtlMs / 1000)));
  return s;
}

export function sessionCookie(ctx: AppContext, req: IncomingMessage, value: string, maxAge: number): string {
  const secure = ctx.cfg.cookieSecure === 'true' || (ctx.cfg.cookieSecure === 'auto' && isHttps(req, ctx.cfg));
  // HttpOnly: page scripts (including proxied ones) can never read the session id.
  // SameSite=Lax: other sites can't make the browser attach it to cross-site
  // POSTs, fetches or WebSocket handshakes (CSRF protection).
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function appendSetCookie(res: ServerResponse, cookie: string): void {
  const prev = res.getHeader('set-cookie');
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  res.setHeader('set-cookie', [...list, cookie]);
}

export function proxyOrigin(ctx: AppContext, req: IncomingMessage): string {
  const host = (req.headers.host ?? 'localhost').toLowerCase();
  return `${isHttps(req, ctx.cfg) ? 'https' : 'http'}://${host}`;
}

/** Registrable domain ("site") of a URL, used for SameSite decisions. */
export function siteOf(u: URL): string {
  return `${u.protocol}//${getDomain(u.hostname, { allowPrivateDomains: true }) ?? u.hostname}`;
}

/** Headers applied to every response the proxy generates itself (UI, errors). */
export function setUiSecurityHeaders(res: ServerResponse): void {
  res.setHeader(
    'content-security-policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src 'self'; " +
      "connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
  );
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('x-frame-options', 'SAMEORIGIN');
  res.setHeader('cross-origin-opener-policy', 'same-origin');
  res.setHeader('permissions-policy', PERMISSIONS_POLICY);
}

/**
 * Powerful-feature permissions are granted per ORIGIN by the browser. Every
 * proxied site shares the proxy's origin, so a camera permission granted to
 * one site would silently apply to all of them. Deny these outright.
 */
export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), ' +
  'midi=(), display-capture=(), publickey-credentials-get=(), publickey-credentials-create=(), ' +
  'otp-credentials=(), idle-detection=(), local-fonts=(), browsing-topics=()';

export function sendError(res: ServerResponse, o: ErrorPageOptions, extraHeaders: Record<string, string> = {}): void {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  // Drop any headers staged for the failed response (except our session cookie).
  const setCookie = res.getHeader('set-cookie');
  for (const h of res.getHeaderNames()) res.removeHeader(h);
  if (setCookie) res.setHeader('set-cookie', setCookie);
  setUiSecurityHeaders(res);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.statusCode = o.status;
  res.end(renderErrorPage(o));
}
