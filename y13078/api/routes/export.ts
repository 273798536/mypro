import { Router } from 'express';
import { db } from '../repository/db';
import { ExportService } from '../services/ExportService';
import { OverlapDetectService } from '../services/OverlapDetectService';
import { SummaryService } from '../services/SummaryService';

const router = Router();

router.get('/json', (_req, res) => {
  const payload = ExportService.buildFullJson(
    db.getAllPoints(), db.getAllViews(), db.getAllCabinets(),
  );
  res.setHeader('Content-Disposition', `attachment; filename="cold-aisle-export-${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(payload);
});

router.get('/summary-json', (_req, res) => {
  const points = db.getAllPoints();
  const overlaps = OverlapDetectService.detectPairs(points);
  const payload = ExportService.buildFullJson(points, db.getAllViews(), db.getAllCabinets());
  res.json(payload);
});

router.get('/pdf', (_req, res) => {
  const points = db.getAllPoints();
  const overlaps = OverlapDetectService.detectPairs(points);
  const buffer = ExportService.buildPdfBuffer(
    points, db.getAllViews(), db.getAllCabinets(), overlaps,
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cold-aisle-report-${Date.now()}.pdf"`);
  res.send(buffer);
});

router.post('/png', (req, res) => {
  const { snapshotId, metadata } = req.body ?? {};
  res.json({
    ok: true,
    snapshotId: snapshotId ?? `SNAP-${Date.now()}`,
    metadata: metadata ?? {},
    summary: SummaryService.buildUnified(
      db.getAllPoints(),
      OverlapDetectService.detectPairs(db.getAllPoints()),
      db.getAllCabinets(),
    ),
  });
});

export default router;
