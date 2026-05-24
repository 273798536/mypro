import Router from 'koa-router';
import { materialService } from '../services';

const router = new Router({ prefix: '/api/materials' });

router.get('/:id', async (ctx) => {
  const material = await materialService.getById(ctx.params.id);
  if (!material) {
    ctx.status = 404;
    ctx.body = { success: false, error: '素材不存在' };
    return;
  }
  ctx.body = { success: true, data: material };
});

router.get('/materialId/:materialId', async (ctx) => {
  const { batchId } = ctx.query as any;
  const materials = await materialService.getByMaterialId(ctx.params.materialId, batchId);
  ctx.body = { success: true, data: materials };
});

router.post('/audit', async (ctx) => {
  try {
    const { batchId, materialId, status, reason, auditor, isManual } = ctx.request.body as any;
    const result = await materialService.addAuditResult(
      batchId,
      { materialId, status, reason, auditor, isManual },
      auditor
    );
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/manual-override', async (ctx) => {
  try {
    const { batchId, materialId, newStatus, reason, operator } = ctx.request.body as any;
    const result = await materialService.manualOverride(
      batchId,
      materialId,
      newStatus,
      reason,
      operator
    );
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/cost', async (ctx) => {
  try {
    const { batchId, materialId, reportDate, cost, impressions, clicks, conversionValue, platform, operator } = ctx.request.body as any;
    const result = await materialService.addCostDaily(
      batchId,
      { materialId, reportDate, cost, impressions, clicks, conversionValue, platform },
      operator
    );
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/mapping', async (ctx) => {
  try {
    const { batchId, materialId, canonicalMaterialId, platformMaterialId, platform, platformMaterialName, mappingReason, operator } = ctx.request.body as any;
    const result = await materialService.addMapping(
      batchId,
      materialId,
      { canonicalMaterialId, platformMaterialId, platform, platformMaterialName, mappingReason },
      operator
    );
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/remark', async (ctx) => {
  try {
    const { batchId, materialId, content, operator: op, source } = ctx.request.body as any;
    const result = await materialService.addRemark(
      batchId,
      { materialId, content, operator: op, source },
      op
    );
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.get('/:materialId/merged', async (ctx) => {
  const { batchId } = ctx.query as any;
  const view = await materialService.getMergedView(ctx.params.materialId, batchId);
  ctx.body = { success: true, data: view };
});

router.get('/:materialId/reconcile', async (ctx) => {
  const { batchId } = ctx.query as any;
  const result = await materialService.reconcileCosts(ctx.params.materialId, batchId);
  ctx.body = { success: true, data: result };
});

export default router;
