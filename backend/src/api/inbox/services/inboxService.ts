import { logger } from '../../../core/logger/index.js';

export class InboxService {
  async getMessages() {
    logger.info('[Inbox Service] Retrieving unified inbox messages & lead tags...');
    return [
      {
        id: 'msg_1',
        platform: 'linkedin',
        type: 'comment',
        senderName: 'Marcus Vance',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        content: 'What is the pricing model for the business tier? Can we manage 5 client brands under one subscription?',
        timestamp: '18 mins ago',
        classification: 'lead',
        isLead: true,
        suggestedReply: 'Hi Marcus! Yes, our Business & Agency tiers include multi-workspace support for managing multiple client brands.',
        replyStatus: 'ai_draft',
        humanActionRequired: true
      }
    ];
  }

  async replyMessage(id: string, customReply?: string) {
    logger.info(`[Inbox Service] Dispatching reply for conversation #${id}`);
    return { id, replyStatus: 'replied', customReply };
  }
}

export const inboxService = new InboxService();
