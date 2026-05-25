"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_router_1 = __importDefault(require("koa-router"));
const services_1 = require("../services");
const router = new koa_router_1.default({ prefix: '/api/batches' });
router.get('/', async (ctx) => {
    const batches = await services_1.batchService.list();
    ctx.body = { success: true, data: batches };
});
router.get('/:id', async (ctx) => {
    const batch = await services_1.batchService.getById(ctx.params.id);
    if (!batch) {
        ctx.status = 404;
        ctx.body = { success: false, error: '批次不存在' };
        return;
    }
    ctx.body = { success: true, data: batch };
});
router.get('/no/:batchNo', async (ctx) => {
    const batch = await services_1.batchService.getByBatchNo(ctx.params.batchNo);
    if (!batch) {
        ctx.status = 404;
        ctx.body = { success: false, error: '批次不存在' };
        return;
    }
    ctx.body = { success: true, data: batch };
});
router.post('/', async (ctx) => {
    try {
        const { batchNo, name, operator, description, duplicateStrategy } = ctx.request.body;
        const batch = await services_1.batchService.create({
            batchNo,
            name,
            operator,
            description,
            duplicateStrategy
        });
        ctx.body = { success: true, data: batch };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/materials', async (ctx) => {
    try {
        const { materials, operator } = ctx.request.body;
        const result = await services_1.batchService.addMaterials(ctx.params.id, materials, operator);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/submit', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const batch = await services_1.batchService.submit(ctx.params.id, operator);
        ctx.body = { success: true, data: batch };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/withdraw', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const batch = await services_1.batchService.withdraw(ctx.params.id, operator);
        ctx.body = { success: true, data: batch };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/resubmit', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const batch = await services_1.batchService.resubmit(ctx.params.id, operator);
        ctx.body = { success: true, data: batch };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/freeze', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const batch = await services_1.batchService.freeze(ctx.params.id, operator);
        ctx.body = { success: true, data: batch };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/:id/unfreeze', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const batch = await services_1.batchService.unfreeze(ctx.params.id, operator);
        ctx.body = { success: true, data: batch };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
exports.default = router;
