import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  importSamplesFromCsv,
  updateSampleStatus,
  saveAnnotation,
  deleteAnnotation,
  getSupervisorOverview,
  getDiffAnalysis,
  generateQcReport,
  generateSeedData,
} from '../services/index.js';
import { sampleRepo, annotationRepo, reportRepo } from '../repositories/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 },
});

generateSeedData();

router.get('/samples', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const result = sampleRepo.findAll({
      status: status as any,
      search,
      page,
      pageSize,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/samples/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传 CSV 文件' });
      return;
    }
    const result = importSamplesFromCsv(req.file.path, req.file.originalname);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/samples/:id', (req: Request, res: Response) => {
  try {
    const sample = sampleRepo.findById(req.params.id);
    if (!sample) {
      res.status(404).json({ success: false, error: '样本不存在' });
      return;
    }
    res.json({ success: true, data: sample });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/samples/:id', (req: Request, res: Response) => {
  try {
    const sample = sampleRepo.update(req.params.id, req.body);
    if (!sample) {
      res.status(404).json({ success: false, error: '样本不存在' });
      return;
    }
    res.json({ success: true, data: sample });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/samples/:id/status', (req: Request, res: Response) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: '请提供状态' });
      return;
    }
    const sample = updateSampleStatus(req.params.id, status, note);
    if (!sample) {
      res.status(404).json({ success: false, error: '样本不存在' });
      return;
    }
    res.json({ success: true, data: sample });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/samples/:id/annotations', (req: Request, res: Response) => {
  try {
    const annotations = annotationRepo.findBySampleId(req.params.id);
    res.json({ success: true, data: annotations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/samples/:id/annotations', (req: Request, res: Response) => {
  try {
    const { x, y, label } = req.body;
    if (x === undefined || y === undefined) {
      res.status(400).json({ success: false, error: '请提供标注坐标' });
      return;
    }
    const annotation = saveAnnotation(req.params.id, x, y, label);
    res.json({ success: true, data: annotation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/annotations/:id', (req: Request, res: Response) => {
  try {
    const { sampleId } = req.query;
    const ok = deleteAnnotation(req.params.id, sampleId as string);
    if (!ok) {
      res.status(404).json({ success: false, error: '标注不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/duplicates', (_req: Request, res: Response) => {
  try {
    const groups = sampleRepo.findDuplicateGroups();
    res.json({ success: true, data: groups });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/diff-analysis', (_req: Request, res: Response) => {
  try {
    const result = getDiffAnalysis();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/supervisor/overview', (_req: Request, res: Response) => {
  try {
    const overview = getSupervisorOverview();
    res.json({ success: true, data: overview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports', (_req: Request, res: Response) => {
  try {
    const reports = reportRepo.findAll();
    res.json({ success: true, data: reports });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reports/generate', (_req: Request, res: Response) => {
  try {
    const { report } = generateQcReport();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/:id/download', (req: Request, res: Response) => {
  try {
    const report = reportRepo.findById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, error: '报告不存在' });
      return;
    }
    if (!fs.existsSync(report.filePath)) {
      res.status(404).json({ success: false, error: '报告文件不存在' });
      return;
    }
    res.download(report.filePath, `质控报告-${report.id}.csv`);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
