/**
 * Ad blocker.
 *
 * Every request a proxied page makes (scripts, images, iframes, fetch/XHR)
 * passes through the proxy, so blocking happens server-side before anything
 * leaves the server:
 *
 *  1. Domain blocking: requests to known ad/tracker domains (a built-in list,
 *     plus optional downloadable lists such as StevenBlack's hosts file) get
 *     an empty response of the right type instead of reaching the network.
 *  2. YouTube: its ads come from the same servers as its videos, so domains
 *     can't be blocked. Instead the ad schedule is removed from YouTube's
 *     player/feed data (both the JSON API responses and the data embedded in
 *     its HTML), the approach used by browser ad blockers. Ad-only endpoints
 *     are also blocked. The client runtime adds cosmetic hiding and a
 *     skip-if-an-ad-still-starts fallback (public/client.js).
 *
 * Visitors can switch it off with the shield button (cookie `__px_ab=0`).
 */
import { log } from '../util/log.js';

/** Conservative built-in list: major ad networks, ad servers and trackers. */
export const BUILTIN_BLOCKLIST = [
  // Google ads / measurement
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'google-analytics.com',
  'googletagservices.com', 'adservice.google.com', 'pagead2.googlesyndication.com', 'imasdk.googleapis.com',
  'ssl.google-analytics.com', 'analytics.google.com', 'googletagmanager.com',
  // Programmatic ad exchanges / SSPs / DSPs
  'adnxs.com', 'adsrvr.org', 'criteo.com', 'criteo.net', 'rubiconproject.com', 'pubmatic.com', 'openx.net',
  'casalemedia.com', 'indexww.com', 'amazon-adsystem.com', 'adform.net', 'smartadserver.com', 'yieldmo.com',
  '33across.com', 'sharethrough.com', 'triplelift.com', '3lift.com', 'teads.tv', 'media.net', 'contextweb.com',
  'sovrn.com', 'lijit.com', 'gumgum.com', 'spotxchange.com', 'spotx.tv', 'springserve.com', 'undertone.com',
  'yieldlab.net', 'adition.com', 'bidswitch.net', 'districtm.io', 'emxdgt.com', 'onetag-sys.com',
  'rhythmone.com', 'improvedigital.com', 'adkernel.com', 'smaato.net', 'inmobi.com', 'mopub.com',
  'applovin.com', 'unityads.unity3d.com', 'adcolony.com', 'vungle.com', 'chartboost.com', 'ironsrc.mobi',
  'advertising.com', 'adtechus.com', 'yieldmanager.com', 'zedo.com', 'revcontent.com', 'mgid.com',
  'taboola.com', 'outbrain.com', 'zergnet.com', 'content.ad', 'adblade.com', 'popads.net', 'popcash.net',
  'propellerads.com', 'propellerclick.com', 'adsterra.com', 'exoclick.com', 'juicyads.com', 'trafficjunky.com',
  'trafficjunky.net', 'hilltopads.net', 'admaven.com', 'ad-maven.com', 'clickadu.com', 'adcash.com',
  'bidvertiser.com', 'infolinks.com', 'chitika.com', 'buysellads.com', 'carbonads.net', 'adroll.com',
  'quantcast.com', 'quantserve.com', 'bluekai.com', 'krxd.net', 'demdex.net', 'everesttech.net',
  'mathtag.com', 'turn.com', 'rlcdn.com', 'agkn.com', 'crwdcntrl.net', 'tapad.com', 'adsymptotic.com',
  'eyeota.net', 'exelator.com', 'liadm.com', 'id5-sync.com', 'openwebmp.com', 'zemanta.com',
  // Verification / viewability / measurement
  'moatads.com', 'moatpixel.com', 'adsafeprotected.com', 'doubleverify.com', 'scorecardresearch.com',
  'imrworldwide.com', 'chartbeat.com', 'chartbeat.net', 'comscore.com', 'serving-sys.com', 'flashtalking.com',
  'innovid.com', 'ipredictive.com', 'adgrx.com',
  // Session recording / trackers
  'hotjar.com', 'hotjar.io', 'mouseflow.com', 'fullstory.com', 'crazyegg.com', 'clarity.ms', 'luckyorange.com',
  'inspectlet.com', 'newrelic.com', 'nr-data.net', 'mixpanel.com', 'segment.io', 'amplitude.com',
  'branch.io', 'app-measurement.com', 'adjust.com', 'appsflyer.com', 'kochava.com',
  // Social pixels
  'ads-twitter.com', 'analytics.twitter.com', 'ads.linkedin.com', 'px.ads.linkedin.com', 'snap.licdn.com',
  'analytics.tiktok.com', 'ads.tiktok.com', 'tr.snapchat.com', 'sc-static.net', 'ct.pinterest.com',
  'ads.pinterest.com', 'bat.bing.com', 'ads.yahoo.com', 'analytics.yahoo.com', 'adtech.yahooinc.com',
  // Consent-wall / anti-adblock vendors commonly used to push ads
  'admiral.com', 'getadmiral.com', 'blockadblock.com', 'pagefair.com', 'pagefair.net',
];

