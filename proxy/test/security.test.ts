import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HostPolicy, PolicyError, resolveAndPin } from '../src/security/ssrf.js';
import { decodeProxyPath, encodeProxyPath, rewriteUrl } from '../src/proxy/urlcodec.js';
import { rewriteHtml, rewriteSrcset } from '../src/rewrite/html.js';
import { rewriteCss } from '../src/rewrite/css.js';
import { RateLimiter, ConcurrencyGate } from '../src/security/limits.js';
import { loadConfig } from '../src/config.js';

const base = { allowedHosts: [], blockedHosts: [], blockedCidrs: [], allowedPorts: [80, 443], publicHosts: [] };
const policy = new HostPolicy(base);

const blocked = [
  'http://127.0.0.1/',
  'http://127.1/',
  'http://0x7f000001/',
  'http://2130706433/',
  'http://017700000001/',
  'http://0.0.0.0/',
  'http://localhost/',
  'http://LOCALHOST./',
  'http://foo.localhost/',
  'http://[::1]/',
  'http://[::]/',
  'http://[::ffff:127.0.0.1]/',
  'http://[::ffff:7f00:1]/',
  'http://[64:ff9b::7f00:1]/',
  'http://[2002:7f00:1::]/',
  'http://[fd00::1]/',
  'http://[fe80::1]/',
  'http://[fd00:ec2::254]/',
  'http://169.254.169.254/latest/meta-data/',
  'http://metadata.google.internal/',
  'http://100.100.100.200/',
  'http://10.0.0.1/',
  'http://172.16.5.4/',
  'http://192.168.0.1/',
  'http://100.64.1.1/',
  'http://224.0.0.1/',
  'http://255.255.255.255/',
  'http://198.18.0.1/',
  'http://intranet/',
  'http://printer.local/',
  'http://svc.internal/',
  'http://user:pass@example.com/',
  'http://example.com@127.0.0.1/',
  'http://example.com:22/',
  'http://example.com:6379/',
  'ftp://example.com/',
  'file:///etc/passwd',
  'gopher://example.com/',
  'javascript:alert(1)',
  'not a url',
];

for (const u of blocked) {
  test(`blocks ${u}`, () => {
    assert.throws(() => policy.validateUrl(u), PolicyError);
  });
}

for (const u of ['https://example.com/', 'http://93.184.216.34/', 'https://[2606:4700:4700::1111]/', 'https://sub.example.co.uk/a?b=c']) {
  test(`allows ${u}`, () => {
    assert.doesNotThrow(() => policy.validateUrl(u));
  });
}

test('DNS answers are all checked (rebinding / mixed records)', async () => {
  const url = new URL('https://rebind.example.com/');
  const mixed = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.5', family: 4 },
  ];
  await assert.rejects(resolveAndPin(policy, url, mixed, 1000), PolicyError);
  const v6private = async () => [{ address: '::ffff:192.168.1.1', family: 6 }];
  await assert.rejects(resolveAndPin(policy, url, v6private, 1000), PolicyError);
  const ok = async () => [{ address: '93.184.216.34', family: 4 }];
  assert.deepEqual(await resolveAndPin(policy, url, ok, 1000), { address: '93.184.216.34', family: 4 });
});

test('DNS timeout is enforced', async () => {
  const slow = () => new Promise<never>(() => {});
  await assert.rejects(resolveAndPin(policy, new URL('https://slow.example.com/'), slow, 50), /timed out/);
});

test('allowlist / blocklist / extra CIDRs', () => {
  const p = new HostPolicy({ ...base, allowedHosts: ['*.wikipedia.org', 'example.com'], blockedHosts: ['evil.wikipedia.org'] });
  assert.doesNotThrow(() => p.validateUrl('https://en.wikipedia.org/'));
  assert.doesNotThrow(() => p.validateUrl('https://wikipedia.org/'));
  assert.doesNotThrow(() => p.validateUrl('https://example.com/'));
  assert.throws(() => p.validateUrl('https://sub.example.com/'), PolicyError);
  assert.throws(() => p.validateUrl('https://evil.wikipedia.org/'), PolicyError);
  assert.throws(() => p.validateUrl('https://google.com/'), PolicyError);
  const c = new HostPolicy({ ...base, blockedCidrs: ['93.184.0.0/16'] });
  assert.throws(() => c.validateUrl('http://93.184.216.34/'), PolicyError);
  const self = new HostPolicy({ ...base, publicHosts: ['proxy.example.net'] });
  assert.throws(() => self.validateUrl('https://proxy.example.net/'), PolicyError);
});

