import { Router } from 'express';
import { DataSource } from 'typeorm';
import { LedgerController } from './controllers/LedgerController';
import { FailedRecordController } from './controllers/FailedRecordController';
import { authenticate, requirePermission, requireRole } from './middleware/auth';
import { DataConsistencyMiddleware, addVersionHeader } from './middleware/dataConsistency';
import { UserRole } from './types/enums';

export const createRoutes = (dataSource: DataSource): Router => {
  const router = Router();
  const ledgerController = new LedgerController(dataSource);
  const failedRecordController = new FailedRecordController(dataSource);
  const dataConsistencyMiddleware = new DataConsistencyMiddleware(dataSource);

  router.use(authenticate);
  router.use(addVersionHeader);

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const ledgerRouter = Router();

  ledgerRouter.post(
    '/',
    requirePermission('ledger:create'),
    ledgerController.createDraft
  );

  ledgerRouter.get(
    '/',
    requirePermission('ledger:list'),
    ledgerController.list
  );

  ledgerRouter.get(
    '/statistics',
    requirePermission('stats:read'),
    ledgerController.getStatistics
  );

  ledgerRouter.get(
    '/no/:ledgerNo',
    requirePermission('ledger:read'),
    dataConsistencyMiddleware.verifyLedgerHash,
    ledgerController.getByLedgerNo
  );

  ledgerRouter.get(
    '/export',
    requirePermission('ledger:export'),
    ledgerController.exportLedgers
  );

  ledgerRouter.get(
    '/:id',
    requirePermission('ledger:read'),
    dataConsistencyMiddleware.verifyLedgerHash,
    ledgerController.getById
  );

  ledgerRouter.put(
    '/:id',
    requirePermission('ledger:update'),
    ledgerController.updateDraft
  );

  ledgerRouter.post(
    '/:id/submit',
    requirePermission('ledger:submit'),
    ledgerController.submit
  );

  ledgerRouter.post(
    '/:id/reject',
    requireRole(UserRole.SERVICE_MANAGER, UserRole.ADMIN),
    ledgerController.reject
  );

  ledgerRouter.post(
    '/:id/confirm',
    requireRole(UserRole.SERVICE_MANAGER, UserRole.ADMIN),
    ledgerController.confirm
  );

  ledgerRouter.post(
    '/:id/audit',
    requireRole(UserRole.AUDITOR, UserRole.ADMIN),
    ledgerController.audit
  );

  ledgerRouter.get(
    '/:id/history',
    requirePermission('history:read'),
    ledgerController.getChangeHistory
  );

  ledgerRouter.get(
    '/:id/compare',
    requirePermission('history:compare'),
    ledgerController.compareVersions
  );

  ledgerRouter.get(
    '/:id/export',
    requirePermission('ledger:export'),
    ledgerController.exportLedger
  );

  ledgerRouter.get(
    '/:id/validate',
    requirePermission('ledger:read'),
    ledgerController.validate
  );

  router.use('/ledgers', ledgerRouter);

  const failedRouter = Router();

  failedRouter.post(
    '/',
    requirePermission('failed:create'),
    failedRecordController.create
  );

  failedRouter.get(
    '/',
    requirePermission('failed:read'),
    failedRecordController.list
  );

  failedRouter.get(
    '/statistics',
    requirePermission('stats:read'),
    failedRecordController.getStatistics
  );

  failedRouter.get(
    '/:id',
    requirePermission('failed:read'),
    failedRecordController.getById
  );

  failedRouter.post(
    '/:id/resolve',
    requirePermission('failed:update'),
    failedRecordController.markResolved
  );

  failedRouter.post(
    '/:id/retry',
    requirePermission('failed:update'),
    failedRecordController.retry
  );

  router.use('/failed-records', failedRouter);

  return router;
};
