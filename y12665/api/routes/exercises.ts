import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exerciseController } from '../controllers/ExerciseController.js';
import { versionController } from '../controllers/VersionController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
});

const router = Router();

router.get('/', exerciseController.getList);
router.get('/:id', exerciseController.getDetail);
router.post('/', exerciseController.create);
router.put('/:id', exerciseController.update);
router.delete('/:id', exerciseController.remove);
router.post('/import', upload.single('file'), exerciseController.import);

router.get('/:exerciseId/versions', versionController.getList);
router.get('/:exerciseId/versions/:versionId', versionController.getDetail);
router.post('/:exerciseId/versions/:versionId/rollback', versionController.rollback);

export default router;
