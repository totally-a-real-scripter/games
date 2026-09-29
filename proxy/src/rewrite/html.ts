/**
 * HTML rewriting.
 *
 * Uses parse5's spec-compliant tokenizer (via parse5-html-rewriting-stream) so
 * tag/attribute boundaries are identified exactly as a browser would, rather
 * than with regexes that can be confused by hostile markup.
 *
 * XSS considerations:
 *  - Modified start tags are re-serialised by parse5, which escapes attribute
 *    values (& and "), so a rewritten URL can never break out of its attribute.
 *  - Unmodified tokens are emitted byte-for-byte from the source, so rewriting
 *    never "repairs" markup into something the browser parses differently.
 *  - Text inside <style> is CSS-rewritten with "</" escaped so it cannot close
 *    the element early.
 *  - The only markup we inject is a fixed <script src> tag whose config lives in
 *    a parse5-escaped attribute.
 *  - Upstream CSP <meta> tags are removed (the proxy sends its own CSP header).
 */
import { RewritingStream } from 'parse5-html-rewriting-stream';
import type { StartTag } from 'parse5-sax-parser';
import { rewriteCss } from './css.js';
import { encodeProxyPath, rewriteUrl } from '../proxy/urlcodec.js';

export interface HtmlRewriteOptions {
  /** Real URL of the document being rewritten. */
  url: URL;
  /** JSON-serialisable config handed to the client runtime. */
  clientConfig: Record<string, unknown>;
  /** Inject the client runtime script (false for iframe srcdoc fragments). */
  inject?: boolean;
}

/** Attributes holding a single URL, keyed by attribute name -> element set ('*' = any). */
const URL_ATTRS: Record<string, Set<string> | '*'> = {
  href: '*', // a, area, link, base, svg <a>/<image>/<use>
  'xlink:href': '*',
  src: new Set(['img', 'script', 'iframe', 'frame', 'embed', 'source', 'audio', 'video', 'track', 'input']),
  action: new Set(['form']),
  formaction: new Set(['button', 'input']),
  poster: new Set(['video']),
  data: new Set(['object']),
  background: new Set(['body', 'table', 'td', 'th']),
  manifest: new Set(['html']),
};

const SRCSET_ATTRS = new Set(['srcset', 'imagesrcset']);
/** Attributes removed outright. */
const DROP_ATTRS = new Set(['integrity', 'ping']);

class CollectingRewriter extends RewritingStream {
  readonly chunks: string[] = [];
  override push(chunk: unknown): boolean {
    if (typeof chunk === 'string') this.chunks.push(chunk);
    return true;
  }
}

export function rewriteHtml(html: string, opts: HtmlRewriteOptions): string {
  const docUrl = opts.url;
  let base = docUrl;
  let baseSeen = false;
  let injected = opts.inject === false;
  const rw = new CollectingRewriter();

  // Buffers for raw-text elements whose content we rewrite as a whole.
  let captureTag: 'style' | 'importmap' | null = null;
  let captured = '';

  const injectRuntime = () => {
    if (injected) return;
    injected = true;
    rw.emitStartTag({
      tagName: 'script',
      attrs: [
        { name: 'src', value: '/__px/client.js' },
        { name: 'data-px', value: JSON.stringify(opts.clientConfig) },
      ],
      selfClosing: false,
    } as StartTag);
    rw.emitRaw('</script>');
  };

  rw.on('doctype', (_t, raw) => rw.emitRaw(raw));
  rw.on('comment', (_t, raw) => rw.emitRaw(raw));

  rw.on('startTag', (tag, raw) => {
    const name = tag.tagName;

    // Inject the runtime as early as possible: right after <head>, or before
    // the first real element if the document has no explicit head.
    if (!injected && name !== 'html' && name !== 'head') injectRuntime();

    if (name === 'meta') {
      const equiv = attr(tag, 'http-equiv')?.toLowerCase();
      if (equiv === 'content-security-policy' || equiv === 'content-security-policy-report-only' || equiv === 'set-cookie') {
        return; // dropped entirely
      }
      if (equiv === 'refresh') {
        const content = attr(tag, 'content');
        if (content) setAttr(tag, 'content', rewriteRefresh(content, base));
      }
      if (equiv === 'content-type') setAttr(tag, 'content', 'text/html; charset=utf-8');
      if (attr(tag, 'charset') !== undefined) setAttr(tag, 'charset', 'utf-8');
      rw.emitStartTag(tag);
      return;
    }

    if (name === 'base') {
      const href = attr(tag, 'href');
      if (href !== undefined && !baseSeen) {
        baseSeen = true;
        try {
          base = new URL(href, docUrl);
        } catch {
          /* keep document URL */
        }
      }
    }

    let modified = false;
    tag.attrs = tag.attrs.filter((a) => {
      const an = a.name.toLowerCase();
      if (DROP_ATTRS.has(an)) {
        modified = true;
        return false;
      }
      const scope = URL_ATTRS[an];
      if (scope && (scope === '*' || scope.has(name))) {
        // <base href> is resolved against the document, everything else against base.
        const next = rewriteUrl(a.value, name === 'base' ? docUrl : base);
        if (next !== a.value) {
          a.value = next;
          modified = true;
        }
      } else if (SRCSET_ATTRS.has(an)) {
        a.value = rewriteSrcset(a.value, base);
        modified = true;
      } else if (an === 'style') {
        const next = rewriteCss(a.value, base);
        if (next !== a.value) {
          a.value = next;
          modified = true;
        }
      } else if (an === 'srcdoc' && name === 'iframe') {
        a.value = rewriteHtml(a.value, { url: base, clientConfig: opts.clientConfig, inject: true });
        modified = true;
      }
      return true;
    });

    if (name === 'style') captureTag = 'style';
    if (name === 'script' && attr(tag, 'type')?.toLowerCase() === 'importmap') captureTag = 'importmap';
    if (captureTag) captured = '';

    if (modified) rw.emitStartTag(tag);
    else rw.emitRaw(raw);

    if (name === 'head') injectRuntime();
  });

  rw.on('text', (t, raw) => {
    if (captureTag) {
      captured += t.text;
      return;
    }
    if (!injected && t.text.trim() !== '') injectRuntime();
    rw.emitRaw(raw);
  });

  rw.on('endTag', (tag, raw) => {
    if (captureTag && (tag.tagName === 'style' || tag.tagName === 'script')) {
      const content = captureTag === 'style' ? rewriteCss(captured, base, true) : rewriteImportMap(captured, base);
      rw.emitRaw(content);
      captureTag = null;
      captured = '';
    }
    rw.emitRaw(raw);
  });

  // Process the whole document synchronously. The public stream API defers
  // the final flush to a later tick, so we drive the tokenizer directly with
  // the "last chunk" flag set. (Pinned dependency version; covered by tests.)
  (rw as unknown as { lastChunkWritten: boolean }).lastChunkWritten = true;
  rw._transformChunk(html);
  if (captureTag) {
    // Unterminated <style>/<script>: flush what we have, rewritten.
    rw.emitRaw(captureTag === 'style' ? rewriteCss(captured, base, true) : rewriteImportMap(captured, base));
  }
  injectRuntime();
  return rw.chunks.join('');
}

