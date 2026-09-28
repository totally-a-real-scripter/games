/**
 * WebSocket proxying for /p/wss/<host>/<path> (and ws://).
 *
 * The handshake is forwarded to the upstream (validated + DNS-pinned exactly
 * like HTTP), and once the upstream answers 101 the two sockets are piped
 * byte-for-byte. Frames (including permessage-deflate) are never parsed, so
 * compression is negotiated end-to-end between browser and upstream.
 *
 * Safety:
 *  - Origin must be the proxy itself (blocks cross-site WebSocket hijacking).
 *  - Global and per-IP connection caps, idle timeout and a per-connection byte cap.
 *  - Only whitelisted handshake headers are forwarded; cookies come from the jar.
 */
import http from 'node:http';
import https from 'node:https';
import type { Duplex } from 'node:stream';
import { PolicyError, pinnedLookup, resolveAndPin } from '../security/ssrf.js';
import { currentSession, proxyOrigin, siteOf, type AppContext } from './context.js';
import { firstHeader } from './headers.js';
import { realUrlFromProxyUrl, type DecodedPath } from './urlcodec.js';

export async function handleUpgrade(
  ctx: AppContext,
  req: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
  decoded: DecodedPath,
  ip: string,
): Promise<void> {
  const { cfg } = ctx;
  const reject = (status: number, msg: string) => {
    if (!socket.destroyed) {
      // end() alone only half-closes; destroy once the response is flushed so
      // rejected handshakes never leave sockets lingering.
      socket.end(`HTTP/1.1 ${status} ${msg}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`, () => socket.destroy());
    }
  };
  socket.on('error', () => socket.destroy());

  if (!cfg.enableWebSockets) return reject(403, 'Forbidden');
  if (String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket') return reject(400, 'Bad Request');

  // SECURITY: Cross-Site WebSocket Hijacking - only pages served by this proxy
  // may open proxied sockets.
  const origin = proxyOrigin(ctx, req);
  const reqOrigin = firstHeader(req.headers.origin);
  const originOk = reqOrigin === origin || (cfg.isolationMode === 'sandbox' && reqOrigin === 'null');
  if (!originOk) return reject(403, 'Forbidden');

  if (ctx.rate.take(ip) !== 0) return reject(429, 'Too Many Requests');
  const release = ctx.wsCounter.tryAcquire(ip);
  if (!release) return reject(503, 'Service Unavailable');

  let released = false;
  const done = () => {
    if (!released) {
      released = true;
      release();
    }
  };
  socket.once('close', done);

  let target: URL;
  try {
    const t = new URL(decoded.target);
    if (t.protocol === 'http:') t.protocol = 'ws:';
    if (t.protocol === 'https:') t.protocol = 'wss:';
    target = ctx.policy.validateUrl(t.href, { websocket: true });
  } catch {
    done();
    return reject(403, 'Forbidden');
  }

  let pinned;
  try {
    pinned = await resolveAndPin(ctx.policy, target, ctx.deps.resolver, cfg.connectTimeoutMs);
  } catch (err) {
    done();
    return reject(err instanceof PolicyError && err.status === 403 ? 403 : 502, 'Bad Gateway');
  }

  const dial = ctx.deps.dial?.(target);
  if (dial) pinned = { address: dial.address, family: 4 as const };
  const httpTarget = new URL(target.href);
  httpTarget.protocol = target.protocol === 'wss:' ? 'https:' : 'http:';
  const refererReal = realUrlFromProxyUrl(firstHeader(req.headers.referer), origin);
  const pageUrl = refererReal ?? httpTarget;

  const session = currentSession(ctx, req);
  const sameSite = refererReal && siteOf(refererReal) === siteOf(httpTarget) ? 'strict' : 'none';
  const cookie = session ? await ctx.sessions.cookieHeader(session, httpTarget, sameSite) : '';

  const headers: http.OutgoingHttpHeaders = {
    host: target.host,
    connection: 'Upgrade',
    upgrade: 'websocket',
    origin: pageUrl.origin,
    via: `1.1 px-${cfg.instanceId}`,
  };
  for (const h of [
    'sec-websocket-key',
    'sec-websocket-version',
    'sec-websocket-protocol',
    'sec-websocket-extensions',
    'user-agent',
    'accept-language',
    'pragma',
    'cache-control',
  ]) {
    const v = req.headers[h];
    if (v !== undefined) headers[h] = v;
  }
  if (cookie) headers.cookie = cookie;
  if (cfg.userAgent) headers['user-agent'] = cfg.userAgent;

  const isTls = target.protocol === 'wss:';
  const hostname = target.hostname.replace(/^\[|\]$/g, '');
  const upReq = (isTls ? https : http).request({
    hostname,
    port: dial?.port ?? (target.port ? Number(target.port) : isTls ? 443 : 80),
    path: target.pathname + target.search,
    method: 'GET',
    headers,
    lookup: pinnedLookup(pinned), // SECURITY: connect to the validated address only
    agent: false,
    ...(isTls ? { servername: /^[\d.]+$|:/.test(hostname) ? undefined : hostname, rejectUnauthorized: true } : {}),
  });

  const timer = setTimeout(() => upReq.destroy(new Error('timeout')), cfg.connectTimeoutMs + cfg.responseTimeoutMs);

  upReq.on('error', () => {
    clearTimeout(timer);
    done();
    reject(502, 'Bad Gateway');
  });

  upReq.on('response', (res) => {
    // Upstream refused to upgrade.
    clearTimeout(timer);
    res.resume();
    done();
    reject(res.statusCode === 403 ? 403 : 502, 'Bad Gateway');
  });

  upReq.on('upgrade', (upRes, upSocket, upHead) => {
    clearTimeout(timer);
    if (socket.destroyed) {
      upSocket.destroy();
      return;
    }
    // Relay only the handshake headers a browser needs.
    const lines = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade'];
    for (const h of ['sec-websocket-accept', 'sec-websocket-protocol', 'sec-websocket-extensions']) {
      const v = firstHeader(upRes.headers[h]);
      if (v && !/[\r\n]/.test(v)) lines.push(`${h}: ${v}`);
    }
    socket.write(lines.join('\r\n') + '\r\n\r\n');
    if (upHead.length) socket.write(upHead);
    if (head.length) upSocket.write(head);

    let bytes = 0;
    const count = (n: number) => {
      bytes += n;
      if (bytes > cfg.wsMaxBytes) {
        socket.destroy();
        upSocket.destroy();
      }
    };
    upSocket.on('data', (c: Buffer) => count(c.length));
    socket.on('data', (c: Buffer) => count(c.length));
    upSocket.setTimeout(cfg.wsIdleTimeoutMs, () => upSocket.destroy());
    (socket as import('node:net').Socket).setTimeout?.(cfg.wsIdleTimeoutMs, () => socket.destroy());

    // Server sockets allow half-open connections, so a FIN from one side would
    // otherwise leave both sockets (and a connection slot) open until the idle
    // timeout. When either side ends, end both and hard-close shortly after.
    let ending = false;
    const shutdown = () => {
      if (ending) return;
      ending = true;
      socket.end();
      upSocket.end();
      setTimeout(() => {
        socket.destroy();
        upSocket.destroy();
      }, 5_000).unref();
    };
    socket.on('end', shutdown);
    upSocket.on('end', shutdown);
    upSocket.on('error', () => socket.destroy());
    upSocket.on('close', () => socket.destroy());
    socket.on('close', () => upSocket.destroy());
    upSocket.pipe(socket);
    socket.pipe(upSocket);
  });

  upReq.end();
}
