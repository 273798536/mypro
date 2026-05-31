import { Router } from 'express';
import {
  exportExcel,
  exportPDF,
  getAuditLogs,
} from '../controllers/exportController';

const router = Router();

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);
router.get('/audit-logs', getAuditLogs);

export default router;
