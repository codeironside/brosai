import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

export class OpenAIService {
  /**
   * Execute chat completion call to OpenAI GPT-4o
   */
  async generateCompletion(
    prompt: string,
    systemInstruction?: string,
    history: Array<{ role: string; content: string }> = [],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const apiKey = config.ai.openaiApiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key missing in environment config');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.ai.fineTunedModel || config.ai.model || 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemInstruction || 'You are an elite AI Social Media Manager executing social strategy, content generation, and brand management.' 
          },
          ...history.map((item) => ({
            role: item.role === 'assistant' || item.role === 'system' ? item.role : 'user',
            content: item.content
          })),
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error(`OpenAI Chat API Error (${res.status}): ${errorText}`);
      throw new Error(`OpenAI API request failed: ${res.statusText}`);
    }

    const json = (await res.json()) as any;
    return json.choices[0]?.message?.content || '';
  }

  async generateWithTools(input: {
    prompt: string;
    systemInstruction: string;
    history?: Array<{ role: string; content: string }>;
    executeTool: (name: string, args: Record<string, string>) => Promise<string>;
  }): Promise<{ reply: string; usedWeb: boolean }> {
    const apiKey = config.ai.openaiApiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key missing in environment config');
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

    const messages: any[] = [
      { role: 'system', content: input.systemInstruction },
      ...(input.history || []).map((item) => ({
        role: item.role === 'assistant' || item.role === 'system' ? item.role : 'user',
        content: item.content
      })),
      { role: 'user', content: input.prompt }
    ];

    let usedWeb = false;
    for (let round = 0; round < 4; round++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.ai.fineTunedModel || config.ai.model || 'gpt-4o',
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 1200
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error(`OpenAI tools API Error (${res.status}): ${errorText}`);
        throw new Error(`OpenAI API request failed: ${res.statusText}`);
      }

      const json = (await res.json()) as any;
      const message = json.choices[0]?.message;
      if (!message) return { reply: '', usedWeb };

      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      if (!toolCalls.length) {
        return { reply: String(message.content || ''), usedWeb };
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

    return { reply: 'I found some web results but could not finish reading them. Ask me to try that URL again.', usedWeb };
  }

  /**
   * AI Onboarding Interview - Generate dynamic follow-up questions or brand synthesis
   */
  async conductOnboardingStep(userResponse: string, history: Array<{ role: string; content: string }>): Promise<string> {
    const systemPrompt = `You are Alex, an elite AI Social Media Manager interviewing a new business client. 
Your goal is to warmly ask 1-2 insightful questions about their business, target audience, core products/services, and brand tone.
Keep responses concise, encouraging, and humanlike.`;

    const apiKey = config.ai.openaiApiKey;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.ai.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userResponse }
        ],
        max_tokens: 300
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('OpenAI onboarding interview error:', errText);
      throw new Error('Failed to conduct onboarding interview step via OpenAI');
    }

    const json = (await res.json()) as any;
    return json.choices[0]?.message?.content || '';
  }

  /**
   * Website Intelligence Analysis - Extract Brand Pillars & Tone from URL
   */
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
      []
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
      history.slice(-6)
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
