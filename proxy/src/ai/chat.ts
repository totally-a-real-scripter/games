/**
 * AI chat assistant backend with multi-provider failover.
 *
 * Providers (Groq, Cerebras, Gemini, Mistral, OpenRouter, Ollama, or any
 * OpenAI-compatible API; see providers.ts) are tried in order. If one is
 * rate-limited, out of free quota, misconfigured, erroring, or slow to start
 * answering, the request moves on to the next one immediately, and the failed
 * provider "rests" for a cooldown (honouring Retry-After / rate-limit reset
 * headers where given) so later requests skip it until it has recovered.
 *
 *   GET  /__px/ai/status  -> { enabled, name, model, providers: [{ name, model, available }] }
 *   POST /__px/ai/chat    -> body { messages: [{ role, content }] }
 *                            response: NDJSON stream: {"p":"Groq"} (who is answering),
 *                            {"t":"text"} chunks, then {"done":true} or {"error":"..."}
 *
 * SECURITY
 *  - Upstream URLs and API keys come only from server configuration; the
 *    browser can't choose where requests go (so this is not an SSRF vector) and
 *    never sees a key.
 *  - Same-origin + custom-header CSRF guard, per-client hourly quota, global
 *    and per-client concurrency caps, input/history size limits, timeouts and a
 *    cap on the size of the streamed answer.
 *  - Only "user"/"assistant" messages are accepted; the system prompt is fixed
 *    server-side. Upstream error bodies are never relayed (they can contain
 *    account details); users get a generic message and operators get a log line.
 */
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AiConfig } from '../config.js';
import { extrasFor, type AiProvider } from './providers.js';
import { ConnectionCounter, RateLimiter } from '../security/limits.js';
import { log } from '../util/log.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_BODY = 256 * 1024;
const MAX_MESSAGES = 60;
/** Hard ceiling on streamed output, independent of the model's token limit. */
const MAX_OUTPUT_CHARS = 200_000;
const MIN = 60_000;

type Attempt =
  | { kind: 'ok' }
  | { kind: 'fail'; cooldownMs: number; reason: string }
  | { kind: 'partial' } // failed after text was already sent
  | { kind: 'aborted' };

/**
 * Answers to identical *first* questions (no prior conversation) are reused
 * for a while, so popular questions and the suggestion buttons cost one API
 * call instead of one per visitor. Follow-ups are never cached because their
 * meaning depends on the conversation. Bounded LRU, in memory only.
 */
export class AnswerCache {
  private readonly map = new Map<string, { text: string; provider: string; model: string; at: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly max: number,
  ) {}

  static key(messages: ChatMessage[], systemPrompt: string): string | null {
    if (messages.length !== 1 || messages[0]!.role !== 'user') return null;
    const q = messages[0]!.content.toLowerCase().replace(/\s+/g, ' ').replace(/[\s?!.]+$/, '').trim();
    if (q.length < 2 || q.length > 500) return null;
    return createHash('sha256').update(systemPrompt).update('\0').update(q).digest('hex');
  }

  get(key: string | null) {
    if (!key || this.ttlMs <= 0) return undefined;
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, hit); // LRU refresh
    return hit;
  }

  set(key: string | null, text: string, provider: string, model: string): void {
    if (!key || this.ttlMs <= 0 || this.max <= 0 || !text || text.length > 20_000) return;
    this.map.delete(key);
    this.map.set(key, { text, provider, model, at: Date.now() });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get size(): number {
    return this.map.size;
  }
}

/** Per-provider health: cooldown deadline and consecutive rate-limit strikes. */
class Health {
  private readonly until = new Map<string, number>();
  private readonly strikes = new Map<string, number>();

  available(id: string, now = Date.now()): boolean {
    return (this.until.get(id) ?? 0) <= now;
  }
  remainingMs(id: string, now = Date.now()): number {
    return Math.max(0, (this.until.get(id) ?? 0) - now);
  }
  private readonly issue = new Map<string, string>();

