/**
 * Long media downloads: a browser that stops reading because its video buffer
 * is full must not have the download cut off by the upstream idle timeout,
 * while a destination that genuinely goes silent still is.
 */
process.env.ADBLOCK_LISTS = 'none';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const SIZE = 64 * 1024 * 1024;

describe('streaming and the idle timeout', () => {
  let upstream: http.Server;
  let app: ReturnType<typeof createApp>;
  let base = '';

  before(async () => {
    upstream = http.createServer((req, res) => {
      if (req.url === '/video') {
        res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': String(SIZE) });
        const chunk = Buffer.alloc(64 * 1024, 7);
        let sent = 0;
        const pump = () => {
          while (sent < SIZE) {
            sent += chunk.length;
            if (!res.write(chunk)) return void res.once('drain', pump);
          }
          res.end();
        };
        pump();
        return;
      }
      if (req.url === '/stall') {
        res.writeHead(200, { 'content-type': 'video/mp4' });
        res.write(Buffer.alloc(1024));
        return; // never finishes
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', () => r()));
    const port = (upstream.address() as AddressInfo).port;
    app = createApp({ ...loadConfig(), idleTimeoutMs: 400 }, {
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

  function download(path: string, pauseMs: number): Promise<{ bytes: number; complete: boolean }> {
    return new Promise((resolve) => {
      http.get(base + path, { agent: false }, (res) => {
        let bytes = 0;
        res.on('data', (c: Buffer) => (bytes += c.length));
        res.pause();
        setTimeout(() => res.resume(), pauseMs);
        res.on('end', () => resolve({ bytes, complete: res.complete }));
        res.on('error', () => resolve({ bytes, complete: false }));
        res.on('close', () => resolve({ bytes, complete: res.complete }));
      }).on('error', () => resolve({ bytes: 0, complete: false }));
    });
  }

  test('a paused reader (full video buffer) keeps its download', async () => {
    const r = await download('/p/http/video.example.com/video', 1500);
    assert.equal(r.bytes, SIZE);
    assert.equal(r.complete, true);
  });

  test('a destination that goes silent is still cut off', async () => {
    const t = Date.now();
    const r = await download('/p/http/video.example.com/stall', 0);
    assert.equal(r.complete, false);
    assert.ok(Date.now() - t < 5000);
  });
});
