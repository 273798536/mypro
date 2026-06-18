import express, { type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { MaterialService } from '../services/MaterialService.ts';
import type { MaterialSource } from '../../shared/types.ts';

const router = express.Router();
const materialService = new MaterialService();

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({ storage });

router.get('/batches', (req: Request, res: Response) => {
  try {
    const result = materialService.getBatches();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/batches/:id', (req: Request, res: Response) => {
  try {
    const batch = materialService.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    res.json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const { sourceType, operator } = req.body;
    if (!sourceType) {
      return res.status(400).json({ success: false, error: 'sourceType is required' });
    }
    
    const result = await materialService.importFile(
      req.file.path,
      sourceType as MaterialSource,
      req.file.originalname,
      operator || 'system'
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
