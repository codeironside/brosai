import { Request, Response } from 'express';
import { inboxService } from '../../services/inboxService.js';
import { logger } from '../../../../core/logger/index.js';

export const replyMessageController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;
    if (!id) {
      res.status(400).json({ success: false, error: 'Message ID is required' });
      return;
    }

    const result = await inboxService.replyMessage(id, replyText);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`ReplyMessageController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to dispatch reply' });
  }
};
