"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_router_1 = __importDefault(require("koa-router"));
const services_1 = require("../services");
const router = new koa_router_1.default({ prefix: '/api/audit' });
router.get('/batch/:batchId', async (ctx) => {
    const logs = await services_1.auditLogService.getBatchHistory(ctx.params.batchId);
    ctx.body = { success: true, data: logs };
});
router.get('/material/:materialId', async (ctx) => {
    const logs = await services_1.auditLogService.getMaterialHistory(ctx.params.materialId);
    ctx.body = { success: true, data: logs };
});
router.get('/diff/:batchId', async (ctx) => {
    const { fieldName } = ctx.query;
    const logs = await services_1.auditLogService.getChangeDiff(ctx.params.batchId, fieldName);
    ctx.body = { success: true, data: logs };
});
router.get('/anomalies/:batchId', async (ctx) => {
    const anomalies = await services_1.exportService.detectAnomalies(ctx.params.batchId);
    ctx.body = { success: true, data: anomalies };
});
router.get('/replay/:materialId', async (ctx) => {
    const { batchId } = ctx.query;
    const diffs = await services_1.exportService.replayMaterialChanges(ctx.params.materialId, batchId);
    ctx.body = { success: true, data: diffs };
});
router.get('/report/:batchId', async (ctx) => {
    const report = await services_1.exportService.getReconciliationReport(ctx.params.batchId);
    ctx.body = { success: true, data: report };
});
router.post('/export/:batchId', async (ctx) => {
    try {
        const { operator } = ctx.request.body;
        const filepath = await services_1.exportService.exportBatchToCsv(ctx.params.batchId, operator);
        ctx.body = { success: true, data: { filepath } };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
router.post('/export-history/:batchId', async (ctx) => {
    try {
        const filepath = await services_1.exportService.exportHistoryDiff(ctx.params.batchId);
        ctx.body = { success: true, data: { filepath } };
    }
    catch (error) {
        ctx.status = 400;
        ctx.body = { success: false, error: error.message };
    }
});
exports.default = router;
