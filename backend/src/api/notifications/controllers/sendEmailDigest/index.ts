import { Request, Response } from 'express';
import { notificationDispatchService } from '../../services/notificationDispatchService.js';
import { logger } from '../../../../core/logger/index.js';

export const sendEmailDigestController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, htmlBody } = req.body;
    if (!to || !subject) {
      res.status(400).json({ success: false, error: 'Recipient and subject are required' });
      return;
    }

    const success = await notificationDispatchService.dispatchEmail(to, subject, htmlBody || 'Daily AI Report');
    res.json({ success, channel: 'email', recipient: to });
  } catch (error: any) {
    logger.error(`SendEmailDigestController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to send email digest' });
  }
};
