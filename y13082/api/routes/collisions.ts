import { Router } from 'express';
import { CollisionController } from '../controllers/index.js';

const router = Router();

router.post('/:id/rejudge', CollisionController.rejudge);

export default router;
