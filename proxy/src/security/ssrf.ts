/**
 * SSRF protection: destination URL validation, host policy and DNS pinning.
 *
 * SECURITY MODEL
 * --------------
 * 1. Only http/https (and ws/wss for WebSockets) URLs are accepted. The URL is
 *    parsed with the WHATWG parser, and every later decision is made on the
 *    *parsed* object, never on the raw string. That rules out parser-differential
 *    tricks such as `http://evil@127.0.0.1`, `http://127.1`, `http://0x7f000001`,
 *    `http://[::ffff:127.0.0.1]` or backslash confusion, since the WHATWG parser
 *    canonicalises all of those before we look at them.
 * 2. Embedded credentials are rejected outright.
 * 3. The port must be in the configured allowlist (80/443 by default), so the
 *    proxy can't be used to talk to SMTP, Redis, etc. on public hosts.
 * 4. Host names are checked against the allow/block lists and a set of
 *    reserved suffixes (localhost, .local, .internal, single-label names...).
 * 5. The name is resolved ONCE. EVERY returned address must be a public
 *    unicast address; if any is private, loopback, link-local, CGNAT,
 *    multicast, reserved, IPv4-mapped/NAT64/6to4/Teredo, the request is refused.
 * 6. The validated address is then *pinned*: the outgoing socket connects to
 *    exactly that IP through a custom `lookup` function, so a second DNS answer
 *    can't swap in an internal address between check and use (DNS rebinding).
 *    TLS still verifies the certificate against the original host name.
 * 7. Redirects are never followed server-side. Each hop goes back to the
 *    browser and re-enters this pipeline as a fresh request.
 */
import dns from 'node:dns';
import net from 'node:net';
import ipaddr from 'ipaddr.js';
import type { Config } from '../config.js';

export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly status: number = 403,
    public readonly code: string = 'blocked',
  ) {
    super(message);
    this.name = 'PolicyError';
  }
}

/** Host suffixes that are never public, regardless of what DNS says. */
const RESERVED_SUFFIXES = [
  'localhost',
  'local',
  'internal',
  'intranet',
  'lan',
  'home',
  'corp',
  'private',
  'localdomain',
  'home.arpa',
  'test',
  'invalid',
  'example',
  'onion',
];

/** Well-known cloud metadata names; also covered by the IP checks, but belt-and-braces. */
const RESERVED_NAMES = new Set(['metadata', 'metadata.google.internal', 'instance-data', 'instance-data.ec2.internal']);

type Cidr = [ipaddr.IPv4 | ipaddr.IPv6, number];

export class HostPolicy {
  private readonly allowed: string[];
  private readonly blocked: string[];
  private readonly extraCidrs: Cidr[];
  private readonly allowedPorts: Set<number>;

  constructor(cfg: Pick<Config, 'allowedHosts' | 'blockedHosts' | 'blockedCidrs' | 'allowedPorts' | 'publicHosts'>) {
    this.allowed = cfg.allowedHosts.map(normalizePattern);
    // The proxy's own public names are always blocked to prevent request loops.
    this.blocked = [...cfg.blockedHosts, ...cfg.publicHosts].map(normalizePattern);
    this.extraCidrs = cfg.blockedCidrs.map((c) => {
      try {
        return ipaddr.parseCIDR(c);
      } catch {
        throw new Error(`Invalid CIDR in BLOCKED_CIDRS: ${c}`);
      }
    });
    this.allowedPorts = new Set(cfg.allowedPorts);
  }

  /**
   * Parse and validate a destination URL. Returns a canonical URL object.
   * Throws PolicyError if the URL is malformed or not permitted by policy.
   * This does NOT touch DNS; call `resolveAndPin` before connecting.
   */
  validateUrl(input: string, opts: { websocket?: boolean } = {}): URL {
    if (input.length > 8192) throw new PolicyError('URL is too long.', 414, 'url_too_long');
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new PolicyError('That address is not a valid URL.', 400, 'invalid_url');
    }
    const allowedSchemes = opts.websocket ? ['ws:', 'wss:'] : ['http:', 'https:'];
    if (!allowedSchemes.includes(url.protocol)) {
      throw new PolicyError(`The ${url.protocol.replace(':', '')} scheme is not supported.`, 400, 'bad_scheme');
    }
    if (url.username || url.password) {
      throw new PolicyError('URLs containing credentials are not allowed.', 400, 'credentials');
    }
    const host = normalizeHost(url.hostname);
    if (!host) throw new PolicyError('The URL has no host.', 400, 'invalid_url');

