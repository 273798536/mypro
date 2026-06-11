import { Router } from 'express';
import { CollisionController, ExportController } from '../controllers/index.js';

const router = Router();

router.get('/', CollisionController.anomalies);
router.get('/export', ExportController.anomaliesCsv);

export default router;
