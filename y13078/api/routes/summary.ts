import { Router } from 'express';
import { db } from '../repository/db';
import { OverlapDetectService } from '../services/OverlapDetectService';
import { SummaryService } from '../services/SummaryService';

const router = Router();

router.get('/', (_req, res) => {
  const points = db.getAllPoints();
  const overlaps = OverlapDetectService.detectPairs(points);
  const summary = SummaryService.buildUnified(points, overlaps, db.getAllCabinets());
  res.json(summary);
});

router.get('/cabinets', (_req, res) => {
  res.json(db.getAllCabinets());
});

export default router;
