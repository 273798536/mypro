import { Router } from 'express';
import { screenshotController } from '../controllers/ScreenshotController.js';

const router = Router();

router.put('/:id/mark', screenshotController.mark);
router.get('/:id', screenshotController.getDetail);

export default router;
