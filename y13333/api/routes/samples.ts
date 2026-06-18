import { Router } from 'express';
import { SampleService } from '../services/SampleService.js';

const router = Router();

router.get('/', (req, res) => {
  const includeWithdrawn = req.query.includeWithdrawn !== 'false';
  const result = SampleService.getAllSamples(includeWithdrawn);
  res.json(result);
});

router.get('/withdrawn', (_req, res) => {
  const result = SampleService.getWithdrawnSamples();
  res.json(result);
});

router.get('/:id', (req, res) => {
  const result = SampleService.getSampleById(req.params.id);
  res.json(result);
});

export default router;
