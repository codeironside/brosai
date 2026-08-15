import { Request, Response } from 'express';
import { postService } from '../../services/postService.js';
import { logger } from '../../../../core/logger/index.js';

export const createPostController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, coreConcept, category } = req.body;
    if (!title || !coreConcept) {
      res.status(400).json({ success: false, error: 'Title and coreConcept are required' });
      return;
    }

    const post = await postService.createPost({ title, coreConcept, category });
    res.json({ success: true, data: post });
  } catch (error: any) {
    logger.error(`CreatePostController Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
};
