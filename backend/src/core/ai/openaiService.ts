import { config } from '../config/index.js';
import { logger } from '../logger/index.js';
import { llmComplete, llmCompleteText, type LlmProviderId } from './llmAdapter.js';

export class OpenAIService {
  /**
   * Chat completion via the multi-provider adapter (OpenRouter → HF → Groq → OpenAI).
   */
  async generateCompletion(
    prompt: string,
    systemInstruction?: string,
    history: Array<{ role: string; content: string }> = [],
    options: { temperature?: number; maxTokens?: number; prefer?: LlmProviderId[] } = {}
  ): Promise<string> {
    return llmCompleteText(prompt, systemInstruction, history, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      prefer: options.prefer
    });
  }

  async generateWithTools(input: {
    prompt: string;
    systemInstruction: string;
    history?: Array<{ role: string; content: string }>;
    executeTool: (name: string, args: Record<string, string>) => Promise<string>;
  }): Promise<{ reply: string; usedWeb: boolean; provider?: string }> {
    // Tool calling: OpenAI first (most reliable tools), then OpenRouter free models.
    const toolProviders: Array<{ id: LlmProviderId; apiKey: string; baseUrl: string; model: string; headers?: Record<string, string> }> = [];
    if (config.ai.openaiApiKey) {
      toolProviders.push({
        id: 'openai',
        apiKey: config.ai.openaiApiKey,
        baseUrl: 'https://api.openai.com/v1',
        model: config.ai.fineTunedModel || config.ai.model || 'gpt-4o'
      });
    }
    if (config.ai.openrouterApiKey) {
      const { FREE_MODEL_POOLS } = await import('./llmAdapter.js');
      const openrouterModels = [
        config.ai.openrouterModel,
        ...(String(config.ai.openrouterModels || '').split(',')),
        ...FREE_MODEL_POOLS.openrouter
      ]
        .map((item) => String(item || '').trim())
        .filter((item) => item && !/turbo/i.test(item) && !/^qwen\/qwen-2\.5-7b-instruct$/i.test(item));
      const seen = new Set<string>();
      for (const model of openrouterModels) {
        if (seen.has(model)) continue;
        seen.add(model);
        toolProviders.push({
          id: 'openrouter',
          apiKey: config.ai.openrouterApiKey,
          baseUrl: String(config.ai.openrouterApiBase || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
          model,
          headers: {
            'HTTP-Referer': config.app.frontendUrl || 'https://vamvamvamai.com',
            'X-Title': 'Vamvamvam AI'
          }
        });
      }
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'fetch_webpage',
          description: 'Read a public webpage. Works on JavaScript sites too. Use a full http or https URL.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Full http or https URL' }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_website',
          description: 'Read a company website thoroughly: homepage plus About / Team / Contact pages. Use this when asked who runs a company, key people, or what the business does.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Homepage URL' }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_web',
          description: 'Search the public web for current pages. Use when you do not already have a URL.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_connected_accounts',
          description: 'List social accounts the customer has connected. Use before offering a dry-run post.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'publish_social_post',
          description: 'Publish a finished post to connected networks. Call ONLY after the user clearly says to go ahead, post it, publish, or send it. Never on the first draft.',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Exact post text to publish' },
              platforms: {
                type: 'string',
                description: 'Comma-separated platforms: twitter,facebook,linkedin,threads. Empty means all connected.'
              }
            },
            required: ['text']
          }
        }
      }
    ];

    const baseMessages: any[] = [
      { role: 'system', content: input.systemInstruction },
      ...(input.history || []).map((item) => ({
        role: item.role === 'assistant' || item.role === 'system' ? item.role : 'user',
        content: item.content
      })),
      { role: 'user', content: input.prompt }
    ];

    for (const provider of toolProviders) {
      try {
        const messages = [...baseMessages];
        let usedWeb = false;
        for (let round = 0; round < 4; round++) {
          const res = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json',
              ...(provider.headers || {})
            },
            body: JSON.stringify({
              model: provider.model,
              messages,
              tools,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 1200
            })
          });

          if (!res.ok) {
            const errorText = await res.text();
            logger.error(`${provider.id} tools API Error (${res.status}): ${errorText}`);
            throw new Error(`${provider.id} tools failed: ${res.status}`);
          }

          const json = (await res.json()) as any;
          const message = json.choices[0]?.message;
          if (!message) return { reply: '', usedWeb, provider: provider.id };

          const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
          if (!toolCalls.length) {
            logger.info(`[LLM Adapter] Tools via ${provider.id}`);
            return { reply: String(message.content || ''), usedWeb, provider: provider.id };
          }

          messages.push(message);
          for (const call of toolCalls) {
            const name = call.function?.name || '';
            if (name === 'fetch_webpage' || name === 'fetch_website' || name === 'search_web') {
              usedWeb = true;
            }
            let args: Record<string, string> = {};
            try {
              args = JSON.parse(call.function?.arguments || '{}');
            } catch {
              args = {};
            }
            let result = `Unknown tool: ${name}`;
            try {
              result = await input.executeTool(name, args);
            } catch (err: any) {
              result = `Tool failed: ${err.message}`;
            }
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: String(result).slice(0, 16000)
            });
          }
        }
        return {
          reply: 'I found some web results but could not finish reading them. Ask me to try that URL again.',
          usedWeb,
          provider: provider.id
        };
      } catch (err: any) {
        logger.warn(`[LLM Adapter] Tools provider ${provider.id} failed: ${err.message}`);
      }
    }

    // Fallback: no tool support — plain completion through the free-tier chain
    logger.warn('[LLM Adapter] Tool providers unavailable — falling back to plain completion');
    const reply = await llmCompleteText(
      input.prompt,
      `${input.systemInstruction}\n\nYou do not have live web tools right now. Use brand memory only. If you need a live webpage, say so and ask the user to try again shortly.`,
      input.history || [],
      { maxTokens: 1200 }
    );
    return { reply, usedWeb: false, provider: 'fallback' };
  }

  async conductOnboardingStep(userResponse: string, history: Array<{ role: string; content: string }>): Promise<string> {
    const systemPrompt = `You are Alex, an elite AI Social Media Manager interviewing a new business client. 
Your goal is to warmly ask 1-2 insightful questions about their business, target audience, core products/services, and brand tone.
Keep responses concise, encouraging, and humanlike.`;

    return this.generateCompletion(userResponse, systemPrompt, history, { maxTokens: 300 });
  }

  async analyzeWebsiteUrl(url: string): Promise<{
    voiceTone: string;
    targetAudience: string;
    contentPillars: string[];
    summary: string;
  }> {
    const prompt = `Analyze this business website URL: "${url}". Extract:
1. Recommended Brand Voice & Tone
2. Target Audience Profile
3. 4 Core Content Pillars
Return strictly valid JSON format: {"voiceTone": "...", "targetAudience": "...", "contentPillars": ["...", "...", "...", "..."], "summary": "..."}`;

    const responseText = await this.generateCompletion(prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        voiceTone: parsed.voiceTone || '',
        targetAudience: parsed.targetAudience || '',
        contentPillars: Array.isArray(parsed.contentPillars) ? parsed.contentPillars : [],
        summary: parsed.summary || ''
      };
    }

    throw new Error('Failed to parse website intelligence analysis JSON output');
  }

  async generateChatTitle(firstPrompt: string): Promise<string> {
    const prompt = `Create a short chat title from this first user message.
Rules: 2 to 6 words, Title Case, no quotes, no punctuation except & or hyphen, no emojis.
User message: """${firstPrompt.slice(0, 500)}"""
Return only the title.`;
    const raw = await this.generateCompletion(
      prompt,
      'You name chat threads. Output only a concise title.',
      [],
      { maxTokens: 40, temperature: 0.4 }
    );
    const title = String(raw || '')
      .replace(/["'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 48);
    return title || 'New chat';
  }

  async extractBrandFacts(userMessage: string, assistantReply: string, history: Array<{ role: string; content: string }> = []): Promise<string[]> {
    const prompt = `Extract durable facts the USER taught about their business or brand.
Include products, audience, tone, restrictions, offers, locations, theology, hours, prices, or preferences they stated or clearly confirmed.
Ignore greetings, one-off questions, and guesses from the assistant.
Return JSON only: {"facts":["..."]}
If nothing durable was taught, return {"facts":[]}.

USER:
${userMessage.slice(0, 2500)}

ASSISTANT:
${assistantReply.slice(0, 1500)}`;
    const raw = await this.generateCompletion(
      prompt,
      'You extract brand knowledge. Never invent facts. JSON only.',
      history.slice(-6),
      { temperature: 0.2, maxTokens: 400 }
    );
    const match = String(raw || '').match(/\{[\s\S]*\}/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      const facts = Array.isArray(parsed.facts) ? parsed.facts : [];
      return facts
        .map((item: unknown) => String(item || '').replace(/\s+/g, ' ').trim())
        .filter((item: string) => item.length > 12)
        .slice(0, 8);
    } catch {
      return [];
    }
  }
}

export const openAIService = new OpenAIService();
