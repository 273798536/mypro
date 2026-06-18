import express, { type Request, type Response } from 'express';
import { ConversationService } from '../services/ConversationService.ts';
import type { ConversationQueryOptions } from '../repositories/ConversationRepository.ts';
import type { ReviewRequest } from '../../shared/types.ts';

const router = express.Router();
const conversationService = new ConversationService();

router.get('/', (req: Request, res: Response) => {
  try {
    const options: ConversationQueryOptions = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      riskLevel: req.query.riskLevel as any,
      sourceType: req.query.sourceType as any,
      batchId: req.query.batchId as string,
      hasDrift: req.query.hasDrift === 'true' ? true : req.query.hasDrift === 'false' ? false : undefined,
      search: req.query.search as string
    };
    
    const result = conversationService.getConversations(options);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const conversation = conversationService.getConversationById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/versions', (req: Request, res: Response) => {
  try {
    const versions = conversationService.getVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/review', (req: Request, res: Response) => {
  try {
    const request: ReviewRequest = req.body;
    const result = conversationService.reviewConversation(req.params.id, request);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/rollback', (req: Request, res: Response) => {
  try {
    const { versionId, operator } = req.body;
    const result = conversationService.rollbackToVersion(req.params.id, versionId, operator);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/versions/compare', (req: Request, res: Response) => {
  try {
    const { v1, v2 } = req.query;
    const diffs = conversationService.compareVersions(v1 as string, v2 as string);
    res.json({ success: true, data: diffs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/truncations/info', (req: Request, res: Response) => {
  try {
    const infos = conversationService.getTruncationInfos();
    res.json({ success: true, data: infos });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tool-errors/info', (req: Request, res: Response) => {
  try {
    const errors = conversationService.getToolCallErrors();
    res.json({ success: true, data: errors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
