import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import { getAllLedgers } from '../dao/ledgerDao';
import { getChangeRecordsByOperator } from '../dao/changeRecordDao';
import { maskLedger, maskChangeRecord } from '../utils/maskUtils';
import { generateManagerReport } from '../utils/reportUtils';
import { Role } from '../types';

const router = Router();

router.get('/ledgers', requirePermission('export:masked'), async (req: Request, res: Response) => {
  const { role } = req.auth!;
  let ledgers = await getAllLedgers();

  if (role !== Role.ADMIN && role !== Role.MANAGER) {
    ledgers = ledgers.map(maskLedger);
  }

  res.json({
    success: true,
    data: ledgers,
    masked: role !== Role.ADMIN && role !== Role.MANAGER
  });
});

router.get('/ledgers/masked', requirePermission('export:masked'), async (req: Request, res: Response) => {
  let ledgers = await getAllLedgers();
  ledgers = ledgers.map(maskLedger);

  res.json({
    success: true,
    data: ledgers,
    masked: true
  });
});

router.get('/history/:operatorId', requirePermission('export:masked'), async (req: Request, res: Response) => {
  const { role } = req.auth!;
  let changes = await getChangeRecordsByOperator(req.params.operatorId);

  if (role !== Role.ADMIN && role !== Role.MANAGER) {
    changes = changes.map(maskChangeRecord);
  }

  res.json({
    success: true,
    data: changes,
    masked: role !== Role.ADMIN && role !== Role.MANAGER
  });
});

router.get('/manager-report', requirePermission('export:sensitive'), async (req: Request, res: Response) => {
  const ledgers = await getAllLedgers();
  const allChanges: any[] = [];

  for (const ledger of ledgers) {
    const changes = await getChangeRecordsByOperator(ledger.createdBy);
    allChanges.push(...changes);
  }

  const report = generateManagerReport(ledgers, allChanges);

  res.json({
    success: true,
    data: report
  });
});

export default router;