/** Paths that only serve ads/ad tracking on otherwise-needed hosts (YouTube). */
const PATH_RULES: { host: RegExp; path: RegExp }[] = [
  { host: /(^|\.)youtube\.com$/, path: /^\/(pagead\/|api\/stats\/ads|ptracking|sw\.js_data\/?$)/ },
  // Not blocked on purpose: /youtubei/v1/player/ad_break and /get_midroll_info.
  // The player waits on these at a mid-roll slot and the video stream pauses
  // until they answer, so blocking them makes videos stop a few minutes in.
  // Their responses are pruned instead (see isYouTubeAdCarrier).
  { host: /(^|\.)youtube-nocookie\.com$/, path: /^\/(pagead\/|api\/stats\/ads|ptracking)/ },
  { host: /(^|\.)google\.com$/, path: /^\/(pagead\/|ads\/|adsense\/)/ },
];

export interface AdblockConfig {
  enabled: boolean;
  defaultOn: boolean;
  lists: string[];
  allow: string[];
  block: string[];
  refreshHours: number;
}

export class AdBlocker {
  private domains = new Set<string>();
  private readonly allow: Set<string>;
  private lastLoaded = 0;
  private listDomains = 0;
  private timer?: NodeJS.Timeout;

  constructor(private readonly cfg: AdblockConfig) {
    for (const d of [...BUILTIN_BLOCKLIST, ...cfg.block]) this.domains.add(normalize(d));
    this.allow = new Set(cfg.allow.map(normalize));
  }

