import { Router } from 'express';
import { AnomaliesController } from '../controllers/index';

const router = Router();

router.get('/', AnomaliesController.getAll);
router.get('/impact/:id', AnomaliesController.getImpactChain);

export default router;
