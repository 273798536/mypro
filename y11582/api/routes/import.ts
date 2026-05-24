
import { Router } from 'express';
import multer from 'multer';
import { importController } from '../controllers/importController';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/csv', upload.single('file'), importController.importCsv);
router.post('/json', importController.importJson);

export default router;
