import { Router, Request, Response } from 'express';
import documentRepository from '../repositories/DocumentRepository';
import stateMachineService from '../services/StateMachineService';
import type { ReviewDecisionRequest } from '../../shared/types';

const router = Router();

router.get('/pending', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20' } = req.query;
  
  const result = documentRepository.findPendingReview({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string)
  });
  
  res.json(result);
});

router.post('/:id/decision', (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, reason, modifiedData, decidedBy } = req.body as ReviewDecisionRequest;
  
  try {
    const doc = stateMachineService.reviewDocument(id, decision, reason, decidedBy, modifiedData);
    res.json({ success: true, document: doc });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/start-review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatedBy } = req.body;
  
  try {
    const doc = stateMachineService.transitionDocument(id, 'START_REVIEW', operatedBy, '开始复核');
    res.json({ success: true, document: doc });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
