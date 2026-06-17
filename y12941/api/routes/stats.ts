import express, { type Request, type Response } from 'express';
import { ConversationService } from '../services/ConversationService';

const router = express.Router();
const conversationService = new ConversationService();

router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const stats = conversationService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
