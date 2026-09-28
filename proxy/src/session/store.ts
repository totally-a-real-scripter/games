/**
 * Server-side sessions holding per-user cookie jars.
 *
 * COOKIE SAFETY
 * -------------
 * Upstream Set-Cookie headers are NEVER forwarded to the browser. If they were,
 * every proxied site would share one cookie namespace on the proxy's origin,
 * cookies from site A would be sent along with requests for site B, and
 * HttpOnly cookies from upstream would become visible to other proxied pages.
 *
 * Instead each browser gets one opaque, random, HttpOnly session id, and the
 * real cookies live here in a tough-cookie jar that applies RFC 6265 domain,
 * path, Secure, expiry and SameSite rules per destination. Only cookies without
 * the HttpOnly flag are ever handed to page scripts (via document.cookie
 * emulation), which matches what the site itself would expose.
 *
 * Memory is bounded: sessions expire after an idle TTL, the total number of
 * sessions is capped (least-recently-used evicted) and each jar is capped.
 */
import { randomBytes } from 'node:crypto';
import { CookieJar, MemoryCookieStore, type Cookie } from 'tough-cookie';

export interface Session {
  id: string;
  jar: CookieJar;
  store: MemoryCookieStore;
  lastSeen: number;
  /** Approximate bytes stored in the jar (upper bound; recomputed when the cap is hit). */
  jarBytes: number;
}

export const SESSION_COOKIE = '__px_sid';
const ID_RE = /^[A-Za-z0-9_-]{43}$/;

export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly sweep: NodeJS.Timeout;

  constructor(
    private readonly ttlMs: number,
    private readonly maxSessions: number,
    private readonly maxJarBytes: number,
  ) {
    this.sweep = setInterval(() => this.cleanup(), Math.min(ttlMs, 60_000));
    this.sweep.unref();
  }

  get size(): number {
    return this.sessions.size;
  }

  get(id: string | undefined): Session | undefined {
    if (!id || !ID_RE.test(id)) return undefined;
    const s = this.sessions.get(id);
    if (!s) return undefined;
    if (Date.now() - s.lastSeen > this.ttlMs) {
      this.sessions.delete(id);
      return undefined;
    }
    s.lastSeen = Date.now();
    // Re-insert to keep Map order = LRU order.
    this.sessions.delete(id);
    this.sessions.set(id, s);
    return s;
  }

  create(): Session {
    while (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.keys().next().value;
      if (oldest === undefined) break;
      this.sessions.delete(oldest);
    }
    const id = randomBytes(32).toString('base64url'); // 256-bit, 43 chars
    const store = new MemoryCookieStore();
    const jar = new CookieJar(store, {
      rejectPublicSuffixes: true, // no cookies for ".com" etc.
      allowSpecialUseDomain: false,
      prefixSecurity: 'strict', // enforce __Secure- / __Host- rules
    });
    const s: Session = { id, jar, store, lastSeen: Date.now(), jarBytes: 0 };
    this.sessions.set(id, s);
    return s;
  }

  destroy(id: string | undefined): void {
    if (id) this.sessions.delete(id);
  }

  /**
   * Store Set-Cookie values received from `url`. `http` is false for cookies
   * written by page scripts, which prevents scripts from creating HttpOnly
   * cookies (same rule browsers apply).
   */
  async setCookies(
    s: Session,
    setCookies: string[],
    url: URL,
    opts: { http: boolean; sameSiteContext: 'strict' | 'lax' | 'none' },
  ): Promise<void> {
    for (const header of setCookies) {
      if (header.length > 4096) continue; // browsers cap cookies at 4 KiB too
      if (s.jarBytes + header.length > this.maxJarBytes) {
        const all = await s.store.getAllCookies();
        s.jarBytes = all.reduce((n, c) => n + c.toString().length, 0);
        if (s.jarBytes + header.length > this.maxJarBytes) break;
      }
      // Modern browsers treat cookies without a SameSite attribute as Lax;
      // tough-cookie defaults to None, so make the browser default explicit.
      const value = /;\s*samesite\s*=/i.test(header) ? header : `${header}; SameSite=Lax`;
      try {
        const c = await s.jar.setCookie(value, url.href, {
          http: opts.http,
          ignoreError: true,
          sameSiteContext: opts.sameSiteContext,
        });
        if (c) s.jarBytes += header.length;
      } catch {
        /* malformed cookie: ignore */
      }
    }
  }

  async cookieHeader(s: Session, url: URL, sameSiteContext: 'strict' | 'lax' | 'none'): Promise<string> {
    return s.jar.getCookieString(url.href, { http: true, sameSiteContext });
  }

  /** Cookies a page script at `url` would see via document.cookie (non-HttpOnly only). */
  async scriptVisibleCookies(s: Session, url: URL): Promise<string> {
    const cookies: Cookie[] = await s.jar.getCookies(url.href, { http: false, sameSiteContext: 'strict' });
    return cookies.map((c) => c.cookieString()).join('; ');
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.lastSeen > this.ttlMs) this.sessions.delete(id);
      else break; // Map is in LRU order; the rest are newer.
    }
  }

  stop(): void {
    clearInterval(this.sweep);
  }
}
