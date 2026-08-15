import { Request, Response } from 'express';
import { inboxService } from '../../services/inboxService.js';
import { logger } from '../../../../core/logger/index.js';

export const getMessagesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const messages = await inboxService.getMessages();
    res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error(`GetMessagesController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to retrieve inbox messages' });
  }
};
