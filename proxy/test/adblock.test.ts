import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { AdBlocker, parseList, pruneYouTube, pruneYouTubeJson, pruneYouTubeInlineScript, isYouTubeAdCarrier } from '../src/adblock/index.js';

process.env.ADBLOCK_LISTS = 'none'; // never download lists in tests
const { createApp } = await import('../src/app.js');
const { loadConfig } = await import('../src/config.js');

const cfg = { enabled: true, defaultOn: true, lists: [], allow: ['allowed.doubleclick.net'], block: ['extra-ads.example.org'], refreshHours: 24 };

test('list parsing: hosts files, plain domains, ||domain^ rules', () => {
  const text = `# comment
127.0.0.1 localhost
0.0.0.0 ads.example.com
0.0.0.0 tracker.example.net # trailing comment
plain-ads.example.io
||adserver.example.co^
||thirdparty.example.co^$third-party
! adblock comment
[Adblock Plus 2.0]
not a domain
0.0.0.0 0.0.0.0`;
  assert.deepEqual(parseList(text), ['ads.example.com', 'tracker.example.net', 'plain-ads.example.io', 'adserver.example.co', 'thirdparty.example.co']);
});

test('domain and path blocking', () => {
  const ab = new AdBlocker(cfg);
  assert.ok(ab.blocks(new URL('https://securepubads.g.doubleclick.net/tag/js/gpt.js')));
  assert.ok(ab.blocks(new URL('https://pagead2.googlesyndication.com/x.js')));
  assert.ok(ab.blocks(new URL('https://cdn.extra-ads.example.org/a.js')));
  assert.ok(!ab.blocks(new URL('https://allowed.doubleclick.net/ok')));
  assert.ok(!ab.blocks(new URL('https://example.com/ads/about')));
  assert.ok(!ab.blocks(new URL('https://net/')));
  // YouTube itself works; only its ad endpoints are blocked
  assert.ok(!ab.blocks(new URL('https://www.youtube.com/watch?v=abc')));
  assert.ok(!ab.blocks(new URL('https://rr3---sn-abc.googlevideo.com/videoplayback?x=1')));
  assert.ok(ab.blocks(new URL('https://www.youtube.com/pagead/viewthroughconversion/1')));
  assert.ok(ab.blocks(new URL('https://www.youtube.com/api/stats/ads?ver=2')));
  // The player waits on these at a mid-roll; they're pruned, never blocked.
  assert.ok(!ab.blocks(new URL('https://www.youtube.com/get_midroll_info')));
  assert.ok(!ab.blocks(new URL('https://www.youtube.com/youtubei/v1/player/ad_break?prettyPrint=false')));
  assert.ok(!ab.blocks(new URL('https://www.youtube.com/api/stats/watchtime')));
});

test('visitor toggle', () => {
  const ab = new AdBlocker(cfg);
  assert.equal(ab.activeFor(undefined), true);
  assert.equal(ab.activeFor('0'), false);
  assert.equal(ab.activeFor('1'), true);
  assert.equal(new AdBlocker({ ...cfg, enabled: false }).activeFor('1'), false);
  assert.equal(new AdBlocker({ ...cfg, defaultOn: false }).activeFor(undefined), false);
});

test('YouTube player response: ad schedule and anti-adblock popup removed, video kept', () => {
  const player = {
    videoDetails: { videoId: 'abc', title: 'Video' },
    streamingData: { formats: [{ itag: 18 }] },
    adPlacements: [{ adPlacementRenderer: {} }],
    playerAds: [{ playerLegacyDesktopWatchAdsRenderer: {} }],
    adSlots: [{ adSlotRenderer: {} }],
    auxiliaryUi: { messageRenderers: { enforcementMessageViewModel: { title: 'Ad blockers are not allowed' } } },
  };
  const out = pruneYouTubeJson(JSON.stringify(player))!;
  const data = JSON.parse(out.text);
  assert.ok(out.removed >= 4);
  assert.equal(data.adPlacements, undefined);
  assert.equal(data.playerAds, undefined);
  assert.equal(data.adSlots, undefined);
  assert.equal(data.auxiliaryUi.messageRenderers.enforcementMessageViewModel, undefined);
  assert.deepEqual(data.videoDetails, player.videoDetails);
  assert.deepEqual(data.streamingData, player.streamingData);
});

