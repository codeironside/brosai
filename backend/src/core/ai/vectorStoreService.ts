import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

export interface VectorItem {
  id: string;
  title: string;
  content: string;
  category: string;
  embedding: number[];
  sourceType?: string;
  parentId?: string;
}

export interface RankedMemory {
  id: string;
  title: string;
  content: string;
  category: string;
  sourceType?: string;
  score: number;
}

export class VectorStoreService {
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  chunkText(text: string, chunkSize = 900, overlap = 120): string[] {
    const clean = text.replace(/\r/g, '').trim();
    if (!clean) return [];
    if (clean.length <= chunkSize) return [clean];

    const chunks: string[] = [];
    let start = 0;
    while (start < clean.length) {
      const end = Math.min(start + chunkSize, clean.length);
      chunks.push(clean.slice(start, end).trim());
      if (end >= clean.length) break;
      start = Math.max(end - overlap, start + 1);
    }
    return chunks.filter(Boolean);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = config.ai.openaiApiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key missing in environment config');
    }

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.ai.embeddingModel || 'text-embedding-3-small',
        input: text.slice(0, 8000)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`OpenAI embedding API Error (${res.status}): ${errText}`);
      throw new Error(`OpenAI embedding request failed: ${res.statusText}`);
    }

    const json = (await res.json()) as any;
    return json.data[0].embedding;
  }

  rankRelevant(
    queryEmbedding: number[],
    items: VectorItem[],
    topK = 5,
    minScore = 0.22
  ): RankedMemory[] {
    if (!items?.length) return [];

    return items
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        sourceType: item.sourceType,
        score: this.cosineSimilarity(queryEmbedding, item.embedding || [])
      }))
      .filter((item) => item.score >= minScore && item.content)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  formatRetrievedContext(memories: RankedMemory[]): string {
    if (!memories.length) {
      return 'No extra brand documents matched this request.';
    }
    return memories
      .map((item, index) => {
        const snippet = item.content.length > 700 ? `${item.content.slice(0, 700)}…` : item.content;
        return `[${index + 1}] ${item.title} (${item.category || item.sourceType || 'memory'}, relevance ${item.score.toFixed(2)})\n${snippet}`;
      })
      .join('\n\n');
  }

  async queryTopRelevant(
    queryEmbedding: number[],
    items: VectorItem[],
    topK = 3
  ): Promise<VectorItem[]> {
    return this.rankRelevant(queryEmbedding, items, topK).map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      embedding: [],
      sourceType: item.sourceType
    }));
  }
}

export const vectorStoreService = new VectorStoreService();
