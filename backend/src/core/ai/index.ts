import { logger } from '../logger/index.js';
import { brandMemoryService } from './brandMemoryService.js';

export interface BrandContext {
  brandName: string;
  industry: string;
  description: string;
  voiceTone: string;
  forbiddenRules: string[];
}

export class AIManagerEngine {
  async processCommand(userInstruction: string, context: BrandContext, userId?: string): Promise<{
    replyText: string;
    actionType?: string;
    payload?: any;
    sources?: Array<{ title: string; score: number }>;
  }> {
    logger.info(`[AI Core Engine] Processing user instruction for brand [${context.brandName}]: "${userInstruction}"`);

    if (userId) {
      const result = await brandMemoryService.generateWithMemory(userId, userInstruction);
      return {
        replyText: result.reply,
        actionType: 'MEMORY_ASSIST',
        sources: result.sources.map((item) => ({ title: item.title, score: item.score }))
      };
    }

    return {
      replyText: `Save your Brand Brain first so I can answer from your brand memory instead of guessing.`,
      actionType: 'GENERAL_ASSIST'
    };
  }
}

export const aiEngine = new AIManagerEngine();
