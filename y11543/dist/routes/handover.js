"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_router_1 = __importDefault(require("koa-router"));
const services_1 = require("../services");
const router = new koa_router_1.default({ prefix: '/api/handover' });
router.post('/', async (ctx) => {
    try {
        const { batchId, materialId, storeId, storeName, handoverDate, receiver, handoverContent, operator } = ctx.request.body;
        const result = await services_1.storeHandoverService.addHandover(batchId, { materialId, storeId, storeName, handoverDate, receiver, handoverContent }, operator);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/confirm', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const result = await services_1.storeHandoverService.confirmHandover(ctx.params.id, operator);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.get('/batch/:batchId', async (ctx) => {
    const result = await services_1.storeHandoverService.getByBatchId(ctx.params.batchId);
    ctx.body = { success: true, data: result };
});
router.get('/batch/:batchId/summary', async (ctx) => {
    const result = await services_1.storeHandoverService.getBatchHandoversSummary(ctx.params.batchId);
    ctx.body = { success: true, data: result };
});
router.get('/material/:materialId', async (ctx) => {
    const { batchId } = ctx.query;
    const result = await services_1.storeHandoverService.getByMaterialId(ctx.params.materialId, batchId);
    ctx.body = { success: true, data: result };
});
router.get('/:id', async (ctx) => {
    const result = await services_1.storeHandoverService.getById(ctx.params.id);
    if (!result) {
        ctx.status = 404;
        ctx.body = { success: false, error: '交接记录不存在' };
        return;
    }
    ctx.body = { success: true, data: result };
});
exports.default = router;