  penalize(id: string, ms: number, reason?: string): void {
    if (reason) this.issue.set(id, reason);
    if (ms <= 0) return;
    this.until.set(id, Math.max(this.until.get(id) ?? 0, Date.now() + ms));
  }
  /** Why the provider last failed (null once it has succeeded since). */
  lastIssue(id: string): string | null {
    return this.issue.get(id) ?? null;
  }
  /** Rate-limit strike: back off 1, 2, 4 ... up to 60 minutes when no reset time is given. */
  strike(id: string): number {
    const n = (this.strikes.get(id) ?? 0) + 1;
    this.strikes.set(id, n);
    return Math.min(60 * MIN, MIN * 2 ** (n - 1));
  }
  success(id: string): void {
    this.strikes.delete(id);
    this.until.delete(id);
    this.issue.delete(id);
  }
}

export class AiService {
  private readonly quota: RateLimiter;
  private readonly slots: ConnectionCounter;
  private readonly health = new Health();
  private readonly cache: AnswerCache;
  /** Upstream chat calls made (exposed for tests / monitoring). */
  apiCalls = 0;
  /** Runtime model per provider (the startup check may swap in an available one). */
  private readonly models = new Map<string, string>();
  /** Providers whose optional request tweaks were rejected; sent without them. */
  private readonly noExtras = new Set<string>();
  private rr = 0;
  /** Resolves when the startup check has finished (tests await it). */
  readonly ready: Promise<void>;

  constructor(private readonly cfg: AiConfig) {
    // Bucket refills continuously to AI_REQUESTS_PER_HOUR per client.
    this.quota = new RateLimiter(cfg.requestsPerHour / 60, cfg.requestsPerHour);
    this.slots = new ConnectionCounter(cfg.maxConcurrent, 1);
    this.cache = new AnswerCache(cfg.cacheTtlMs, cfg.cacheMaxEntries);
    this.ready = cfg.enabled && cfg.startupCheck ? this.checkProviders().catch(() => {}) : Promise.resolve();
  }

  private modelOf(p: AiProvider): string {
    return this.models.get(p.id) ?? p.model;
  }

  private extrasOf(p: AiProvider): Record<string, unknown> {
    if (this.noExtras.has(p.id)) return {};
    return p.presetId ? extrasFor(p.presetId, this.modelOf(p)) : p.extraBody;
  }

  /**
   * Verify every provider at startup WITHOUT spending free quota: list the
   * account's models (GET /models). This catches wrong keys, retired model
   * names and blocked network egress, logs a clear line per provider, and
   * swaps in an available free model when a default has been retired.
   */
  async checkProviders(): Promise<void> {
    await Promise.all(
      this.cfg.providers.map(async (p) => {
        const result = await this.checkOne(p);
        const line = { provider: p.id, model: this.modelOf(p), ...result };
        if (result.ok) log.info('ai provider ready', line);
        else log.warn('ai provider problem', line);
      }),
    );
  }

