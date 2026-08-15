import { UserModel } from '../../api/auth/models/userModel.js';
import { activeManager, listBrandBrains, listManagers } from '../../api/auth/services/workspaceProfiles.js';
import { logger } from '../logger/index.js';
import { RankedMemory, vectorStoreService } from './vectorStoreService.js';
import { webToolService } from './webToolService.js';

export interface PublicMemoryDoc {
  id: string;
  title: string;
  category: string;
  sourceType: string;
  preview: string;
  createdAt?: string;
}

function brandProfileText(brain: any): string {
  if (!brain) return '';
  return [
    brain.brandName && `Brand: ${brain.brandName}`,
    brain.industry && `Account type: ${brain.industry}`,
    brain.description && `What they do: ${brain.description}`,
    brain.productsServices && `Offerings: ${brain.productsServices}`,
    brain.targetAudience && `Audience: ${brain.targetAudience}`,
    brain.voiceTone && `Tone: ${brain.voiceTone}`,
    brain.differentiator && `What makes them different: ${brain.differentiator}`,
    Array.isArray(brain.goals) && brain.goals.length ? `Goals: ${brain.goals.join(', ')}` : '',
    Array.isArray(brain.topics) && brain.topics.length ? `Topics: ${brain.topics.join(', ')}` : '',
    Array.isArray(brain.contentPillars) && brain.contentPillars.length ? `Content mix: ${brain.contentPillars.join(', ')}` : '',
    Array.isArray(brain.restrictions) && brain.restrictions.length ? `Never: ${brain.restrictions.join('; ')}` : '',
    brain.customNotes && `Other instructions: ${brain.customNotes}`,
    brain.website && `Website: ${brain.website}`
  ].filter(Boolean).join('\n');
}

export class BrandMemoryService {
  formatBrandCard(user: any, options: { managerId?: string; brandId?: string } = {}): string {
    const managers = listManagers(user);
    const brains = listBrandBrains(user);
    const manager = (options.managerId && managers.find((item: any) => item.id === options.managerId))
      || activeManager(managers);
    const linkedBrandId = options.brandId || manager?.brandId;
    const brain = (linkedBrandId && brains.find((item: any) => item.id === linkedBrandId))
      || (options.brandId ? null : brains.find((item: any) => item.isActive))
      || brains[0];
    const lines: string[] = [];

    if (manager) {
      lines.push([
        `HIRED AI: ${manager.name || 'AI'} — ${manager.role || 'Social Manager'}`,
        manager.personality && `Voice: ${manager.personality}`,
        manager.goal && `Goal: ${manager.goal}`,
        manager.postingFrequency && `Posting frequency: ${manager.postingFrequency}`,
        manager.workingHours && `Working hours: ${manager.workingHours}`,
        manager.autopilotMode && `Control level: ${manager.autopilotMode}`,
        manager.brandName && `Linked brand: ${manager.brandName}`
      ].filter(Boolean).join('\n'));
    }

    if (brain) {
      lines.push(`LINKED BRAND (use only this brand, not others):\n${brandProfileText(brain)}`);
    } else {
      lines.push('No brand is linked to this AI yet. Ask the user to link a Brand Brain.');
    }

    return lines.filter(Boolean).join('\n\n');
  }

  scopedMemoryDocs(user: any, brandId?: string) {
    const docs = user?.knowledgeBase || [];
    if (!brandId) return docs;
    const otherBrandIds = new Set(
      listBrandBrains(user)
        .map((item: any) => item.id)
        .filter((id: string) => id && id !== brandId)
    );
    return docs.filter((doc: any) => {
      if (doc.id === `brand_profile_${brandId}` || doc.parentId === brandId) return true;
      if (String(doc.id || '').startsWith('brand_profile_') && doc.id !== `brand_profile_${brandId}`) return false;
      if (doc.parentId && otherBrandIds.has(doc.parentId)) return false;
      return true;
    });
  }

  async indexBrandProfile(userId: string, brain: any): Promise<void> {
    const text = brandProfileText(brain);
    if (!text) return;

    const embedding = await vectorStoreService.generateEmbedding(`Brand profile\n${text}`);
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) return;

