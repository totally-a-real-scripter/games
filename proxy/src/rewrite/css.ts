/**
 * CSS rewriting: url(...) references and @import rules.
 *
 * XSS note: rewritten URLs are always re-emitted inside a double-quoted
 * url("...") with CSS string escaping, so a hostile URL can't close the
 * string or the declaration. When CSS is embedded in HTML (<style> or a style
 * attribute) callers additionally pass `inHtml` so any "</" sequence is
 * escaped and cannot terminate the surrounding <style> element.
 */
import { rewriteUrl } from '../proxy/urlcodec.js';

// url( <optional ws> ( "..." | '...' | unquoted ) <optional ws> )
const URL_RE = /url\(\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|([^)"'\s]*))\s*\)/gi;
// @import "..."; or @import '...';  (the url() form is handled by URL_RE)
const IMPORT_RE = /@import\s+(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)')/gi;

function cssUnescape(s: string): string {
  return s.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_m, hex: string | undefined, ch: string | undefined) => {
    if (hex) {
      const cp = parseInt(hex, 16);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '�';
    }
    return ch ?? '';
  });
}

function cssQuote(s: string): string {
  return '"' + s.replace(/[\\"\n\r\f]/g, (c) => '\\' + c.charCodeAt(0).toString(16) + ' ') + '"';
}

export function rewriteCss(css: string, base: URL, inHtml = false): string {
  let out = css.replace(URL_RE, (match, dq?: string, sq?: string, bare?: string) => {
    const raw = cssUnescape(dq ?? sq ?? bare ?? '');
    if (!raw || raw.startsWith('#') || /^data:/i.test(raw.trim())) return match;
    return `url(${cssQuote(rewriteUrl(raw, base))})`;
  });
  out = out.replace(IMPORT_RE, (match, dq?: string, sq?: string) => {
    const raw = cssUnescape(dq ?? sq ?? '');
    if (!raw) return match;
    return `@import ${cssQuote(rewriteUrl(raw, base))}`;
  });
  if (inHtml) out = out.replace(/<\//g, '<\\/');
  return out;
}
