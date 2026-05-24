import Router from 'koa-router';
import { auditLogService, exportService } from '../services';

const router = new Router({ prefix: '/api/audit' });

router.get('/batch/:batchId', async (ctx) => {
  const logs = await auditLogService.getBatchHistory(ctx.params.batchId);
  ctx.body = { success: true, data: logs };
});

router.get('/material/:materialId', async (ctx) => {
  const logs = await auditLogService.getMaterialHistory(ctx.params.materialId);
  ctx.body = { success: true, data: logs };
});

router.get('/diff/:batchId', async (ctx) => {
  const { fieldName } = ctx.query as any;
  const logs = await auditLogService.getChangeDiff(ctx.params.batchId, fieldName);
  ctx.body = { success: true, data: logs };
});

router.get('/anomalies/:batchId', async (ctx) => {
  const anomalies = await exportService.detectAnomalies(ctx.params.batchId);
  ctx.body = { success: true, data: anomalies };
});

router.get('/replay/:materialId', async (ctx) => {
  const { batchId } = ctx.query as any;
  const diffs = await exportService.replayMaterialChanges(ctx.params.materialId, batchId);
  ctx.body = { success: true, data: diffs };
});

router.get('/report/:batchId', async (ctx) => {
  const report = await exportService.getReconciliationReport(ctx.params.batchId);
  ctx.body = { success: true, data: report };
});

router.post('/export/:batchId', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const filepath = await exportService.exportBatchToCsv(ctx.params.batchId, operator);
    ctx.body = { success: true, data: { filepath } };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/export-history/:batchId', async (ctx) => {
  try {
    const filepath = await exportService.exportHistoryDiff(ctx.params.batchId);
    ctx.body = { success: true, data: { filepath } };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

export default router;
