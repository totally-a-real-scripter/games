/**
 * Runtime configuration, read once from environment variables at startup.
 *
 * Every value has a conservative default so the app is safe to start with an
 * empty environment. Invalid values fail fast at boot rather than silently
 * falling back to something permissive.
 */
import { randomBytes } from 'node:crypto';
import { loadProviders, type AiProvider } from './ai/providers.js';
import type { AdblockConfig } from './adblock/index.js';

export interface AiConfig {
  enabled: boolean;
  /** Providers in priority order; see src/ai/providers.ts. */
  providers: AiProvider[];
  /** "priority": always try the first healthy provider. "round-robin": spread load. */
  strategy: 'priority' | 'round-robin';
  name: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  /** Max wait for a provider's first token before failing over to the next. */
  attemptTimeoutMs: number;
  maxInputChars: number;
  maxHistoryChars: number;
  requestsPerHour: number;
  maxConcurrent: number;
  /** Verify keys/models at startup via GET /models (uses no quota). */
  startupCheck: boolean;
  /** Only the most recent N messages are sent (fewer tokens per request). */
  maxHistoryMessages: number;
  /** Reuse answers to identical first questions for this long (0 = off). */
  cacheTtlMs: number;
  cacheMaxEntries: number;
}

export type IsolationMode = 'compat' | 'sandbox';
export type CookieSecureMode = 'auto' | 'true' | 'false';

export interface Config {
  host: string;
  port: number;
  /** Public hostnames this proxy is served under. Used for loop detection. */
  publicHosts: string[];

  // --- Destination policy -------------------------------------------------
  /** If non-empty, ONLY these host patterns may be proxied. */
  allowedHosts: string[];
  /** Host patterns that may never be proxied (checked after the allowlist). */
  blockedHosts: string[];
  /** Additional CIDR ranges to block on top of the built-in private ranges. */
  blockedCidrs: string[];
  /** Destination ports that may be contacted. Empty array = any port. */
  allowedPorts: number[];

  // --- Limits ------------------------------------------------------------
  connectTimeoutMs: number;
  responseTimeoutMs: number;
  idleTimeoutMs: number;
  maxResponseBytes: number;
  maxRewriteBytes: number;
  maxRequestBodyBytes: number;
  maxConcurrent: number;
  maxConcurrentPerIp: number;
  maxQueue: number;
  queueTimeoutMs: number;
  rateLimitPerMinute: number;
  rateLimitBurst: number;

  // --- Sessions / cookies --------------------------------------------------
  enableCookies: boolean;
  cookieSecure: CookieSecureMode;
  sessionTtlMs: number;
  maxSessions: number;
  sessionsPerIpPerHour: number;
  maxJarBytesPerSession: number;

  // --- WebSockets ----------------------------------------------------------
  enableWebSockets: boolean;
  maxWebSockets: number;
  maxWebSocketsPerIp: number;
  wsIdleTimeoutMs: number;
  wsMaxBytes: number;

  // --- Behaviour -----------------------------------------------------------
  isolationMode: IsolationMode;
  searchUrl: string;
  /** Number of trusted reverse-proxy hops in X-Forwarded-For. 0 = ignore XFF. */
  trustProxyHops: number;
  /** Optional single trusted header carrying the client IP (e.g. cf-connecting-ip). */
  clientIpHeader: string;
  userAgent: string;
  logRequests: boolean;

  // --- AI assistant (any OpenAI-compatible chat API) ------------------------
  ai: AiConfig;

  // --- Ad blocker ------------------------------------------------------------
  adblock: AdblockConfig;
  /** Random per-process id used to detect requests looping back through us. */
  instanceId: string;
}

function str(name: string, def: string): string {
  const v = process.env[name];
  return v === undefined || v.trim() === '' ? def : v.trim();
}

function int(name: string, def: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`Invalid ${name}=${raw}: expected integer in [${min}, ${max}]`);
  }
  return n;
}

function bool(name: string, def: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return def;
  const v = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  throw new Error(`Invalid ${name}=${raw}: expected true/false`);
}

function list(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The proxy's own public names (always blocked as destinations, to prevent
 * loops). Combines PUBLIC_HOSTNAMES with the domains Coolify injects
 * (COOLIFY_FQDN / COOLIFY_URL, comma-separated URLs), so a Coolify deployment
 * is loop-protected without extra configuration.
 */
