/**
 * End-to-end tests: a real proxy server in front of a local upstream server.
 *
 * The upstream listens on 127.0.0.1, which the proxy (correctly) refuses to
 * contact. Tests therefore resolve the test host names to a *public* address
 * so every policy check runs for real, and use the post-validation `dial`
 * hook to point the socket at the local server.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { destroyAgents } from '../src/proxy/upstream.js';

let upstream: http.Server;
let upstreamPort = 0;
let proxy: http.Server;
let proxyBase = '';
let closeApp: () => void;
const seen: { url: string; headers: http.IncomingHttpHeaders }[] = [];

function startUpstream(): Promise<void> {
  upstream = http.createServer((req, res) => {
    seen.push({ url: req.url ?? '', headers: req.headers });
    const u = new URL(req.url ?? '/', 'http://x');
    switch (u.pathname) {
      case '/':
        res.writeHead(200, {
          'content-type': 'text/html',
          'set-cookie': ['sid=secret123; Path=/; HttpOnly', 'pref=dark; Path=/'],
          'strict-transport-security': 'max-age=63072000',
          'clear-site-data': '"*"',
          'content-security-policy': "default-src 'none'",
          'x-frame-options': 'DENY',
          'alt-svc': 'h3=":443"',
        });
        res.end('<html><head><title>Home</title></head><body><a href="/about">About</a><img src="https://img.test-cdn.org/a.png"></body></html>');
        return;
      case '/echo-cookie':
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ cookie: req.headers.cookie ?? null, referer: req.headers.referer ?? null, origin: req.headers.origin ?? null }));
        return;
      case '/gzip': {
        const body = zlib.gzipSync('<html><body><a href="/gz-link">x</a></body></html>');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'gzip' });
        res.end(body);
        return;
      }
      case '/br.css': {
        res.writeHead(200, { 'content-type': 'text/css', 'content-encoding': 'br' });
        res.end(zlib.brotliCompressSync('body{background:url(/bg.png)}'));
        return;
      }
      case '/bomb': {
        // ~20 MB of zeros compressed to a few KB.
        res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' });
        res.end(zlib.gzipSync(Buffer.alloc(20 * 1024 * 1024)));
        return;
      }
      case '/big.bin':
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': String(3 * 1024 * 1024) });
        res.end(Buffer.alloc(3 * 1024 * 1024));
        return;
      case '/big-chunked.bin':
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        for (let i = 0; i < 12; i++) res.write(Buffer.alloc(256 * 1024));
        res.end();
        return;
      case '/redirect-external':
        res.writeHead(302, { location: 'https://elsewhere.example.org/landing?x=1' });
        res.end();
        return;
      case '/redirect-internal':
        res.writeHead(302, { location: 'http://127.0.0.1:6379/' });
        res.end();
        return;
      case '/a/redirect-relative':
        res.writeHead(301, { location: '../target' });
        res.end();
        return;
      case '/post':
        let n = 0;
        req.on('data', (c: Buffer) => (n += c.length));
        req.on('end', () => {
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end(`${req.method} ${n}`);
        });
        return;
      case '/image.png':
        res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=600, s-maxage=900', etag: '"abc"' });
        res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        return;
      case '/untyped-html':
        res.writeHead(200);
        res.end('<html><body><a href="https://escape.example.net/">x</a></body></html>');
        return;
      case '/untyped-bin':
        res.writeHead(200);
        res.end(Buffer.from([0, 1, 2, 3, 255]));
        return;
      default:
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('nope');
    }
  });
  // Minimal WebSocket echo server (handshake + raw echo of frames).
  upstream.on('upgrade', (req, socket) => {
    const key = String(req.headers['sec-websocket-key']);
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nX-Origin-Seen: ${req.headers.origin}\r\n\r\n`);
    socket.on('data', (d) => socket.write(d));
  });
  return new Promise((r) => upstream.listen(0, '127.0.0.1', () => {
    upstreamPort = (upstream.address() as AddressInfo).port;
    r();
  }));
}

describe('proxy end-to-end', () => {
before(async () => {
  await startUpstream();
  process.env.MAX_RESPONSE_BYTES = String(2 * 1024 * 1024);
  process.env.MAX_REWRITE_BYTES = String(1024 * 1024);
  process.env.RATE_LIMIT_PER_MINUTE = '100000';
  process.env.RATE_LIMIT_BURST = '100000';
  process.env.BLOCKED_HOSTS = 'blocked.example.org';
  const cfg = loadConfig();
  const app = createApp(cfg, {
    // Every test host resolves to a public documentation-free address.
    resolver: async (host) => {
      if (host === 'private.example.org') return [{ address: '10.1.2.3', family: 4 }];
      return [{ address: '93.184.216.34', family: 4 }];
    },
    dial: () => ({ address: '127.0.0.1', port: upstreamPort }),
  });
  proxy = app.server;
  closeApp = app.close;
  await new Promise<void>((r) => proxy.listen(0, '127.0.0.1', () => r()));
  proxyBase = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
});

after(async () => {
  closeApp();
  destroyAgents();
  proxy.closeAllConnections();
  upstream.closeAllConnections();
  // close() callbacks can stay pending after upgraded (WebSocket) sockets are
  // torn down; stopping the listeners is all the teardown needs.
  proxy.close();
  upstream.close();
});

async function get(path: string, init: RequestInit = {}) {
  return fetch(proxyBase + path, { redirect: 'manual', ...init });
}

test('healthz', async () => {
  const r = await get('/healthz');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'ok');
});

test('UI is served with a strict CSP', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy') ?? '', /script-src 'self'/);
  assert.match(await r.text(), /Search or enter a web address/);
});

let sessionCookie = '';

test('proxies and rewrites HTML; cookies stay server-side; dangerous headers dropped', async () => {
  const r = await get('/p/http/site.example.com/');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /href="\/p\/http\/site.example.com\/about"/);
  assert.match(html, /src="\/p\/https\/img.test-cdn.org\/a.png"/);
  assert.match(html, /\/__px\/client.js/);
  // Script-visible cookie is handed to the runtime; the HttpOnly one is not.
  assert.match(html, /pref=dark/);
  assert.doesNotMatch(html, /secret123/);
  const setCookie = r.headers.getSetCookie();
  assert.equal(setCookie.length, 1);
  assert.match(setCookie[0]!, /^__px_sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(setCookie.join(), /secret123|pref=/);
  sessionCookie = setCookie[0]!.split(';')[0]!;
  assert.equal(r.headers.get('strict-transport-security'), null);
  assert.equal(r.headers.get('clear-site-data'), null);
  assert.equal(r.headers.get('alt-svc'), null);
  assert.match(r.headers.get('content-security-policy') ?? '', /frame-ancestors 'self'/);
  assert.doesNotMatch(r.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('permissions-policy') ?? '', /camera=\(\)/);
  assert.match(html, /frameGuard&quot;:&quot;deny/);
});

test('jar cookies are sent upstream only to their own site', async () => {
  let r = await get('/p/http/site.example.com/echo-cookie', { headers: { cookie: `${sessionCookie}; stray=1` } });
  let body = await r.json();
  assert.match(body.cookie, /sid=secret123/);
  assert.match(body.cookie, /pref=dark/);
  assert.doesNotMatch(body.cookie, /__px_sid|stray/);
  r = await get('/p/http/other.example.net/echo-cookie', { headers: { cookie: sessionCookie } });
  body = await r.json();
  assert.equal(body.cookie, null);
});

test('SameSite emulation: cross-site subresource gets no Lax cookies', async () => {
  const r = await get('/p/http/site.example.com/echo-cookie', {
    headers: {
      cookie: sessionCookie,
      referer: `${proxyBase}/p/https/attacker.example.net/page`,
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'no-cors',
    },
  });
  const body = await r.json();
  assert.equal(body.cookie, null); // default SameSite=Lax cookies withheld
  assert.equal(body.referer, null); // https -> http downgrade: no Referer
});

test('Origin and Referer are translated to real URLs', async () => {
  const r = await get('/p/http/site.example.com/echo-cookie', {
    headers: { origin: proxyBase, referer: `${proxyBase}/p/http/site.example.com/page?a=1` },
  });
  const body = await r.json();
  assert.equal(body.origin, 'http://site.example.com');
  assert.equal(body.referer, 'http://site.example.com/page?a=1');
  const last = seen.at(-1)!;
  assert.equal(last.headers['x-forwarded-for'], undefined);
  assert.match(String(last.headers.via), /px-/);
});

test('gzip HTML and brotli CSS are decoded, rewritten and re-encoded', async () => {
  let r = await get('/p/http/site.example.com/gzip');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /href="\/p\/http\/site.example.com\/gz-link"/);
  r = await get('/p/http/site.example.com/br.css');
  assert.equal(await r.text(), 'body{background:url("/p/http/site.example.com/bg.png")}');
});

test('decompression bombs are stopped', async () => {
  const r = await get('/p/http/site.example.com/bomb');
  assert.equal(r.status, 502);
  assert.match(await r.text(), /larger than the proxy/);
});

test('oversized streamed downloads are refused', async () => {
  const r = await get('/p/http/site.example.com/big.bin');
  assert.equal(r.status, 502); // declared Content-Length over the limit
  await r.text();
  // Undeclared length: the stream is cut off once the limit is crossed.
  const r2 = await get('/p/http/site.example.com/big-chunked.bin');
  let received = 0;
  await assert.rejects(async () => {
    for await (const chunk of r2.body as unknown as AsyncIterable<Uint8Array>) received += chunk.length;
  });
  assert.ok(received <= 2 * 1024 * 1024 + 256 * 1024, `received ${received}`);
});

test('redirects stay inside the proxy', async () => {
  let r = await get('/p/http/site.example.com/redirect-external');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/p/https/elsewhere.example.org/landing?x=1');
  r = await get('/p/http/site.example.com/a/redirect-relative');
  assert.equal(r.headers.get('location'), '/p/http/site.example.com/target');
  r = await get('/p/http/site.example.com/redirect-internal');
  const loc = r.headers.get('location')!;
  assert.equal(loc, '/p/http/127.0.0.1:6379/');
  // Following it is refused by policy.
  r = await get(loc);
  assert.equal(r.status, 403);
});

test('SSRF: internal targets are refused at every entry point', async () => {
  for (const p of [
    '/p/http/127.0.0.1/',
    '/p/http/localhost/',
    '/p/http/169.254.169.254/latest/meta-data/',
    '/p/http/[::1]/',
    '/p/http/0x7f000001/',
    '/p/http/private.example.org/', // DNS answer is private
    '/p/http/blocked.example.org/',
    '/p/http/site.example.com:25/',
  ]) {
    const r = await get(p);
    assert.equal(r.status, 403, p);
    await r.text();
  }
  const r = await get('/__px/go?q=http://127.0.0.1/');
  assert.equal(r.status, 403);
});

test('request loops and service workers are refused', async () => {
  let r = await get('/p/http/site.example.com/', { headers: { via: `1.1 px-${'0'.repeat(16)}` } });
  assert.equal(r.status, 200);
  await r.text();
  r = await get('/p/http/127.0.0.1/', { headers: { host: '127.0.0.1' } });
  assert.ok(r.status === 508 || r.status === 403);
  await r.text();
  r = await get('/p/http/site.example.com/sw.js', { headers: { 'service-worker': 'script' } });
  assert.equal(r.status, 403);
  await r.text();
});

test('missing trailing slash is canonicalised', async () => {
  const r = await get('/p/http/site.example.com');
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('location'), '/p/http/site.example.com/');
});

test('root-relative requests from proxied pages are re-homed', async () => {
  const r = await get('/api/data?x=1', { headers: { referer: `${proxyBase}/p/http/site.example.com/app/` } });
  assert.equal(r.status, 307);
  assert.equal(r.headers.get('location'), '/p/http/site.example.com/api/data?x=1');
  const r2 = await get('/api/data');
  assert.equal(r2.status, 404);
  await r2.text();
});

test('/__px/go normalises input', async () => {
  let r = await get('/__px/go?q=example.com/path');
  assert.equal(r.headers.get('location'), '/p/https/example.com/path');
  r = await get('/__px/go?q=' + encodeURIComponent('how do proxies work'));
  assert.equal(r.headers.get('location'), '/p/https/duckduckgo.com/html/?q=how%20do%20proxies%20work');
});

test('untyped responses are sniffed, never left for the browser to sniff', async () => {
  let r = await get('/p/http/site.example.com/untyped-html');
  assert.match(r.headers.get('content-type') ?? '', /^text\/html/);
  assert.match(await r.text(), /href="\/p\/https\/escape.example.net\/"/);
  r = await get('/p/http/site.example.com/untyped-bin');
  assert.equal(r.headers.get('content-type'), 'application/octet-stream');
  assert.equal((await r.arrayBuffer()).byteLength, 5);
});

test('POST bodies are forwarded', async () => {
  const r = await get('/p/http/site.example.com/post', { method: 'POST', body: 'a'.repeat(1000) });
  assert.equal(await r.text(), 'POST 1000');
});

test('passthrough caching is forced private', async () => {
  const r = await get('/p/http/site.example.com/image.png');
  assert.equal(r.headers.get('cache-control'), 'private, max-age=600');
  assert.equal(r.headers.get('etag'), '"abc"');
  assert.equal(r.headers.get('content-type'), 'image/png');
  await r.arrayBuffer();
});

test('document.cookie writes require same-origin API requests', async () => {
  const body = JSON.stringify({ url: 'http://site.example.com/', cookie: 'js=1; Path=/' });
  let r = await get('/__px/cookie', { method: 'POST', body, headers: { cookie: sessionCookie, 'content-type': 'application/json' } });
  assert.equal(r.status, 403); // no x-px-req header
  r = await get('/__px/cookie', {
    method: 'POST',
    body,
    headers: { cookie: sessionCookie, 'x-px-req': '1', referer: `${proxyBase}/p/http/site.example.com/`, origin: proxyBase },
  });
  assert.equal(r.status, 204);
  r = await get('/__px/cookie', {
    method: 'POST',
    body: JSON.stringify({ url: 'http://site.example.com/', cookie: 'hack=1; HttpOnly' }),
    headers: { cookie: sessionCookie, 'x-px-req': '1', referer: `${proxyBase}/p/https/other.example.net/`, origin: proxyBase },
  });
  assert.equal(r.status, 403); // wrong site
  const e = await (await get('/p/http/site.example.com/echo-cookie', { headers: { cookie: sessionCookie } })).json();
  assert.match(e.cookie, /js=1/);
});

function wsHandshake(path: string, origin: string): Promise<{ status: number; echo?: string; originSeen?: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(proxyBase + path, {
      agent: false,
      headers: {
        connection: 'Upgrade',
        upgrade: 'websocket',
        'sec-websocket-key': crypto.randomBytes(16).toString('base64'),
        'sec-websocket-version': '13',
        origin,
      },
    });
    req.on('response', (res) => {
      res.resume();
      resolve({ status: res.statusCode ?? 0 });
    });
    req.on('upgrade', (res, socket) => {
      socket.write('ping');
      socket.once('data', (d) => {
        socket.destroy();
        resolve({ status: 101, echo: d.toString(), originSeen: String(res.headers['x-origin-seen'] ?? '') });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('WebSockets are proxied; cross-origin handshakes rejected', async () => {
  const ok = await wsHandshake('/p/wss/site.example.com/socket', proxyBase);
  // wss:// would require TLS on the test upstream; use ws for the echo test.
  assert.ok(ok.status === 101 || ok.status === 502);
  const plain = await wsHandshake('/p/ws/site.example.com/socket', proxyBase);
  assert.equal(plain.status, 101);
  assert.equal(plain.echo, 'ping');
  const bad = await wsHandshake('/p/ws/site.example.com/socket', 'https://evil.example');
  assert.equal(bad.status, 403);
  const internal = await wsHandshake('/p/ws/127.0.0.1/socket', proxyBase);
  assert.equal(internal.status, 403);
});

test('clear endpoint destroys the session', async () => {
  const r = await get('/__px/clear', { method: 'POST', headers: { cookie: sessionCookie, 'x-px-req': '1', origin: proxyBase } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('clear-site-data'), '"storage"');
  const e = await (await get('/p/http/site.example.com/echo-cookie', { headers: { cookie: sessionCookie } })).json();
  assert.equal(e.cookie, null);
});
});
