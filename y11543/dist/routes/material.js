"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_router_1 = __importDefault(require("koa-router"));
const services_1 = require("../services");
const router = new koa_router_1.default({ prefix: '/api/materials' });
router.get('/:id', async (ctx) => {
    const material = await services_1.materialService.getById(ctx.params.id);
    if (!material) {
        ctx.status = 404;
        ctx.body = { success: false, error: '素材不存在' };
        return;
    }
    ctx.body = { success: true, data: material };
});
router.get('/materialId/:materialId', async (ctx) => {
    const { batchId } = ctx.query;
    const materials = await services_1.materialService.getByMaterialId(ctx.params.materialId, batchId);
    ctx.body = { success: true, data: materials };
});
router.post('/audit', async (ctx) => {
    try {
        const { batchId, materialId, status, reason, auditor, isManual } = ctx.request.body;
        const result = await services_1.materialService.addAuditResult(batchId, { materialId, status, reason, auditor, isManual }, auditor);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/manual-override', async (ctx) => {
    try {
        const { batchId, materialId, newStatus, reason, operator } = ctx.request.body;
        const result = await services_1.materialService.manualOverride(batchId, materialId, newStatus, reason, operator);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/cost', async (ctx) => {
    try {
        const { batchId, materialId, reportDate, cost, impressions, clicks, conversionValue, platform, operator } = ctx.request.body;
        const result = await services_1.materialService.addCostDaily(batchId, { materialId, reportDate, cost, impressions, clicks, conversionValue, platform }, operator);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/mapping', async (ctx) => {
    try {
        const { batchId, materialId, canonicalMaterialId, platformMaterialId, platform, platformMaterialName, mappingReason, operator } = ctx.request.body;
        const result = await services_1.materialService.addMapping(batchId, materialId, { canonicalMaterialId, platformMaterialId, platform, platformMaterialName, mappingReason }, operator);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/remark', async (ctx) => {
    try {
        const { batchId, materialId, content, operator: op, source } = ctx.request.body;
        const result = await services_1.materialService.addRemark(batchId, { materialId, content, operator: op, source }, op);
        ctx.body = { success: true, data: result };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.get('/:materialId/merged', async (ctx) => {
    const { batchId } = ctx.query;
    const view = await services_1.materialService.getMergedView(ctx.params.materialId, batchId);
    ctx.body = { success: true, data: view };
});
router.get('/:materialId/reconcile', async (ctx) => {
    const { batchId } = ctx.query;
    const result = await services_1.materialService.reconcileCosts(ctx.params.materialId, batchId);
    ctx.body = { success: true, data: result };
});
exports.default = router;
