import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { z } from 'zod';
import { CsvService } from '../services/csv.service';
import { ModelVersionService } from '../services/model-version.service';
import { EvaluationStatus } from '@prisma/client';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传CSV文件'));
    }
  },
});

const importSchema = z.object({
  modelVersionId: z.string().min(1, '模型版本ID不能为空'),
});

router.post(
  '/import',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 400, message: '请上传文件' });
      }

      const { modelVersionId } = importSchema.parse(req.body);
      const operator = req.headers['x-operator'] as string;

      const result = await CsvService.importFromFile(
        req.file.path,
        modelVersionId,
        operator
      );

      fs.unlinkSync(req.file.path);

      res.json({ code: 0, message: 'success', data: result });
    } catch (e: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ code: 400, message: e.message });
    }
  }
);

router.get('/export', async (req: Request, res: Response) => {
  try {
    const { batchId, status } = req.query;

    const outputDir = path.join(process.cwd(), 'exports');
    const filePath = await CsvService.exportToFile(
      {
        batchId: batchId as string | undefined,
        status: status as EvaluationStatus | undefined,
      },
      outputDir
    );

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

export default router;
