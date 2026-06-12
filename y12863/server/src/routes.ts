import { Router } from 'express';
import * as path from 'path';
import multer from 'multer';
import {
  getAllRecords,
  getRecordById,
  importRecordsFromFile,
  updateRecordStatus,
  updateRecordDrift,
  attachPhoto,
  generateMonthlyReport,
  exportReportAsCsv,
  getReviewHistory,
  getAllBatches,
  getUploadsDir,
  getPhotosDir,
} from './store/dataStore';
import { calculateDrift } from './services/driftCalculator';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadsDir()),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, '_')}`),
});

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getPhotosDir()),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, '_')}`),
});

const upload = multer({ storage });
const photoUpload = multer({ storage: photoStorage });

router.get('/records', (_req, res) => {
  res.json(getAllRecords());
});

router.get('/records/:id', (req, res) => {
  const r = getRecordById(req.params.id);
  if (!r) return res.status(404).json({ error: '未找到记录' });
  res.json(r);
});

router.get('/records/:id/history', (req, res) => {
  res.json(getReviewHistory(req.params.id));
});

router.post('/records/:id/status', (req, res) => {
  const { status, reviewStatus, reviewer, remark } = req.body;
  const updated = updateRecordStatus(req.params.id, status, reviewStatus, reviewer || '调度员', remark || '');
  if (!updated) return res.status(404).json({ error: '未找到记录' });
  res.json(updated);
});

router.post('/records/:id/drift', (req, res) => {
  const { reportedLat, reportedLng, actualLat, actualLng, reviewer, remark } = req.body;
  const updated = updateRecordDrift(
    req.params.id,
    Number(reportedLat),
    Number(reportedLng),
    Number(actualLat),
    Number(actualLng),
    reviewer || '调度员',
    remark || ''
  );
  if (!updated) return res.status(404).json({ error: '未找到记录' });
  res.json(updated);
});

router.post('/records/:id/photos', photoUpload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  const { remark } = req.body;
  const updated = attachPhoto(req.params.id, req.file.originalname, req.file.filename, remark || '');
  if (!updated) return res.status(404).json({ error: '未找到记录' });
  res.json(updated);
});

router.get('/photos/:filename', (req, res) => {
  res.sendFile(path.join(getPhotosDir(), req.params.filename));
});

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  const { operator } = req.body;
  try {
    const result = importRecordsFromFile(req.file.path, operator || '调度员');
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/batches', (_req, res) => {
  res.json(getAllBatches());
});

router.post('/drift/calculate', (req, res) => {
  const { reportedLat, reportedLng, actualLat, actualLng } = req.body;
  res.json(
    calculateDrift(
      Number(reportedLat),
      Number(reportedLng),
      Number(actualLat),
      Number(actualLng)
    )
  );
});

router.get('/report/monthly/:month', (req, res) => {
  res.json(generateMonthlyReport(req.params.month));
});

router.get('/report/monthly/:month/csv', (req, res) => {
  const csv = exportReportAsCsv(req.params.month);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="台风避风锚地月报_${req.params.month}.csv"`);
  res.send('\ufeff' + csv);
});

export default router;
