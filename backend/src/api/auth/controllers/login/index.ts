import { Request, Response } from 'express';
import { loginService } from '../../services/loginService.js';
import { logger } from '../../../../core/logger/index.js';

export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, avatarUrl } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email parameter is required for Google OAuth login.' });
      return;
    }

    const result = await loginService.authenticateGoogleUser({ email, name, avatarUrl });
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`LoginController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};
