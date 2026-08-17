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
    const starting = /closing|closed|topology|not connected|ECONNREFUSED|buffering timed out|interrupted/i.test(
      error.message || ''
    );
    res.status(starting ? 503 : 500).json({
      success: false,
      error: starting
        ? 'The server is still starting. Try signing in again in a moment.'
        : 'Authentication failed',
    });
  }
};
