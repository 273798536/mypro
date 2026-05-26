
import { Router } from 'express';
import multer from 'multer';
import { importController } from '../controllers/importController.js';
import { authMiddleware, requireRole, PERMISSIONS } from '../middleware/auth.js';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/csv', authMiddleware, requireRole(...PERMISSIONS.WRITE), upload.single('file'), importController.importCsv);
router.post('/json', authMiddleware, requireRole(...PERMISSIONS.WRITE), importController.importJson);

export default router;