test('proxy path codec', () => {
  const u = new URL('https://example.com:8443/a/b?c=d#e');
  assert.equal(encodeProxyPath(u), '/p/https/example.com:8443/a/b?c=d#e');
  assert.deepEqual(decodeProxyPath('/p/https/example.com/a?x=1'), { target: 'https://example.com/a?x=1', needsSlash: false });
  assert.deepEqual(decodeProxyPath('/p/https/example.com'), { target: 'https://example.com/', needsSlash: true });
  assert.equal(decodeProxyPath('/p/file/etc/passwd'), null);
  assert.equal(decodeProxyPath('/p/https/evil@127.0.0.1/'), null);
  assert.equal(decodeProxyPath('/p/https/a\\b/'), null);
  assert.equal(decodeProxyPath('/other'), null);
});

test('rewriteUrl', () => {
  const b = new URL('https://example.com/dir/page.html');
  assert.equal(rewriteUrl('img.png', b), '/p/https/example.com/dir/img.png');
  assert.equal(rewriteUrl('/root', b), '/p/https/example.com/root');
  assert.equal(rewriteUrl('//cdn.example.net/x.js', b), '/p/https/cdn.example.net/x.js');
  assert.equal(rewriteUrl('http://other.org/?q=1', b), '/p/http/other.org/?q=1');
  assert.equal(rewriteUrl('#frag', b), '#frag');
  assert.equal(rewriteUrl('data:image/png;base64,AAA', b), 'data:image/png;base64,AAA');
  assert.equal(rewriteUrl('javascript:void(0)', b), 'javascript:void(0)');
  assert.equal(rewriteUrl('file:///etc/passwd', b), '#');
});

test('srcset with commas in URLs', () => {
  const b = new URL('https://example.com/');
  assert.equal(
    rewriteSrcset('a.jpg 1x, https://cdn.x.com/w_100,h_100/b.jpg 2x', b),
    '/p/https/example.com/a.jpg 1x, /p/https/cdn.x.com/w_100,h_100/b.jpg 2x',
  );
});

test('CSS rewriting', () => {
  const b = new URL('https://example.com/css/site.css');
  const out = rewriteCss(`@import "print.css"; a{background:url(../img/a.png)} b{background:url( 'https://x.org/b.png' )} c{background:url(data:image/png;base64,AA)}`, b);
  assert.match(out, /@import "\/p\/https\/example.com\/css\/print.css"/);
  assert.match(out, /url\("\/p\/https\/example.com\/img\/a.png"\)/);
  assert.match(out, /url\("\/p\/https\/x.org\/b.png"\)/);
  assert.match(out, /url\(data:image\/png;base64,AA\)/);
});

