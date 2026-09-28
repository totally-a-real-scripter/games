/**
 * AI provider list: built-in presets for free tiers, plus custom providers.
 *
 * Configuration (all optional; any provider with its settings present joins
 * the chain):
 *
 *   GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY,
 *   OPENROUTER_API_KEY            -> enable that preset
 *   <PRESET>_MODEL                -> override the preset's default model
 *   OLLAMA_BASE_URL               -> enable a self-hosted Ollama (no key)
 *
 *   AI_1_BASE_URL / AI_1_API_KEY / AI_1_MODEL / AI_1_NAME  (up to AI_9_*)
 *                                 -> any other OpenAI-compatible API
 *                                    (e.g. PhotonAI once it launches)
 *   AI_BASE_URL / AI_API_KEY / AI_MODEL
 *                                 -> single custom provider (older setting)
 *
 *   AI_ORDER=groq,cerebras,gemini,mistral,openrouter,custom,ollama
 *                                 -> priority order (ids: preset names,
 *                                    "custom" for all numbered/legacy ones,
 *                                    or "ai1".."ai9" individually)
 *
 * Default models were chosen from each provider's free catalog as of mid-2026;
 * free catalogs change, so every one can be overridden.
 */

export interface AiProvider {
  /** Stable id used in AI_ORDER and logs (e.g. "groq", "ai1"). */
  id: string;
  /** Display name shown to users (e.g. "Groq"). */
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Extra request-body fields this provider/model needs. */
  extraBody: Record<string, unknown>;
  /** Extra request headers (never secret). */
  extraHeaders: Record<string, string>;
  /** Preset id this came from ("" for custom providers). */
  presetId: string;
  /** True when the operator set the model explicitly (never auto-substituted). */
  explicitModel: boolean;
  /** Fallback models, in preference order, if the default isn't offered. */
  preferred: string[];
}

interface Preset {
  name: string;
  keyEnv: string;
  modelEnv: string;
  baseUrl: string;
  model: string;
  /** Alternatives tried (in order) if `model` isn't in the account's model list. */
  preferred: string[];
}

export const PRESETS: Record<string, Preset> = {
  // Very fast LPU inference; generous daily requests, tokens/minute is the cap.
  groq: {
    name: 'Groq',
    keyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    preferred: ['openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'qwen/qwen3-32b', 'openai/gpt-oss-20b'],
  },
  // Very fast wafer-scale inference; large token budget per minute/day.
  cerebras: {
    name: 'Cerebras',
    keyEnv: 'CEREBRAS_API_KEY',
    modelEnv: 'CEREBRAS_MODEL',
    baseUrl: 'https://api.cerebras.ai/v1',
    model: 'gpt-oss-120b',
    preferred: ['llama-3.3-70b', 'zai-glm-4.7', 'qwen-3-32b', 'llama3.1-8b'],
  },
  // Google AI Studio free tier (OpenAI-compatible endpoint).
  gemini: {
    name: 'Gemini',
    keyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // "-latest" alias follows Google's current Flash model.
    model: 'gemini-flash-latest',
    preferred: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemma-3-27b-it'],
  },
  // Mistral "Experiment" free plan; large monthly token allowance.
  mistral: {
    name: 'Mistral',
    keyEnv: 'MISTRAL_API_KEY',
    modelEnv: 'MISTRAL_MODEL',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    preferred: ['mistral-medium-latest', 'open-mistral-nemo', 'ministral-8b-latest'],
  },
  // Many ":free" models behind one key; low daily request cap, good last resort.
  openrouter: {
    name: 'OpenRouter',
    keyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    preferred: ['openai/gpt-oss-120b:free', 'deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen3-coder:free', '*:free'],
  },
};

export const DEFAULT_ORDER = ['groq', 'cerebras', 'gemini', 'mistral', 'openrouter', 'custom', 'ollama'];

type Env = Record<string, string | undefined>;

function val(env: Env, name: string): string {
  return (env[name] ?? '').trim();
}

function checkUrl(raw: string, label: string): string {
  const url = raw.replace(/\/+$/, '');
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Invalid ${label}=${raw}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`${label} must be an http(s) URL`);
  if (u.username || u.password) throw new Error(`Put credentials in the API key setting, not ${label}`);
  return url;
}

