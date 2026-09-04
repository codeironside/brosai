import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

export type LlmProviderId = 'openrouter' | 'huggingface' | 'groq' | 'openai';

export type ChatMessage = { role: string; content: string };

export type LlmCompleteOptions = {
  temperature?: number;
  maxTokens?: number;
  /** Prefer these providers first; others still used as fallback */
  prefer?: LlmProviderId[];
  /** Skip these providers for this call */
  skip?: LlmProviderId[];
};

export type LlmCompleteResult = {
  content: string;
  provider: LlmProviderId;
  model: string;
};

type ProviderConfig = {
  id: LlmProviderId;
  label: string;
  apiKey: string;
  baseUrl: string;
  /** Tried in order until one succeeds */
  models: string[];
  headers?: Record<string, string>;
};

/** Verified free / efficient defaults — never *-Turbo or non-serverless HF variants */
const FREE_MODEL_POOLS: Record<Exclude<LlmProviderId, 'openai'>, string[]> = {
  openrouter: [
    'openrouter/free',
    'qwen/qwen-2.5-72b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-r1:free'
  ],
  huggingface: [
    'Qwen/Qwen2.5-7B-Instruct',
    'google/gemma-2-9b-it',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'meta-llama/Llama-3.2-3B-Instruct'
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'gemma2-9b-it',
    'mixtral-8x7b-32768'
  ]
};

const COOLDOWN_MS = 10 * 60 * 1000;
const MODEL_COOLDOWN_MS = 5 * 60 * 1000;
const providerCooldownUntil = new Map<LlmProviderId, number>();
const modelCooldownUntil = new Map<string, number>();

function modelKey(providerId: LlmProviderId, model: string) {
  return `${providerId}::${model}`;
}

function isRateLimitedOrQuota(status: number, body: string): boolean {
  if (status === 429 || status === 402) return true;
  return /rate.?limit|quota|insufficient.?credits|out of credits|too many requests|billing|exceeded your|monthly limit/i.test(
    body
  );
}

function isTransientUpstream(status: number, body: string): boolean {
  if (status === 502 || status === 503 || status === 504 || status === 520 || status === 521 || status === 522) {
    return true;
  }
  return /provider returned error|temporarily unavailable|capacity|overloaded/i.test(body);
}

function isBadModel(status: number, body: string): boolean {
  if (status === 404) return true;
  return /does not exist|model_not_found|not found|unable to access non-serverless|unknown model|invalid model/i.test(
    body
  );
}

/** Drop Turbo / paid-only / broken aliases from env overrides */
function sanitizeModelId(model: string): string | null {
  const raw = String(model || '').trim();
  if (!raw) return null;
  if (/turbo/i.test(raw)) return null;
  if (/^qwen\/qwen-2\.5-7b-instruct$/i.test(raw)) {
    // Prefer free 72B instruct on OpenRouter; 7B without :free often hits flaky BYOK hosts
    return null;
  }
  if (/^llama-3\.1-8b-instant$/i.test(raw)) return null;
  return raw;
}

function parseModelList(value: string | undefined, fallback: string[]): string[] {
  const fromEnv = String(value || '')
    .split(',')
    .map((item) => sanitizeModelId(item))
    .filter(Boolean) as string[];
  const merged = [...fromEnv, ...fallback.map((item) => sanitizeModelId(item)).filter(Boolean) as string[]];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of merged) {
    if (seen.has(model)) continue;
    seen.add(model);
    out.push(model);
  }
  return out;
}

function markProviderCooldown(id: LlmProviderId, reason: string) {
  providerCooldownUntil.set(id, Date.now() + COOLDOWN_MS);
  logger.warn(`[LLM Adapter] Cooling down ${id} for ${COOLDOWN_MS / 60000}m (${reason})`);
}

function markModelCooldown(providerId: LlmProviderId, model: string, reason: string) {
  modelCooldownUntil.set(modelKey(providerId, model), Date.now() + MODEL_COOLDOWN_MS);
  logger.warn(`[LLM Adapter] Skipping ${providerId}/${model} for ${MODEL_COOLDOWN_MS / 60000}m (${reason})`);
}

function isProviderCooling(id: LlmProviderId): boolean {
  const until = providerCooldownUntil.get(id) || 0;
  if (until <= Date.now()) {
    providerCooldownUntil.delete(id);
    return false;
  }
  return true;
}

function isModelCooling(providerId: LlmProviderId, model: string): boolean {
  const key = modelKey(providerId, model);
  const until = modelCooldownUntil.get(key) || 0;
  if (until <= Date.now()) {
    modelCooldownUntil.delete(key);
    return false;
  }
  return true;
}

function buildProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // gsk_ keys are Groq (not Hugging Face hf_). Remap so a mislabeled key still works.
  let huggingfaceKey = config.ai.huggingfaceApiKey || '';
  let groqKey = config.ai.groqApiKey || '';
  if (huggingfaceKey.startsWith('gsk_') && !groqKey) {
    groqKey = huggingfaceKey;
    huggingfaceKey = '';
  }

  if (config.ai.openrouterApiKey) {
    const primary = sanitizeModelId(config.ai.openrouterModel);
    providers.push({
      id: 'openrouter',
      label: 'OpenRouter',
      apiKey: config.ai.openrouterApiKey,
      baseUrl: String(config.ai.openrouterApiBase || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
      models: parseModelList(
        [primary, config.ai.openrouterModels].filter(Boolean).join(','),
        FREE_MODEL_POOLS.openrouter
      ),
      headers: {
        'HTTP-Referer': config.app.frontendUrl || 'https://vamvamvamai.com',
        'X-Title': 'Vamvamvam AI'
      }
    });
  }

  if (huggingfaceKey) {
    const primary = sanitizeModelId(config.ai.huggingfaceModel);
    providers.push({
      id: 'huggingface',
      label: 'Hugging Face',
      apiKey: huggingfaceKey,
      baseUrl: String(config.ai.huggingfaceApiBase || 'https://router.huggingface.co/v1').replace(/\/$/, ''),
      models: parseModelList(
        [primary, config.ai.huggingfaceModels].filter(Boolean).join(','),
        FREE_MODEL_POOLS.huggingface
      )
    });
  }

  if (groqKey) {
    const primary = sanitizeModelId(config.ai.groqModel);
    providers.push({
      id: 'groq',
      label: 'Groq',
      apiKey: groqKey,
      baseUrl: String(config.ai.groqApiBase || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
      models: parseModelList(
        [primary, config.ai.groqModels].filter(Boolean).join(','),
        FREE_MODEL_POOLS.groq
      )
    });
  }

  if (config.ai.openaiApiKey) {
    const model = config.ai.fineTunedModel || config.ai.model || 'gpt-4o';
    providers.push({
      id: 'openai',
      label: 'OpenAI',
      apiKey: config.ai.openaiApiKey,
      baseUrl: 'https://api.openai.com/v1',
      models: [model]
    });
  }

  const order = (config.ai.llmProviderOrder || 'openrouter,huggingface,groq,openai')
    .split(',')
    .map((item) => item.trim().toLowerCase() as LlmProviderId)
    .filter(Boolean);

  providers.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  return providers;
}

function orderedProviders(options: LlmCompleteOptions = {}): ProviderConfig[] {
  const all = buildProviders();
  const skip = new Set(options.skip || []);
  let list = all.filter((item) => !skip.has(item.id) && !isProviderCooling(item.id));
  if (options.prefer?.length) {
    const prefer = options.prefer.filter((id) => !skip.has(id));
    list = [
      ...prefer.map((id) => list.find((p) => p.id === id)).filter(Boolean) as ProviderConfig[],
      ...list.filter((p) => !prefer.includes(p.id))
    ];
  }
  return list;
}

async function callOpenAiCompatible(
  provider: ProviderConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: LlmCompleteOptions
): Promise<string> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...(provider.headers || {})
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000
    })
  });

  const errorText = res.ok ? '' : await res.text();
  if (!res.ok) {
    if (isRateLimitedOrQuota(res.status, errorText)) {
      markProviderCooldown(provider.id, `${res.status}`);
      throw new Error(`${provider.label} ${res.status}: ${errorText.slice(0, 280)}`);
    }
    if (isBadModel(res.status, errorText) || isTransientUpstream(res.status, errorText)) {
      markModelCooldown(provider.id, model, `${res.status}`);
    }
    throw new Error(`${provider.label} ${res.status}: ${errorText.slice(0, 280)}`);
  }

  const json = (await res.json()) as any;
  return String(json.choices?.[0]?.message?.content || '');
}

/**
 * Unified chat completion with automatic failover:
 * 1) try each free model on a provider
 * 2) then the next provider (OpenRouter → HF → Groq → OpenAI)
 */
export async function llmComplete(
  prompt: string,
  systemInstruction?: string,
  history: ChatMessage[] = [],
  options: LlmCompleteOptions = {}
): Promise<LlmCompleteResult> {
  const providers = orderedProviders(options);
  if (!providers.length) {
    throw new Error('No LLM providers configured. Set OPENROUTER_API_KEY, HUGGINGFACE_API_KEY / GROQ_API_KEY, or OPENAI_API_KEY.');
  }

  const messages = [
    {
      role: 'system',
      content:
        systemInstruction ||
        'You are an elite AI Social Media Manager executing social strategy, content generation, and brand management.'
    },
    ...history.map((item) => ({
      role: item.role === 'assistant' || item.role === 'system' ? item.role : 'user',
      content: item.content
    })),
    { role: 'user', content: prompt }
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    if (isProviderCooling(provider.id)) continue;
    const models = provider.models.filter((model) => !isModelCooling(provider.id, model));
    if (!models.length) {
      errors.push(`${provider.id}: all models cooling`);
      continue;
    }

    for (const model of models) {
      try {
        const content = await callOpenAiCompatible(provider, model, messages, options);
        if (!content.trim()) {
          errors.push(`${provider.id}/${model}: empty response`);
          continue;
        }
        logger.info(`[LLM Adapter] Used ${provider.id} (${model})`);
        return { content, provider: provider.id, model };
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(msg);
        logger.warn(`[LLM Adapter] ${provider.id}/${model} failed — trying next: ${msg.slice(0, 180)}`);
        if (isProviderCooling(provider.id)) break;
      }
    }
  }

  throw new Error(`All LLM providers failed. ${errors.slice(0, 4).join(' | ')}`);
}

export async function llmCompleteText(
  prompt: string,
  systemInstruction?: string,
  history: ChatMessage[] = [],
  options: LlmCompleteOptions = {}
): Promise<string> {
  const result = await llmComplete(prompt, systemInstruction, history, options);
  return result.content;
}

export function listConfiguredLlmProviders(): Array<{ id: LlmProviderId; models: string[]; cooling: boolean }> {
  return buildProviders().map((item) => ({
    id: item.id,
    models: item.models,
    cooling: isProviderCooling(item.id)
  }));
}

export function clearLlmCooldowns(): void {
  providerCooldownUntil.clear();
  modelCooldownUntil.clear();
}

export { FREE_MODEL_POOLS };