  /** Download configured lists now and then every refreshHours (never throws). */
  start(): void {
    if (!this.cfg.enabled || this.cfg.lists.length === 0) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.cfg.refreshHours * 3_600_000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    const next = new Set<string>([...BUILTIN_BLOCKLIST, ...this.cfg.block].map(normalize));
    let loaded = 0;
    for (const url of this.cfg.lists) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await readCapped(res, 30 * 1024 * 1024);
        const found = parseList(text);
        for (const d of found) next.add(d);
        loaded += found.length;
        log.info('adblock list loaded', { url, domains: found.length });
      } catch (err) {
        log.warn('adblock list failed (keeping previous list)', { url, err: err instanceof Error ? err.message : String(err) });
        if (this.lastLoaded) return; // keep the previous full set rather than shrinking it
      }
    }
    this.domains = next;
    this.listDomains = loaded;
    this.lastLoaded = Date.now();
  }

  get size(): number {
    return this.domains.size;
  }

  status() {
    return { available: this.cfg.enabled, defaultOn: this.cfg.defaultOn, domains: this.domains.size, fromLists: this.listDomains };
  }

  /** Is this visitor's blocker on? (Shield button sets the `__px_ab` cookie.) */
  activeFor(cookieValue: string | undefined): boolean {
    if (!this.cfg.enabled) return false;
    if (cookieValue === '0') return false;
    if (cookieValue === '1') return true;
    return this.cfg.defaultOn;
  }

  /** Whether a request to `url` should be blocked. */
  blocks(url: URL): boolean {
    const host = normalize(url.hostname);
    if (this.isAllowed(host)) return false;
    // host and every parent domain ("a.b.ads.com" -> "b.ads.com" -> "ads.com")
    let h = host;
    for (;;) {
      if (this.domains.has(h)) return true;
      const dot = h.indexOf('.');
      if (dot < 0) break;
      h = h.slice(dot + 1);
      if (!h.includes('.')) break; // stop at the TLD
    }
    return PATH_RULES.some((r) => r.host.test(host) && r.path.test(url.pathname));
  }

  private isAllowed(host: string): boolean {
    let h = host;
    for (;;) {
      if (this.allow.has(h)) return true;
      const dot = h.indexOf('.');
      if (dot < 0) return false;
      h = h.slice(dot + 1);
    }
  }
}

function normalize(d: string): string {
  return d.trim().toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
}

const SKIP = new Set(['localhost', 'localhost.localdomain', 'local', 'broadcasthost', 'ip6-localhost', 'ip6-loopback', '0.0.0.0']);

/**
 * Parse hosts-file ("0.0.0.0 ads.example.com"), plain domain lists and the
 * simple "||domain^" Adblock-style lines. Everything else is ignored.
 */
export function parseList(text: string): string[] {
  const out: string[] = [];
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/#.*$/, '').trim();
    if (!line || line.startsWith('!') || line.startsWith('[')) continue;
    let d: string | undefined;
    const abp = /^\|\|([a-z0-9.-]+)\^(\$third-party)?$/i.exec(line);
    if (abp) d = abp[1];
    else {
      const parts = line.split(/\s+/);
      if (parts.length >= 2 && /^(0\.0\.0\.0|127\.0\.0\.1|::1?|::)$/.test(parts[0]!)) d = parts[1];
      else if (parts.length === 1) d = parts[0];
    }
    if (!d) continue;
    d = normalize(d);
    if (SKIP.has(d) || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) continue;
    out.push(d);
  }
  return out;
}