  private async checkOne(p: AiProvider): Promise<{ ok: boolean; issue?: string; hint?: string }> {
    let res: Response;
    try {
      res = await fetch(`${p.baseUrl}/models`, {
        headers: { ...p.extraHeaders, ...(p.apiKey ? { authorization: `Bearer ${p.apiKey}` } : {}) },
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
    } catch (err) {
      const msg = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err);
      this.health.penalize(p.id, 0, 'unreachable');
      return { ok: false, issue: 'unreachable', hint: `The server could not connect to ${new URL(p.baseUrl).host} (${msg}). Check the server's outbound internet access/DNS.` };
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel().catch(() => {});
      // A bad key won't fix itself until the settings change (redeploy).
      this.health.penalize(p.id, 24 * 60 * MIN, 'key rejected');
      return { ok: false, issue: 'key rejected', hint: 'The API key was rejected. Re-copy it (no quotes or spaces) into the environment variable and redeploy.' };
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return { ok: true, hint: `Could not list models (HTTP ${res.status}); will find out on first use.` };
    }
    let ids: string[] = [];
    try {
      const json = (await res.json()) as { data?: { id?: unknown }[]; models?: { name?: unknown }[] };
      const list = json.data ?? json.models ?? [];
      ids = list
        .map((m) => String((m as { id?: unknown }).id ?? (m as { name?: unknown }).name ?? ''))
        .map((id) => id.replace(/^models\//, ''))
        .filter(Boolean);
    } catch {
      return { ok: true, hint: 'Model list was unreadable; will find out on first use.' };
    }
    if (ids.length === 0) return { ok: true };
    const model = this.modelOf(p);
    const has = (m: string) => ids.includes(m) || ids.includes(m.replace(/:latest$/, ''));
    if (has(model) || (p.id === 'ollama' && ids.some((i) => i.startsWith(model.split(':')[0]! + ':')))) return { ok: true };

    const sample = ids.filter((i) => !p.presetId || p.presetId !== 'openrouter' || i.endsWith(':free')).slice(0, 12).join(', ');
    if (!p.explicitModel) {
      const pick = p.preferred.map((m) => (m === '*:free' ? ids.find((i) => i.endsWith(':free')) : has(m) ? m : undefined)).find(Boolean);
      if (pick) {
        this.models.set(p.id, pick);
        return { ok: true, hint: `Default model "${model}" isn't offered anymore; using "${pick}" instead.` };
      }
    }
    this.health.penalize(p.id, 24 * 60 * MIN, 'model not found');
    const fix = p.id === 'ollama' ? `Run "ollama pull ${model}" on the Ollama server.` : `Set a model your account has, e.g. one of: ${sample}`;
    return { ok: false, issue: 'model not found', hint: `Model "${model}" isn't available. ${fix}` };
  }

  status(): {
    enabled: boolean;
    name: string;
    model: string;
    providers: { name: string; model: string; available: boolean; issue: string | null }[];
  } {
    const ps = this.cfg.enabled ? this.cfg.providers : [];
    const model =
      ps.length === 0 ? '' : ps.length === 1 ? `${ps[0]!.name} · ${ps[0]!.model}` : `Auto · ${ps.length} providers`;
    return {
      enabled: this.cfg.enabled,
      name: this.cfg.name,
      model,
      providers: ps.map((p) => ({
        name: p.name,
        model: this.modelOf(p),
        available: this.health.available(p.id),
        issue: this.health.lastIssue(p.id),
      })),
    };
  }

  stop(): void {
    this.quota.stop();
  }

  /** Providers to try for this request, healthy ones first in strategy order. */
  private plan(): AiProvider[] {
    let list = this.cfg.providers.slice();
    if (this.cfg.strategy === 'round-robin' && list.length > 1) {
      const k = this.rr++ % list.length;
      list = [...list.slice(k), ...list.slice(0, k)];
    }
    const now = Date.now();
    const healthy = list.filter((p) => this.health.available(p.id, now));
    if (healthy.length > 0) return healthy;
    // Everyone is resting: try the one that recovers soonest if that's imminent.
    const soonest = list.sort((a, b) => this.health.remainingMs(a.id, now) - this.health.remainingMs(b.id, now))[0];
    return soonest && this.health.remainingMs(soonest.id, now) < 15_000 ? [soonest] : [];
  }

  async handleChat(req: IncomingMessage, res: ServerResponse, clientKey: string): Promise<void> {
    if (!this.cfg.enabled) return sendJson(res, 404, { error: 'The AI assistant is not configured on this server.' });

    let messages: ChatMessage[];
    try {
      messages = validateMessages(await readJson(req), this.cfg);
    } catch (err) {
      return sendJson(res, 400, { error: err instanceof Error ? err.message : 'Invalid request.' });
    }

    // Saved answer: no API call, and it doesn't count against the visitor's quota.
    const cacheKey = AnswerCache.key(messages, this.cfg.systemPrompt);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.write(JSON.stringify({ p: cached.provider, m: cached.model, cached: true }) + '\n');
      res.write(JSON.stringify({ t: cached.text }) + '\n');
      res.end(JSON.stringify({ done: true }) + '\n');
      return;
    }

    const wait = this.quota.take(clientKey);
    if (wait > 0) {
      res.setHeader('retry-after', String(wait));
      return sendJson(res, 429, { error: `You've reached the AI message limit. Try again in about ${formatWait(wait)}.` });
    }

    const release = this.slots.tryAcquire(clientKey);
    if (!release) return sendJson(res, 429, { error: 'Please wait for the current answer to finish.' });

    const overall = new AbortController();
    const timer = setTimeout(() => overall.abort(new Error('timeout')), this.cfg.timeoutMs);
    res.on('close', () => {
      if (!res.writableFinished) overall.abort(new Error('client closed'));
    });

    res.writeHead(200, {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-accel-buffering': 'no', // don't let Nginx buffer the stream
    });
    const emit = (obj: unknown) => {
      if (!res.writableEnded) res.write(JSON.stringify(obj) + '\n');
    };

    try {
      const plan = this.plan();
      if (plan.length === 0) {
        const soonest = Math.min(...this.cfg.providers.map((p) => this.health.remainingMs(p.id)));
        const issues = this.cfg.providers.map((p) => ({ name: p.name, reason: this.health.lastIssue(p.id) ?? 'resting' }));
        emit({ error: failureMessage(issues, Math.ceil(soonest / 1000)) });
        return;
      }
      const tried: { name: string; reason: string }[] = [];
      for (const provider of plan) {
        if (overall.signal.aborted) break;
        let text = '';
        const capture = (o: unknown) => {
          const t = (o as { t?: unknown }).t;
          if (typeof t === 'string') text += t;
          emit(o);
        };
        const r = await this.attempt(provider, messages, overall.signal, capture);
        if (r.kind === 'ok') {
          this.health.success(provider.id);
          this.cache.set(cacheKey, text, provider.name, this.modelOf(provider));
          emit({ done: true });
          return;
        }
        if (r.kind === 'aborted' || r.kind === 'partial') {
          if (r.kind === 'partial') this.health.penalize(provider.id, 30_000);
          break;
        }
        this.health.penalize(provider.id, r.cooldownMs, category(r.reason));
        tried.push({ name: provider.name, reason: category(r.reason) });
        log.warn('ai provider failed, trying next', {
          provider: provider.id,
          reason: r.reason,
          restSeconds: Math.round(r.cooldownMs / 1000),
        });
      }
      if (overall.signal.aborted) {
        if (!res.destroyed && String(overall.signal.reason ?? '').includes('timeout')) {
          emit({ error: 'The AI took too long to answer. Please try again.' });
        }
        return;
      }
      if (tried.length) emit({ error: failureMessage(tried) });
    } finally {
      clearTimeout(timer);
      release();
      res.end();
    }
  }

  /** One provider attempt. Text is streamed to the client as soon as it arrives. */
  private async attempt(
    p: AiProvider,
    messages: ChatMessage[],
    overall: AbortSignal,
    emit: (o: unknown) => void,
  ): Promise<Attempt> {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort(overall.reason);
    overall.addEventListener('abort', onAbort, { once: true });
    // Fail over if the provider doesn't start answering in time.
    let started = false;
    const firstToken = setTimeout(() => {
      if (!started) ctrl.abort(new Error('slow'));
    }, this.cfg.attemptTimeoutMs);

    try {
      this.apiCalls++;
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          ...p.extraHeaders,
          ...(p.apiKey ? { authorization: `Bearer ${p.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.modelOf(p),
          stream: true,
          max_tokens: this.cfg.maxTokens,
          temperature: this.cfg.temperature,
          messages: [{ role: 'system', content: this.cfg.systemPrompt }, ...messages],
          ...this.extrasOf(p),
        }),
        signal: ctrl.signal,
        redirect: 'error',
      });

      if (!res.ok || !res.body) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        log.warn('ai provider error response', { provider: p.id, status: res.status, detail });
        // Some models reject our optional tweaks (e.g. reasoning_effort):
        // retry right away without them, and remember that.
        if ((res.status === 400 || res.status === 422) && Object.keys(this.extrasOf(p)).length > 0 && !this.noExtras.has(p.id)) {
          this.noExtras.add(p.id);
          clearTimeout(firstToken);
          overall.removeEventListener('abort', onAbort);
          return this.attempt(p, messages, overall, emit);
        }
        return { kind: 'fail', ...classify(res.status, res.headers, detail, this.health, p.id) };
      }

      let produced = 0;
      for await (const delta of streamDeltas(res.body)) {
        if (!started) {
          started = true;
          clearTimeout(firstToken);
          emit({ p: p.name, m: this.modelOf(p) });
        }
        produced += delta.length;
        if (produced > MAX_OUTPUT_CHARS) {
          emit({ error: 'The answer was too long and was cut off.' });
          ctrl.abort();
          return { kind: 'partial' };
        }
        emit({ t: delta });
      }
      if (!started) return { kind: 'fail', cooldownMs: 0, reason: 'empty answer' };
      return { kind: 'ok' };
    } catch (err) {
      if (overall.aborted) return { kind: 'aborted' };
      if (started) {
        log.warn('ai stream interrupted', { provider: p.id, err: err instanceof Error ? err.message : String(err) });
        emit({ error: 'The answer was interrupted. Ask again to continue.' });
        return { kind: 'partial' };
      }
      const slow = String(ctrl.signal.reason ?? '').includes('slow');
      log.warn('ai provider request failed', { provider: p.id, err: err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err) });
      return {
        kind: 'fail',
        cooldownMs: slow ? 2 * MIN : 30_000,
        reason: slow ? 'no response in time' : `network: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      clearTimeout(firstToken);
      overall.removeEventListener('abort', onAbort);
    }
  }
}

/** Decide how long a failed provider should rest, from its HTTP status and headers. */
export function classify(
  status: number,
  headers: Headers,
  detail: string,
  health: { strike(id: string): number },
  id: string,
): { cooldownMs: number; reason: string } {
  const body = detail.toLowerCase();
  if (status === 429) {
    const reset = resetMs(headers);
    // "per day" / quota exhaustion messages: rest much longer.
    const daily = /per day|daily|quota|exhausted|rpd|tpd/.test(body);
    const fallback = health.strike(id);
    return { cooldownMs: reset ?? (daily ? Math.max(fallback, 60 * MIN) : fallback), reason: `rate limited (${status})` };
  }
  if (status === 402) return { cooldownMs: 60 * MIN, reason: 'out of credits (402)' };
  if (status === 401 || status === 403) return { cooldownMs: 30 * MIN, reason: `key rejected (${status})` };
  if (status === 404) return { cooldownMs: 30 * MIN, reason: 'model not found (404)' };
  if (status === 413) return { cooldownMs: 0, reason: 'request too large (413)' };
  if (status === 400 || status === 422) return { cooldownMs: 2 * MIN, reason: `rejected request (${status})` };
  if (status === 408 || status >= 500) return { cooldownMs: 30_000, reason: `server error (${status})` };
  return { cooldownMs: MIN, reason: `unexpected status (${status})` };
}

/**
 * Parse a reset time from Retry-After or common rate-limit headers
 * (x-ratelimit-reset-requests / -tokens: "2m59.56s", "7.66s", "120").
 */
export function resetMs(headers: Headers): number | undefined {
  const ra = headers.get('retry-after');
  if (ra) {
    const secs = Number(ra);
    if (Number.isFinite(secs)) return clampReset(secs * 1000);
    const date = Date.parse(ra);
    if (!Number.isNaN(date)) return clampReset(date - Date.now());
  }
  let best: number | undefined;
  for (const h of ['x-ratelimit-reset-requests', 'x-ratelimit-reset-tokens', 'x-ratelimit-reset']) {
    const v = headers.get(h);
    if (!v) continue;
    const ms = parseDuration(v);
    if (ms !== undefined && (best === undefined || ms > best)) best = ms;
  }
  return best === undefined ? undefined : clampReset(best);
}

function parseDuration(v: string): number | undefined {
  const t = v.trim();
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    // Unix timestamps (seconds or ms) vs. plain seconds.
    if (n > 1e12) return n - Date.now();
    if (n > 1e9) return n * 1000 - Date.now();
    return n * 1000;
  }
  const m = /^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+)ms)?$/.exec(t);
  if (!m || !t) return undefined;
  return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000 + Number(m[4] ?? 0);
}

function clampReset(ms: number): number {
  return Math.min(Math.max(ms, 1_000), 24 * 60 * MIN);
}

/** Short, user-safe category for a failure reason. */
function category(reason: string): string {
  if (reason.startsWith('rate limited')) return 'rate limited';
  if (reason.startsWith('out of credits')) return 'out of free credits';
  if (reason.startsWith('key rejected')) return 'key rejected';
  if (reason.startsWith('model not found')) return 'model not found';
  if (reason.startsWith('request too large')) return 'conversation too long';
  if (reason === 'no response in time') return 'too slow';
  if (reason.startsWith('network')) return 'unreachable';
  if (reason.startsWith('server error')) return 'provider error';
  if (reason === 'empty answer') return 'empty answer';
  if (reason.startsWith('rejected request')) return 'request rejected';
  return 'error';
}

/**
 * Tell the visitor what actually happened. Only genuine rate/credit limits
 * are described as "limits"; configuration or network problems say so.
 */
export function failureMessage(issues: { name: string; reason: string }[], retryInSeconds?: number): string {
  const limited = (r: string) => r === 'rate limited' || r === 'out of free credits' || r === 'too slow' || r === 'resting';
  const detail = issues.map((i) => `${i.name}: ${i.reason}`).join(' \u00b7 ');
  const when = retryInSeconds && retryInSeconds > 0 ? ` Try again in about ${formatWait(retryInSeconds)}.` : ' Please try again shortly.';
  if (issues.every((i) => i.reason === 'conversation too long')) return 'This conversation is too long for the AI. Start a new chat.';
  if (issues.every((i) => limited(i.reason))) return `The free AI limits have been reached for now (${detail}).${when}`;
  return `The AI couldn't answer (${detail}). The site owner can see details in the server log.${when}`;
}


/** Parse an OpenAI-style SSE stream and yield the text deltas. */
export async function* streamDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buf = '';
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const obj = JSON.parse(data) as { choices?: { delta?: { content?: unknown } }[]; error?: unknown };
        if (obj.error) throw new Error('upstream stream error');
        const text = obj.choices?.[0]?.delta?.content;
        if (typeof text === 'string' && text) yield text;
      } catch (e) {
        if (e instanceof Error && e.message === 'upstream stream error') throw e;
        /* ignore keep-alive / malformed lines */
      }
    }
    if (buf.length > 1_000_000) throw new Error('upstream line too long');
  }
}

