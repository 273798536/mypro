import { Router } from 'express';
import { exportController } from '../controllers/ExportController.js';

const router = Router();

router.post('/', exportController.create);
router.get('/list', exportController.getList);
router.get('/:id/download', exportController.download);
router.get('/:id', exportController.getDetail);

export default router;