    const profileId = `brand_profile_${brain.id || 'default'}`;
    const docs = (dbUser.knowledgeBase || []).filter((doc: any) => doc.id !== profileId && !(doc.id === 'brand_profile' && !brain.id));
    docs.unshift({
      id: profileId,
      title: brain.brandName ? `${brain.brandName} brand profile` : 'Brand profile',
      content: text,
      category: 'Brand Profile',
      sourceType: 'brand_profile',
      parentId: brain.id || 'brand_profile',
      embedding,
      createdAt: new Date()
    });
    dbUser.knowledgeBase = docs;
    dbUser.markModified('knowledgeBase');
    await dbUser.save();
  }

  async indexDocument(userId: string, input: {
    title: string;
    content: string;
    category?: string;
    sourceType?: string;
  }): Promise<{ docIds: string[]; chunks: number }> {
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }

    const chunks = vectorStoreService.chunkText(input.content);
    const parentId = `doc_${Date.now()}`;
    const sourceType = input.sourceType || 'document';
    const category = input.category || 'Company Document';
    dbUser.knowledgeBase = dbUser.knowledgeBase || [];

    const docIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = chunks.length === 1 ? parentId : `${parentId}_${i + 1}`;
      const title = chunks.length === 1 ? input.title : `${input.title} (${i + 1}/${chunks.length})`;
      const embedding = await vectorStoreService.generateEmbedding(`${title}: ${chunk}`);
      dbUser.knowledgeBase.push({
        id,
        title,
        content: chunk,
        category,
        sourceType,
        parentId,
        embedding,
        createdAt: new Date()
      });
      docIds.push(id);
    }

    dbUser.markModified('knowledgeBase');
    await dbUser.save();
    logger.info(`[Brand Memory] Indexed ${chunks.length} chunk(s) for user ${userId}`);
    return { docIds, chunks: chunks.length };
  }

  async listDocuments(userId: string): Promise<PublicMemoryDoc[]> {
    const dbUser = await UserModel.findById(userId);
    const docs = dbUser?.knowledgeBase || [];
    const grouped = new Map<string, PublicMemoryDoc>();

    for (const doc of docs) {
      const key = doc.parentId || doc.id;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: key,
          title: String(doc.title || '').replace(/ \(\d+\/\d+\)$/, ''),
          category: doc.category || 'General',
          sourceType: doc.sourceType || 'document',
          preview: String(doc.content || '').slice(0, 180),
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined
        });
      }
    }

    return Array.from(grouped.values());
  }

  async deleteDocument(userId: string, docId: string): Promise<PublicMemoryDoc[]> {
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) throw new Error('User not found');
    dbUser.knowledgeBase = (dbUser.knowledgeBase || []).filter(
      (doc: any) => doc.id !== docId && doc.parentId !== docId
    );
    dbUser.markModified('knowledgeBase');
    await dbUser.save();
    return this.listDocuments(userId);
  }

  async retrieve(userId: string, query: string, topK = 8, brandId?: string): Promise<RankedMemory[]> {
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) return [];
    const items = this.scopedMemoryDocs(dbUser, brandId).filter((doc: any) => Array.isArray(doc.embedding) && doc.embedding.length);
    if (!items.length) return [];
    const queryEmbedding = await vectorStoreService.generateEmbedding(query);
    return vectorStoreService.rankRelevant(queryEmbedding, items, topK, 0.16);
  }

  otherChatsRecap(user: any, excludeThreadId?: string): string {
    const channels = ['hireAi', 'brandBrain'] as const;
    const lines: string[] = [];
    for (const channel of channels) {
      const threads = Array.isArray(user?.aiConversations?.[channel]) ? user.aiConversations[channel] : [];
      for (const thread of threads) {
        if (!thread || thread.id === excludeThreadId) continue;
        const messages = Array.isArray(thread.messages) ? thread.messages : [];
        if (!messages.length) continue;
        const lastUser = [...messages].reverse().find((item: any) => item.role === 'user' && item.content);
        const preview = String(lastUser?.content || messages[messages.length - 1]?.content || '').replace(/\s+/g, ' ').slice(0, 160);
        lines.push(`- ${thread.title || 'Chat'}: ${preview}`);
      }
    }
    return lines.slice(0, 14).join('\n') || 'No other chats yet.';
  }

  async generateWithMemory(
    userId: string,
    userMessage: string,
    history: Array<{ role: string; content: string }> = [],
    options: { threadId?: string; managerId?: string; brandId?: string; channel?: 'hireAi' | 'brandBrain' } = {}
  ): Promise<{
    reply: string;
    sources: RankedMemory[];
    usedWeb: boolean;
  }> {
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) {
      throw new Error('User not found');
    }

    const managers = listManagers(dbUser);
    const brains = listBrandBrains(dbUser);
    const manager = (options.managerId && managers.find((item: any) => item.id === options.managerId))
      || activeManager(managers);
    const brandId = options.brandId || manager?.brandId || '';
    const brain = brains.find((item: any) => item.id === brandId) || null;
    const sources = await this.retrieve(userId, userMessage, 8, brandId);
    const brandCard = this.formatBrandCard(dbUser, { managerId: manager?.id, brandId });
    const memory = vectorStoreService.formatRetrievedContext(sources);
    const otherChats = this.otherChatsRecap(dbUser, options.threadId);
    const recentHistory = history.slice(-24);
    const managerName = manager?.name || 'Alex';
    const savedSites = [brain?.website].filter(Boolean).join(', ');

    const system = `You are ${managerName}, the hired AI for this customer.
You work for ONE linked brand only${brain?.brandName ? `: ${brain.brandName}` : ''}.
Do not mix in other brands this customer may have.
You are not a workflow builder. Speak simply. Never mention APIs, webhooks, Zapier, MCP, embeddings, or fine-tuning.
Format replies in clean markdown: short intro, then bullet lists with **bold** labels, blank line between items, no all-caps pixel text.

Treat this as one ongoing relationship with this brand:
- Use the linked brand profile below as ground truth.
- Remember what they already told you in earlier messages and other chats.
- Do not ask again for facts they already gave.
- Decisions (tone, topics, what to post, what to avoid) must match this brand and prior chats.
- If a new request conflicts with an earlier instruction, follow the latest instruction and note the change briefly.

You CAN look up the live web with your tools when the user asks you to check a website, a brand, or current public info.
Prefer the saved brand website: ${savedSites || 'none saved yet'}.
If they name a company or site, call fetch_website on the homepage so About/Team pages are included.
Many company sites are JavaScript apps. The fetch tools still return readable text — use that text. Quote names, roles, and facts from it.
Never say you could not retrieve content if the tool returned body text. If a name is not on the pages, say it was not listed.

Do not invent products, prices, hours, theology, or facts that are not in this brand's memory, past chats, or a page you fetched.
If you still do not know, say so and ask one short question.
Obey every restriction / "never" rule for this brand.

BRAND PROFILE:
${brandCard}

RELEVANT MEMORY FOR THIS BRAND:
${memory}

OTHER CHATS (titles and latest user notes):
${otherChats}`;

    const { openAIService } = await import('./openaiService.js');
    const result = await openAIService.generateWithTools({
      prompt: userMessage,
      systemInstruction: system,
      history: recentHistory,
      executeTool: async (name, args) => {
        if (name === 'search_web') {
          const hits = await webToolService.searchWeb(args.query || userMessage);
          if (!hits.length) return 'No search results.';
          return hits.map((item, i) => `${i + 1}. ${item.title}\n${item.url}`).join('\n\n');
        }
        if (name === 'fetch_webpage') {
          const url = args.url || savedSites.split(',')[0]?.trim();
          if (!url) return 'No URL provided.';
          const page = await webToolService.fetchWebpage(url);
          try {
            await this.indexDocument(userId, {
              title: `Web: ${page.title}`,
              content: `${page.url}\n${page.text.slice(0, 4000)}`,
              category: 'Web lookup',
              sourceType: 'web_live'
            });
          } catch (err: any) {
            logger.warn(`Live page indexed skip: ${err.message}`);
          }
          return `TITLE: ${page.title}\nURL: ${page.url}\nRENDERED: ${page.rendered}\n\n${page.text}`;
        }
        if (name === 'fetch_website') {
          const url = args.url || savedSites.split(',')[0]?.trim();
          if (!url) return 'No URL provided.';
          const page = await webToolService.fetchWebsite(url);
          try {
            await this.indexDocument(userId, {
              title: `Website: ${page.title}`,
              content: `${page.url}\n${page.text.slice(0, 5000)}`,
              category: 'Web lookup',
              sourceType: 'web_live'
            });
          } catch (err: any) {
            logger.warn(`Live site indexed skip: ${err.message}`);
          }
          return `TITLE: ${page.title}\nURL: ${page.url}\n\n${page.text}`;
        }
        if (name === 'list_connected_accounts') {
          const { listConnectedPublishTargets } = await import('../../api/social/services/socialPublishService.js');
          const targets = await listConnectedPublishTargets(userId);
          if (!targets.length) return 'No social accounts connected yet.';
          return targets.map((item) => `${item.platform}: ${item.handle}`).join('\n');
        }
        if (name === 'publish_social_post') {
          if (options.channel === 'brandBrain') {
            return 'Publishing is done from Hire AI, not Brand Brain.';
          }
          const { publishSocialPost } = await import('../../api/social/services/socialPublishService.js');
          const platforms = String(args.platforms || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          return publishSocialPost(userId, args.text || '', platforms);
        }
        return `Unknown tool: ${name}`;
      }
    });
    return { reply: result.reply, sources, usedWeb: result.usedWeb };
  }

  async generateDryRunPost(userId: string, managerId?: string): Promise<{ text: string; platforms: string[]; managerName: string }> {
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) throw new Error('User not found');
    const { assertReadyToRun, listManagers, activeManager } = await import('../../api/auth/services/workspaceProfiles.js');
    const managers = listManagers(dbUser);
    const manager = (managerId && managers.find((item: any) => item.id === managerId)) || activeManager(managers);
    if (!manager) throw new Error('Hire an AI first.');
    assertReadyToRun(dbUser, manager);
    const { connectedPlatforms } = await import('../../api/auth/services/workspaceProfiles.js');
    const linked = connectedPlatforms(dbUser);
    const platforms = (Array.isArray(manager.postTo) ? manager.postTo : []).filter((item: string) => linked.includes(item));
    const previous = (dbUser.agentRuns || [])
      .map((item: any) => String(item.draft || '').trim())
      .filter(Boolean)
      .slice(0, 6);
    const angles = ['a sharp question', 'a concrete customer story', 'one surprising stat', 'a short how-to', 'a bold claim plus proof', 'a call to action'];
    const angle = angles[Math.floor(Math.random() * angles.length)];
    const brandCard = this.formatBrandCard(dbUser, { managerId: manager.id, brandId: manager.brandId });
    const { openAIService } = await import('./openaiService.js');
    const text = (await openAIService.generateCompletion(
      [
        `Write one ready-to-publish social post using ${angle}.`,
        'Keep it under 450 characters so it fits Threads.',
        'Output only the post text. No title, quotes, or preamble.',
        previous.length ? `Do not repeat or lightly rephrase these earlier drafts:\n${previous.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}` : ''
      ].filter(Boolean).join('\n'),
      `You are ${manager.name || 'the hired AI'}. Write in this brand voice only. Vary the hook, structure, and wording every time.\n\n${brandCard}`,
      [],
      { temperature: 1.05, maxTokens: 220 }
    )).trim().replace(/^["']|["']$/g, '');
    if (!text) throw new Error('empty');
    return { text, platforms, managerName: manager.name || 'Hired AI' };
  }

  chatMemoryParentId(threadId: string) {
    return `chat_thread_${threadId}`;
  }

  async pruneChatTurns(docs: any[]) {
    const turns = docs.filter((doc) => doc.sourceType === 'chat_turn');
    if (turns.length <= 240) return docs;
    const dropIds = new Set(
      turns
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        .slice(0, turns.length - 200)
        .map((item) => item.id)
    );
    return docs.filter((doc) => !dropIds.has(doc.id));
  }

  async learnFromChat(userId: string, threadId: string, userMessage: string, assistantReply: string, history: Array<{ role: string; content: string }> = [], threadTitle = ''): Promise<number> {
    try {
      const dbUser = await UserModel.findById(userId);
      if (!dbUser) return 0;
      dbUser.knowledgeBase = dbUser.knowledgeBase || [];
      const parentId = this.chatMemoryParentId(threadId);
      const turnText = [
        threadTitle && `Chat: ${threadTitle}`,
        `User: ${userMessage}`,
        `Assistant: ${assistantReply.slice(0, 1200)}`
      ].filter(Boolean).join('\n');
      const turnEmbedding = await vectorStoreService.generateEmbedding(turnText);
      dbUser.knowledgeBase.push({
        id: `chatturn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: threadTitle ? `Earlier chat: ${threadTitle}` : 'Earlier chat',
        content: turnText,
        category: 'Past conversation',
        sourceType: 'chat_turn',
        parentId,
        embedding: turnEmbedding,
        createdAt: new Date()
      });

      const { openAIService } = await import('./openaiService.js');
      const facts = await openAIService.extractBrandFacts(userMessage, assistantReply, history);
      for (const fact of facts) {
        const embedding = await vectorStoreService.generateEmbedding(fact);
        dbUser.knowledgeBase.push({
          id: `chatmem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: 'Learned from chat',
          content: fact,
          category: 'Chat training',
          sourceType: 'chat_memory',
          parentId,
          embedding,
          createdAt: new Date()
        });
      }

      dbUser.knowledgeBase = await this.pruneChatTurns(dbUser.knowledgeBase);
      dbUser.markModified('knowledgeBase');
      await dbUser.save();
      logger.info(`[Brand Memory] Indexed chat turn${facts.length ? ` and ${facts.length} fact(s)` : ''} for ${threadId}`);
      return facts.length;
    } catch (err: any) {
      logger.warn(`Chat memory index skipped: ${err.message}`);
      return 0;
    }
  }

  async deleteChatMemory(userId: string, threadId: string): Promise<void> {
    const dbUser = await UserModel.findById(userId);
    if (!dbUser) return;
    const parentId = this.chatMemoryParentId(threadId);
    dbUser.knowledgeBase = (dbUser.knowledgeBase || []).filter(
      (doc: any) => doc.parentId !== parentId && doc.id !== parentId
    );
    dbUser.markModified('knowledgeBase');
    await dbUser.save();
  }
}

export const brandMemoryService = new BrandMemoryService();
