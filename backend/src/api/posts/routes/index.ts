import { Router } from 'express';
import { createPostController } from '../controllers/createPost/index.js';
import { getPostsController } from '../controllers/getPosts/index.js';
import { approvePostController } from '../controllers/approvePost/index.js';

const router = Router();

// Routes ONLY - forwarding to individual controller modules
router.get('/', getPostsController);
router.post('/', createPostController);
router.patch('/:id/approve', approvePostController);

export default router;