test('YouTube feed: ad items removed from lists, real items kept', () => {
  const feed = {
    contents: [
      { richItemRenderer: { content: { videoRenderer: { videoId: 'v1' } } } },
      { richItemRenderer: { content: { adSlotRenderer: { slotId: 'ad' } } } },
      { richSectionRenderer: { content: { statementBannerRenderer: {} } } },
      { compactPromotedVideoRenderer: {} },
      { richItemRenderer: { content: { videoRenderer: { videoId: 'v2' } } } },
    ],
  };
  pruneYouTube(feed);
  assert.deepEqual(feed.contents.map((c: any) => c.richItemRenderer?.content?.videoRenderer?.videoId), ['v1', 'v2']);
  assert.equal(pruneYouTubeJson('not json'), null);
});

test('YouTube embedded page data is pruned safely', () => {
  const js = `var ytInitialPlayerResponse = {"videoDetails":{"title":"a } tricky \\" string </script>"},"adPlacements":[{"x":1}],"playerAds":[1]};var meta = document.createElement('meta');`;
  const out = pruneYouTubeInlineScript(js);
  assert.doesNotMatch(out, /adPlacements|playerAds/);
  assert.doesNotMatch(out, /<\/script>/i); // "<" escaped, can't close the script tag
  assert.match(out, /;var meta = document\.createElement\('meta'\);$/);
  const parsed = JSON.parse(out.slice(out.indexOf('{'), out.indexOf('};var meta') + 1));
  assert.equal(parsed.videoDetails.title, 'a } tricky " string </script>');
  // Scripts without ad data are returned unchanged.
  assert.equal(pruneYouTubeInlineScript('var x = {"a":1};'), 'var x = {"a":1};');
  assert.ok(isYouTubeAdCarrier(new URL('https://www.youtube.com/youtubei/v1/player?prettyPrint=false')));
  // Ad-break answers are left alone: pruning them makes the player re-ask in a loop.
  assert.ok(!isYouTubeAdCarrier(new URL('https://www.youtube.com/youtubei/v1/player/ad_break')));
  assert.ok(!isYouTubeAdCarrier(new URL('https://www.youtube.com/get_midroll_info?ei=x')));
  assert.ok(!isYouTubeAdCarrier(new URL('https://www.youtube.com/youtubei/v1/log_event')));
});

