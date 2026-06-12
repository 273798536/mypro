import { Router } from 'express';
import { ExportController } from '../controllers/index';

const router = Router();

router.get('/', ExportController.export);
router.get('/preview', ExportController.preview);

export default router;
