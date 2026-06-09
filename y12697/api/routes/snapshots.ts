import { Router } from 'express';
import { SnapshotController } from '../controllers/SnapshotController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', SnapshotController.list);
router.get('/:id', SnapshotController.get);
router.post('/import', upload.array('files', 50), SnapshotController.import);

export default router;
