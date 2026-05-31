import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { parseFile, confirmImport } from '../services/import.service.js';
import type { ImportConfirm } from '../../shared/types.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel和CSV文件'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/upload', authMiddleware, requireRole('admin'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }
    
    const { dataType } = req.body;
    if (!dataType) {
      return res.status(400).json({
        success: false,
        error: '请指定数据类型 (students, attendance, practice, feedback)'
      });
    }
    
    const validTypes = ['students', 'attendance', 'practice', 'feedback'];
    if (!validTypes.includes(dataType)) {
      return res.status(400).json({
        success: false,
        error: '无效的数据类型'
      });
    }
    
    const preview = parseFile(req.file.path, dataType);
    
    res.json({
      success: true,
      data: {
        ...preview,
        filePath: req.file.path
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '文件解析失败'
    });
  }
});

router.post('/confirm', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { filePath, mapping, dataType, skipInvalid } = req.body as ImportConfirm & { filePath: string };
    
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        error: '文件不存在，请重新上传'
      });
    }
    
    const fileName = path.basename(filePath);
    const result = confirmImport(filePath, { fileName, mapping, dataType, skipInvalid });
    
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      data: result,
      message: `成功导入 ${result.totalImported} 条记录`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '数据导入失败'
    });
  }
});

export default router;
