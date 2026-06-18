import { Router } from 'express';
import { ReviewService } from '../services/ReviewService.js';

const router = Router();

router.get('/metrics', (_req, res) => {
  const result = ReviewService.getMetrics();
  res.json(result);
});

router.get('/metrics/:metricName/details', (req, res) => {
  const result = ReviewService.getMetricDetails(req.params.metricName);
  res.json(result);
});

router.get('/biasing/:sampleId', (req, res) => {
  const result = ReviewService.getBiasingSampleDetails(req.params.sampleId);
  res.json(result);
});

export default router;
