import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

type ChatTurn = { role: string; content: string };

function gemmaContents(prompt: string, history: ChatTurn[]) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const item of history.slice(-24)) {
    const text = String(item.content || '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  const last = contents[contents.length - 1];
  if (last?.role === 'user') {
    last.parts[0].text += `\n\n${prompt}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: prompt }] });
  }
  if (contents[0]?.role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: 'Continue this draft.' }] });
  }
  return contents;
}

function replyFromGemma(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part: any) => !part?.thought)
    .map((part: any) => String(part?.text || ''))
    .join('')
    .trim();
}

export class GemmaService {
  isConfigured() {
    return Boolean(config.ai.gemmaApiKey);
  }

  async generateCompletion(
    prompt: string,
    systemInstruction: string,
    history: ChatTurn[] = [],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const apiKey = config.ai.gemmaApiKey;
    if (!apiKey) {
      throw new Error('Gemma API key is missing. Set GEMMA_API_KEY from Google AI Studio.');
    }

    const base = String(config.ai.gemmaApiBase || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const model = String(config.ai.gemmaModel || 'gemma-4-31b-it').replace(/^models\//, '');
    const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: gemmaContents(prompt, history),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 700,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const firstError = await res.text();
      if (res.status === 400 && /thinking/i.test(firstError)) {
        delete (payload.generationConfig as any).thinkingConfig;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        logger.error(`Gemma API error (${res.status}): ${firstError.slice(0, 400)}`);
        throw new Error('Gemma could not finish that draft. Please try again.');
      }
    }

    const errorText = !res.ok ? await res.text() : '';
    if (!res.ok) {
      logger.error(`Gemma API error (${res.status}): ${errorText.slice(0, 400)}`);
      throw new Error('Gemma could not finish that draft. Please try again.');
    }

    const json = (await res.json()) as any;
    const reply = replyFromGemma(json);
    if (!reply) {
      const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'empty';
      logger.warn(`Gemma returned no text (${reason})`);
      throw new Error('Gemma returned an empty draft. Please try again.');
    }
    return reply;
  }
}

export const gemmaService = new GemmaService();
