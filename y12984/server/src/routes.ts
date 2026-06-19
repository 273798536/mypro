import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

import { getRuns, getRun, deleteRun } from './services/runService';
import { getRecordsByRun, getRecord, updateMigrationStatus } from './services/recordService';
import { getAnomaliesByRecord, updateAnomaly } from './services/anomalyService';
import { createPermission, getPermissionsByRecord, deletePermission } from './services/permissionService';
import { importFile } from './services/importService';
import { buildExportWorkbook, getExportFilename } from './services/exportService';
import { MigrationStatus, ReportRecordWithAnomalies } from './types';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get('/runs', (_req: Request, res: Response) => {
  res.json(getRuns());
});

router.get('/runs/:id', (req: Request, res: Response) => {
  const run = getRun(Number(req.params.id));
  if (!run) return res.status(404).json({ error: 'not found' });
  res.json(run);
});

router.delete('/runs/:id', (req: Request, res: Response) => {
  deleteRun(Number(req.params.id));
  res.json({ ok: true });
});

router.post('/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const result = importFile(req.file.path, req.file.originalname);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/records', (req: Request, res: Response) => {
  const runId = Number(req.query.run_id);
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  const filters = {
    anomalyType: req.query.anomaly_type as string | undefined,
    migrationStatus: req.query.migration_status as string | undefined,
    hasAnomaly: req.query.has_anomaly !== undefined ? req.query.has_anomaly === 'true' : undefined
  };
  res.json(getRecordsByRun(runId, filters));
});

router.get('/records/:id', (req: Request, res: Response) => {
  const r = getRecord(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

router.patch('/records/:id/migration-status', (req: Request, res: Response) => {
  const { status } = req.body;
  const valid: MigrationStatus[] = ['not_started', 'in_progress', 'completed', 'blocked'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'invalid status' });
  updateMigrationStatus(Number(req.params.id), status);
  res.json({ ok: true });
});

router.get('/records/:id/anomalies', (req: Request, res: Response) => {
  res.json(getAnomaliesByRecord(Number(req.params.id)));
});

router.patch('/anomalies/:id', (req: Request, res: Response) => {
  updateAnomaly(Number(req.params.id), req.body);
  res.json({ ok: true });
});

router.get('/records/:id/permissions', (req: Request, res: Response) => {
  res.json(getPermissionsByRecord(Number(req.params.id)));
});

router.post('/records/:id/permissions', (req: Request, res: Response) => {
  const id = createPermission({ record_id: Number(req.params.id), ...req.body });
  res.json({ id });
});

router.delete('/permissions/:id', (req: Request, res: Response) => {
  deletePermission(Number(req.params.id));
  res.json({ ok: true });
});

router.get('/stats/overview', (req: Request, res: Response) => {
  const runId = Number(req.query.run_id);
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  const records = getRecordsByRun(runId);

  const byAnomalyType: Record<string, number> = {};
  const byMigrationStatus: Record<string, number> = {};
  let errorCount = 0;
  let warningCount = 0;

  for (const r of records) {
    byMigrationStatus[r.migration_status] = (byMigrationStatus[r.migration_status] || 0) + 1;
    for (const a of r.anomalies) {
      byAnomalyType[a.anomaly_type] = (byAnomalyType[a.anomaly_type] || 0) + 1;
      if (a.severity === 'error') errorCount++;
      else warningCount++;
    }
  }

  res.json({
    total: records.length,
    withAnomaly: records.filter((r: ReportRecordWithAnomalies) => r.anomalies.length > 0).length,
    errorCount,
    warningCount,
    byAnomalyType,
    byMigrationStatus
  });
});

router.get('/export/:runId', (req: Request, res: Response) => {
  try {
    const runId = Number(req.params.runId);
    const wb = buildExportWorkbook(runId);
    const filename = getExportFilename(runId);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
