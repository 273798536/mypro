import Router from 'koa-router';
import { storeHandoverService } from '../services';

const router = new Router({ prefix: '/api/handover' });

router.post('/', async (ctx) => {
  try {
    const { batchId, materialId, storeId, storeName, handoverDate, receiver, handoverContent, operator } = ctx.request.body as any;
    const result = await storeHandoverService.addHandover(
      batchId,
      { materialId, storeId, storeName, handoverDate, receiver, handoverContent },
      operator
    );
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/confirm', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const result = await storeHandoverService.confirmHandover(ctx.params.id, operator);
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.get('/batch/:batchId', async (ctx) => {
  const result = await storeHandoverService.getByBatchId(ctx.params.batchId);
  ctx.body = { success: true, data: result };
});

router.get('/batch/:batchId/summary', async (ctx) => {
  const result = await storeHandoverService.getBatchHandoversSummary(ctx.params.batchId);
  ctx.body = { success: true, data: result };
});

router.get('/material/:materialId', async (ctx) => {
  const { batchId } = ctx.query as any;
  const result = await storeHandoverService.getByMaterialId(ctx.params.materialId, batchId);
  ctx.body = { success: true, data: result };
});

router.get('/:id', async (ctx) => {
  const result = await storeHandoverService.getById(ctx.params.id);
  if (!result) {
    ctx.status = 404;
    ctx.body = { success: false, error: '交接记录不存在' };
    return;
  }
  ctx.body = { success: true, data: result };
});

export default router;