test('HTML rewriting', () => {
  const html = `<!doctype html><html><head><meta charset="iso-8859-1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'">
<meta http-equiv="refresh" content="5; url=/next">
<link rel="stylesheet" href="/s.css" integrity="sha384-x">
<style>body{background:url(/bg.png)}</style>
<script type="importmap">{"imports":{"lib":"https://cdn.example.net/lib.js"}}</script>
</head><body>
<a href="https://other.org/x?a=1&amp;b=2">x</a>
<img src="i.png" srcset="i.png 1x, i2.png 2x" style="background:url('/s.png')">
<form action="/submit" method="post"><button formaction="/alt">go</button></form>
<iframe srcdoc="&lt;a href=&quot;/in&quot;&gt;in&lt;/a&gt;"></iframe>
<svg><use href="#icon"></use><image href="/pic.svg"></image></svg>
</body></html>`;
  const out = rewriteHtml(html, { url: new URL('https://example.com/dir/page'), clientConfig: { url: 'https://example.com/dir/page' } });
  assert.match(out, /<head><script src="\/__px\/client.js" data-px="\{&quot;url&quot;/);
  assert.doesNotMatch(out, /Content-Security-Policy/);
  assert.match(out, /content="5; url=\/p\/https\/example.com\/next"/);
  assert.match(out, /href="\/p\/https\/example.com\/s.css"/);
  assert.doesNotMatch(out, /integrity/);
  assert.match(out, /url\("\/p\/https\/example.com\/bg.png"\)/);
  assert.match(out, /"lib":"\/p\/https\/cdn.example.net\/lib.js"/);
  assert.match(out, /href="\/p\/https\/other.org\/x\?a=1&amp;b=2"/);
  assert.match(out, /src="\/p\/https\/example.com\/dir\/i.png"/);
  assert.match(out, /srcset="\/p\/https\/example.com\/dir\/i.png 1x, \/p\/https\/example.com\/dir\/i2.png 2x"/);
  assert.match(out, /action="\/p\/https\/example.com\/submit"/);
  assert.match(out, /formaction="\/p\/https\/example.com\/alt"/);
  assert.match(out, /srcdoc="[^"]*\/p\/https\/example.com\/in/);
  assert.match(out, /<use href="#icon">/);
  assert.match(out, /<image href="\/p\/https\/example.com\/pic.svg">/);
  assert.match(out, /<meta charset="utf-8">/);
});

test('HTML rewriting does not introduce XSS', () => {
  const b = { url: new URL('https://example.com/'), clientConfig: { url: 'https://example.com/"><script>alert(1)</script>' } };
  // CSS escapes that decode to "</style><script>" must not survive rewriting.
  const out = rewriteHtml(`<a href='x" onmouseover="alert(1)'>a</a><style>a{background:url("\\3c/style\\3e<script>alert(2)</script>")}</style>`, b);
  // Attribute value stays inside its quotes.
  assert.doesNotMatch(out, /href="[^"]*" onmouseover=/);
  // Style content can't terminate the element.
  assert.equal((out.match(/<\/style>/g) ?? []).length, 1);
  assert.doesNotMatch(out, /<script>alert\(2\)/);
  // Client config is attribute-escaped.
  assert.doesNotMatch(out, /data-px="[^"]*"><script>alert\(1\)/);
});

test('base href is respected and rewritten', () => {
  const out = rewriteHtml('<head><base href="https://cdn.example.org/assets/"></head><img src="a.png">', {
    url: new URL('https://example.com/'),
    clientConfig: {},
  });
  assert.match(out, /<base href="\/p\/https\/cdn.example.org\/assets\/">/);
  assert.match(out, /src="\/p\/https\/cdn.example.org\/assets\/a.png"/);
});

test('rate limiter', () => {
  const r = new RateLimiter(60, 3);
  assert.equal(r.take('a'), 0);
  assert.equal(r.take('a'), 0);
  assert.equal(r.take('a'), 0);
  assert.ok(r.take('a') > 0);
  assert.equal(r.take('b'), 0);
  r.stop();
});

test('concurrency gate queues and times out', async () => {
  const g = new ConcurrencyGate(1, 1, 1, 50);
  const rel = await g.acquire('x');
  const waiting = g.acquire('x');
  await assert.rejects(g.acquire('x'), /busy/); // queue full
  rel();
  const rel2 = await waiting;
  await assert.rejects(g.acquire('x'), /Timed out/);
  rel2();
});

test('Coolify domains are picked up as the proxy\'s own hosts', () => {
  process.env.COOLIFY_FQDN = 'https://proxy.example.com,https://www.proxy.example.com:43117';
  process.env.PUBLIC_HOSTNAMES = 'alt.example.net';
  try {
    const cfg = loadConfig();
    assert.deepEqual(cfg.publicHosts.sort(), ['alt.example.net', 'proxy.example.com', 'www.proxy.example.com']);
    const p = new HostPolicy(cfg);
    assert.throws(() => p.validateUrl('https://proxy.example.com/'), PolicyError);
  } finally {
    delete process.env.COOLIFY_FQDN;
    delete process.env.PUBLIC_HOSTNAMES;
  }
});
