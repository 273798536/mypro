import { Router } from 'express';
import { db } from '../repository/db';
import { OverlapDetectService } from '../services/OverlapDetectService';

const router = Router();

router.get('/overlaps', (_req, res) => {
  const points = db.getAllPoints();
  const pairs = OverlapDetectService.detectPairs(points);
  res.json({ pairs, totalPoints: points.length, checkedAt: Date.now() });
});

export default router;
