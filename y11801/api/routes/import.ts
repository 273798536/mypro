import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ImportService } from '../services/ImportService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { ImportDataType, ApiResponse, ImportLog } from '../../shared/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 CSV 和 Excel 文件'));
    }
  },
});

const router = Router();
const importService = new ImportService();

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('请上传文件', 400);
    }

    const dataType = req.body.dataType as ImportDataType;
    if (!dataType || !['vehicle', 'contract', 'residual'].includes(dataType)) {
      throw new AppError('请指定正确的数据类型: vehicle, contract, residual', 400);
    }

    const operator = req.body.operator || 'system';

    const result = await importService.processUpload(
      req.file.path,
      dataType,
      req.file.originalname,
      operator
    );

    const response: ApiResponse<ImportLog> = {
      success: true,
      data: result,
      message: '文件导入成功',
    };

    res.status(200).json(response);
  })
);

router.get(
  '/logs',
  asyncHandler(async (req: Request, res: Response) => {
    const logs = importService.getImportLogs();

    const response: ApiResponse<ImportLog[]> = {
      success: true,
      data: logs,
    };

    res.status(200).json(response);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const success = importService.deleteImport(id);

    if (!success) {
      throw new AppError('导入记录不存在', 404);
    }

    const response: ApiResponse = {
      success: true,
      message: '导入批次已删除',
    };

    res.status(200).json(response);
  })
);

export default router;