/** Request tweaks per model family, so reasoning models don't spend the whole token budget thinking. */
export function extrasFor(presetId: string, model: string): Record<string, unknown> {
  const m = model.toLowerCase().replace(/^openai\//, '');
  if ((presetId === 'groq' || presetId === 'cerebras') && m.startsWith('gpt-oss')) return { reasoning_effort: 'low' };
  if (presetId === 'gemini' && /2\.5|thinking|flash-latest/.test(m)) return { reasoning_effort: 'low' };
  return {};
}

export function loadProviders(env: Env = process.env): AiProvider[] {
  const byId = new Map<string, AiProvider>();
  const customIds: string[] = [];

  for (const [id, p] of Object.entries(PRESETS)) {
    const key = val(env, p.keyEnv);
    if (!key) continue;
    const explicit = val(env, p.modelEnv);
    const model = explicit || p.model;
    byId.set(id, {
      presetId: id,
      explicitModel: explicit !== '',
      preferred: p.preferred,
      id,
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: key,
      model,
      extraBody: extrasFor(id, model),
      extraHeaders: id === 'openrouter' ? { 'x-title': 'Veil' } : {},
    });
  }

  const ollama = val(env, 'OLLAMA_BASE_URL');
  if (ollama) {
    let base = checkUrl(ollama, 'OLLAMA_BASE_URL');
    if (!/\/v1$/.test(base)) base += '/v1';
    byId.set('ollama', {
      id: 'ollama',
      presetId: '',
      explicitModel: true,
      preferred: [],
      name: 'Ollama',
      baseUrl: base,
      apiKey: '',
      model: val(env, 'OLLAMA_MODEL') || 'llama3.2:3b',
      extraBody: {},
      extraHeaders: {},
    });
  }

  for (let i = 1; i <= 9; i++) {
    const base = val(env, `AI_${i}_BASE_URL`);
    if (!base) continue;
    const id = `ai${i}`;
    const baseUrl = checkUrl(base, `AI_${i}_BASE_URL`);
    byId.set(id, {
      id,
      presetId: '',
      explicitModel: true,
      preferred: [],
      name: val(env, `AI_${i}_NAME`) || hostLabel(baseUrl),
      baseUrl,
      apiKey: val(env, `AI_${i}_API_KEY`),
      model: val(env, `AI_${i}_MODEL`) || 'default',
      extraBody: {},
      extraHeaders: {},
    });
    customIds.push(id);
  }

  // Older single-provider settings keep working.
  const legacy = val(env, 'AI_BASE_URL');
  if (legacy) {
    const baseUrl = checkUrl(legacy, 'AI_BASE_URL');
    byId.set('ai0', {
      id: 'ai0',
      presetId: '',
      explicitModel: true,
      preferred: [],
      name: val(env, 'AI_PROVIDER_NAME') || hostLabel(baseUrl),
      baseUrl,
      apiKey: val(env, 'AI_API_KEY'),
      model: val(env, 'AI_MODEL') || 'llama3.2:3b',
      extraBody: {},
      extraHeaders: {},
    });
    customIds.unshift('ai0');
  }

  const orderRaw = val(env, 'AI_ORDER');
  const order = (orderRaw ? orderRaw.toLowerCase().split(/[,\s]+/).filter(Boolean) : DEFAULT_ORDER).flatMap((id) =>
    id === 'custom' ? customIds : [id],
  );
  for (const id of order) {
    if (id !== 'custom' && !byId.has(id) && !PRESETS[id] && id !== 'ollama' && !/^ai[0-9]$/.test(id)) {
      throw new Error(`Unknown provider "${id}" in AI_ORDER`);
    }
  }
  const result: AiProvider[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const p = byId.get(id);
    if (p && !seen.has(id)) {
      result.push(p);
      seen.add(id);
    }
  }
  // Configured providers missing from a custom AI_ORDER still go last.
  for (const [id, p] of byId) if (!seen.has(id)) result.push(p);
  return result;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^api\./, '');
  } catch {
    return 'AI';
  }
}