function publicHostnames(): string[] {
  const names = new Set(list('PUBLIC_HOSTNAMES'));
  for (const v of [process.env.COOLIFY_FQDN, process.env.COOLIFY_URL]) {
    for (const item of (v ?? '').split(',')) {
      const t = item.trim();
      if (!t) continue;
      try {
        names.add(new URL(/^[a-z]+:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase());
      } catch {
        /* ignore malformed entries */
      }
    }
  }
  return [...names];
}

// Kept short on purpose: the system prompt is sent with every request.
const DEFAULT_SYSTEM_PROMPT =
  'You are {name}, the assistant in Veil, a private web browser. Be accurate and concise: ' +
  'answer in a few sentences unless asked for detail. Use Markdown when it helps. ' +
  "You can't browse the web; for current events, say so and suggest a search. If unsure, say so.";

function loadAiConfig(): AiConfig {
  const providers = loadProviders();
  const name = str('AI_NAME', 'Veil AI');
  const temperature = Number(str('AI_TEMPERATURE', '0.7'));
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) throw new Error('AI_TEMPERATURE must be between 0 and 2');
  const strategy = str('AI_STRATEGY', 'priority');
  if (strategy !== 'priority' && strategy !== 'round-robin') throw new Error('AI_STRATEGY must be priority or round-robin');
  return {
    enabled: bool('AI_ENABLED', providers.length > 0) && providers.length > 0,
    providers,
    strategy,
    name,
    systemPrompt: str('AI_SYSTEM_PROMPT', DEFAULT_SYSTEM_PROMPT).replace(/\{name\}/g, name),
    maxTokens: int('AI_MAX_TOKENS', 1024, 16, 32_768),
    temperature,
    timeoutMs: int('AI_TIMEOUT_MS', 120_000, 5_000, 600_000),
    attemptTimeoutMs: int('AI_ATTEMPT_TIMEOUT_MS', 20_000, 1_000, 300_000),
    maxInputChars: int('AI_MAX_INPUT_CHARS', 4_000, 100, 100_000),
    maxHistoryChars: int('AI_MAX_HISTORY_CHARS', 8_000, 500, 1_000_000),
    maxHistoryMessages: int('AI_MAX_HISTORY_MESSAGES', 12, 1, 200),
    requestsPerHour: int('AI_REQUESTS_PER_HOUR', 30, 1, 100_000),
    maxConcurrent: int('AI_MAX_CONCURRENT', 4, 1, 1_000),
    startupCheck: bool('AI_STARTUP_CHECK', true),
    cacheTtlMs: int('AI_CACHE_TTL_MINUTES', 1440, 0, 60 * 24 * 30) * 60_000,
    cacheMaxEntries: int('AI_CACHE_MAX_ENTRIES', 500, 0, 100_000),
  };
}

