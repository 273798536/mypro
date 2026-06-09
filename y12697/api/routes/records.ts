import { Router } from 'express';
import { RecordController } from '../controllers/RecordController.js';

const router = Router({ mergeParams: true });

router.get('/', RecordController.list);
router.get('/latest', RecordController.latest);
router.post('/', RecordController.save);

export default router;