function attr(tag: StartTag, name: string): string | undefined {
  return tag.attrs.find((a) => a.name.toLowerCase() === name)?.value;
}

function setAttr(tag: StartTag, name: string, value: string): void {
  const a = tag.attrs.find((x) => x.name.toLowerCase() === name);
  if (a) a.value = value;
}

/** `5; url=/next` -> `5; url=/p/https/host/next` */
export function rewriteRefresh(content: string, base: URL): string {
  const m = /^(\s*[\d.]*\s*[;,]?\s*)(?:url\s*=\s*)?(['"]?)(.*?)\2\s*$/i.exec(content);
  if (!m || !m[3]) return content;
  return `${m[1]}url=${rewriteUrl(m[3], base)}`;
}

/**
 * srcset parser following the HTML spec's candidate grammar, so URLs that
 * contain commas (common with image CDNs) are handled correctly.
 */
export function rewriteSrcset(value: string, base: URL): string {
  const out: string[] = [];
  let i = 0;
  const n = value.length;
  while (i < n) {
    while (i < n && /[\s,]/.test(value[i]!)) i++;
    if (i >= n) break;
    let start = i;
    while (i < n && !/\s/.test(value[i]!)) i++;
    let url = value.slice(start, i);
    let descriptor = '';
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '');
    } else {
      start = i;
      let depth = 0;
      while (i < n) {
        const c = value[i]!;
        if (c === '(') depth++;
        else if (c === ')') depth = Math.max(0, depth - 1);
        else if (c === ',' && depth === 0) break;
        i++;
      }
      descriptor = value.slice(start, i).trim();
      i++; // skip comma
    }
    if (url) out.push(descriptor ? `${rewriteUrl(url, base)} ${descriptor}` : rewriteUrl(url, base));
  }
  return out.join(', ');
}

/** Rewrite URL values inside an import map; on any parse error the map is emptied. */
function rewriteImportMap(json: string, base: URL): string {
  try {
    const map = JSON.parse(json) as { imports?: Record<string, string>; scopes?: Record<string, Record<string, string>> };
    const fix = (o?: Record<string, string>) => {
      if (!o || typeof o !== 'object') return o;
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(o)) {
        const key = /^(\/|\.\.?\/|[a-z][a-z0-9+.-]*:)/i.test(k) ? rewriteUrl(k, base) : k;
        r[key] = typeof v === 'string' ? rewriteUrl(v, base) : v;
      }
      return r;
    };
    const next: Record<string, unknown> = {};
    if (map.imports) next.imports = fix(map.imports);
    if (map.scopes) {
      const scopes: Record<string, unknown> = {};
      for (const [scope, m] of Object.entries(map.scopes)) scopes[rewriteUrl(scope, base)] = fix(m);
      next.scopes = scopes;
    }
    // JSON.stringify never emits a raw "<", but escape anyway so "</script>" is impossible.
    return JSON.stringify(next).replace(/</g, '\\u003c');
  } catch {
    return '{}';
  }
}

export { encodeProxyPath };
