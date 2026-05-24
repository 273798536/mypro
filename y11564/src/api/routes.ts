import { Router, Request, Response } from 'express';
import { ledgerService } from '../services/ledger-service';
import { exportService } from '../services/export-service';
import { LedgerStatus, Role } from '../types';

const router = Router();

interface AuthenticatedRequest extends Request {
  headers: {
    'x-operator'?: string;
    'x-role'?: string;
  };
}

function getAuthInfo(req: AuthenticatedRequest): { operator: string; role: Role } {
  const operator = req.headers['x-operator'] || 'anonymous';
  const role = (req.headers['x-role'] as Role) || Role.FRONT_DESK;
  return { operator, role };
}

router.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.post('/ledgers/check-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const result = await ledgerService.createLedgerFromCheckIn(req.body, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/ledgers/deposit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const result = await ledgerService.addDeposit(req.body, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/ledgers/room-change', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const result = await ledgerService.addRoomChange(req.body, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/ledgers/:id/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const result = await ledgerService.submitLedger(req.params.id, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/ledgers/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const { reason } = req.body;
    const result = await ledgerService.rejectLedger(req.params.id, reason, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/ledgers/:id/confirm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const result = await ledgerService.confirmLedger(req.params.id, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/ledgers/:id/audit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const result = await ledgerService.auditLedger(req.params.id, operator, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/ledgers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = getAuthInfo(req);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const status = req.query.status as LedgerStatus | undefined;
    const hasSyncIssue = req.query.hasSyncIssue ? req.query.hasSyncIssue === 'true' : undefined;

    const result = await ledgerService.getLedgerList({ page, pageSize, status, hasSyncIssue }, role);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/ledgers/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = getAuthInfo(req);
    const detail = await ledgerService.getLedgerDetail(req.params.id, role);
    if (!detail) {
      res.status(404).json({ success: false, message: '台账不存在' });
      return;
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/ledgers/:id/history', async (req: Request, res: Response) => {
  try {
    const histories = await ledgerService.getLedgerHistories(req.params.id);
    res.json({ success: true, data: histories });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/failed-records', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const result = await ledgerService.getFailedRecords({ page, pageSize });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/report/summary', async (req: Request, res: Response) => {
  try {
    const summary = await ledgerService.getReportSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/export/ledgers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const { status, hasSyncIssue } = req.body;
    const filePath = await exportService.exportLedgersToCSV({ status, hasSyncIssue }, operator, role);
    res.json({ success: true, data: { filePath, filename: filePath.split('/').pop() } });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/export/ledgers/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const filePath = await exportService.exportLedgerDetailToCSV(req.params.id, operator, role);
    res.json({ success: true, data: { filePath, filename: filePath.split('/').pop() } });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/export/failed-records', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operator, role } = getAuthInfo(req);
    const filePath = await exportService.exportFailedRecordsToCSV(operator, role);
    res.json({ success: true, data: { filePath, filename: filePath.split('/').pop() } });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/export/files', async (req: Request, res: Response) => {
  try {
    const files = exportService.listExportFiles();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.get('/export/download/:filename', async (req: Request, res: Response) => {
  try {
    const filePath = exportService.getExportFilePath(req.params.filename);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
