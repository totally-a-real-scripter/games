/**
 * Outbound HTTP(S) requests to validated, DNS-pinned destinations.
 *
 * Timeouts:
 *  - connect:  TCP (+TLS) handshake must finish within CONNECT_TIMEOUT_MS
 *  - response: response headers must arrive within RESPONSE_TIMEOUT_MS
 *  - idle:     no more than IDLE_TIMEOUT_MS between socket activity
 *
 * Node's http client ignores HTTP(S)_PROXY environment variables, so requests
 * always go directly to the pinned address.
 */
import http from 'node:http';
import https from 'node:https';
import type { Readable } from 'node:stream';
import { pinnedLookup, type PinnedTarget } from '../security/ssrf.js';

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

const agentOpts = { keepAlive: true, maxSockets: 64, maxTotalSockets: 2048, maxFreeSockets: 32, scheduling: 'lifo' as const };
const httpAgent = new http.Agent(agentOpts);
const httpsAgent = new https.Agent({ ...agentOpts, minVersion: 'TLSv1.2' });

export interface UpstreamOptions {
  url: URL;
  pinned: PinnedTarget;
  method: string;
  headers: http.OutgoingHttpHeaders;
  body: Readable | null;
  connectTimeoutMs: number;
  responseTimeoutMs: number;
  idleTimeoutMs: number;
  /** Test hook: overrides the TCP port actually dialled. */
  portOverride?: number;
  /** Abort when the client disconnects. */
  signal?: AbortSignal;
}

export function upstreamRequest(o: UpstreamOptions): Promise<{ res: http.IncomingMessage; req: http.ClientRequest }> {
  return new Promise((resolve, reject) => {
    const isHttps = o.url.protocol === 'https:' || o.url.protocol === 'wss:';
    const hostname = o.url.hostname.replace(/^\[|\]$/g, '');
    const port = o.portOverride ?? (o.url.port ? Number(o.url.port) : isHttps ? 443 : 80);
    const mod = isHttps ? https : http;

    let settled = false;
    const fail = (err: UpstreamError) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(responseTimer);
      req.destroy();
      reject(err);
    };

    const req = mod.request({
      protocol: isHttps ? 'https:' : 'http:',
      hostname,
      port,
      path: (o.url.pathname || '/') + o.url.search,
      method: o.method,
      headers: o.headers,
      agent: isHttps ? httpsAgent : httpAgent,
      // SECURITY: connect only to the address validated in resolveAndPin().
      lookup: pinnedLookup(o.pinned),
      // TLS: SNI + certificate verification use the real host name.
      ...(isHttps ? { servername: /^[\d.]+$|:/.test(hostname) ? undefined : hostname, rejectUnauthorized: true } : {}),
      signal: o.signal,
    });

    const connectTimer = setTimeout(
      () => fail(new UpstreamError('Timed out connecting to the destination.', 504, 'connect_timeout')),
      o.connectTimeoutMs,
    );
    const responseTimer = setTimeout(
      () => fail(new UpstreamError('The destination took too long to respond.', 504, 'response_timeout')),
      o.responseTimeoutMs,
    );

    req.on('socket', (sock) => {
      const connected = () => clearTimeout(connectTimer);
      // Reused keep-alive sockets are already connected.
      if (!sock.connecting && !(sock as { pending?: boolean }).pending) connected();
      sock.once(isHttps ? 'secureConnect' : 'connect', connected);
    });
    // Applies both before the response and while its body is streaming.
    req.setTimeout(o.idleTimeoutMs, () => {
      if (!settled) fail(new UpstreamError('The connection to the destination went idle.', 504, 'idle_timeout'));
      else req.destroy(new Error('idle timeout'));
    });

    req.on('response', (res) => {
      if (settled) {
        res.destroy();
        return;
      }
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(responseTimer);
      resolve({ res, req });
    });

    req.on('error', (err: NodeJS.ErrnoException) => {
      fail(mapError(err));
    });

    if (o.body) {
      o.body.on('error', () => req.destroy());
      o.body.pipe(req);
    } else {
      req.end();
    }
  });
}

function mapError(err: NodeJS.ErrnoException): UpstreamError {
  const code = err.code ?? '';
  if (err.name === 'AbortError') return new UpstreamError('Request aborted.', 499, 'aborted');
  if (code === 'ECONNREFUSED') return new UpstreamError('The destination refused the connection.', 502, 'refused');
  if (code === 'ECONNRESET' || code === 'EPIPE') return new UpstreamError('The destination reset the connection.', 502, 'reset');
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') return new UpstreamError('The destination network is unreachable.', 502, 'unreachable');
  if (code === 'ETIMEDOUT') return new UpstreamError('Timed out connecting to the destination.', 504, 'connect_timeout');
  if (code === 'HPE_HEADER_OVERFLOW') return new UpstreamError('The destination sent oversized headers.', 502, 'bad_response');
  if (code.startsWith('HPE_')) return new UpstreamError('The destination sent an invalid HTTP response.', 502, 'bad_response');
  if (code.startsWith('ERR_TLS') || code.includes('CERT') || code === 'EPROTO' || /certificate|SSL|TLS/i.test(err.message)) {
    return new UpstreamError('A secure connection to the destination could not be established (TLS/certificate error).', 502, 'tls_error');
  }
  return new UpstreamError('Could not reach the destination.', 502, 'upstream_error');
}

export function destroyAgents(): void {
  httpAgent.destroy();
  httpsAgent.destroy();
}
