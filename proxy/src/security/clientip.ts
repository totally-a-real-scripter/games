/**
 * Client IP extraction for rate limiting.
 *
 * Forwarding headers are trivially spoofable, so they are only honoured when
 * the operator has explicitly said a trusted reverse proxy sits in front:
 *  - CLIENT_IP_HEADER (e.g. `cf-connecting-ip`, `x-real-ip`) - a single header
 *    set by the edge that the client cannot influence.
 *  - TRUST_PROXY_HOPS=N - take the Nth address from the right of
 *    X-Forwarded-For, i.e. the one appended by the outermost trusted proxy.
 * Otherwise the TCP peer address is used.
 */
import type { IncomingMessage } from 'node:http';
import net from 'node:net';
import type { Config } from '../config.js';

export function clientIp(req: IncomingMessage, cfg: Pick<Config, 'clientIpHeader' | 'trustProxyHops'>): string {
  const peer = normalize(req.socket.remoteAddress ?? 'unknown');
  if (cfg.clientIpHeader) {
    const v = req.headers[cfg.clientIpHeader];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    if (s && net.isIP(s)) return normalize(s);
  }
  if (cfg.trustProxyHops > 0) {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff.join(',') : xff;
    if (raw) {
      const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
      const candidate = parts[parts.length - cfg.trustProxyHops];
      if (candidate && net.isIP(candidate)) return normalize(candidate);
    }
  }
  return peer;
}

/** Whether the original client connection used TLS (only trusted behind a proxy). */
export function isHttps(req: IncomingMessage, cfg: Pick<Config, 'trustProxyHops' | 'clientIpHeader'>): boolean {
  if ((req.socket as { encrypted?: boolean }).encrypted) return true;
  if (cfg.trustProxyHops > 0 || cfg.clientIpHeader) {
    const proto = req.headers['x-forwarded-proto'];
    const p = (Array.isArray(proto) ? proto[0] : proto)?.split(',')[0]?.trim().toLowerCase();
    if (p === 'https') return true;
    // Cloudflare
    const cfVisitor = req.headers['cf-visitor'];
    if (typeof cfVisitor === 'string' && cfVisitor.includes('"https"')) return true;
  }
  return false;
}

function normalize(ip: string): string {
  return ip.startsWith('::ffff:') && net.isIPv4(ip.slice(7)) ? ip.slice(7) : ip;
}
