/**
 * Abuse controls: per-client token-bucket rate limiting and bounded
 * concurrency (global + per client) with a short, capped wait queue.
 *
 * All state is in memory and bounded; stale entries are swept periodically so
 * a flood of distinct client IPs cannot grow memory without limit.
 */

export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updated: number }>();
  private readonly refillPerMs: number;
  private readonly sweep: NodeJS.Timeout;

  constructor(
    perMinute: number,
    private readonly burst: number,
    private readonly maxKeys = 100_000,
  ) {
    this.refillPerMs = perMinute / 60_000;
    this.sweep = setInterval(() => this.cleanup(), 60_000);
    this.sweep.unref();
  }

  /** Returns 0 if allowed, otherwise the number of seconds to wait. */
  take(key: string, cost = 1): number {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b) {
      if (this.buckets.size >= this.maxKeys) this.cleanup(true);
      b = { tokens: this.burst, updated: now };
      this.buckets.set(key, b);
    } else {
      b.tokens = Math.min(this.burst, b.tokens + (now - b.updated) * this.refillPerMs);
      b.updated = now;
    }
    if (b.tokens >= cost) {
      b.tokens -= cost;
      return 0;
    }
    return Math.max(1, Math.ceil((cost - b.tokens) / this.refillPerMs / 1000));
  }

  private cleanup(aggressive = false): void {
    const now = Date.now();
    const fullAfter = this.burst / this.refillPerMs;
    for (const [k, b] of this.buckets) {
      if (aggressive || now - b.updated > fullAfter) this.buckets.delete(k);
    }
  }

  stop(): void {
    clearInterval(this.sweep);
  }
}

export class LimitError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

interface Waiter {
  key: string;
  resolve: (release: () => void) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Concurrency gate. `acquire(key)` resolves with a release function once both
 * a global slot and a per-key slot are free. Waiters beyond `maxQueue` or
 * waiting longer than `timeoutMs` are rejected with 503.
 */
export class ConcurrencyGate {
  private active = 0;
  private readonly perKey = new Map<string, number>();
  private readonly queue: Waiter[] = [];

  constructor(
    private readonly max: number,
    private readonly maxPerKey: number,
    private readonly maxQueue: number,
    private readonly timeoutMs: number,
  ) {}

  get inFlight(): number {
    return this.active;
  }

  acquire(key: string): Promise<() => void> {
    if (this.canRun(key)) return Promise.resolve(this.start(key));
    if (this.queue.length >= this.maxQueue) {
      return Promise.reject(new LimitError('The proxy is busy. Please try again shortly.', 503, 5));
    }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        key,
        resolve,
        reject,
        timer: setTimeout(() => {
          const i = this.queue.indexOf(waiter);
          if (i >= 0) this.queue.splice(i, 1);
          reject(new LimitError('Timed out waiting for a free connection slot.', 503, 5));
        }, this.timeoutMs),
      };
      this.queue.push(waiter);
    });
  }

  private canRun(key: string): boolean {
    return this.active < this.max && (this.perKey.get(key) ?? 0) < this.maxPerKey;
  }

  private start(key: string): () => void {
    this.active++;
    this.perKey.set(key, (this.perKey.get(key) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      const n = (this.perKey.get(key) ?? 1) - 1;
      if (n <= 0) this.perKey.delete(key);
      else this.perKey.set(key, n);
      this.drain();
    };
  }

  private drain(): void {
    for (let i = 0; i < this.queue.length && this.active < this.max; ) {
      const w = this.queue[i]!;
      if (this.canRun(w.key)) {
        this.queue.splice(i, 1);
        clearTimeout(w.timer);
        w.resolve(this.start(w.key));
      } else i++;
    }
  }
}

/** Simple counter gate for long-lived connections (WebSockets). */
export class ConnectionCounter {
  private total = 0;
  private readonly perKey = new Map<string, number>();
  constructor(
    private readonly max: number,
    private readonly maxPerKey: number,
  ) {}

  tryAcquire(key: string): (() => void) | null {
    const k = this.perKey.get(key) ?? 0;
    if (this.total >= this.max || k >= this.maxPerKey) return null;
    this.total++;
    this.perKey.set(key, k + 1);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.total--;
      const n = (this.perKey.get(key) ?? 1) - 1;
      if (n <= 0) this.perKey.delete(key);
      else this.perKey.set(key, n);
    };
  }
}
