import { Router } from 'express';
import { EvidenceService } from '../services/EvidenceService.js';

const router = Router();

router.get('/:playbackId', (req, res) => {
  const result = EvidenceService.getEvidenceChain(req.params.playbackId);
  res.json(result);
});

router.get('/original/:sampleId', (req, res) => {
  const result = EvidenceService.getOriginalStatement(req.params.sampleId);
  res.json(result);
});

export default router;