    const port = effectivePort(url);
    if (this.allowedPorts.size > 0 && !this.allowedPorts.has(port)) {
      throw new PolicyError(`Port ${port} is not permitted.`, 403, 'port_blocked');
    }

    this.checkHostName(host);

    // IP literals are checked immediately (DNS resolution of a literal is itself).
    const literal = parseIpLiteral(host);
    if (literal) this.assertPublicIp(literal, host);

    return url;
  }

  private checkHostName(host: string): void {
    if (this.allowed.length > 0 && !this.allowed.some((p) => matchHost(p, host))) {
      throw new PolicyError('This destination is not on the allowlist.', 403, 'not_allowlisted');
    }
    if (this.blocked.some((p) => matchHost(p, host))) {
      throw new PolicyError('This destination is blocked by the proxy operator.', 403, 'blocklisted');
    }
    if (parseIpLiteral(host)) return; // literals are handled by the IP check
    if (RESERVED_NAMES.has(host)) {
      throw new PolicyError('Internal hosts cannot be proxied.', 403, 'internal_host');
    }
    // Single-label names ("intranet", "router") only resolve via local search
    // domains and are almost always internal.
    if (!host.includes('.')) {
      throw new PolicyError('Internal hosts cannot be proxied.', 403, 'internal_host');
    }
    for (const suffix of RESERVED_SUFFIXES) {
      if (host === suffix || host.endsWith('.' + suffix)) {
        throw new PolicyError('Internal hosts cannot be proxied.', 403, 'internal_host');
      }
    }
  }

  /** Throw unless `addr` is a globally routable unicast address. */
  assertPublicIp(addr: ipaddr.IPv4 | ipaddr.IPv6, label: string): void {
    if (!this.isPublicIp(addr)) {
      throw new PolicyError(`${label} resolves to a private or reserved address.`, 403, 'private_address');
    }
  }

  isPublicIp(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
    // Unwrap IPv4-mapped IPv6 (::ffff:a.b.c.d) so it is judged as IPv4.
    let ip: ipaddr.IPv4 | ipaddr.IPv6 = addr;
    if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) {
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    }
    // ipaddr.js classifies every special-purpose block (private, loopback,
    // linkLocal, carrierGradeNat, multicast, reserved, uniqueLocal, 6to4,
    // teredo, rfc6052/NAT64, rfc6145, benchmarking, ...). Anything that isn't
    // plain 'unicast' is refused.
    if (ip.range() !== 'unicast') return false;
    if (ip.kind() === 'ipv4') {
      const v4 = ip as ipaddr.IPv4;
      // Extra IPv4 blocks not flagged by every ipaddr.js version.
      const [a, b, c] = v4.octets;
      if (a === 0) return false; // "this network"
      if (a === 192 && b === 0 && c === 0) return false; // IETF protocol assignments
      if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
      if (a >= 240) return false; // reserved + broadcast
    } else {
      const v6 = ip as ipaddr.IPv6;
      const first = v6.parts[0]!;
      // Only the global unicast block 2000::/3 is routable on the internet.
      if ((first & 0xe000) !== 0x2000) return false;
      if (first === 0x2001 && v6.parts[1]! < 0x0200) return false; // 2001::/23 IETF special
      if (first === 0x2001 && v6.parts[1] === 0x0db8) return false; // documentation
      if (first === 0x2002) return false; // 6to4 (embeds arbitrary IPv4)
      if (first === 0x0064 && v6.parts[1] === 0xff9b) return false; // NAT64
    }
    for (const cidr of this.extraCidrs) {
      if (ip.kind() === cidr[0].kind() && ip.match(cidr as [ipaddr.IPv4, number])) return false;
    }
    return true;
  }
}