async function readCapped(res: Response, max: number): Promise<string> {
  if (!res.body) return '';
  const chunks: Uint8Array[] = [];
  let n = 0;
  for await (const c of res.body as unknown as AsyncIterable<Uint8Array>) {
    n += c.length;
    if (n > max) throw new Error('list too large');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** An empty-but-valid response for a blocked request, based on what the page asked for. */
export function blockedResponse(dest: string | undefined): { status: number; type?: string; body?: Buffer | string } {
  switch (dest) {
    case 'script':
      return { status: 200, type: 'text/javascript; charset=utf-8', body: '' };
    case 'style':
      return { status: 200, type: 'text/css; charset=utf-8', body: '' };
    case 'image':
      return { status: 200, type: 'image/gif', body: TRANSPARENT_GIF };
    case 'iframe':
    case 'frame':
    case 'embed':
    case 'object':
      return { status: 200, type: 'text/html; charset=utf-8', body: '<!doctype html><title></title>' };
    default:
      return { status: 204 };
  }
}

const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// ---------------------------------------------------------------------------
// YouTube

export function isYouTubeHost(hostname: string): boolean {
  return /(^|\.)(youtube\.com|youtube-nocookie\.com)$/i.test(hostname);
}

/** YouTube JSON API responses that can carry ads (player, feed, watch page, search, shorts). */
export function isYouTubeAdCarrier(url: URL): boolean {
  return isYouTubeHost(url.hostname) && (/^\/youtubei\/v1\/(player|next|browse|search|reel\/reel_watch_sequence|reel\/reel_item_watch|guide)/.test(url.pathname) || url.pathname === '/get_midroll_info');
}

/** Keys whose values are ads (or the anti-adblock popup) in YouTube's data. */
const YT_AD_KEYS = new Set([
  'adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams', 'adBreakParams',
  'adSlotRenderer', 'promotedSparklesWebRenderer', 'promotedSparklesTextSearchRenderer', 'displayAdRenderer',
  'promotedVideoRenderer', 'compactPromotedVideoRenderer', 'inFeedAdLayoutRenderer', 'bannerPromoRenderer',
  'statementBannerRenderer', 'brandVideoShelfRenderer', 'brandVideoSingletonRenderer', 'searchPyvRenderer',
  'adsEngagementPanelContentRenderer', 'movingThumbnailAdRenderer', 'reelPlayerAdRenderer',
  'adInfoRenderer', 'companionAdRenderer', 'actionCompanionAdRenderer', 'mastheadAdRenderer',
  'enforcementMessageViewModel',
]);

function hasAdKey(v: unknown, depth: number): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  for (const k of Object.keys(v)) {
    if (YT_AD_KEYS.has(k)) return true;
    // Look through single wrapper layers like {richItemRenderer:{content:{adSlotRenderer:...}}}.
    if (depth > 0 && hasAdKey((v as Record<string, unknown>)[k], depth - 1)) return true;
  }
  return false;
}

/** Remove ads from YouTube data in place. Returns how many ad entries were removed. */
export function pruneYouTube(node: unknown, depth = 0): number {
  if (depth > 400 || !node || typeof node !== 'object') return 0;
  let removed = 0;
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      if (hasAdKey(node[i], 3)) {
        node.splice(i, 1);
        removed++;
      } else removed += pruneYouTube(node[i], depth + 1);
    }
    return removed;
  }
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (YT_AD_KEYS.has(k)) {
      delete obj[k];
      removed++;
    } else removed += pruneYouTube(obj[k], depth + 1);
  }
  return removed;
}

/** Prune a YouTube JSON API body. Returns null if it isn't JSON (leave it untouched). */
export function pruneYouTubeJson(text: string): { text: string; removed: number } | null {
  const trimmed = text.replace(/^\)\]\}'\s*/, ''); // XSSI prefix some endpoints use
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const removed = pruneYouTube(data);
  return { text: removed ? JSON.stringify(data) : text, removed };
}

const YT_INLINE = /(ytInitialPlayerResponse|ytInitialData|playerResponse)["']?\]?\s*=\s*(?=\{)/g;

/**
 * Prune the data YouTube embeds in inline <script>s
 * (`var ytInitialPlayerResponse = {...};`). The JSON object is located with a
 * string-aware brace scanner, parsed, pruned and re-serialised with "<"
 * escaped so it can never close the surrounding <script>.
 */
export function pruneYouTubeInlineScript(js: string): string {
  if (!js.includes('ytInitial') && !js.includes('playerResponse')) return js;
  let out = '';
  let last = 0;
  YT_INLINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = YT_INLINE.exec(js))) {
    const start = m.index + m[0].length;
    const end = matchBrace(js, start);
    if (end < 0) continue;
    const raw = js.slice(start, end + 1);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue; // not plain JSON (e.g. a JS expression): leave it
    }
    if (pruneYouTube(data) === 0) continue;
    out += js.slice(last, start) + JSON.stringify(data).replace(/</g, '\\u003c');
    last = end + 1;
    YT_INLINE.lastIndex = end + 1;
  }
  return last === 0 ? js : out + js.slice(last);
}

/** Index of the "}" closing the "{" at `start`, skipping strings; -1 if unbalanced. */
function matchBrace(s: string, start: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = start; i < s.length; i++) {
    const c = s[i]!;
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") inStr = c;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
