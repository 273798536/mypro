import { Router } from 'express';
import { BatchController } from '../controllers/index.js';

const router = Router();

router.get('/', BatchController.list);
router.get('/:id', BatchController.detail);
router.get('/:id/points', BatchController.points);
router.get('/:id/collisions', BatchController.collisions);

export default router;