export function loadConfig(): Config {
  const isolation = str('ISOLATION_MODE', 'compat');
  if (isolation !== 'compat' && isolation !== 'sandbox') {
    throw new Error(`Invalid ISOLATION_MODE=${isolation}: expected compat or sandbox`);
  }
  const cookieSecure = str('COOKIE_SECURE', 'auto');
  if (!['auto', 'true', 'false'].includes(cookieSecure)) {
    throw new Error(`Invalid COOKIE_SECURE=${cookieSecure}: expected auto, true or false`);
  }

  const portsRaw = list('ALLOWED_PORTS');
  let allowedPorts: number[];
  if (portsRaw.length === 0) allowedPorts = [80, 443];
  else if (portsRaw.includes('*')) allowedPorts = [];
  else {
    allowedPorts = portsRaw.map((p) => {
      const n = Number(p);
      if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`Invalid port in ALLOWED_PORTS: ${p}`);
      return n;
    });
  }

  const searchUrl = str('SEARCH_URL', 'https://duckduckgo.com/html/?q=%s');
  if (!searchUrl.includes('%s') || !/^https?:\/\//i.test(searchUrl)) {
    throw new Error('SEARCH_URL must be an http(s) URL containing %s');
  }

  return {
    host: str('HOST', '0.0.0.0'),
    port: int('PORT', 43117, 1, 65535),
    publicHosts: publicHostnames(),

    allowedHosts: list('ALLOWED_HOSTS'),
    blockedHosts: list('BLOCKED_HOSTS'),
    blockedCidrs: list('BLOCKED_CIDRS'),
    allowedPorts,

    connectTimeoutMs: int('CONNECT_TIMEOUT_MS', 10_000, 500, 120_000),
    responseTimeoutMs: int('RESPONSE_TIMEOUT_MS', 25_000, 1_000, 300_000),
    idleTimeoutMs: int('IDLE_TIMEOUT_MS', 30_000, 1_000, 600_000),
    maxResponseBytes: int('MAX_RESPONSE_BYTES', 100 * 1024 * 1024, 1024, 10 * 1024 * 1024 * 1024),
    maxRewriteBytes: int('MAX_REWRITE_BYTES', 8 * 1024 * 1024, 1024, 256 * 1024 * 1024),
    maxRequestBodyBytes: int('MAX_REQUEST_BODY_BYTES', 10 * 1024 * 1024, 0, 1024 * 1024 * 1024),
    maxConcurrent: int('MAX_CONCURRENT_REQUESTS', 128, 1, 100_000),
    maxConcurrentPerIp: int('MAX_CONCURRENT_PER_IP', 24, 1, 10_000),
    maxQueue: int('MAX_QUEUE', 512, 0, 100_000),
    queueTimeoutMs: int('QUEUE_TIMEOUT_MS', 15_000, 100, 120_000),
    rateLimitPerMinute: int('RATE_LIMIT_PER_MINUTE', 600, 1, 1_000_000),
    rateLimitBurst: int('RATE_LIMIT_BURST', 200, 1, 1_000_000),

    enableCookies: bool('ENABLE_COOKIES', true),
    cookieSecure: cookieSecure as CookieSecureMode,
    sessionTtlMs: int('SESSION_TTL_MINUTES', 120, 1, 60 * 24 * 30) * 60_000,
    maxSessions: int('MAX_SESSIONS', 2_000, 1, 10_000_000),
    maxJarBytesPerSession: int('MAX_COOKIE_BYTES_PER_SESSION', 256 * 1024, 4096, 64 * 1024 * 1024),
    sessionsPerIpPerHour: int('SESSIONS_PER_IP_PER_HOUR', 60, 1, 1_000_000),

    enableWebSockets: bool('ENABLE_WEBSOCKETS', true),
    maxWebSockets: int('MAX_WEBSOCKETS', 500, 0, 100_000),
    maxWebSocketsPerIp: int('MAX_WEBSOCKETS_PER_IP', 16, 0, 10_000),
    wsIdleTimeoutMs: int('WS_IDLE_TIMEOUT_MS', 120_000, 1_000, 3_600_000),
    wsMaxBytes: int('WS_MAX_BYTES', 256 * 1024 * 1024, 1024, 100 * 1024 * 1024 * 1024),

    isolationMode: isolation,
    searchUrl,
    trustProxyHops: int('TRUST_PROXY_HOPS', 0, 0, 10),
    clientIpHeader: str('CLIENT_IP_HEADER', '').toLowerCase(),
    userAgent: str(
      'UPSTREAM_USER_AGENT',
      '',
    ),
    logRequests: bool('LOG_REQUESTS', false),
    ai: loadAiConfig(),
    adblock: {
      enabled: bool('ADBLOCK_ENABLED', true),
      defaultOn: bool('ADBLOCK_DEFAULT_ON', true),
      // Extra downloadable lists (hosts files, domain lists or "||domain^" lists). "none" = built-in list only.
      lists: (() => {
        const raw = str('ADBLOCK_LISTS', 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts');
        if (raw.toLowerCase() === 'none') return [];
        const urls = raw.split(/[,\s]+/).filter(Boolean);
        for (const u of urls) if (!/^https:\/\//i.test(u)) throw new Error(`ADBLOCK_LISTS entries must be https URLs: ${u}`);
        return urls;
      })(),
      allow: list('ADBLOCK_ALLOW'),
      block: list('ADBLOCK_BLOCK'),
      refreshHours: int('ADBLOCK_REFRESH_HOURS', 24, 1, 24 * 30),
    },
    instanceId: randomBytes(8).toString('hex'),
  };
}