export interface PinnedTarget {
  address: string;
  family: 4 | 6;
}

export type Resolver = (hostname: string) => Promise<{ address: string; family: number }[]>;

export const systemResolver: Resolver = (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true });

/**
 * Resolve `url.hostname` and return a single validated address to connect to.
 * EVERY address in the answer must be public; mixing a public and a private
 * record is a classic rebinding trick, so we refuse the whole name.
 */
export async function resolveAndPin(
  policy: HostPolicy,
  url: URL,
  resolver: Resolver,
  timeoutMs: number,
): Promise<PinnedTarget> {
  const host = normalizeHost(url.hostname);
  const literal = parseIpLiteral(host);
  if (literal) {
    policy.assertPublicIp(literal, host);
    return { address: literal.toString(), family: literal.kind() === 'ipv4' ? 4 : 6 };
  }

  let answers: { address: string; family: number }[];
  let timer: NodeJS.Timeout | undefined;
  try {
    answers = await Promise.race([
      resolver(host),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PolicyError('DNS lookup timed out.', 504, 'dns_timeout')), timeoutMs);
      }),
    ]);
  } catch (err) {
    if (err instanceof PolicyError) throw err;
    throw new PolicyError(`Could not resolve ${host}.`, 502, 'dns_failed');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!answers || answers.length === 0) {
    throw new PolicyError(`Could not resolve ${host}.`, 502, 'dns_failed');
  }
  for (const a of answers) {
    let parsed: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      parsed = ipaddr.parse(a.address);
    } catch {
      throw new PolicyError(`${host} returned an invalid address.`, 502, 'dns_failed');
    }
    policy.assertPublicIp(parsed, host);
  }
  // Prefer IPv4 for broader reachability from container networks.
  const chosen = answers.find((a) => a.family === 4) ?? answers[0]!;
  return { address: chosen.address, family: chosen.family === 6 ? 6 : 4 };
}

/**
 * A `lookup` implementation for http/https/net that ignores the requested name
 * and always returns the pre-validated, pinned address. Supports both the
 * single-result and `all: true` call styles (the latter is used by Node's
 * happy-eyeballs `autoSelectFamily`).
 */
export function pinnedLookup(target: PinnedTarget): net.LookupFunction {
  return ((_hostname: string, options: dns.LookupOptions | ((...a: unknown[]) => void), cb?: (...a: unknown[]) => void) => {
    const callback = (typeof options === 'function' ? options : cb) as (...a: unknown[]) => void;
    const opts = (typeof options === 'object' ? options : {}) as dns.LookupOptions;
    if (opts.all) callback(null, [{ address: target.address, family: target.family }]);
    else callback(null, target.address, target.family);
  }) as unknown as net.LookupFunction;
}

// ---------------------------------------------------------------------------
// helpers

export function normalizeHost(hostname: string): string {
  let h = hostname.toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  while (h.endsWith('.')) h = h.slice(0, -1);
  return h;
}

function normalizePattern(p: string): string {
  return normalizeHost(p.trim());
}

/** `*.example.com` matches example.com and any subdomain; plain names match exactly. */
export function matchHost(pattern: string, host: string): boolean {
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2);
    return host === base || host.endsWith('.' + base);
  }
  return host === pattern;
}

export function parseIpLiteral(host: string): ipaddr.IPv4 | ipaddr.IPv6 | null {
  // After WHATWG parsing, IPv4 literals are always canonical dotted-quad and
  // IPv6 literals are bracket-stripped by normalizeHost.
  if (net.isIP(host) === 0) return null;
  try {
    return ipaddr.parse(host);
  } catch {
    return null;
  }
}

export function effectivePort(url: URL): number {
  if (url.port) return Number(url.port);
  return url.protocol === 'https:' || url.protocol === 'wss:' ? 443 : 80;
}
