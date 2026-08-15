import { Request, Response } from 'express';
import { postService } from '../../services/postService.js';
import { logger } from '../../../../core/logger/index.js';

export const getPostsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const posts = await postService.getPosts();
    res.json({ success: true, data: posts });
  } catch (error: any) {
    logger.error(`GetPostsController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to retrieve posts' });
  }
};
