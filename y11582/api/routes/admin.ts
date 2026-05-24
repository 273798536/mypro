
import { Router } from 'express';
import { adminController } from '../controllers/adminController';

const router = Router();

router.post('/resume', adminController.resumeProcessing);
router.post('/start', adminController.startProcessing);
router.post('/stop', adminController.stopProcessing);

export default router;
