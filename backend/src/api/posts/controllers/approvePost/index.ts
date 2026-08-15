import { Request, Response } from 'express';
import { postService } from '../../services/postService.js';
import { logger } from '../../../../core/logger/index.js';

export const approvePostController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Post ID is required' });
      return;
    }

    const result = await postService.approvePost(id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`ApprovePostController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to approve post' });
  }
};
