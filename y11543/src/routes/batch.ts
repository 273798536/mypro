import Router from 'koa-router';
import { batchService } from '../services';

const router = new Router({ prefix: '/api/batches' });

router.get('/', async (ctx) => {
  const batches = await batchService.list();
  ctx.body = { success: true, data: batches };
});

router.get('/:id', async (ctx) => {
  const batch = await batchService.getById(ctx.params.id);
  if (!batch) {
    ctx.status = 404;
    ctx.body = { success: false, error: '批次不存在' };
    return;
  }
  ctx.body = { success: true, data: batch };
});

router.get('/no/:batchNo', async (ctx) => {
  const batch = await batchService.getByBatchNo(ctx.params.batchNo);
  if (!batch) {
    ctx.status = 404;
    ctx.body = { success: false, error: '批次不存在' };
    return;
  }
  ctx.body = { success: true, data: batch };
});

router.post('/', async (ctx) => {
  try {
    const { batchNo, name, operator, description, duplicateStrategy } = ctx.request.body as any;
    const batch = await batchService.create({
      batchNo,
      name,
      operator,
      description,
      duplicateStrategy
    });
    ctx.body = { success: true, data: batch };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/materials', async (ctx) => {
  try {
    const { materials, operator } = ctx.request.body as any;
    const result = await batchService.addMaterials(ctx.params.id, materials, operator);
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/submit', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const batch = await batchService.submit(ctx.params.id, operator);
    ctx.body = { success: true, data: batch };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/withdraw', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const batch = await batchService.withdraw(ctx.params.id, operator);
    ctx.body = { success: true, data: batch };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/resubmit', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const batch = await batchService.resubmit(ctx.params.id, operator);
    ctx.body = { success: true, data: batch };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/freeze', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const batch = await batchService.freeze(ctx.params.id, operator);
    ctx.body = { success: true, data: batch };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

router.post('/:id/unfreeze', async (ctx) => {
  try {
    const { operator } = ctx.request.body as any;
    const batch = await batchService.unfreeze(ctx.params.id, operator);
    ctx.body = { success: true, data: batch };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, error: error.message };
  }
});

export default router;
