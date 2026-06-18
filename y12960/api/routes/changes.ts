import { Router } from 'express';
import multer from 'multer';
import { changeController } from '../controllers/ChangeController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', changeController.getChanges);
router.get('/template', changeController.downloadTemplate);
router.get('/:id', changeController.getChangeById);
router.post('/import', upload.single('file'), changeController.importChanges);
router.put('/:id', changeController.updateChange);
router.post('/bulk-update', changeController.bulkUpdate);
router.post('/export', changeController.exportChanges);
router.post('/end-of-month-transfer', changeController.endOfMonthTransfer);
router.post('/:id/sync', changeController.syncToSource);

export default router;
