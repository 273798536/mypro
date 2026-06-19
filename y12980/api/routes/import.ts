import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ImportService } from '../services/ImportService.js';
import type { SourceType } from '../../shared/types.js';

const router = Router();
const importService = new ImportService();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.log') || file.originalname.endsWith('.sql') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .log, .sql, .txt 格式文件'));
    }
  },
});

router.get('/batches', (_req: Request, res: Response) => {
  try {
    const batches = importService.getBatches();
    res.json(batches);
  } catch (error) {
    console.error('Error fetching import batches:', error);
    res.status(500).json({ error: 'Failed to fetch import batches' });
  }
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const sourceType = req.body.sourceType as SourceType;
    if (!sourceType || !['SLOW_QUERY_LOG', 'SCHEMA_SNAPSHOT'].includes(sourceType)) {
      return res.status(400).json({ error: '请指定正确的来源类型' });
    }

    const content = req.file.buffer.toString('utf-8');
    const result = await importService.importData(req.file.originalname, sourceType, content);

    res.json(result);
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : '导入失败' });
  }
});

router.post('/test-duplicate', async (_req: Request, res: Response) => {
  try {
    const result = await importService.runDuplicateImportTest();
    res.json({
      message: '重复导入测试完成',
      result,
      expected: {
        newRecords: 0,
        duplicateRecords: result.totalRecords,
      },
      success: result.newRecords === 0 && result.duplicateRecords > 0,
    });
  } catch (error) {
    console.error('Error running duplicate test:', error);
    res.status(500).json({ error: '重复导入测试失败' });
  }
});

export default router;
