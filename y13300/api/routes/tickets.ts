import { Router, type Request, type Response } from 'express';
import { TicketController } from '../controllers/index.js';

const router = Router();
const ticketController = new TicketController();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  await ticketController.listTickets(req, res);
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  await ticketController.getTicketDetail(req, res);
});

router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  await ticketController.updateStatus(req, res);
});

router.post('/import', async (req: Request, res: Response): Promise<void> => {
  await ticketController.importTickets(req, res);
});

router.get('/:id/audit-logs', async (req: Request, res: Response): Promise<void> => {
  await ticketController.getAuditLogs(req, res);
});

export default router;
