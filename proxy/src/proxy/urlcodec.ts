/**
 * Mapping between real destination URLs and proxy paths.
 *
 *   https://example.com:8443/a/b?q=1   <->   /p/https/example.com:8443/a/b?q=1
 *
 * The readable, hierarchical form is deliberate: the browser's own relative-URL
 * resolution keeps working (`img.png` on /p/https/example.com/a/ resolves to
 * /p/https/example.com/a/img.png) and GET form submissions append their query
 * string to the right place without any client-side help.
 */

export const PROXY_PREFIX = '/p/';
const SCHEMES = new Set(['http', 'https', 'ws', 'wss']);

export interface DecodedPath {
  /** Absolute destination URL string (not yet policy-validated). */
  target: string;
  /** True when the path lacked the slash after the host and should be canonicalised. */
  needsSlash: boolean;
}

/**
 * Decode a raw request path (as received, still percent-encoded) into a
 * destination URL string. Returns null if the path is not a proxy path.
 * The result MUST still go through HostPolicy.validateUrl().
 */
export function decodeProxyPath(rawPath: string): DecodedPath | null {
  if (!rawPath.startsWith(PROXY_PREFIX)) return null;
  const rest = rawPath.slice(PROXY_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const scheme = rest.slice(0, slash).toLowerCase();
  if (!SCHEMES.has(scheme)) return null;
  const afterScheme = rest.slice(slash + 1);
  const m = /^([^/?#]*)(.*)$/s.exec(afterScheme);
  if (!m) return null;
  const host = m[1]!;
  let tail = m[2]!;
  // Characters that would change how the authority is parsed are rejected here
  // as defence in depth; the canonical URL is re-validated afterwards anyway.
  if (!host || /[@\\\s]/.test(host)) return null;
  let needsSlash = false;
  if (!tail.startsWith('/')) {
    needsSlash = true;
    tail = '/' + tail;
  }
  // Fragments never reach the server, but strip defensively.
  const hash = tail.indexOf('#');
  if (hash >= 0) tail = tail.slice(0, hash);
  return { target: `${scheme}://${host}${tail}`, needsSlash };
}

/** Encode an absolute http(s)/ws(s) URL into its proxy path. */
export function encodeProxyPath(url: URL): string {
  const scheme = url.protocol.slice(0, -1);
  return `${PROXY_PREFIX}${scheme}/${url.host}${url.pathname}${url.search}${url.hash}`;
}

const PASSTHROUGH_SCHEMES = new Set(['data:', 'blob:', 'javascript:', 'mailto:', 'tel:', 'sms:', 'about:']);

/**
 * Rewrite a URL found in proxied content so it routes through the proxy.
 * `base` is the real (unproxied) base URL of the document.
 * Returns the original string for fragments, data:, javascript: etc.
 */
export function rewriteUrl(raw: string, base: URL): string {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return raw;
  // Already a proxy path (e.g. content that was rewritten twice).
  if (trimmed.startsWith(PROXY_PREFIX)) return raw;
  let abs: URL;
  try {
    abs = new URL(trimmed, base);
  } catch {
    return raw;
  }
  if (PASSTHROUGH_SCHEMES.has(abs.protocol)) return raw;
  if (abs.protocol === 'http:' || abs.protocol === 'https:' || abs.protocol === 'ws:' || abs.protocol === 'wss:') {
    return encodeProxyPath(abs);
  }
  // Unknown schemes (ftp:, file:, custom app links) are neutralised so they
  // cannot bypass the proxy; the browser couldn't load most of them anyway.
  return '#';
}

/**
 * Given a Referer (or any URL) pointing at this proxy, recover the real page
 * URL it represents. Returns null for non-proxy URLs.
 */
export function realUrlFromProxyUrl(proxyUrl: string | undefined, proxyOrigin: string): URL | null {
  if (!proxyUrl) return null;
  let u: URL;
  try {
    u = new URL(proxyUrl);
  } catch {
    return null;
  }
  if (u.origin !== proxyOrigin) return null;
  const decoded = decodeProxyPath(u.pathname + u.search);
  if (!decoded) return null;
  try {
    const real = new URL(decoded.target);
    if (real.protocol === 'ws:') real.protocol = 'http:';
    if (real.protocol === 'wss:') real.protocol = 'https:';
    return real;
  } catch {
    return null;
  }
}