export function validateMessages(
  body: unknown,
  cfg: Pick<AiConfig, 'maxInputChars' | 'maxHistoryChars'> & Partial<Pick<AiConfig, 'maxHistoryMessages'>>,
): ChatMessage[] {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) {
    throw new Error('Expected a list of messages.');
  }
  const raw = (body as { messages: unknown[] }).messages;
  if (raw.length === 0) throw new Error('Type a message first.');
  if (raw.length > MAX_MESSAGES * 4) throw new Error('This conversation is too long. Start a new chat.');
  const msgs: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') throw new Error('Invalid message.');
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') throw new Error('Invalid message role.');
    if (typeof content !== 'string') throw new Error('Invalid message content.');
    // Strip control characters other than tab/newline.
    const clean = content.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
    if (!clean) continue;
    msgs.push({ role, content: clean });
  }
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'user') throw new Error('The last message must be from you.');
  if (last.content.length > cfg.maxInputChars) {
    throw new Error(`Messages are limited to ${cfg.maxInputChars.toLocaleString('en-US')} characters.`);
  }
  // Keep the most recent history that fits the budget (always keep the last message).
  const kept: ChatMessage[] = [];
  let total = 0;
  const maxKept = Math.min(MAX_MESSAGES, cfg.maxHistoryMessages ?? MAX_MESSAGES);
  for (let i = msgs.length - 1; i >= 0 && kept.length < maxKept; i--) {
    const m = msgs[i]!;
    const len = Math.min(m.content.length, cfg.maxInputChars * 4);
    if (kept.length > 0 && total + len > cfg.maxHistoryChars) break;
    kept.unshift({ role: m.role, content: m.content.slice(0, cfg.maxInputChars * 4) });
    total += len;
  }
  // Chat APIs expect the conversation to start with a user turn.
  while (kept.length > 1 && kept[0]!.role !== 'user') kept.shift();
  return kept;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req as AsyncIterable<Buffer>) {
    size += c.length;
    if (size > MAX_BODY) throw new Error('Message is too large.');
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Invalid request.');
  }
}


function formatWait(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  return `${Math.ceil(seconds / 60)} minutes`;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}
