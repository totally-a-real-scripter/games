/**
 * Header filtering in both directions.
 *
 * Request (browser -> upstream): a denylist removes hop-by-hop headers,
 * anything that identifies the proxy's infrastructure (X-Forwarded-*, CF-*,
 * Via, ...), the browser's cookies for the proxy origin (upstream cookies come
 * from the server-side jar instead) and Authorization. Origin/Referer are
 * translated from proxy URLs back to real URLs.
 *
 * Response (upstream -> browser): an ALLOWLIST. Security headers that would be
 * scoped to the proxy's whole origin are never passed through - e.g. an
 * upstream Strict-Transport-Security, Clear-Site-Data, Set-Cookie, Alt-Svc or
 * Service-Worker-Allowed would otherwise affect every site viewed through the
 * proxy. The proxy sets its own security headers instead.
 *
 * Header injection: Node's http layer rejects CR/LF/NUL in header names and
 * values; `safeSet` additionally validates before setting and skips anything
 * invalid instead of throwing mid-response.
 */
import type { IncomingHttpHeaders, OutgoingHttpHeaders, ServerResponse } from 'node:http';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'http2-settings',
]);

const REQUEST_DROP = new Set([
  ...HOP_BY_HOP,
  'host',
  'cookie',
  'authorization', // could carry credentials for the proxy itself (e.g. basic auth at the edge)
  'origin',
  'referer',
  'accept-encoding', // we choose encodings we can decode
  'forwarded',
  'via',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-forwarded-server',
  'x-real-ip',
  'x-client-ip',
  'true-client-ip',
  'cdn-loop',
  'dnt',
  'service-worker',
  'x-px-req',
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-extensions',
  'sec-websocket-protocol',
]);

export function buildUpstreamRequestHeaders(
  incoming: IncomingHttpHeaders,
  extra: { host: string; origin?: string; referer?: string; cookie?: string; userAgent?: string; via: string },
): OutgoingHttpHeaders {
  const out: OutgoingHttpHeaders = {};
  // Headers named in Connection are hop-by-hop too (RFC 9110 7.6.1).
  const connTokens = new Set(
    String(incoming.connection ?? '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const [rawName, value] of Object.entries(incoming)) {
    const name = rawName.toLowerCase();
    if (value === undefined) continue;
    if (REQUEST_DROP.has(name) || connTokens.has(name)) continue;
    if (name.startsWith('cf-') || name.startsWith('x-px-') || name.startsWith('sec-fetch-') || name.startsWith('x-amzn-')) continue;
    out[name] = value;
  }
  out['host'] = extra.host;
  out['accept-encoding'] = 'gzip, deflate, br';
  if (extra.origin) out['origin'] = extra.origin;
  if (extra.referer) out['referer'] = extra.referer;
  if (extra.cookie) out['cookie'] = extra.cookie;
  if (extra.userAgent) out['user-agent'] = extra.userAgent;
  // Loop marker: a request that arrives carrying our own instance id has gone around.
  out['via'] = extra.via;
  return out;
}

/** Response headers that may be copied from upstream as-is. */
const RESPONSE_ALLOW = new Set([
  'content-type',
  'content-language',
  'content-disposition',
  'content-range',
  'accept-ranges',
  'cache-control',
  'expires',
  'last-modified',
  'etag',
  'age',
  'date',
  'vary',
  'retry-after',
  'x-content-type-options',
  'timing-allow-origin',
]);

/** Additional headers copied only when the body is streamed through unmodified. */
const PASSTHROUGH_ONLY = new Set(['content-length', 'content-encoding']);

export function copyResponseHeaders(
  upstream: IncomingHttpHeaders,
  res: ServerResponse,
  opts: { passthrough: boolean },
): void {
  for (const [rawName, value] of Object.entries(upstream)) {
    const name = rawName.toLowerCase();
    if (value === undefined) continue;
    if (RESPONSE_ALLOW.has(name) || (opts.passthrough && PASSTHROUGH_ONLY.has(name))) {
      safeSet(res, name, value);
    }
  }
  // Responses may depend on the server-side cookie jar, so they must never be
  // stored by a shared cache (CDN/reverse proxy) and served to another user.
  const cc = String(upstream['cache-control'] ?? '');
  let next = cc
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d && !/^(public|s-maxage\s*=.*|proxy-revalidate)$/i.test(d));
  if (!next.some((d) => /^(private|no-store)$/i.test(d))) next.unshift('private');
  safeSet(res, 'cache-control', next.join(', '));
}

const TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/** Set a header only if its name/value are valid; never throws. */
export function safeSet(res: ServerResponse, name: string, value: string | number | string[]): boolean {
  if (!TOKEN_RE.test(name)) return false;
  const values = Array.isArray(value) ? value : [String(value)];
  if (values.some((v) => /[\r\n\0]/.test(v))) return false;
  try {
    res.setHeader(name, Array.isArray(value) ? values : values[0]!);
    return true;
  } catch {
    return false;
  }
}

export function firstHeader(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