describe('ad blocker through the proxy', () => {
  let upstream: http.Server;
  let app: ReturnType<typeof createApp>;
  let base = '';
  const hits: string[] = [];

  before(async () => {
    upstream = http.createServer((req, res) => {
      hits.push(`${req.headers.host}${req.url}`);
      const u = new URL(req.url ?? '/', 'http://x');
      if (u.pathname === '/youtubei/v1/player') {
        res.writeHead(200, { 'content-type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ videoDetails: { videoId: 'abc' }, adPlacements: [{ a: 1 }], playerAds: [{ b: 2 }] }));
        return;
      }
      if (u.pathname === '/youtubei/v1/player/ad_break') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ responseContext: { a: 1 }, adPlacements: [{ ad: 1 }], adBreakHeartbeatParams: 'x' }));
        return;
      }
      if (u.pathname === '/watch') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><head><script>var ytInitialPlayerResponse = {"videoDetails":{"videoId":"abc"},"adPlacements":[{"a":1}]};</script></head><body>video</body></html>');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('real content');
    });
    await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', () => r()));
    const port = (upstream.address() as AddressInfo).port;
    app = createApp(loadConfig(), {
      resolver: async () => [{ address: '93.184.216.34', family: 4 }],
      dial: () => ({ address: '127.0.0.1', port }),
    });
    await new Promise<void>((r) => app.server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  });

  after(() => {
    app.close();
    app.server.closeAllConnections();
    upstream.closeAllConnections();
    app.server.close();
    upstream.close();
  });

  const page = () => `${base}/p/http/news.example.com/article`;

  test('ad scripts and images get empty responses and never reach the network', async () => {
    const before = hits.length;
    let r = await fetch(`${base}/p/http/securepubads.g.doubleclick.net/tag/js/gpt.js`, {
      headers: { 'sec-fetch-dest': 'script', 'sec-fetch-mode': 'no-cors', referer: page() },
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-px-blocked'), 'ad');
    assert.match(r.headers.get('content-type') ?? '', /javascript/);
    assert.equal(await r.text(), '');
    r = await fetch(`${base}/p/http/ads.pubmatic.com/pixel.gif`, { headers: { 'sec-fetch-dest': 'image', referer: page() } });
    assert.equal(r.headers.get('content-type'), 'image/gif');
    await r.arrayBuffer();
    r = await fetch(`${base}/p/http/www.google-analytics.com/collect`, { method: 'POST', headers: { 'sec-fetch-dest': 'empty', referer: page() } });
    assert.equal(r.status, 204);
    assert.equal(hits.length, before);
  });

  test('turned off with the shield cookie, the request goes through', async () => {
    const r = await fetch(`${base}/p/http/securepubads.g.doubleclick.net/tag/js/gpt.js`, {
      headers: { 'sec-fetch-dest': 'script', cookie: 'px_ab=0', referer: page() },
    });
    assert.equal(await r.text(), 'real content');
  });

  // Raw HTTP: fetch() rewrites Sec-Fetch-* headers, so it can't imitate a browser navigation.
  function raw(path: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      http.get(base + path, { headers, agent: false }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      }).on('error', reject);
    });
  }

  test('typing an ad domain yourself is allowed; clicking an ad link explains the block', async () => {
    let r = await raw('/p/http/www.taboola.com/', { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe' });
    assert.equal(r.body, 'real content');
    r = await raw('/p/http/www.taboola.com/', { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe', 'sec-fetch-user': '?1', referer: page() });
    assert.equal(r.status, 403);
    assert.match(r.body, /Blocked by the ad blocker/);
    // An ad iframe a page loads on its own gets an empty frame.
    r = await raw('/p/http/www.taboola.com/widget', { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe', referer: page() });
    assert.equal(r.body, '<!doctype html><title></title>');
  });

  test('YouTube: ads removed from API responses and page data; ad endpoints blocked', async () => {
    let r = await fetch(`${base}/p/http/www.youtube.com/youtubei/v1/player?prettyPrint=false`, {
      method: 'POST', body: '{}', headers: { 'content-type': 'application/json' },
    });
    const player = await r.json();
    assert.deepEqual(player, { videoDetails: { videoId: 'abc' } });
    r = await fetch(`${base}/p/http/www.youtube.com/watch?v=abc`);
    const html = await r.text();
    assert.doesNotMatch(html, /adPlacements/);
    assert.match(html, /"videoId":"abc"/);
    assert.match(html, /&quot;adblock&quot;:true/); // runtime gets the flag for cosmetic hiding + skipper
    r = await fetch(`${base}/p/http/www.youtube.com/api/stats/ads?ver=2`, { headers: { 'sec-fetch-dest': 'empty', referer: `${base}/p/http/www.youtube.com/watch?v=abc` } });
    assert.equal(r.status, 204);
    // Ad break: passed through untouched (neither blocked nor pruned).
    r = await fetch(`${base}/p/http/www.youtube.com/youtubei/v1/player/ad_break?prettyPrint=false`, {
      method: 'POST', body: '{}', headers: { 'content-type': 'application/json', 'sec-fetch-dest': 'empty', referer: `${base}/p/http/www.youtube.com/watch?v=abc` },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { responseContext: { a: 1 }, adPlacements: [{ ad: 1 }], adBreakHeartbeatParams: 'x' });
    // Shield off: YouTube data is left untouched.
    r = await fetch(`${base}/p/http/www.youtube.com/youtubei/v1/player`, { method: 'POST', body: '{}', headers: { cookie: 'px_ab=0' } });
    assert.ok((await r.json()).adPlacements);
  });

  test('status endpoint', async () => {
    const s = await (await fetch(`${base}/__px/adblock/status`)).json();
    assert.equal(s.available, true);
    assert.equal(s.on, true);
    assert.ok(s.domains > 100);
    const off = await (await fetch(`${base}/__px/adblock/status`, { headers: { cookie: 'px_ab=0' } })).json();
    assert.equal(off.on, false);
  });
});
